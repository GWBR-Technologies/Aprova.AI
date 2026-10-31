import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { makeLoginHandler } from '../../src/application/auth/login.handler.ts';
import { makeLogoutHandler } from '../../src/application/auth/logout.handler.ts';
import { makeRefreshHandler } from '../../src/application/auth/refresh.handler.ts';
import { Unauthenticated } from '../../src/application/errors.ts';
import type { AccessTokenPort, IdentityProviderPort } from '../../src/application/ports/auth.port.ts';
import { memoryStore } from '../support/memory-store.ts';

const DAY = 24 * 60 * 60 * 1000;

function setup(initial = new Date('2026-10-31T12:00:00Z')) {
  let now = initial;
  const store = memoryStore(() => now);
  const identity: IdentityProviderPort = {
    verify: async (_provider, idToken) => (idToken === 'valid-google-token' ? 'google-sub-1' : null),
  };
  const accessTokens: AccessTokenPort = {
    issue: async (userId, at) => ({ token: `access-for-${userId}`, expiresAt: new Date(at.getTime() + 900_000) }),
    verify: async () => null,
  };
  const deps = { uow: store.uow, identity, accessTokens, now: () => now, newId: randomUUID, refreshTtlMs: 30 * DAY };
  return {
    store,
    login: makeLoginHandler(deps),
    refresh: makeRefreshHandler(deps),
    logout: makeLogoutHandler(deps),
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

describe('login', () => {
  it('cria o usuário uma única vez e emite os tokens', async () => {
    const { login, store } = setup();
    const first = await login({ provider: 'google', idToken: 'valid-google-token' });
    const second = await login({ provider: 'google', idToken: 'valid-google-token' });

    expect(store.state.users.size).toBe(1);
    expect(first.accessToken).toBe(second.accessToken);
    expect(first.refreshToken).not.toBe(second.refreshToken);
    expect(first.accessTokenExpiresAt).toBe('2026-10-31T12:15:00.000Z');
  });

  it('recusa idToken inválido sem gravar nada', async () => {
    const { login, store } = setup();
    await expect(login({ provider: 'apple', idToken: 'forjado' })).rejects.toBeInstanceOf(Unauthenticated);
    expect(store.state.users.size).toBe(0);
  });
});

describe('refresh', () => {
  it('rotaciona o token e revoga o anterior', async () => {
    const { login, refresh } = setup();
    const { refreshToken } = await login({ provider: 'google', idToken: 'valid-google-token' });
    const rotated = await refresh({ refreshToken });

    expect(rotated.refreshToken).not.toBe(refreshToken);
    await expect(refresh({ refreshToken: rotated.refreshToken })).resolves.toBeDefined();
  });

  it('revoga a família inteira quando um token já usado é reapresentado', async () => {
    const { login, refresh, store } = setup();
    const { refreshToken } = await login({ provider: 'google', idToken: 'valid-google-token' });
    const rotated = await refresh({ refreshToken });

    await expect(refresh({ refreshToken })).rejects.toBeInstanceOf(Unauthenticated);
    await expect(refresh({ refreshToken: rotated.refreshToken })).rejects.toBeInstanceOf(Unauthenticated);
    expect(store.state.refreshTokens.every((t) => t.revokedAt !== null)).toBe(true);
  });

  it('recusa token expirado e token desconhecido', async () => {
    const { login, refresh, advance } = setup();
    const { refreshToken } = await login({ provider: 'google', idToken: 'valid-google-token' });
    advance(31 * DAY);

    await expect(refresh({ refreshToken })).rejects.toBeInstanceOf(Unauthenticated);
    await expect(refresh({ refreshToken: 'desconhecido' })).rejects.toBeInstanceOf(Unauthenticated);
  });
});

describe('logout', () => {
  it('revoga a família e não revela token desconhecido', async () => {
    const { login, refresh, logout } = setup();
    const { refreshToken } = await login({ provider: 'google', idToken: 'valid-google-token' });

    await logout({ refreshToken });
    await expect(refresh({ refreshToken })).rejects.toBeInstanceOf(Unauthenticated);
    await expect(logout({ refreshToken: 'desconhecido' })).resolves.toBeUndefined();
  });
});
