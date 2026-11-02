import { and, eq, gte, sql } from 'drizzle-orm';

import type {
  AiUsageRepository,
  EssayQuotaRepository,
  EssayRecord,
  EssayRepository,
} from '../../application/ports/essay-store.port.ts';
import type { Executor } from './database.ts';
import { aiUsage, essayQuota, essays } from './schema.ts';

const essayColumns = {
  id: essays.id,
  userId: essays.userId,
  text: essays.text,
  status: essays.status,
  quotaPeriod: essays.quotaPeriod,
  version: essays.version,
  result: essays.result,
  failureCode: essays.failureCode,
  createdAt: essays.createdAt,
};

export function essayRepository(db: Executor): EssayRepository {
  const finish = async (id: string, changes: Partial<typeof essays.$inferInsert>, at: Date): Promise<EssayRecord | null> => {
    const [row] = await db
      .update(essays)
      .set({ ...changes, version: sql`${essays.version} + 1`, updatedAt: at })
      .where(and(eq(essays.id, id), eq(essays.status, 'processing')))
      .returning(essayColumns);
    return row ?? null;
  };

  return {
    async insert(essay) {
      const rows = await db
        .insert(essays)
        .values({ ...essay, status: 'processing', version: 1 })
        .onConflictDoNothing({ target: essays.id })
        .returning({ id: essays.id });
      return rows.length > 0;
    },

    async find(id) {
      const [row] = await db.select(essayColumns).from(essays).where(eq(essays.id, id));
      return row ?? null;
    },

    complete: (id, outcome, at) => finish(id, { status: 'completed', ...outcome }, at),

    fail: (id, failureCode, at) => finish(id, { status: 'failed', failureCode }, at),
  };
}

export function essayQuotaRepository(db: Executor): EssayQuotaRepository {
  return {
    async reserve(userId, period, limit) {
      // Atômico mesmo com envios simultâneos: o segundo espera o bloqueio da linha e reavalia
      // a condição sobre o valor confirmado (§7.2 do guia).
      const rows = await db
        .insert(essayQuota)
        .values({ userId, period, used: 1 })
        .onConflictDoUpdate({
          target: [essayQuota.userId, essayQuota.period],
          set: { used: sql`${essayQuota.used} + 1` },
          setWhere: sql`${essayQuota.used} < ${limit}`,
        })
        .returning({ used: essayQuota.used });
      return rows[0]?.used ?? null;
    },

    async release(userId, period) {
      await db
        .update(essayQuota)
        .set({ used: sql`${essayQuota.used} - 1` })
        .where(and(eq(essayQuota.userId, userId), eq(essayQuota.period, period), sql`${essayQuota.used} > 0`));
    },
  };
}

export function aiUsageRepository(db: Executor): AiUsageRepository {
  return {
    async record(usage) {
      await db.insert(aiUsage).values(usage);
    },

    async countForEssay(essayId) {
      const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(aiUsage).where(eq(aiUsage.essayId, essayId));
      return row?.count ?? 0;
    },

    async costSince(since) {
      const [row] = await db
        .select({ total: sql<string>`coalesce(sum(${aiUsage.costUsd}), 0)` })
        .from(aiUsage)
        .where(gte(aiUsage.createdAt, since));
      return Number(row?.total ?? 0);
    },
  };
}
