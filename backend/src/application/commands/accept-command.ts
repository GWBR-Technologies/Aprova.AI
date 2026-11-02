import type { CommandType } from '../ports/command-log.port.ts';
import type { Tx } from '../ports/unit-of-work.port.ts';

import type { CommandAccepted, CommandEnvelope } from '@contracts/commands/command-envelope.ts';

export type CommandResult = { accepted: CommandAccepted; replayed: boolean };

/**
 * Esqueleto comum a todo comando, dentro da transação do handler (§6 do guia): reivindica o
 * commandId, aplica o efeito e guarda o 202. Um reenvio devolve o 202 original antes de qualquer
 * regra, o que impede, por exemplo, cobrar a cota duas vezes.
 */
export async function acceptCommand(
  tx: Tx,
  userId: string,
  cmd: CommandEnvelope<unknown>,
  type: CommandType,
  now: Date,
  apply: () => Promise<void>,
): Promise<CommandResult> {
  const claim = await tx.commandLog.claim(userId, cmd, type);
  if (claim.replayed) return { accepted: claim.response, replayed: true };

  await apply();

  const accepted: CommandAccepted = { commandId: cmd.commandId, status: 'accepted', receivedAt: now.toISOString() };
  await tx.commandLog.complete(userId, cmd.commandId, accepted);
  return { accepted, replayed: false };
}
