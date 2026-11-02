import type { MessageType } from '../../application/messages.ts';
import type { QueueName } from '../../application/ports/queue.port.ts';

// Contrato de roteamento do §8.1 do guia; muda só junto do §5 e do §6 da arquitetura.
// A fila `notifications` entra aqui quando a proposta P4 for aprovada.
export const ROUTES: Record<MessageType, QueueName[]> = {
  QuestionAnswered: ['projections'],
  RoutineProgressRecorded: ['projections'],
  EssaySubmitted: ['essay-correction', 'projections'],
  EssayCorrected: ['projections'],
  EssayCorrectionFailed: ['projections'],
  MockExamCompleted: ['mock-exam-processing', 'projections'],
  MockExamProcessed: ['projections'],
  MessageDeadLettered: ['dead-letter'],
};
