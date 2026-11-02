import type { Logger } from '../../application/ports/logger.port.ts';
import type { QueuePort } from '../../application/ports/queue.port.ts';
import type { UnitOfWork } from '../../application/ports/unit-of-work.port.ts';
import { ROUTES } from './routes.ts';

type RelayDeps = { uow: UnitOfWork; queue: QueuePort; now: () => Date };

const BATCH_SIZE = 100;

/**
 * Publica um lote do outbox e o marca como publicado na mesma transação (§8.2 do guia). Se a
 * publicação falhar, a transação reverte e o lote volta a ser tentado; o que já tinha sido
 * publicado é absorvido pelo jobId determinístico e pela idempotência dos consumidores.
 */
export async function relayOnce(deps: RelayDeps): Promise<number> {
  let claimedIds: number[] = [];
  try {
    return await deps.uow.run(async (tx) => {
      const rows = await tx.outbox.claimPending(BATCH_SIZE);
      claimedIds = rows.map((r) => r.id);
      for (const { message } of rows) {
        for (const queue of ROUTES[message.type]) {
          await deps.queue.publish(queue, message, { jobId: `${message.type}_${message.aggregateId}_${message.correlationId}` });
        }
      }
      await tx.outbox.markPublished(claimedIds, deps.now());
      return rows.length;
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'erro desconhecido';
    await deps.uow.run((tx) => tx.outbox.recordFailure(claimedIds, error)).catch(() => undefined);
    throw err;
  }
}

// Valores iniciais a calibrar no teste de carga (§8.3 do guia).
const BUSY_INTERVAL_MS = 500;
const IDLE_INTERVAL_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;
const RECONCILE_EVERY_MS = 5 * 60_000;
const STALLED_AFTER_MS = 15 * 60_000;
const CLEANUP_EVERY_MS = 60 * 60_000;
const RETENTION_MS = 7 * 24 * 60 * 60_000;

/** Laço do processo relay: publica o outbox, reconcilia jobs perdidos e limpa linhas antigas. */
export function startRelay(deps: RelayDeps & { logger: Logger }) {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let failures = 0;
  let lastReconcile = 0;
  let lastCleanup = 0;
  let running: Promise<void> = Promise.resolve();

  const tick = async () => {
    let delay = IDLE_INTERVAL_MS;
    try {
      const nowMs = deps.now().getTime();
      if (nowMs - lastReconcile >= RECONCILE_EVERY_MS) {
        const requeued = await deps.uow.run((tx) => tx.outbox.requeueStalled(new Date(nowMs - STALLED_AFTER_MS)));
        if (requeued > 0) deps.logger.warn({ requeued }, 'Eventos republicados pelo reconciliador');
        lastReconcile = nowMs;
      }
      if (nowMs - lastCleanup >= CLEANUP_EVERY_MS) {
        const removed = await deps.uow.run((tx) => tx.outbox.deletePublishedBefore(new Date(nowMs - RETENTION_MS)));
        deps.logger.info({ removed }, 'Limpeza do outbox concluída');
        lastCleanup = nowMs;
      }
      const published = await relayOnce(deps);
      failures = 0;
      if (published > 0) delay = BUSY_INTERVAL_MS;
    } catch (err) {
      failures += 1;
      delay = Math.min(IDLE_INTERVAL_MS * 2 ** failures, MAX_BACKOFF_MS);
      deps.logger.error({ err, failures }, 'Falha ao publicar o outbox');
    }
    if (!stopped) timer = setTimeout(() => (running = tick()), delay);
  };

  running = tick();

  return {
    async stop() {
      stopped = true;
      clearTimeout(timer);
      await running;
    },
  };
}
