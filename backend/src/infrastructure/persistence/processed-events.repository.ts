import { and, eq } from 'drizzle-orm';

import type { ProcessedEventsRepository } from '../../application/ports/processed-events.port.ts';
import type { Executor } from './database.ts';
import { processedEvents } from './schema.ts';

export function processedEventsRepository(db: Executor): ProcessedEventsRepository {
  return {
    async claim(consumer, eventId) {
      const rows = await db
        .insert(processedEvents)
        .values({ consumer, eventId })
        .onConflictDoNothing()
        .returning({ eventId: processedEvents.eventId });
      return rows.length > 0;
    },

    async has(consumer, eventId) {
      const rows = await db
        .select({ eventId: processedEvents.eventId })
        .from(processedEvents)
        .where(and(eq(processedEvents.consumer, consumer), eq(processedEvents.eventId, eventId)));
      return rows.length > 0;
    },
  };
}
