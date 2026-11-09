import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { makeLoginHandler } from '../../src/application/auth/login.handler.ts';
import { makeRefreshHandler } from '../../src/application/auth/refresh.handler.ts';
import { makeCompleteMockExamHandler } from '../../src/application/commands/complete-mock-exam.handler.ts';
import { makeSubmitEssayHandler } from '../../src/application/commands/submit-essay.handler.ts';
import type { AiPort } from '../../src/application/ports/ai.port.ts';
import type { AccessTokenPort } from '../../src/application/ports/auth.port.ts';
import { makeGetEntitlementsHandler } from '../../src/application/queries/get-entitlements.handler.ts';
import { makeGetEssayHandler } from '../../src/application/queries/get-essay.handler.ts';
import { makeGetMockExamResultHandler } from '../../src/application/queries/get-mock-exam-result.handler.ts';
import { createDatabase, type Database } from '../../src/infrastructure/persistence/database.ts';
import { entitlementRepository } from '../../src/infrastructure/persistence/entitlement.repository.ts';
import { aiUsageRepository } from '../../src/infrastructure/persistence/essay.repository.ts';
import { outboxPendingStats } from '../../src/infrastructure/persistence/outbox.repository.ts';
import { readStore } from '../../src/infrastructure/persistence/read-models.repository.ts';
import { entitlements } from '../../src/infrastructure/persistence/schema.ts';
import { drizzleUnitOfWork } from '../../src/infrastructure/persistence/unit-of-work.ts';
import { bullmqQueue } from '../../src/infrastructure/queue/bullmq.queue.adapter.ts';
import { createProducerConnection, createWorkerConnection } from '../../src/infrastructure/queue/connections.ts';
import { makeEssayCorrectionProcessor } from '../../src/workers/essay-correction/essay-correction.worker.ts';
import { makeProjectionsProcessor } from '../../src/workers/projections/projections.worker.ts';
import { relayOnce } from '../../src/workers/relay/outbox-relay.ts';

// Roda a API, o relay e os Workers com logins restritos, como em produção: a API e o relay no grupo
// aprova_api e os Workers no grupo aprova_worker (migração 0001). Os outros testes de integração
// usam o dono do banco e não pegariam uma permissão faltando. Exige TEST_DATABASE_URL com um papel
// que possa criar papéis (o superusuário do contêiner descartável) e TEST_REDIS_URL.
const dbUrl = process.env.TEST_DATABASE_URL;
const redisUrl = process.env.TEST_REDIS_URL;
const logger = pino({ level: 'silent' });

type Group = 'aprova_api' | 'aprova_worker';

