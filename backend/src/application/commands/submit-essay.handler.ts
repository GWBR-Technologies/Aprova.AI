import { quotaPeriod, startOfNextPeriod } from '../../domain/essay/quota-period.ts';
import { EssayQuotaExceeded, InvalidCommand, PremiumRequired } from '../errors.ts';
import type { UnitOfWork } from '../ports/unit-of-work.port.ts';
import { acceptCommand } from './accept-command.ts';

import type { CommandEnvelope } from '@contracts/commands/command-envelope.ts';
import type { SubmitEssayPayload } from '@contracts/commands/submit-essay.command.ts';

type Deps = {
  uow: UnitOfWork;
  now: () => Date;
  newId: () => string;
  monthlyLimit: number;
};

/**
 * Premium, cota e gravação numa única transação (§7 do guia). Qualquer recusa desfaz tudo,
 * inclusive a reivindicação do commandId, então nada é gravado e a cota não é consumida.
 */
export function makeSubmitEssayHandler(deps: Deps) {
  return (userId: string, cmd: CommandEnvelope<SubmitEssayPayload>) =>
    deps.uow.run((tx) => {
      const now = deps.now();
      const { essayId, text } = cmd.payload;
      return acceptCommand(tx, userId, cmd, 'SubmitEssay', now, async () => {
        // O plano vem sempre do servidor; o app nunca informa se é Premium.
        const plan = await tx.entitlements.get(userId, now);
        if (plan !== 'PREMIUM') throw new PremiumRequired();

        const period = quotaPeriod(now);
        const used = await tx.essayQuota.reserve(userId, period, deps.monthlyLimit);
        if (used === null) {
          throw new EssayQuotaExceeded({
            limit: deps.monthlyLimit,
            used: deps.monthlyLimit,
            resetsAt: startOfNextPeriod(now).toISOString(),
          });
        }

        const created = await tx.essays.insert({ id: essayId, userId, commandId: cmd.commandId, text, quotaPeriod: period });
        if (!created) throw new InvalidCommand('essayId já usado por outro comando');

        // O evento leva só identificadores: o texto não passa pelo Redis nem pelos logs de fila.
        await tx.outbox.add({
          eventId: deps.newId(),
          type: 'EssaySubmitted',
          version: 1,
          occurredAt: now.toISOString(),
          aggregateId: essayId,
          aggregateVersion: 1,
          correlationId: cmd.commandId,
          causationId: cmd.commandId,
          payload: { essayId, userId },
        });
      });
    });
}
