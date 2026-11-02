import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { makeGetEssayHandler } from '../../../application/queries/get-essay.handler.ts';
import { parseInput } from '../../errors.ts';

const params = z.object({ essayId: z.uuid() });

export function registerEssayRoutes(app: FastifyInstance, getEssay: ReturnType<typeof makeGetEssayHandler>) {
  app.get('/essays/:essayId', (request) => getEssay(request.userId, parseInput(params, request.params).essayId));
}
