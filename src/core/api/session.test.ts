import { ApiRequestError } from './errors';
import { createSession, subjectOf } from './session';
import type { StoredSession, TokenStorage } from '../storage/token-storage';

function fakeJwt(sub: string) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode({ sub })}.assinatura`;
}

function memoryStorage(initial: StoredSession | null = null): TokenStorage & { value: StoredSession | null } {
  const storage = {
    value: initial,
    load: async () => storage.value,
    save: async (session: StoredSession) => {
      storage.value = session;
    },
    clear: async () => {
      storage.value = null;
    },
  };
  return storage;
}

const tokens = (sub: string, refreshToken: string) => ({
  accessToken: fakeJwt(sub),
  accessTokenExpiresAt: '2026-11-01T12:00:00Z',
  refreshToken,
});

describe('subjectOf', () => {
  it('lê o sub do JWT e ignora tokens malformados', () => {
    expect(subjectOf(fakeJwt('user-1'))).toBe('user-1');
    expect(subjectOf('abc')).toBeNull();
    expect(subjectOf('a.b.c')).toBeNull();
  });
});

describe('createSession', () => {
  it('faz login, guarda só o refresh token e mantém o acesso em memória', async () => {
    const storage = memoryStorage();
    const postAuth = jest.fn(async () => tokens('user-1', 'r1'));
    const session = createSession({ postAuth: postAuth as never, storage });

    await session.signIn('google', 'id-token');

    expect(postAuth).toHaveBeenCalledWith('/v1/auth/login', { provider: 'google', idToken: 'id-token' });
    expect(storage.value).toEqual({ userId: 'user-1', refreshToken: 'r1' });
    expect(session.getState()).toEqual({ status: 'signedIn', userId: 'user-1' });
    expect(session.getAccessToken()).toBe(fakeJwt('user-1'));
  });

  it('restaura a sessão sem chamar a rede', async () => {
    const postAuth = jest.fn();
    const session = createSession({
      postAuth: postAuth as never,
      storage: memoryStorage({ userId: 'user-1', refreshToken: 'r1' }),
    });
    await session.restore();
    expect(session.getState()).toEqual({ status: 'signedIn', userId: 'user-1' });
    expect(session.getAccessToken()).toBeNull();
    expect(postAuth).not.toHaveBeenCalled();
  });

  it('sem sessão guardada, restaura como deslogado', async () => {
    const session = createSession({ postAuth: jest.fn() as never, storage: memoryStorage() });
    await session.restore();
    expect(session.getState()).toEqual({ status: 'signedOut', reason: 'none' });
  });

  it('rotaciona o refresh token a cada renovação', async () => {
    const storage = memoryStorage({ userId: 'user-1', refreshToken: 'r1' });
    const postAuth = jest.fn(async () => tokens('user-1', 'r2'));
    const session = createSession({ postAuth: postAuth as never, storage });
    await session.restore();

    await expect(session.refresh()).resolves.toBe(fakeJwt('user-1'));
    expect(postAuth).toHaveBeenCalledWith('/v1/auth/refresh', { refreshToken: 'r1' });
    expect(storage.value?.refreshToken).toBe('r2');
  });

  it('encerra a sessão quando a renovação é recusada de forma permanente', async () => {
    const storage = memoryStorage({ userId: 'user-1', refreshToken: 'r1' });
    const postAuth = jest.fn(async () => {
      throw new ApiRequestError({ kind: 'http', status: 401 });
    });
    const session = createSession({ postAuth: postAuth as never, storage });
    await session.restore();

    await expect(session.refresh()).resolves.toBeNull();
    expect(session.getState()).toEqual({ status: 'signedOut', reason: 'expired' });
    expect(storage.value).toBeNull();
  });

  it('mantém a sessão quando a renovação falha por rede ou 5xx', async () => {
    const storage = memoryStorage({ userId: 'user-1', refreshToken: 'r1' });
    const postAuth = jest.fn(async () => {
      throw new ApiRequestError({ kind: 'network' });
    });
    const session = createSession({ postAuth: postAuth as never, storage });
    await session.restore();

    await expect(session.refresh()).resolves.toBeNull();
    expect(session.getState()).toEqual({ status: 'signedIn', userId: 'user-1' });
    expect(storage.value).not.toBeNull();
  });

  it('sai da conta mesmo quando o logout no servidor falha', async () => {
    const storage = memoryStorage({ userId: 'user-1', refreshToken: 'r1' });
    const postAuth = jest.fn(async () => {
      throw new ApiRequestError({ kind: 'network' });
    });
    const session = createSession({ postAuth: postAuth as never, storage });
    await session.restore();

    await session.signOut();
    expect(postAuth).toHaveBeenCalledWith('/v1/auth/logout', { refreshToken: 'r1' });
    expect(session.getState()).toEqual({ status: 'signedOut', reason: 'none' });
    expect(storage.value).toBeNull();
  });

  it('notifica quem assina as mudanças de estado', async () => {
    const session = createSession({ postAuth: jest.fn() as never, storage: memoryStorage() });
    const listener = jest.fn();
    session.subscribe(listener);
    await session.restore();
    expect(listener).toHaveBeenCalledWith({ status: 'signedOut', reason: 'none' });
  });
});
