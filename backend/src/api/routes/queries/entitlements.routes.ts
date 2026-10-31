import type { FastifyInstance } from 'fastify';

import type { makeGetEntitlementsHandler } from '../../../application/queries/get-entitlements.handler.ts';

export function registerEntitlementsRoutes(app: FastifyInstance, getEntitlements: ReturnType<typeof makeGetEntitlementsHandler>) {
  app.get('/me/entitlements', (request) => getEntitlements(request.userId));
}
