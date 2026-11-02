import { and, desc, eq, lt, sql } from 'drizzle-orm';

import type { ReadModelWriter, ReadStore } from '../../application/ports/read-models.port.ts';
import type { Executor } from './database.ts';
import { essayView, mockExamView, performanceSummary } from './schema.ts';

// Linha por agregado: só aplica um evento com aggregateVersion maior que o já projetado, o que
// torna a projeção idempotente e tolerante a reentrega fora de ordem (§11.1 do guia).
export function readModelWriter(db: Executor): ReadModelWriter {
  return {
    async upsertEssayView(row) {
      const applied = await db
        .insert(essayView)
        .values({ ...row, asOf: sql`now()` })
        .onConflictDoUpdate({
          target: essayView.essayId,
          set: {
            status: sql`excluded.status`,
            result: sql`excluded.result`,
            failureCode: sql`excluded.failure_code`,
            aggregateVersion: sql`excluded.aggregate_version`,
            asOf: sql`now()`,
          },
          setWhere: sql`${essayView.aggregateVersion} < excluded.aggregate_version`,
        })
        .returning({ essayId: essayView.essayId });
      return applied.length > 0;
    },

    async upsertMockExamView(row) {
      const applied = await db
        .insert(mockExamView)
        .values({ ...row, asOf: sql`now()` })
        .onConflictDoUpdate({
          target: mockExamView.mockExamId,
          set: {
            status: sql`excluded.status`,
            result: sql`excluded.result`,
            aggregateVersion: sql`excluded.aggregate_version`,
            asOf: sql`now()`,
          },
          setWhere: sql`${mockExamView.aggregateVersion} < excluded.aggregate_version`,
        })
        .returning({ mockExamId: mockExamView.mockExamId });
      return applied.length > 0;
    },
  };
}

export function readStore(db: Executor): ReadStore {
  return {
    async essay(userId, essayId) {
      const [row] = await db
        .select()
        .from(essayView)
        .where(and(eq(essayView.essayId, essayId), eq(essayView.userId, userId)));
      return row ?? null;
    },

    async performanceSummary(userId) {
      const [row] = await db
        .select({ data: performanceSummary.data, asOf: performanceSummary.asOf })
        .from(performanceSummary)
        .where(eq(performanceSummary.userId, userId));
      return row ?? null;
    },

    async mockExams(userId, page) {
      const filter = page.before
        ? and(eq(mockExamView.userId, userId), lt(mockExamView.createdAt, page.before))
        : eq(mockExamView.userId, userId);
      return db.select().from(mockExamView).where(filter).orderBy(desc(mockExamView.createdAt)).limit(page.limit);
    },

    async mockExam(userId, mockExamId) {
      const [row] = await db
        .select()
        .from(mockExamView)
        .where(and(eq(mockExamView.mockExamId, mockExamId), eq(mockExamView.userId, userId)));
      return row ?? null;
    },
  };
}
