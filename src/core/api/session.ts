import type {
  AuthTokens,
  IdentityProvider,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
} from '@contracts/auth/auth';

import { ApiRequestError } from './errors';
import type { StoredSession, TokenStorage } from '../storage/token-storage';

export type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut'; reason: 'none' | 'expired' }
  | { status: 'signedIn'; userId: string };

type PostAuth = <T>(path: string, body: unknown) => Promise<T>;

export type SessionConfig = {
  /** POST sem token nos endpoints `/v1/auth/*`. */
  postAuth: PostAuth;
  storage: TokenStorage;
};

/** Lê `sub` do JWT só para identificar o usuário no aparelho; a API é quem valida o token. */
export function subjectOf(accessToken: string): string | null {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const parsed: unknown = JSON.parse(json);
    const sub = (parsed as { sub?: unknown }).sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

export function createSession({ postAuth, storage }: SessionConfig) {
  let accessToken: string | null = null;
  let stored: StoredSession | null = null;
  let state: SessionState = { status: 'loading' };
  const listeners = new Set<(next: SessionState) => void>();

  function setState(next: SessionState) {
    state = next;
    listeners.forEach((listener) => listener(next));
  }

  async function endSession(reason: 'none' | 'expired') {
    accessToken = null;
    stored = null;
    await storage.clear();
    setState({ status: 'signedOut', reason });
  }

  async function adopt(tokens: AuthTokens, userId: string) {
    accessToken = tokens.accessToken;
    stored = { userId, refreshToken: tokens.refreshToken };
    await storage.save(stored);
    setState({ status: 'signedIn', userId });
  }

  return {
    getState: () => state,
    getAccessToken: () => accessToken,

    subscribe(listener: (next: SessionState) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Restaura a sessão do SecureStore sem rede: o token de acesso é obtido no primeiro 401. */
    async restore() {
      stored = await storage.load();
      setState(stored ? { status: 'signedIn', userId: stored.userId } : { status: 'signedOut', reason: 'none' });
    },

    async signIn(provider: IdentityProvider, idToken: string) {
      const body: LoginRequest = { provider, idToken };
      const tokens = await postAuth<AuthTokens>('/v1/auth/login', body);
      const userId = subjectOf(tokens.accessToken);
      if (!userId) throw new Error('Resposta de login sem identificação do usuário.');
      await adopt(tokens, userId);
    },

    /**
     * Renovação usada pelo cliente HTTP em caso de 401. Falha permanente (4xx) encerra a sessão;
     * falha transitória mantém a sessão para o aluno continuar enfileirando comandos offline.
     */
    async refresh(): Promise<string | null> {
      if (!stored) return null;
      const body: RefreshRequest = { refreshToken: stored.refreshToken };
      try {
        const tokens = await postAuth<AuthTokens>('/v1/auth/refresh', body);
        await adopt(tokens, stored.userId);
        return tokens.accessToken;
      } catch (error) {
        if (error instanceof ApiRequestError && !error.retryable) {
          await endSession('expired');
        }
        return null;
      }
    },

    async signOut() {
      const refreshToken = stored?.refreshToken;
      if (refreshToken) {
        const body: LogoutRequest = { refreshToken };
        // O logout local não depende da resposta do servidor.
        await postAuth('/v1/auth/logout', body).catch(() => undefined);
      }
      await endSession('none');
    },
  };
}

export type Session = ReturnType<typeof createSession>;
