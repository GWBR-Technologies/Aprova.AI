import * as Crypto from 'expo-crypto';

import type { CommandEnvelope } from '@contracts/commands/command-envelope';
import type { SubmitEssayPayload } from '@contracts/commands/submit-essay.command';

import { enqueueCommand } from '@/core/outbox/instance';

/**
 * Grava a redação no outbox local; o envio e o `202` são responsabilidade do outbox. A tela só
 * mostra a confirmação de recebimento depois do `202`, nunca ao tocar no botão.
 */
export async function submitEssay(userId: string, text: string) {
  const command: CommandEnvelope<SubmitEssayPayload> = {
    commandId: Crypto.randomUUID(),
    issuedAt: new Date().toISOString(),
    payload: { essayId: Crypto.randomUUID(), text },
  };
  await enqueueCommand({ userId, route: 'submit-essay', resourceId: command.payload.essayId, command });
  return { commandId: command.commandId, essayId: command.payload.essayId };
}
