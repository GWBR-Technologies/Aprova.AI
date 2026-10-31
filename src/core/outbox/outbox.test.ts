import { DatabaseSync } from 'node:sqlite';

import type { CommandAccepted, CommandEnvelope } from '@contracts/commands/command-envelope';

import { backoffDelayMs, createOutbox, OUTBOX_SCHEMA, type OutboxDb, type OutboxState } from './outbox';
import { ApiRequestError } from '../api/errors';

function sqliteDb(): OutboxDb & { raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  return {
    raw,
    execAsync: async (sql) => {
      raw.exec(sql);
    },
    runAsync: async (sql, params) => ({ changes: Number(raw.prepare(sql).run(...params).changes) }),
    getAllAsync: async <T,>(sql: string, params: (string | number | null)[]) =>
      raw.prepare(sql).all(...params) as T[],
    getFirstAsync: async <T,>(sql: string, params: (string | number | null)[]) =>
      (raw.prepare(sql).get(...params) ?? null) as T | null,
  };
}

function envelope(commandId: string, text = 'texto da redação'): CommandEnvelope<{ text: string }> {
  return { commandId, issuedAt: '2026-10-31T12:00:00.000Z', payload: { text } };
}

function accepted(commandId: string): CommandAccepted {
  return { commandId, status: 'accepted', receivedAt: '2026-10-31T12:00:01.000Z' };
}

function setup(sendImpl?: (route: string, command: CommandEnvelope<unknown>) => Promise<CommandAccepted>) {
  const db = sqliteDb();
  let clock = 1_000_000;
  const send = jest.fn(sendImpl ?? (async (_route: string, command: CommandEnvelope<unknown>) => accepted(command.commandId)));
  const setTimer = jest.fn(() => 'handle');
  const outbox = createOutbox({
    db,
    send,
    now: () => clock,
    random: () => 0,
    setTimer,
    clearTimer: jest.fn(),
  });
  return {
    db,
    send,
    setTimer,
    outbox,
    advance: (ms: number) => {
      clock += ms;
    },
    now: () => clock,
  };
}

function stateOf(db: OutboxDb & { raw: DatabaseSync }, commandId: string) {
  return db.raw.prepare('SELECT * FROM outbox WHERE command_id = ?').get(commandId) as
    | { state: OutboxState; body: string | null; attempts: number; next_attempt_at: number; last_error_code: string | null }
    | undefined;
}

describe('backoffDelayMs', () => {
  it('cresce exponencialmente a partir de 2 s e para em 5 min', () => {
    expect([0, 1, 2, 3].map((attempts) => backoffDelayMs(attempts, () => 0))).toEqual([2000, 4000, 8000, 16000]);
    expect(backoffDelayMs(20, () => 0)).toBe(300_000);
  });

  it('soma até 20% de sorteio', () => {
    expect(backoffDelayMs(0, () => 1)).toBe(2400);
    expect(backoffDelayMs(20, () => 1)).toBe(360_000);
  });
});

