import { Redis } from 'ioredis';

// Exigências do "Going to production" do BullMQ (§9.1 do guia).

/** Produtor (API e relay): falha rápido se o Redis cair, em vez de acumular comandos na memória. */
export const createProducerConnection = (url: string) => new Redis(url, { enableOfflineQueue: false });

/** Worker: o BullMQ exige maxRetriesPerRequest nulo. */
export const createWorkerConnection = (url: string) => new Redis(url, { maxRetriesPerRequest: null });
