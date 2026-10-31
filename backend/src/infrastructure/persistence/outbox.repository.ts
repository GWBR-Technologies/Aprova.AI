import { and, asc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';

import type { OutboxRepository } from '../../application/ports/outbox.port.ts';
import type { Executor } from './database.ts';
import { essays, mockExams, outbox } from './schema.ts';

export function outboxRepository(db: Executor): OutboxRepository {
  return {
    async add(message) {
      await db.insert(outbox).values({
        eventId: message.eventId,
        eventType: message.type,
        aggregateId: message.aggregateId,
        correlationId: message.correlationId,
        envelope: message,
      });
    },

    async claimPending(limit) {
      const rows = await db
        .select({ id: outbox.id, envelope: outbox.envelope })
        .from(outbox)
        .where(isNull(outbox.publishedAt))
        .orderBy(asc(outbox.id))
        .limit(limit)
        .for('update', { skipLocked: true });
      return rows.map((r) => ({ id: r.id, message: r.envelope }));
    },

    async markPublished(ids, at) {
      if (ids.length === 0) return;
      await db.update(outbox).set({ publishedAt: at }).where(inArray(outbox.id, ids));
    },

    async recordFailure(ids, error) {
      if (ids.length === 0) return;
      await db
        .update(outbox)
        .set({ attempts: sql`${outbox.attempts} + 1`, lastError: error })
        .where(inArray(outbox.id, ids));
    },

    async requeueStalled(publishedBefore) {
      // Um job perdido com o Redis deixa o agregado em 'processing' para sempre; republicar é
      // seguro porque o jobId é determinístico e os consumidores são idempotentes (§8.4 do guia).
      const essayRows = await db
        .update(outbox)
        .set({ publishedAt: null })
        .from(essays)
        .where(
          and(
            eq(outbox.eventType, 'EssaySubmitted'),
            eq(outbox.aggregateId, essays.id),
            eq(essays.status, 'processing'),
            lt(outbox.publishedAt, publishedBefore),
          ),
        )
        .returning({ id: outbox.id });
      const mockExamRows = await db
        .update(outbox)
        .set({ publishedAt: null })
        .from(mockExams)
        .where(
          and(
            eq(outbox.eventType, 'MockExamCompleted'),
            eq(outbox.aggregateId, mockExams.id),
            eq(mockExams.status, 'processing'),
            lt(outbox.publishedAt, publishedBefore),
          ),
        )
        .returning({ id: outbox.id });
      return essayRows.length + mockExamRows.length;
    },

    async deletePublishedBefore(before) {
      const rows = await db.delete(outbox).where(lt(outbox.publishedAt, before)).returning({ id: outbox.id });
      return rows.length;
    },
  };
}
