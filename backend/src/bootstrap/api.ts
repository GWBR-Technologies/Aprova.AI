import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { buildServer } from '../api/server.ts';
import { makeLoginHandler } from '../application/auth/login.handler.ts';
import { makeLogoutHandler } from '../application/auth/logout.handler.ts';
import { makeRefreshHandler } from '../application/auth/refresh.handler.ts';
import { makeAnswerQuestionHandler } from '../application/commands/answer-question.handler.ts';
import { makeCompleteMockExamHandler } from '../application/commands/complete-mock-exam.handler.ts';
import { makeRecordRoutineProgressHandler } from '../application/commands/record-routine-progress.handler.ts';
import { makeSubmitEssayHandler } from '../application/commands/submit-essay.handler.ts';
import { EssayQuotaExceeded, PremiumRequired } from '../application/errors.ts';
import { makeGetEntitlementsHandler } from '../application/queries/get-entitlements.handler.ts';
import { makeGetEssayHandler } from '../application/queries/get-essay.handler.ts';
import { makeGetMockExamHistoryHandler } from '../application/queries/get-mock-exam-history.handler.ts';
import { makeGetMockExamResultHandler } from '../application/queries/get-mock-exam-result.handler.ts';
import { makeGetPerformanceSummaryHandler } from '../application/queries/get-performance-summary.handler.ts';
import { jwtAccessTokens } from '../infrastructure/auth/jwt.access-token.adapter.ts';
import { oidcIdentityProvider } from '../infrastructure/auth/oidc.identity-provider.adapter.ts';
import { createLogger } from '../infrastructure/observability/logger.ts';
import { createMetrics, startMetricsServer } from '../infrastructure/observability/metrics.ts';
import { createDatabase } from '../infrastructure/persistence/database.ts';
import { entitlementRepository } from '../infrastructure/persistence/entitlement.repository.ts';
import { readStore } from '../infrastructure/persistence/read-models.repository.ts';
import { drizzleUnitOfWork } from '../infrastructure/persistence/unit-of-work.ts';
import { createProducerConnection } from '../infrastructure/queue/connections.ts';
import { intEnv, optionalEnv, requireEnv, requirePositiveInt } from './env.ts';
import { onShutdown } from './shutdown.ts';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const logger = createLogger('api', optionalEnv('LOG_LEVEL'));
const metrics = createMetrics('api');
const db = createDatabase(requireEnv('DATABASE_URL'));
// A API não publica na fila (isso é do relay); o Redis só entra na verificação de prontidão.
const redis = createProducerConnection(requireEnv('REDIS_URL'), logger);
const uow = drizzleUnitOfWork(db);
const reads = readStore(db);
const now = () => new Date();

const essayMaxChars = requirePositiveInt('ESSAY_MAX_CHARS');
const monthlyLimit = intEnv('ESSAY_MONTHLY_LIMIT', 4);
const accessTokens = jwtAccessTokens({
  secret: requireEnv('JWT_SECRET'),
  issuer: requireEnv('JWT_ISSUER'),
  audience: requireEnv('JWT_AUDIENCE'),
  ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
});
const identity = oidcIdentityProvider({
  googleClientIds: requireEnv('GOOGLE_CLIENT_IDS').split(',').map((id) => id.trim()).filter(Boolean),
  appleClientId: requireEnv('APPLE_CLIENT_ID'),
});

const commandDeps = { uow, now, newId: randomUUID };
const authDeps = { uow, accessTokens, now, refreshTtlMs: REFRESH_TOKEN_TTL_MS };
const submitEssay = makeSubmitEssayHandler({ ...commandDeps, monthlyLimit });

const app = await buildServer({
  logger,
  // O maior corpo é o da redação: até 4 bytes por caractere em UTF-8, mais o envelope.
  bodyLimitBytes: essayMaxChars * 4 + 16 * 1024,
  essayMaxChars,
  verifyAccessToken: (token) => accessTokens.verify(token),
  ready: async () => {
    await db.execute(sql`select 1`);
    return (await redis.ping()) === 'PONG';
  },
  observeRequest: ({ method, route, status, seconds }) => metrics.httpDuration.observe({ method, route, status }, seconds),
  auth: {
    login: makeLoginHandler({ ...authDeps, identity, newId: randomUUID }),
    refresh: makeRefreshHandler(authDeps),
    logout: makeLogoutHandler({ uow, now }),
  },
  commands: {
    answerQuestion: makeAnswerQuestionHandler(commandDeps),
    recordRoutineProgress: makeRecordRoutineProgressHandler(commandDeps),
    completeMockExam: makeCompleteMockExamHandler(commandDeps),
    submitEssay: async (userId, cmd) => {
      try {
        return await submitEssay(userId, cmd);
      } catch (err) {
        if (err instanceof PremiumRequired) metrics.quotaRejections.inc({ reason: 'premium_required' });
        if (err instanceof EssayQuotaExceeded) metrics.quotaRejections.inc({ reason: 'quota_exceeded' });
        throw err;
      }
    },
  },
  queries: {
    getEntitlements: makeGetEntitlementsHandler({ entitlements: entitlementRepository(db), now, monthlyLimit }),
    getEssay: makeGetEssayHandler({ reads }),
    getPerformanceSummary: makeGetPerformanceSummaryHandler({ reads }),
    getMockExamHistory: makeGetMockExamHistoryHandler({ reads, now }),
    getMockExamResult: makeGetMockExamResultHandler({ reads }),
  },
});

// Dentro da rede do Compose; a única porta pública é a do proxy (guia de DevOps).
await app.listen({ host: '0.0.0.0', port: intEnv('PORT', 3000) });
const metricsServer = startMetricsServer(intEnv('METRICS_PORT', 9100), () => metrics.registry.metrics(), metrics.registry.contentType);

onShutdown(logger, async () => {
  await app.close();
  metricsServer.close();
  await Promise.all([db.$client.end(), redis.quit()]);
});
