import { createLogger } from '../infrastructure/observability/logger.ts';
import { createMetrics, startMetricsServer } from '../infrastructure/observability/metrics.ts';
import { createDatabase } from '../infrastructure/persistence/database.ts';
import { outboxPendingStats } from '../infrastructure/persistence/outbox.repository.ts';
import { drizzleUnitOfWork } from '../infrastructure/persistence/unit-of-work.ts';
import { bullmqQueue } from '../infrastructure/queue/bullmq.queue.adapter.ts';
import { createProducerConnection, createWorkerConnection } from '../infrastructure/queue/connections.ts';
import { startRelay } from '../workers/relay/outbox-relay.ts';
import { intEnv, optionalEnv, requireEnv } from './env.ts';
import { onShutdown } from './shutdown.ts';

const logger = createLogger('relay', optionalEnv('LOG_LEVEL'));
const metrics = createMetrics('relay');
const redisUrl = requireEnv('REDIS_URL');
const db = createDatabase(requireEnv('DATABASE_URL'), 2);
const producer = createProducerConnection(redisUrl, logger);
const queue = bullmqQueue({ producer, createWorkerConnection: () => createWorkerConnection(redisUrl, logger), logger });
const now = () => new Date();

// Alerta principal do relay: idade da linha pendente mais antiga (Redis fora do ar ou relay parado).
metrics.outboxGauges(() => outboxPendingStats(db, now()));

const relay = startRelay({ uow: drizzleUnitOfWork(db), queue: queue.port, now, logger });
const metricsServer = startMetricsServer(intEnv('METRICS_PORT', 9100), () => metrics.registry.metrics(), metrics.registry.contentType);
logger.info({}, 'Relay do outbox iniciado');

onShutdown(logger, async () => {
  await relay.stop();
  metricsServer.close();
  await queue.port.close();
  await Promise.all([db.$client.end(), producer.quit()]);
});
