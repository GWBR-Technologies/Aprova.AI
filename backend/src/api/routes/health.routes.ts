import type { FastifyInstance } from 'fastify';

const noRateLimit = { rateLimit: false };

export function registerHealthRoutes(app: FastifyInstance, ready: () => Promise<boolean>) {
  // Liveness: o processo responde.
  app.get('/healthz', { config: noRateLimit }, () => ({ status: 'ok' }));

  // Readiness: Postgres e Redis respondem.
  app.get('/readyz', { config: noRateLimit }, async (_request, reply) => {
    const ok = await ready().catch(() => false);
    return reply.status(ok ? 200 : 503).send({ status: ok ? 'ready' : 'unavailable' });
  });
}
