import { randomUUID } from 'node:crypto';

import pino from 'pino';
import { describe, expect, it } from 'vitest';

import { buildServer, type ApiDeps } from '../../src/api/server.ts';
import { makeAnswerQuestionHandler } from '../../src/application/commands/answer-question.handler.ts';
import { makeCompleteMockExamHandler } from '../../src/application/commands/complete-mock-exam.handler.ts';
import { makeRecordRoutineProgressHandler } from '../../src/application/commands/record-routine-progress.handler.ts';
import { makeSubmitEssayHandler } from '../../src/application/commands/submit-essay.handler.ts';
import { Unauthenticated } from '../../src/application/errors.ts';
import { quotaPeriod } from '../../src/domain/essay/quota-period.ts';
import { memoryStore } from '../support/memory-store.ts';

import type { ApiError } from '@contracts/api-error.ts';

const tokens = { accessToken: 'a', accessTokenExpiresAt: '2026-10-31T12:15:00.000Z', refreshToken: 'r' };

function deps(overrides: Partial<ApiDeps> = {}, store = memoryStore()): ApiDeps {
  const commandDeps = { uow: store.uow, now: () => new Date(), newId: randomUUID };
  return {
    commands: {
      answerQuestion: makeAnswerQuestionHandler(commandDeps),
      recordRoutineProgress: makeRecordRoutineProgressHandler(commandDeps),
      completeMockExam: makeCompleteMockExamHandler(commandDeps),
      submitEssay: makeSubmitEssayHandler({ ...commandDeps, monthlyLimit: 4 }),
    },
    essayMaxChars: 50,
    logger: pino({ level: 'silent' }),
    bodyLimitBytes: 64 * 1024,
    verifyAccessToken: async (token) => (token === 'valid' ? 'user-1' : null),
    ready: async () => true,
    auth: {
      login: async () => tokens,
      refresh: async () => {
        throw new Unauthenticated();
      },
      logout: async () => undefined,
    },
    queries: {
      getEntitlements: async () => ({ plan: 'FREE', essayQuota: null, asOf: '2026-10-31T12:00:00.000Z' }),
    },
    ...overrides,
  };
}

const auth = { authorization: 'Bearer valid' };

describe('operação', () => {
  it('responde liveness e readiness', async () => {
    const app = await buildServer(deps({ ready: async () => false }));
    expect((await app.inject({ url: '/healthz' })).statusCode).toBe(200);
    expect((await app.inject({ url: '/readyz' })).statusCode).toBe(503);
  });
});

describe('autenticação', () => {
  it('exige token de acesso nas rotas /v1', async () => {
    const app = await buildServer(deps());
    const missing = await app.inject({ url: '/v1/me/entitlements' });
    const invalid = await app.inject({ url: '/v1/me/entitlements', headers: { authorization: 'Bearer forjado' } });

    for (const res of [missing, invalid]) {
      const body = res.json<ApiError>();
      expect(res.statusCode).toBe(401);
      expect(body.code).toBe('UNAUTHENTICATED');
      expect(body.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it('faz login e recusa corpo inválido', async () => {
    const app = await buildServer(deps());
    const ok = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { provider: 'google', idToken: 'x' } });
    const bad = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { provider: 'facebook', idToken: 'x' } });

    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual(tokens);
    expect(bad.statusCode).toBe(400);
    expect(bad.json<ApiError>()).toMatchObject({ code: 'VALIDATION_FAILED', details: { fields: ['provider'] } });
  });

  it('traduz refresh recusado em 401 e logout em 204', async () => {
    const app = await buildServer(deps());
    const refresh = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: 'r' } });
    const logout = await app.inject({ method: 'POST', url: '/v1/auth/logout', payload: { refreshToken: 'r' } });

    expect(refresh.statusCode).toBe(401);
    expect(logout.statusCode).toBe(204);
  });

  it('limita tentativas de login por IP', async () => {
    const app = await buildServer(deps());
    let last = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { provider: 'google', idToken: 'x' } });
    for (let i = 0; i < 20; i += 1) {
      last = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { provider: 'google', idToken: 'x' } });
    }

    expect(last.statusCode).toBe(429);
    expect(last.json<ApiError>().code).toBe('RATE_LIMITED');
    expect(last.headers['retry-after']).toBeDefined();
  });
});

