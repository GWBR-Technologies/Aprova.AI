import { randomUUID } from 'node:crypto';

import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';

import type { makeGetEntitlementsHandler } from '../application/queries/get-entitlements.handler.ts';
import { Unauthenticated } from '../application/errors.ts';
import { registerErrorHandler } from './errors.ts';
import { type AuthHandlers, registerAuthRoutes } from './routes/auth.routes.ts';
import { registerStudyCommands, type StudyCommandHandlers } from './routes/commands/study.commands.ts';
import { registerHealthRoutes } from './routes/health.routes.ts';
import { registerEntitlementsRoutes } from './routes/queries/entitlements.routes.ts';

declare module 'fastify' {
  interface FastifyRequest {
    /** Dono da requisição, vindo só do token de acesso; nunca do corpo. */
    userId: string;
    /** commandId nas rotas de comando; id da requisição nas demais. */
    correlationId: string;
  }
}

export type ApiDeps = {
  logger: FastifyBaseLogger;
  bodyLimitBytes: number;
  verifyAccessToken: (token: string) => Promise<string | null>;
  ready: () => Promise<boolean>;
  auth: AuthHandlers;
  commands: StudyCommandHandlers;
  queries: {
    getEntitlements: ReturnType<typeof makeGetEntitlementsHandler>;
  };
};

export async function buildServer(deps: ApiDeps): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: deps.logger,
    // A API só é alcançável pela rede interna do Compose, atrás do Caddy: confia apenas em
    // endereços privados, de onde vem o X-Forwarded-For escrito pelo proxy.
    trustProxy: 'loopback,uniquelocal',
    bodyLimit: deps.bodyLimitBytes,
    requestTimeout: 30_000,
    genReqId: () => randomUUID(),
  });

  app.decorateRequest('userId', '');
  app.decorateRequest('correlationId', '');
  app.addHook('onRequest', async (request) => {
    request.correlationId = request.id;
  });
  registerErrorHandler(app);

  // CORS fica desligado: o app nativo não precisa dele (§12.4 do guia).
  await app.register(helmet);
  // Memória local em vez do Redis: a API continua aceitando comandos com o Redis fora do ar.
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    hook: 'preHandler',
    keyGenerator: (request) => request.userId || request.ip,
  });

  registerHealthRoutes(app, deps.ready);

  await app.register(async (scope) => registerAuthRoutes(scope, deps.auth), { prefix: '/v1/auth' });

  await app.register(
    async (scope) => {
      scope.addHook('onRequest', async (request) => {
        const header = request.headers.authorization;
        const userId = header?.startsWith('Bearer ') ? await deps.verifyAccessToken(header.slice(7)) : null;
        if (!userId) throw new Unauthenticated();
        request.userId = userId;
      });
      registerStudyCommands(scope, deps.commands);
      registerEntitlementsRoutes(scope, deps.queries.getEntitlements);
    },
    { prefix: '/v1' },
  );

  return app;
}
