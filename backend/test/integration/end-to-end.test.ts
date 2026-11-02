import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { Queue } from 'bullmq';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { makeSubmitEssayHandler } from '../../src/application/commands/submit-essay.handler.ts';
import type { AiPort } from '../../src/application/ports/ai.port.ts';
import { makeGetEssayHandler } from '../../src/application/queries/get-essay.handler.ts';
import { createDatabase, type Database } from '../../src/infrastructure/persistence/database.ts';
import { readStore } from '../../src/infrastructure/persistence/read-models.repository.ts';
import { entitlements } from '../../src/infrastructure/persistence/schema.ts';
import { drizzleUnitOfWork } from '../../src/infrastructure/persistence/unit-of-work.ts';
import { bullmqQueue } from '../../src/infrastructure/queue/bullmq.queue.adapter.ts';
import { createProducerConnection, createWorkerConnection } from '../../src/infrastructure/queue/connections.ts';
import { makeEssayCorrectionProcessor } from '../../src/workers/essay-correction/essay-correction.worker.ts';
import { makeProjectionsProcessor } from '../../src/workers/projections/projections.worker.ts';
import { relayOnce } from '../../src/workers/relay/outbox-relay.ts';

// Fluxo do §8.1 da arquitetura com Postgres e Redis reais e IA falsa. Usa TEST_DATABASE_URL e
// TEST_REDIS_URL, recria os esquemas e esvazia o Redis: use só instâncias descartáveis.
const dbUrl = process.env.TEST_DATABASE_URL;
const redisUrl = process.env.TEST_REDIS_URL;
const logger = pino({ level: 'silent' });

describe.skipIf(!dbUrl || !redisUrl)('ponta a ponta: envio e correção de redação', () => {
  let db: Database;
  let queue: ReturnType<typeof bullmqQueue>;
  let producer: ReturnType<typeof createProducerConnection>;

  beforeAll(async () => {
    db = createDatabase(dbUrl ?? '', 10);
    await db.execute(sql`DROP SCHEMA IF EXISTS "write" CASCADE`);
    await db.execute(sql`DROP SCHEMA IF EXISTS "read" CASCADE`);
    await db.execute(sql`DROP SCHEMA IF EXISTS "drizzle" CASCADE`);
    await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../migrations', import.meta.url)) });
    producer = createProducerConnection(redisUrl ?? '', logger);
    await producer.flushdb();
    queue = bullmqQueue({ producer, createWorkerConnection: () => createWorkerConnection(redisUrl ?? '', logger), logger });
  });

  afterAll(async () => {
    await queue?.port.close();
    await producer?.quit();
    await db?.$client.end();
  });

  it('Premium envia, recebe 202, o Worker corrige e GetEssay devolve completed', async () => {
    const uow = drizzleUnitOfWork(db);
    const userId = await uow.run((tx) => tx.users.findOrCreate('apple', randomUUID()));
    await db.insert(entitlements).values({ userId, plan: 'PREMIUM' });
    const essayId = randomUUID();

    const { accepted } = await makeSubmitEssayHandler({ uow, now: () => new Date(), newId: randomUUID, monthlyLimit: 4 })(userId, {
      commandId: randomUUID(),
      issuedAt: new Date().toISOString(),
      payload: { essayId, text: 'Texto de teste.' },
    });
    expect(accepted.status).toBe('accepted');

    const fakeAi: AiPort = {
      correctEssay: async () => ({ raw: { resumo: 'ok' }, model: 'falso', usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 5 } }),
    };
    queue.port.consume('projections', makeProjectionsProcessor({ uow, logger }), { concurrency: 2 });
    queue.port.consume(
      'essay-correction',
      makeEssayCorrectionProcessor({
        uow,
        ai: fakeAi,
        logger,
        now: () => new Date(),
        newId: randomUUID,
        promptVersion: 'teste-v1',
        parseResult: (raw) => (typeof raw === 'object' && raw !== null ? { ...raw } : null),
        prices: { inputPerM: 1, cachedInputPerM: 0.05, outputPerM: 5 },
        timeoutMs: 5_000,
        maxInvalidOutputAttempts: 2,
      }),
      { concurrency: 1 },
    );

    const getEssay = makeGetEssayHandler({ reads: readStore(db) });
    const deadline = Date.now() + 20_000;
    let status = 'missing';
    while (Date.now() < deadline && status !== 'completed') {
      await relayOnce({ uow, queue: queue.port, now: () => new Date() });
      status = await getEssay(userId, essayId).then(
        (v) => v.status,
        () => 'missing',
      );
      await new Promise((r) => setTimeout(r, 200));
    }

    expect(status).toBe('completed');
    await expect(getEssay(userId, essayId)).resolves.toMatchObject({ result: { resumo: 'ok' }, failure: null });
  }, 30_000);

  it('publicação duplicada com o mesmo jobId é ignorada pelo BullMQ', async () => {
    const message = {
      eventId: randomUUID(),
      type: 'QuestionAnswered' as const,
      version: 1,
      occurredAt: new Date().toISOString(),
      aggregateId: randomUUID(),
      aggregateVersion: 1,
      correlationId: randomUUID(),
      causationId: randomUUID(),
      payload: { answerId: randomUUID(), userId: randomUUID() },
    };
    const jobId = `QuestionAnswered_${message.aggregateId}_${message.correlationId}`;
    await queue.port.publish('dead-letter', message, { jobId });
    await queue.port.publish('dead-letter', message, { jobId });

    const deadLetter = new Queue('dead-letter', { connection: producer });
    await expect(deadLetter.getWaitingCount()).resolves.toBe(1);
    await deadLetter.close();
  });
});
