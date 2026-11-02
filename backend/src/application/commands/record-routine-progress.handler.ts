import type { UnitOfWork } from '../ports/unit-of-work.port.ts';
import { acceptCommand } from './accept-command.ts';

import type { CommandEnvelope } from '@contracts/commands/command-envelope.ts';
import type { RecordRoutineProgressPayload } from '@contracts/commands/record-routine-progress.command.ts';

type Deps = { uow: UnitOfWork; now: () => Date; newId: () => string };

export function makeRecordRoutineProgressHandler(deps: Deps) {
  return (userId: string, cmd: CommandEnvelope<RecordRoutineProgressPayload>) =>
    deps.uow.run((tx) => {
      const now = deps.now();
      return acceptCommand(tx, userId, cmd, 'RecordRoutineProgress', now, async () => {
        // Mesmas decisões do AnswerQuestion: id igual ao commandId e horário do aparelho (issuedAt).
        await tx.routineProgress.insert({
          id: cmd.commandId,
          userId,
          commandId: cmd.commandId,
          payload: cmd.payload,
          recordedAt: new Date(cmd.issuedAt),
        });
        await tx.outbox.add({
          eventId: deps.newId(),
          type: 'RoutineProgressRecorded',
          version: 1,
          occurredAt: now.toISOString(),
          aggregateId: cmd.commandId,
          aggregateVersion: 1,
          correlationId: cmd.commandId,
          causationId: cmd.commandId,
          payload: { progressId: cmd.commandId, userId },
        });
      });
    });
}
