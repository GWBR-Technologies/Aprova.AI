import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { makeGetMockExamHistoryHandler } from '../../../application/queries/get-mock-exam-history.handler.ts';
import type { makeGetMockExamResultHandler } from '../../../application/queries/get-mock-exam-result.handler.ts';
import { parseInput } from '../../errors.ts';

const historyQuery = z.object({
  before: z.iso
    .datetime({ offset: true })
    .transform((v) => new Date(v))
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const params = z.object({ mockExamId: z.uuid() });

export function registerMockExamRoutes(
  app: FastifyInstance,
  handlers: {
    getMockExamHistory: ReturnType<typeof makeGetMockExamHistoryHandler>;
    getMockExamResult: ReturnType<typeof makeGetMockExamResultHandler>;
  },
) {
  app.get('/me/mock-exams', (request) => handlers.getMockExamHistory(request.userId, parseInput(historyQuery, request.query)));

  app.get('/mock-exams/:mockExamId', (request) =>
    handlers.getMockExamResult(request.userId, parseInput(params, request.params).mockExamId),
  );
}
