import type { UnitOfWork } from '../ports/unit-of-work.port.ts';
import { acceptCommand } from './accept-command.ts';

import type { AnswerQuestionPayload } from '@contracts/commands/answer-question.command.ts';
import type { CommandEnvelope } from '@contracts/commands/command-envelope.ts';

type Deps = { uow: UnitOfWork; now: () => Date; newId: () => string };

export function makeAnswerQuestionHandler(deps: Deps) {
  return (userId: string, cmd: CommandEnvelope<AnswerQuestionPayload>) =>
    deps.uow.run((tx) => {
      const now = deps.now();
      return acceptCommand(tx, userId, cmd, 'AnswerQuestion', now, async () => {
        // Um comando registra uma resposta, então o commandId serve de identificador dela.
        // answeredAt vem do issuedAt: o aluno pode ter respondido offline, antes do envio.
        await tx.questionAnswers.insert({
          id: cmd.commandId,
          userId,
          commandId: cmd.commandId,
          payload: cmd.payload,
          answeredAt: new Date(cmd.issuedAt),
        });
        await tx.outbox.add({
          eventId: deps.newId(),
          type: 'QuestionAnswered',
          version: 1,
          occurredAt: now.toISOString(),
          aggregateId: cmd.commandId,
          aggregateVersion: 1,
          correlationId: cmd.commandId,
          causationId: cmd.commandId,
          payload: { answerId: cmd.commandId, userId },
        });
      });
    });
}
