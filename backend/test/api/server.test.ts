import pino from 'pino';
import { describe, expect, it } from 'vitest';

import { buildServer, type ApiDeps } from '../../src/api/server.ts';
import { Unauthenticated } from '../../src/application/errors.ts';

import type { ApiError } from '@contracts/api-error.ts';

const tokens = { accessToken: 'a', accessTokenExpiresAt: '2026-10-31T12:15:00.000Z', refreshToken: 'r' };

function deps(overrides: Partial<ApiDeps> = {}): ApiDeps {
  return {
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

describe('GetEntitlements', () => {
  it('devolve a visão do usuário autenticado', async () => {
    const app = await buildServer(deps());
    const res = await app.inject({ url: '/v1/me/entitlements', headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ plan: 'FREE', essayQuota: null });
  });
});
