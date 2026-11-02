import type { EventEnvelope } from './event-envelope.ts';

export type QuestionAnswered = EventEnvelope<'QuestionAnswered', { answerId: string; userId: string }>;
