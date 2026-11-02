import type { FastifyInstance } from 'fastify';

import type { makeGetPerformanceSummaryHandler } from '../../../application/queries/get-performance-summary.handler.ts';

export function registerPerformanceRoutes(
  app: FastifyInstance,
  getPerformanceSummary: ReturnType<typeof makeGetPerformanceSummaryHandler>,
) {
  app.get('/me/performance', (request) => getPerformanceSummary(request.userId));
}
