import { InvalidCommand } from '../errors.ts';
import type { UnitOfWork } from '../ports/unit-of-work.port.ts';
import { acceptCommand } from './accept-command.ts';

import type { CommandEnvelope } from '@contracts/commands/command-envelope.ts';
import type { CompleteMockExamPayload } from '@contracts/commands/complete-mock-exam.command.ts';

type Deps = { uow: UnitOfWork; now: () => Date; newId: () => string };

export function makeCompleteMockExamHandler(deps: Deps) {
  return (userId: string, cmd: CommandEnvelope<CompleteMockExamPayload>) =>
    deps.uow.run((tx) => {
      const now = deps.now();
      const { mockExamId } = cmd.payload;
      return acceptCommand(tx, userId, cmd, 'CompleteMockExam', now, async () => {
        const created = await tx.mockExams.insert({ id: mockExamId, userId, commandId: cmd.commandId, payload: cmd.payload });
        if (!created) throw new InvalidCommand('mockExamId já usado por outro comando');
        await tx.outbox.add({
          eventId: deps.newId(),
          type: 'MockExamCompleted',
          version: 1,
          occurredAt: now.toISOString(),
          aggregateId: mockExamId,
          aggregateVersion: 1,
          correlationId: cmd.commandId,
          causationId: cmd.commandId,
          payload: { mockExamId, userId },
        });
      });
    });
}
