import { projectEssayView } from '../../application/events/essay-view.projector.ts';
import { projectMockExamView } from '../../application/events/mock-exam-view.projector.ts';
import type { Logger } from '../../application/ports/logger.port.ts';
import type { MessageHandler } from '../../application/ports/queue.port.ts';
import type { UnitOfWork } from '../../application/ports/unit-of-work.port.ts';

type Deps = { uow: UnitOfWork; logger: Logger };

export function makeProjectionsProcessor(deps: Deps): MessageHandler {
  return async ({ message }) => {
    switch (message.type) {
      case 'EssaySubmitted':
      case 'EssayCorrected':
      case 'EssayCorrectionFailed':
        await deps.uow.run((tx) => projectEssayView(tx, message.aggregateId));
        return;
      case 'MockExamCompleted':
      case 'MockExamProcessed':
        await deps.uow.run((tx) => projectMockExamView(tx, message.aggregateId));
        return;
      default:
        // O projetor de desempenho depende dos campos definidos com o produto. Os fatos continuam
        // em write.question_answers e write.routine_progress e serão reaplicados quando ele existir.
        deps.logger.debug({ type: message.type, eventId: message.eventId }, 'Evento sem projetor implementado');
    }
  };
}