describe('erros', () => {
  it('responde JSON malformado com VALIDATION_FAILED', async () => {
    const app = await buildServer(deps());
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{"provider":',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<ApiError>().code).toBe('VALIDATION_FAILED');
  });

  it('esconde detalhes de falha inesperada', async () => {
    const app = await buildServer(
      deps({
        queries: {
          getEntitlements: async () => {
            throw new Error('senha=segredo na string de conexão');
          },
        },
      }),
    );
    const res = await app.inject({ url: '/v1/me/entitlements', headers: auth });

    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('segredo');
    expect(res.json<ApiError>().code).toBe('INTERNAL_ERROR');
  });

  it('responde 404 padronizado em rota desconhecida', async () => {
    const app = await buildServer(deps());
    const res = await app.inject({ url: '/v1/nada', headers: auth });
    expect(res.statusCode).toBe(404);
    expect(res.json<ApiError>().code).toBe('NOT_FOUND');
  });
});

describe('comandos', () => {
  const command = (payload: unknown, commandId = randomUUID()) => ({ commandId, issuedAt: '2026-10-31T12:00:00.000Z', payload });

  it('responde 202 e repete a mesma resposta num reenvio', async () => {
    const app = await buildServer(deps());
    const body = command({ alternativa: 'B' });
    const first = await app.inject({ method: 'POST', url: '/v1/commands/answer-question', headers: auth, payload: body });
    const replay = await app.inject({ method: 'POST', url: '/v1/commands/answer-question', headers: auth, payload: body });

    expect(first.statusCode).toBe(202);
    expect(first.json()).toMatchObject({ commandId: body.commandId, status: 'accepted' });
    expect(first.headers['idempotent-replayed']).toBeUndefined();
    expect(replay.statusCode).toBe(202);
    expect(replay.json()).toEqual(first.json());
    expect(replay.headers['idempotent-replayed']).toBe('true');
  });

  it('responde 409 quando o mesmo commandId chega com outro payload', async () => {
    const app = await buildServer(deps());
    const commandId = randomUUID();
    await app.inject({ method: 'POST', url: '/v1/commands/record-routine-progress', headers: auth, payload: command({ a: 1 }, commandId) });
    const conflict = await app.inject({ method: 'POST', url: '/v1/commands/record-routine-progress', headers: auth, payload: command({ a: 2 }, commandId) });

    expect(conflict.statusCode).toBe(409);
    expect(conflict.json<ApiError>()).toMatchObject({ code: 'COMMAND_ID_CONFLICT', correlationId: commandId });
  });

  it('valida o envelope e o payload na borda', async () => {
    const app = await buildServer(deps());
    const badId = await app.inject({ method: 'POST', url: '/v1/commands/answer-question', headers: auth, payload: { ...command({}), commandId: '123' } });
    const noExamId = await app.inject({ method: 'POST', url: '/v1/commands/complete-mock-exam', headers: auth, payload: command({ nota: 10 }) });
    const noAuth = await app.inject({ method: 'POST', url: '/v1/commands/answer-question', payload: command({}) });

    expect(badId.statusCode).toBe(400);
    expect(noExamId.json<ApiError>()).toMatchObject({ code: 'VALIDATION_FAILED', details: { fields: ['payload.mockExamId'] } });
    expect(noAuth.statusCode).toBe(401);
  });

  it('recusa mockExamId reutilizado por outro comando', async () => {
    const app = await buildServer(deps());
    const mockExamId = randomUUID();
    const first = await app.inject({ method: 'POST', url: '/v1/commands/complete-mock-exam', headers: auth, payload: command({ mockExamId }) });
    const reused = await app.inject({ method: 'POST', url: '/v1/commands/complete-mock-exam', headers: auth, payload: command({ mockExamId }) });

    expect(first.statusCode).toBe(202);
    expect(reused.statusCode).toBe(400);
  });
});

describe('SubmitEssay pela API', () => {
  const submit = (text = 'Uma redação curta.') => ({
    commandId: randomUUID(),
    issuedAt: '2026-10-31T12:00:00.000Z',
    payload: { essayId: randomUUID(), text },
  });

  it('responde 403 PREMIUM_REQUIRED para quem não é Premium', async () => {
    const app = await buildServer(deps());
    const res = await app.inject({ method: 'POST', url: '/v1/commands/submit-essay', headers: auth, payload: submit() });
    expect(res.statusCode).toBe(403);
    expect(res.json<ApiError>().code).toBe('PREMIUM_REQUIRED');
  });

  it('aceita a redação do Premium e informa a cota esgotada com limit, used e resetsAt', async () => {
    const store = memoryStore();
    store.setPlan('user-1', 'PREMIUM');
    store.state.quota.set(`user-1|${quotaPeriod(new Date())}`, 3);
    const app = await buildServer(deps({}, store));

    const accepted = await app.inject({ method: 'POST', url: '/v1/commands/submit-essay', headers: auth, payload: submit() });
    expect(accepted.statusCode).toBe(202);

    const rejected = await app.inject({ method: 'POST', url: '/v1/commands/submit-essay', headers: auth, payload: submit() });
    expect(rejected.statusCode).toBe(403);
    expect(rejected.json<ApiError>()).toMatchObject({ code: 'ESSAY_QUOTA_EXCEEDED', details: { limit: 4, used: 4 } });
  });

  it('recusa texto vazio ou acima do limite configurado', async () => {
    const app = await buildServer(deps());
    const empty = await app.inject({ method: 'POST', url: '/v1/commands/submit-essay', headers: auth, payload: submit('   ') });
    const long = await app.inject({ method: 'POST', url: '/v1/commands/submit-essay', headers: auth, payload: submit('x'.repeat(51)) });
    expect(empty.statusCode).toBe(400);
    expect(long.statusCode).toBe(400);
  });
});

describe('GetEntitlements', () => {
  it('devolve a visão do usuário autenticado', async () => {
    const app = await buildServer(deps());
    const res = await app.inject({ url: '/v1/me/entitlements', headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ plan: 'FREE', essayQuota: null });
  });
});
