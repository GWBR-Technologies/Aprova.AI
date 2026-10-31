import type { CommandAccepted, CommandEnvelope } from '@contracts/commands/command-envelope';

import { ApiRequestError } from '../api/errors';

export type OutboxState = 'queued-locally' | 'sending' | 'received' | 'failed';

export type OutboxRow = {
  commandId: string;
  userId: string;
  route: string;
  /** Identificador do recurso criado pelo comando (por exemplo `essayId`); não é dado pessoal. */
  resourceId: string | null;
  /** JSON do envelope; nulo depois de `received` (o servidor já tem o conteúdo). */
  body: string | null;
  state: OutboxState;
  attempts: number;
  nextAttemptAt: number;
  lastErrorCode: string | null;
  createdAt: number;
  updatedAt: number;
};

type SqlParam = string | number | null;

/** Subconjunto de `SQLiteDatabase` (expo-sqlite) de que o outbox precisa. */
export type OutboxDb = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SqlParam[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: SqlParam[]): Promise<T | null>;
};

export const OUTBOX_SCHEMA = `
CREATE TABLE IF NOT EXISTS outbox (
  command_id      TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  route           TEXT NOT NULL,
  resource_id     TEXT,
  body            TEXT,
  state           TEXT NOT NULL,
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  last_error_code TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS outbox_due ON outbox (user_id, state, next_attempt_at);
`;

const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 5 * 60_000;
const JITTER_RATIO = 0.2;
const RECEIVED_RETENTION_MS = 7 * 24 * 60 * 60_000;

/** `min(2^attempts × 2 s, 5 min)` mais até 20% de sorteio, para não sincronizar aparelhos. */
export function backoffDelayMs(attempts: number, random: () => number = Math.random): number {
  const base = Math.min(BASE_DELAY_MS * 2 ** attempts, MAX_DELAY_MS);
  return Math.round(base + base * JITTER_RATIO * random());
}

type RawRow = {
  command_id: string;
  user_id: string;
  route: string;
  resource_id: string | null;
  body: string | null;
  state: OutboxState;
  attempts: number;
  next_attempt_at: number;
  last_error_code: string | null;
  created_at: number;
  updated_at: number;
};

