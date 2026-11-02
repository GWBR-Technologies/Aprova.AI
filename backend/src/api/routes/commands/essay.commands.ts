import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { makeSubmitEssayHandler } from '../../../application/commands/submit-essay.handler.ts';
import { registerCommand } from './command-route.ts';

import type { SubmitEssayPayload } from '@contracts/commands/submit-essay.command.ts';

// O limite de caracteres é definido pelo produto e chega por ESSAY_MAX_CHARS, sem valor padrão.
export const submitEssayPayloadSchema = (maxChars: number) =>
  z.object({
    essayId: z.uuid(),
    text: z.string().trim().min(1).max(maxChars),
  }) satisfies z.ZodType<SubmitEssayPayload>;

export function registerEssayCommands(
  app: FastifyInstance,
  submitEssay: ReturnType<typeof makeSubmitEssayHandler>,
  essayMaxChars: number,
) {
  registerCommand(app, 'submit-essay', submitEssayPayloadSchema(essayMaxChars), submitEssay);
}
