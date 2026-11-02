import type { EventEnvelope } from './event-envelope.ts';

export type RoutineProgressRecorded = EventEnvelope<'RoutineProgressRecorded', { progressId: string; userId: string }>;
