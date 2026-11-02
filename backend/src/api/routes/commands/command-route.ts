import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { CommandResult } from '../../../application/commands/accept-command.ts';
import { parseInput } from '../../errors.ts';

import type { CommandEnvelope } from '@contracts/commands/command-envelope.ts';

type CommandHandler<P> = (userId: string, cmd: CommandEnvelope<P>) => Promise<CommandResult>;

// A tolerância a relógio absurdo do aparelho é decisão do produto (§12.2 do guia); aqui só se
// exige um instante ISO 8601 válido.
const envelopeOf = <P>(payload: z.ZodType<P>) =>
  z.object({
    commandId: z.uuidv4(),
    issuedAt: z.iso.datetime({ offset: true }),
    payload,
  });

/** POST /v1/commands/<nome>: valida na borda, chama o handler e responde sempre 202 no sucesso. */
export function registerCommand<P>(app: FastifyInstance, name: string, payload: z.ZodType<P>, handler: CommandHandler<P>) {
  const schema = envelopeOf(payload);
  app.post(`/commands/${name}`, async (request, reply) => {
    const cmd = parseInput(schema, request.body);
    request.correlationId = cmd.commandId;
    const { accepted, replayed } = await handler(request.userId, cmd);
    if (replayed) reply.header('Idempotent-Replayed', 'true');
    return reply.status(202).send(accepted);
  });
}
