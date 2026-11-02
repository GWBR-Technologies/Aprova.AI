import { Redis } from 'ioredis';

import type { Logger } from '../../application/ports/logger.port.ts';

// Exigências do "Going to production" do BullMQ (§9.1 do guia). O ioredis reconecta sozinho; o
// listener de erro evita o aviso de evento não tratado e deixa a queda registrada no log.
const withErrorLog = (redis: Redis, logger: Logger) =>
  redis.on('error', (err) => logger.warn({ err: err.message }, 'Falha na conexão com o Redis'));

/** Produtor (API e relay): falha rápido se o Redis cair, em vez de acumular comandos na memória. */
export const createProducerConnection = (url: string, logger: Logger) =>
  withErrorLog(new Redis(url, { enableOfflineQueue: false }), logger);

/** Worker: o BullMQ exige maxRetriesPerRequest nulo. */
export const createWorkerConnection = (url: string, logger: Logger) =>
  withErrorLog(new Redis(url, { maxRetriesPerRequest: null }), logger);