function toRow(raw: RawRow): OutboxRow {
  return {
    commandId: raw.command_id,
    userId: raw.user_id,
    route: raw.route,
    resourceId: raw.resource_id,
    body: raw.body,
    state: raw.state,
    attempts: raw.attempts,
    nextAttemptAt: raw.next_attempt_at,
    lastErrorCode: raw.last_error_code,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export type OutboxConfig = {
  db: OutboxDb;
  /** POST `/v1/commands/<route>`; lança `ApiRequestError` em caso de falha. */
  send: (route: string, envelope: CommandEnvelope<unknown>) => Promise<CommandAccepted>;
  now?: () => number;
  random?: () => number;
  /** Agenda o próximo envio quando há comando com `next_attempt_at` no futuro. */
  setTimer?: (callback: () => void, delayMs: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

export function createOutbox(config: OutboxConfig) {
  const { db, send } = config;
  const now = config.now ?? Date.now;
  const random = config.random ?? Math.random;
  const setTimer = config.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const clearTimer = config.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  const listeners = new Map<string, Set<(state: OutboxState) => void>>();
  let initialized: Promise<void> | null = null;
  let running: Promise<void> | null = null;
  let rerun = false;
  let timer: unknown = null;
  let timerUserId: string | null = null;

  function init() {
    // Recuperação de queda: o commandId é a chave de idempotência, então reenviar é seguro.
    initialized ??= db
      .execAsync(OUTBOX_SCHEMA)
      .then(() =>
        db.runAsync("UPDATE outbox SET state = 'queued-locally', updated_at = ? WHERE state = 'sending'", [now()]),
      )
      .then(() => undefined);
    return initialized;
  }

  function notify(commandId: string, state: OutboxState) {
    listeners.get(commandId)?.forEach((listener) => listener(state));
  }

  async function setState(
    commandId: string,
    patch: { state: OutboxState; clearBody?: boolean; attempts?: number; nextAttemptAt?: number; lastErrorCode?: string | null },
  ) {
    const sets = ['state = ?', 'updated_at = ?'];
    const params: SqlParam[] = [patch.state, now()];
    if (patch.clearBody) sets.push('body = NULL');
    if (patch.attempts !== undefined) {
      sets.push('attempts = ?');
      params.push(patch.attempts);
    }
    if (patch.nextAttemptAt !== undefined) {
      sets.push('next_attempt_at = ?');
      params.push(patch.nextAttemptAt);
    }
    if (patch.lastErrorCode !== undefined) {
      sets.push('last_error_code = ?');
      params.push(patch.lastErrorCode);
    }
    params.push(commandId);
    const { changes } = await db.runAsync(`UPDATE outbox SET ${sets.join(', ')} WHERE command_id = ?`, params);
    if (changes > 0) notify(commandId, patch.state);
  }

  async function runRound(userId: string) {
    await init();
    const queued = await db.getAllAsync<RawRow>(
      "SELECT * FROM outbox WHERE user_id = ? AND state = 'queued-locally' ORDER BY created_at, command_id",
      [userId],
    );

    for (const raw of queued) {
      const row = toRow(raw);
      // FIFO estrito: um comando que ainda aguarda o atraso bloqueia os mais novos.
      if (row.nextAttemptAt > now()) break;
      if (row.body === null) continue;
      await setState(row.commandId, { state: 'sending' });
      try {
        await send(row.route, JSON.parse(row.body) as CommandEnvelope<unknown>);
        // O texto só é necessário até o servidor confirmar; depois disso é apagado (§6.3).
        await setState(row.commandId, { state: 'received', clearBody: true, lastErrorCode: null });
      } catch (error) {
        const failure = error instanceof ApiRequestError ? error : null;
        if (failure && !failure.retryable) {
          await setState(row.commandId, {
            state: 'failed',
            lastErrorCode: failure.apiError?.code ?? `HTTP_${failure.status ?? 0}`,
          });
          continue;
        }
        // Erro de rede, 408, 429 ou 5xx: volta para a fila e interrompe a rodada para não reordenar.
        const delay = Math.max(backoffDelayMs(row.attempts, random), failure?.retryAfterMs ?? 0);
        await setState(row.commandId, {
          state: 'queued-locally',
          attempts: row.attempts + 1,
          nextAttemptAt: now() + delay,
          lastErrorCode: failure?.apiError?.code ?? (failure?.status ? `HTTP_${failure.status}` : 'NETWORK'),
        });
        break;
      }
    }
  }

  async function scheduleNext(userId: string) {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    const next = await db.getFirstAsync<{ at: number | null }>(
      "SELECT MIN(next_attempt_at) AS at FROM outbox WHERE user_id = ? AND state = 'queued-locally'",
      [userId],
    );
    if (next?.at == null) return;
    timerUserId = userId;
    timer = setTimer(() => {
      timer = null;
      void flush(timerUserId ?? userId);
    }, Math.max(0, next.at - now()));
  }

  async function drain(userId: string) {
    do {
      rerun = false;
      await runRound(userId);
    } while (rerun);
    await scheduleNext(userId);
  }

  /**
   * Só uma rodada roda por vez. Um pedido feito durante a rodada a repete ao terminar, para que
   * um comando gravado depois da seleção não espere o temporizador.
   */
  function flush(userId: string): Promise<void> {
    if (running) {
      rerun = true;
      return running;
    }
    running = drain(userId).finally(() => {
      running = null;
    });
    return running;
  }

  return {
    flush,

    async enqueue(input: {
      userId: string;
      route: string;
      resourceId?: string;
      command: CommandEnvelope<unknown>;
    }) {
      await init();
      const at = now();
      await db.runAsync(
        `INSERT INTO outbox (command_id, user_id, route, resource_id, body, state, attempts, next_attempt_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'queued-locally', 0, ?, ?, ?)`,
        [
          input.command.commandId,
          input.userId,
          input.route,
          input.resourceId ?? null,
          JSON.stringify(input.command),
          at,
          at,
          at,
        ],
      );
      notify(input.command.commandId, 'queued-locally');
      // O envio roda em segundo plano; a tela já recebe o estado `queued-locally`.
      void flush(input.userId).catch(() => undefined);
    },

    observe(commandId: string, listener: (state: OutboxState) => void) {
      const set = listeners.get(commandId) ?? new Set();
      set.add(listener);
      listeners.set(commandId, set);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(commandId);
      };
    },

    async get(commandId: string): Promise<OutboxRow | null> {
      await init();
      const raw = await db.getFirstAsync<RawRow>('SELECT * FROM outbox WHERE command_id = ?', [commandId]);
      return raw ? toRow(raw) : null;
    },

    async getByResourceId(userId: string, resourceId: string): Promise<OutboxRow | null> {
      await init();
      const raw = await db.getFirstAsync<RawRow>(
        'SELECT * FROM outbox WHERE user_id = ? AND resource_id = ? ORDER BY created_at DESC',
        [userId, resourceId],
      );
      return raw ? toRow(raw) : null;
    },

    async list(userId: string): Promise<OutboxRow[]> {
      await init();
      const rows = await db.getAllAsync<RawRow>('SELECT * FROM outbox WHERE user_id = ? ORDER BY created_at DESC', [userId]);
      return rows.map(toRow);
    },

    async countPending(userId: string): Promise<number> {
      await init();
      const row = await db.getFirstAsync<{ total: number }>(
        "SELECT COUNT(*) AS total FROM outbox WHERE user_id = ? AND state IN ('queued-locally', 'sending', 'failed')",
        [userId],
      );
      return row?.total ?? 0;
    },

    async discard(commandId: string) {
      await init();
      await db.runAsync('DELETE FROM outbox WHERE command_id = ?', [commandId]);
    },

    /** Logout com pendências: descarta tudo o que é do usuário (a UI exige confirmação antes). */
    async discardAll(userId: string) {
      await init();
      await db.runAsync('DELETE FROM outbox WHERE user_id = ?', [userId]);
    },

    /** Linhas `received` com mais de 7 dias (valor inicial a calibrar). */
    async purgeReceived() {
      await init();
      await db.runAsync("DELETE FROM outbox WHERE state = 'received' AND updated_at < ?", [now() - RECEIVED_RETENTION_MS]);
    },
  };
}

export type Outbox = ReturnType<typeof createOutbox>;
