import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { makeSubmitEssayHandler } from '../../src/application/commands/submit-essay.handler.ts';
import { makeAnswerQuestionHandler } from '../../src/application/commands/answer-question.handler.ts';
import { CommandIdConflict, EssayQuotaExceeded } from '../../src/application/errors.ts';
import { createDatabase, type Database } from '../../src/infrastructure/persistence/database.ts';
import { drizzleUnitOfWork } from '../../src/infrastructure/persistence/unit-of-work.ts';
import { entitlements, essayQuota, outbox } from '../../src/infrastructure/persistence/schema.ts';

// Testes de integração com um Postgres real e descartável. Usam TEST_DATABASE_URL (nunca
// DATABASE_URL) e recriam os esquemas a cada execução: não aponte para um banco com dados.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('integração com PostgreSQL', () => {
  let db: Database;

  beforeAll(async () => {
    db = createDatabase(url ?? '', 10);
    await db.execute(sql`DROP SCHEMA IF EXISTS "write" CASCADE`);
    await db.execute(sql`DROP SCHEMA IF EXISTS "read" CASCADE`);
    await db.execute(sql`DROP SCHEMA IF EXISTS "drizzle" CASCADE`);
    await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../migrations', import.meta.url)) });
  });

  afterAll(async () => {
    await db?.$client.end();
  });

  let userId: string;
  beforeEach(async () => {
    userId = await drizzleUnitOfWork(db).run((tx) => tx.users.findOrCreate('google', randomUUID()));
  });

  const now = new Date('2026-10-31T12:00:00Z');
  const submitHandler = () => makeSubmitEssayHandler({ uow: drizzleUnitOfWork(db), now: () => now, newId: randomUUID, monthlyLimit: 4 });
  const essayCommand = () => ({
    commandId: randomUUID(),
    issuedAt: now.toISOString(),
    payload: { essayId: randomUUID(), text: 'Texto de teste.' },
  });
  const premium = () => db.insert(entitlements).values({ userId, plan: 'PREMIUM' });

  it('aplica as migrações com os esquemas write e read', async () => {
    const result = await db.execute(sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('write', 'read')`);
    expect(result.rows).toHaveLength(2);
  });

  it('duas submissões simultâneas com 3 usos: só uma passa', async () => {
    await premium();
    await db.insert(essayQuota).values({ userId, period: '2026-10', used: 3 });
    const submit = submitHandler();

    const results = await Promise.allSettled([submit(userId, essayCommand()), submit(userId, essayCommand())]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(EssayQuotaExceeded);
    const [quota] = await db.select().from(essayQuota).where(sql`${essayQuota.userId} = ${userId}`);
    expect(quota?.used).toBe(4);
  });

  it('reenvio concorrente do mesmo commandId gera um único efeito e o mesmo 202', async () => {
    await premium();
    const submit = submitHandler();
    const cmd = essayCommand();

    const [a, b] = await Promise.all([submit(userId, cmd), submit(userId, cmd)]);

    expect(a.accepted).toEqual(b.accepted);
    expect([a.replayed, b.replayed].sort()).toEqual([false, true]);
    const events = await db.select().from(outbox).where(sql`${outbox.correlationId} = ${cmd.commandId}`);
    expect(events).toHaveLength(1);
    const [quota] = await db.select().from(essayQuota).where(sql`${essayQuota.userId} = ${userId}`);
    expect(quota?.used).toBe(1);
  });

  it('mesmo commandId com payload diferente responde conflito', async () => {
    const answer = makeAnswerQuestionHandler({ uow: drizzleUnitOfWork(db), now: () => now, newId: randomUUID });
    const commandId = randomUUID();
    await answer(userId, { commandId, issuedAt: now.toISOString(), payload: { a: 1 } });

    await expect(answer(userId, { commandId, issuedAt: now.toISOString(), payload: { a: 2 } })).rejects.toBeInstanceOf(CommandIdConflict);
  });

  it('a devolução da cota nunca deixa o contador negativo', async () => {
    const uow = drizzleUnitOfWork(db);
    await uow.run((tx) => tx.essayQuota.release(userId, '2026-10'));
    await uow.run(async (tx) => {
      await tx.essayQuota.reserve(userId, '2026-10', 4);
      await tx.essayQuota.release(userId, '2026-10');
      await tx.essayQuota.release(userId, '2026-10');
    });
    const [quota] = await db.select().from(essayQuota).where(sql`${essayQuota.userId} = ${userId}`);
    expect(quota?.used).toBe(0);
  });

  it('projeção ignora versão antiga e o reconciliador republica redação parada', async () => {
    await premium();
    const cmd = essayCommand();
    await submitHandler()(userId, cmd);
    const uow = drizzleUnitOfWork(db);

    await uow.run(async (tx) => {
      expect(await tx.readModels.upsertEssayView({ essayId: cmd.payload.essayId, userId, status: 'completed', result: null, failureCode: null, aggregateVersion: 2, createdAt: now })).toBe(true);
      expect(await tx.readModels.upsertEssayView({ essayId: cmd.payload.essayId, userId, status: 'processing', result: null, failureCode: null, aggregateVersion: 1, createdAt: now })).toBe(false);
    });

    await uow.run(async (tx) => {
      const rows = await tx.outbox.claimPending(100);
      await tx.outbox.markPublished(rows.map((r) => r.id), new Date('2026-10-31T12:00:00Z'));
    });
    const requeued = await uow.run((tx) => tx.outbox.requeueStalled(new Date('2026-10-31T12:20:00Z')));
    expect(requeued).toBeGreaterThanOrEqual(1);
  });
});
