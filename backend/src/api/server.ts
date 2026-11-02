import { randomUUID } from 'node:crypto';

import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';

import type { makeSubmitEssayHandler } from '../application/commands/submit-essay.handler.ts';
import { Unauthenticated } from '../application/errors.ts';
import type { makeGetEntitlementsHandler } from '../application/queries/get-entitlements.handler.ts';
import type { makeGetEssayHandler } from '../application/queries/get-essay.handler.ts';
import type { makeGetMockExamHistoryHandler } from '../application/queries/get-mock-exam-history.handler.ts';
import type { makeGetMockExamResultHandler } from '../application/queries/get-mock-exam-result.handler.ts';
import type { makeGetPerformanceSummaryHandler } from '../application/queries/get-performance-summary.handler.ts';
import { registerErrorHandler } from './errors.ts';
import { type AuthHandlers, registerAuthRoutes } from './routes/auth.routes.ts';
import { registerEssayCommands } from './routes/commands/essay.commands.ts';
import { registerStudyCommands, type StudyCommandHandlers } from './routes/commands/study.commands.ts';
import { registerHealthRoutes } from './routes/health.routes.ts';
import { registerEntitlementsRoutes } from './routes/queries/entitlements.routes.ts';
import { registerEssayRoutes } from './routes/queries/essays.routes.ts';
import { registerMockExamRoutes } from './routes/queries/mock-exams.routes.ts';
import { registerPerformanceRoutes } from './routes/queries/performance.routes.ts';

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
  essayMaxChars: number;
  /** SHA da versão em execução, devolvido no /readyz. */
  version?: string | null;
  verifyAccessToken: (token: string) => Promise<string | null>;
  ready: () => Promise<boolean>;
  /** Recebe a latência de cada resposta; a composição a liga às métricas. */
  observeRequest?: (sample: { method: string; route: string; status: number; seconds: number }) => void;
  auth: AuthHandlers;
  commands: StudyCommandHandlers & { submitEssay: ReturnType<typeof makeSubmitEssayHandler> };
  queries: {
    getEntitlements: ReturnType<typeof makeGetEntitlementsHandler>;
    getEssay: ReturnType<typeof makeGetEssayHandler>;
    getPerformanceSummary: ReturnType<typeof makeGetPerformanceSummaryHandler>;
    getMockExamHistory: ReturnType<typeof makeGetMockExamHistoryHandler>;
    getMockExamResult: ReturnType<typeof makeGetMockExamResultHandler>;
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
  const observe = deps.observeRequest;
  if (observe) {
    app.addHook('onResponse', async (request, reply) => {
      // A rota do molde (/v1/essays/:essayId), nunca a URL real, para não multiplicar séries.
      observe({ method: request.method, route: request.routeOptions.url ?? 'desconhecida', status: reply.statusCode, seconds: reply.elapsedTime / 1000 });
    });
  }
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

  registerHealthRoutes(app, deps.ready, deps.version ?? null);

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
      registerEssayCommands(scope, deps.commands.submitEssay, deps.essayMaxChars);
      registerEntitlementsRoutes(scope, deps.queries.getEntitlements);
      registerEssayRoutes(scope, deps.queries.getEssay);
      registerPerformanceRoutes(scope, deps.queries.getPerformanceSummary);
      registerMockExamRoutes(scope, deps.queries);
    },
    { prefix: '/v1' },
  );

  return app;
}