/** Cria (ou reaproveita) um login no grupo, como faz infra/scripts/create-db-logins.sh. */
async function loginInGroup(admin: Database, group: Group): Promise<Database> {
  // Nomes fixos e senha hexadecimal: nada vindo de fora entra no SQL montado.
  const login = `${group}_teste_login`;
  const password = randomBytes(16).toString('hex');
  await admin.execute(
    sql.raw(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${login}') THEN CREATE ROLE ${login} LOGIN; END IF; END $$`),
  );
  await admin.execute(sql.raw(`ALTER ROLE ${login} PASSWORD '${password}'`));
  await admin.execute(sql.raw(`GRANT ${group} TO ${login}`));
  const url = new URL(dbUrl ?? '');
  url.username = login;
  url.password = password;
  return createDatabase(url.toString(), 5);
}

describe.skipIf(!dbUrl || !redisUrl)('papéis de banco: API, relay e Workers com logins restritos', () => {
  let admin: Database;
  let apiDb: Database;
  let workerDb: Database;
  let queue: ReturnType<typeof bullmqQueue>;
  let producer: ReturnType<typeof createProducerConnection>;
  const now = () => new Date();

  beforeAll(async () => {
    admin = createDatabase(dbUrl ?? '', 2);
    await admin.execute(sql`DROP SCHEMA IF EXISTS "write" CASCADE`);
    await admin.execute(sql`DROP SCHEMA IF EXISTS "read" CASCADE`);
    await admin.execute(sql`DROP SCHEMA IF EXISTS "drizzle" CASCADE`);
    await migrate(admin, { migrationsFolder: fileURLToPath(new URL('../../migrations', import.meta.url)) });
    apiDb = await loginInGroup(admin, 'aprova_api');
    workerDb = await loginInGroup(admin, 'aprova_worker');

    producer = createProducerConnection(redisUrl ?? '', logger);
    await new Promise((resolve) => producer.once('ready', resolve));
    await producer.flushdb();
    queue = bullmqQueue({ producer, createWorkerConnection: () => createWorkerConnection(redisUrl ?? '', logger), logger });
  });

  afterAll(async () => {
    await queue?.port.close();
    await producer?.quit();
    await Promise.all([apiDb?.$client.end(), workerDb?.$client.end()]);
    await admin?.$client.end();
  });

  it('login, refresh, comandos, relay, Workers e consultas funcionam cada um com o seu papel', async () => {
    const apiUow = drizzleUnitOfWork(apiDb);
    const workerUow = drizzleUnitOfWork(workerDb);
    const accessTokens: AccessTokenPort = {
      issue: async (userId, at) => ({ token: `token-${userId}`, expiresAt: new Date(at.getTime() + 60_000) }),
      verify: async () => null,
    };

    // Autenticação (API): cria o usuário e gira o refresh token, com bloqueio de linha.
    const login = makeLoginHandler({
      uow: apiUow,
      identity: { verify: async () => `sub-${randomUUID()}` },
      accessTokens,
      now,
      newId: randomUUID,
      refreshTtlMs: 60_000,
    });
    const tokens = await login({ provider: 'google', idToken: 'qualquer' });
    const rotated = await makeRefreshHandler({ uow: apiUow, accessTokens, now, refreshTtlMs: 60_000 })({ refreshToken: tokens.refreshToken });
    expect(rotated.refreshToken).not.toBe(tokens.refreshToken);
    const userId = tokens.accessToken.replace('token-', '');

    // O plano vem de fora da API (fonte do Premium em aberto); aqui o dono do banco o grava.
    await admin.insert(entitlements).values({ userId, plan: 'PREMIUM' });

    // Comandos (API).
    const essayId = randomUUID();
    const mockExamId = randomUUID();
    const submitted = await makeSubmitEssayHandler({ uow: apiUow, now, newId: randomUUID, monthlyLimit: 4 })(userId, {
      commandId: randomUUID(),
      issuedAt: now().toISOString(),
      payload: { essayId, text: 'Texto de teste.' },
    });
    expect(submitted.accepted.status).toBe('accepted');
    await makeCompleteMockExamHandler({ uow: apiUow, now, newId: randomUUID })(userId, {
      commandId: randomUUID(),
      issuedAt: now().toISOString(),
      payload: { mockExamId },
    });

    // Workers (aprova_worker): correção com IA falsa e projeções.
    const fakeAi: AiPort = {
      correctEssay: async () => ({ raw: { resumo: 'ok' }, model: 'falso', usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 5 } }),
    };
    queue.port.consume('projections', makeProjectionsProcessor({ uow: workerUow, logger }), { concurrency: 2 });
    queue.port.consume(
      'essay-correction',
      makeEssayCorrectionProcessor({
        uow: workerUow,
        ai: fakeAi,
        logger,
        now,
        newId: randomUUID,
        promptVersion: 'teste-v1',
        parseResult: (raw) => (typeof raw === 'object' && raw !== null ? { ...raw } : null),
        prices: { inputPerM: 1, cachedInputPerM: 0.05, outputPerM: 5 },
        timeoutMs: 5_000,
        maxInvalidOutputAttempts: 2,
      }),
      { concurrency: 1 },
    );

    // Relay (aprova_api) e consultas (API) até a redação aparecer corrigida.
    const reads = readStore(apiDb);
    const getEssay = makeGetEssayHandler({ reads });
    const getMockExam = makeGetMockExamResultHandler({ reads });
    const deadline = Date.now() + 20_000;
    let essayStatus = 'missing';
    let mockExamFound = false;
    while (Date.now() < deadline && (essayStatus !== 'completed' || !mockExamFound)) {
      await relayOnce({ uow: apiUow, queue: queue.port, now });
      essayStatus = await getEssay(userId, essayId).then(
        (v) => v.status,
        () => 'missing',
      );
      mockExamFound = await getMockExam(userId, mockExamId).then(
        () => true,
        () => false,
      );
      await new Promise((r) => setTimeout(r, 200));
    }
    expect(essayStatus).toBe('completed');
    expect(mockExamFound).toBe(true);

    // Exceção do §14: GetEntitlements lê o write store com o papel da API.
    const view = await makeGetEntitlementsHandler({ entitlements: entitlementRepository(apiDb), now, monthlyLimit: 4 })(userId);
    expect(view.essayQuota?.used).toBe(1);

    // Manutenção do relay e métricas: reconciliador, limpeza do outbox, outbox pendente e custo da IA.
    await apiUow.run((tx) => tx.outbox.requeueStalled(new Date(0)));
    await apiUow.run((tx) => tx.outbox.deletePublishedBefore(new Date(0)));
    await expect(outboxPendingStats(apiDb, now())).resolves.toBeDefined();
    await expect(aiUsageRepository(workerDb).costSince(new Date(0))).resolves.toBeGreaterThan(0);
  }, 30_000);

  it('cada papel só tem o acesso de que precisa', async () => {
    // O Drizzle embrulha o erro do Postgres; 42501 é insufficient_privilege (inclui "must be owner").
    const denied = { cause: { code: '42501' } };
    // A API só lê o read store; quem grava as projeções são os Workers.
    await expect(apiDb.execute(sql`DELETE FROM "read"."essay_view"`)).rejects.toMatchObject(denied);
    // Os Workers não apagam no write store (a limpeza do outbox é do relay).
    await expect(workerDb.execute(sql`DELETE FROM "write"."outbox"`)).rejects.toMatchObject(denied);
    // Nenhum dos dois altera o esquema.
    await expect(apiDb.execute(sql`CREATE TABLE "write"."intrusa" (id int)`)).rejects.toMatchObject(denied);
    await expect(workerDb.execute(sql`DROP TABLE "write"."essays"`)).rejects.toMatchObject(denied);
  });
});
