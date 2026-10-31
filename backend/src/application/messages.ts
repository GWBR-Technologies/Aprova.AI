import type { EssayCorrected, EssayCorrectionFailed, EssaySubmitted } from '@contracts/events/essay.event.ts';
import type { EventEnvelope } from '@contracts/events/event-envelope.ts';
import type { MockExamCompleted, MockExamProcessed } from '@contracts/events/mock-exam.event.ts';
import type { QuestionAnswered } from '@contracts/events/question.event.ts';
import type { RoutineProgressRecorded } from '@contracts/events/routine.event.ts';

/** Eventos do catálogo do §5 da arquitetura. */
export type DomainEvent =
  | QuestionAnswered
  | RoutineProgressRecorded
  | EssaySubmitted
  | EssayCorrected
  | EssayCorrectionFailed
  | MockExamCompleted
  | MockExamProcessed;

/** Mensagem técnica do backend: o relay a roteia para a fila dead-letter (§9.5 do guia). */
export type MessageDeadLettered = EventEnvelope<
  'MessageDeadLettered',
  { queue: string; jobId: string; attempts: number; error: string; original: DomainEvent }
>;

export type OutboxMessage = DomainEvent | MessageDeadLettered;
export type MessageType = OutboxMessage['type'];
