import type { EventEnvelope } from './event-envelope.ts';

type MockExamRef = { mockExamId: string; userId: string };

export type MockExamCompleted = EventEnvelope<'MockExamCompleted', MockExamRef>;
export type MockExamProcessed = EventEnvelope<'MockExamProcessed', MockExamRef>;
