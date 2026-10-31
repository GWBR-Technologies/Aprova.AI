import type { EventEnvelope } from './event-envelope.ts';

// Os eventos levam só identificadores: o texto da redação e o resultado ficam no banco.
type EssayRef = { essayId: string; userId: string };

export type EssaySubmitted = EventEnvelope<'EssaySubmitted', EssayRef>;
export type EssayCorrected = EventEnvelope<'EssayCorrected', EssayRef>;
export type EssayCorrectionFailed = EventEnvelope<'EssayCorrectionFailed', EssayRef & { failureCode: string }>;