describe('createOutbox', () => {
  it('grava antes de enviar e mantém o corpo enquanto o envio está em andamento', async () => {
    let release: (value: CommandAccepted) => void = () => undefined;
    const { outbox, db, send } = setup(() => new Promise<CommandAccepted>((resolve) => (release = resolve)));

    await outbox.enqueue({ userId: 'u1', route: 'submit-essay', command: envelope('c1') });
    await new Promise((resolve) => setImmediate(resolve));

    expect(send).toHaveBeenCalledTimes(1);
    expect(stateOf(db, 'c1')).toMatchObject({ state: 'sending' });
    expect(JSON.parse(stateOf(db, 'c1')?.body ?? '{}').payload.text).toBe('texto da redação');

    release(accepted('c1'));
    await outbox.flush('u1');
    expect(stateOf(db, 'c1')).toMatchObject({ state: 'received', body: null });
  });

  it('apaga o corpo depois do 202 e envia o envelope original', async () => {
    const { outbox, db, send } = setup();
    await outbox.enqueue({ userId: 'u1', route: 'submit-essay', command: envelope('c1') });
    await outbox.flush('u1');

    expect(send).toHaveBeenCalledWith('submit-essay', envelope('c1'));
    expect(stateOf(db, 'c1')).toMatchObject({ state: 'received', body: null });
  });

  it('recupera linhas em sending após uma queda e reenvia com o mesmo commandId', async () => {
    const db = sqliteDb();
    db.raw.exec(OUTBOX_SCHEMA);
    db.raw
      .prepare(
        "INSERT INTO outbox VALUES ('c1', 'u1', 'submit-essay', NULL, ?, 'sending', 0, 0, NULL, 1, 1)",
      )
      .run(JSON.stringify(envelope('c1')));
    const send = jest.fn(async (_route: string, command: CommandEnvelope<unknown>) => accepted(command.commandId));
    const outbox = createOutbox({ db, send, now: () => 5_000, setTimer: jest.fn(), clearTimer: jest.fn() });

    await outbox.flush('u1');

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1].commandId).toBe('c1');
    expect(stateOf(db, 'c1')?.state).toBe('received');
  });

  it('envia em ordem e interrompe a rodada em erro de rede, com atraso crescente', async () => {
    const calls: string[] = [];
    const { outbox, db, advance, now, setTimer } = setup(async (_route, command) => {
      calls.push(command.commandId);
      throw new ApiRequestError({ kind: 'network' });
    });
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c1') });
    advance(1);
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c2') });
    await outbox.flush('u1');

    expect(calls).toEqual(['c1']);
    expect(stateOf(db, 'c1')).toMatchObject({ state: 'queued-locally', attempts: 1, last_error_code: 'NETWORK' });
    expect(stateOf(db, 'c1')?.next_attempt_at).toBe(now() + 2000);
    expect(stateOf(db, 'c2')).toMatchObject({ state: 'queued-locally', attempts: 0 });
    expect(setTimer).toHaveBeenLastCalledWith(expect.any(Function), expect.any(Number));
  });

  it('respeita a ordem de criação e só envia o que já venceu', async () => {
    const calls: string[] = [];
    const { outbox, advance } = setup(async (_route, command) => {
      calls.push(command.commandId);
      return accepted(command.commandId);
    });
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c1') });
    advance(10);
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c2') });
    await outbox.flush('u1');
    expect(calls).toEqual(['c1', 'c2']);
  });

  it('marca só o comando rejeitado como failed, mantém o corpo e segue para o próximo', async () => {
    const { outbox, db, send } = setup(async (_route, command) => {
      if (command.commandId === 'c1') {
        throw new ApiRequestError({
          kind: 'http',
          status: 403,
          apiError: { code: 'PREMIUM_REQUIRED', message: 'Premium', correlationId: 'c1' },
        });
      }
      return accepted(command.commandId);
    });
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c1') });
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c2') });
    await outbox.flush('u1');

    expect(send).toHaveBeenCalledTimes(2);
    expect(stateOf(db, 'c1')).toMatchObject({ state: 'failed', last_error_code: 'PREMIUM_REQUIRED' });
    expect(stateOf(db, 'c1')?.body).not.toBeNull();
    expect(stateOf(db, 'c2')?.state).toBe('received');
  });

  it('usa o maior entre o atraso crescente e o Retry-After do 429', async () => {
    const { outbox, db, now } = setup(async () => {
      throw new ApiRequestError({ kind: 'http', status: 429, retryAfterMs: 30_000 });
    });
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c1') });
    await outbox.flush('u1');
    expect(stateOf(db, 'c1')?.next_attempt_at).toBe(now() + 30_000);
    expect(stateOf(db, 'c1')?.last_error_code).toBe('HTTP_429');
  });

  it('não reenvia antes do horário e reenvia quando ele chega', async () => {
    let fail = true;
    const { outbox, db, send, advance } = setup(async (_route, command) => {
      if (fail) throw new ApiRequestError({ kind: 'http', status: 503 });
      return accepted(command.commandId);
    });
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c1') });
    await outbox.flush('u1');
    expect(send).toHaveBeenCalledTimes(1);

    fail = false;
    await outbox.flush('u1');
    expect(send).toHaveBeenCalledTimes(1);

    advance(2000);
    await outbox.flush('u1');
    expect(send).toHaveBeenCalledTimes(2);
    expect(stateOf(db, 'c1')?.state).toBe('received');
  });

  it('só envia comandos do usuário atual', async () => {
    const { outbox, db, send } = setup();
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c1') });
    await outbox.flush('u1');
    send.mockClear();
    db.raw
      .prepare("INSERT INTO outbox VALUES ('c2', 'u2', 'r', NULL, ?, 'queued-locally', 0, 0, NULL, 1, 1)")
      .run(JSON.stringify(envelope('c2')));

    await outbox.flush('u1');
    expect(send).not.toHaveBeenCalled();
    expect(stateOf(db, 'c2')?.state).toBe('queued-locally');
  });

  it('guarda o identificador do recurso e o mantém depois que o corpo é apagado', async () => {
    const { outbox } = setup();
    await outbox.enqueue({ userId: 'u1', route: 'submit-essay', resourceId: 'essay-1', command: envelope('c1') });
    await outbox.flush('u1');

    const row = await outbox.getByResourceId('u1', 'essay-1');
    expect(row).toMatchObject({ commandId: 'c1', resourceId: 'essay-1', state: 'received', body: null });
    expect(await outbox.getByResourceId('u2', 'essay-1')).toBeNull();
  });

  it('executa uma rodada por vez', async () => {
    let release: (value: CommandAccepted) => void = () => undefined;
    const { outbox, send } = setup(() => new Promise<CommandAccepted>((resolve) => (release = resolve)));
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c1') });
    await new Promise((resolve) => setImmediate(resolve));

    const second = outbox.flush('u1');
    release(accepted('c1'));
    await second;
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('notifica observadores a cada mudança de estado', async () => {
    const { outbox } = setup();
    const seen: OutboxState[] = [];
    outbox.observe('c1', (state) => seen.push(state));
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c1') });
    await outbox.flush('u1');
    expect(seen).toEqual(['queued-locally', 'sending', 'received']);
  });

  it('descarta, conta pendências e limpa linhas received antigas', async () => {
    const { outbox, db, advance } = setup(async () => {
      throw new ApiRequestError({ kind: 'http', status: 400 });
    });
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c1') });
    await outbox.flush('u1');
    expect(await outbox.countPending('u1')).toBe(1);

    await outbox.discard('c1');
    expect(stateOf(db, 'c1')).toBeUndefined();
    expect(await outbox.countPending('u1')).toBe(0);

    db.raw.prepare("INSERT INTO outbox VALUES ('c9', 'u1', 'r', NULL, NULL, 'received', 0, 0, NULL, 1, ?)").run(1_000_000);
    advance(8 * 24 * 60 * 60_000);
    await outbox.purgeReceived();
    expect(stateOf(db, 'c9')).toBeUndefined();
  });

  it('descarta todos os pendentes do usuário no logout confirmado', async () => {
    const { outbox, db } = setup(async () => {
      throw new ApiRequestError({ kind: 'network' });
    });
    await outbox.enqueue({ userId: 'u1', route: 'r', command: envelope('c1') });
    await outbox.enqueue({ userId: 'u2', route: 'r', command: envelope('c2') });
    await outbox.discardAll('u1');
    expect(stateOf(db, 'c1')).toBeUndefined();
    expect(stateOf(db, 'c2')).toBeDefined();
  });
});
