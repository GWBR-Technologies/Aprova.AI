import type { ApiError } from '@contracts/api-error';

import { ApiRequestError, parseRetryAfter } from './errors';

export type ApiClientConfig = {
  baseUrl: string;
  /** Token de acesso em memória; `null` quando não há sessão. */
  getAccessToken: () => string | null;
  /** Renova o par de tokens e devolve o novo token de acesso, ou `null` se a sessão terminou. */
  refreshAccessToken: () => Promise<string | null>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export type RequestOptions = {
  /** `false` nos endpoints de autenticação, que não levam o token nem disparam renovação. */
  authenticated?: boolean;
};

const DEFAULT_TIMEOUT_MS = 15_000;

function assertHttps(baseUrl: string) {
  if (!baseUrl.startsWith('https://')) {
    throw new Error('A URL da API precisa usar HTTPS.');
  }
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).code === 'string' &&
    typeof (value as ApiError).message === 'string'
  );
}

export function createApiClient(config: ApiClientConfig) {
  assertHttps(config.baseUrl);
  const fetchImpl = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = config.baseUrl.replace(/\/+$/, '');

  // Uma única renovação compartilhada: requisições concorrentes aguardam a mesma promessa (§9.3).
  let refreshing: Promise<string | null> | null = null;
  function refreshOnce() {
    refreshing ??= config.refreshAccessToken().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function send(method: string, path: string, body: unknown, token: string | null) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      return await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch {
      throw new ApiRequestError({ kind: timedOut ? 'timeout' : 'network' });
    } finally {
      clearTimeout(timer);
    }
  }

  async function toFailure(response: Response): Promise<ApiRequestError> {
    let apiError: ApiError | undefined;
    try {
      const parsed: unknown = await response.json();
      if (isApiError(parsed)) apiError = parsed;
    } catch {
      // Corpo ausente ou inválido: o status HTTP basta para classificar.
    }
    return new ApiRequestError({
      kind: 'http',
      status: response.status,
      apiError,
      retryAfterMs: parseRetryAfter(response.headers.get('Retry-After')),
    });
  }

  async function request<T>(
    method: string,
    path: string,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const authenticated = options.authenticated ?? true;
    let response = await send(method, path, body, authenticated ? config.getAccessToken() : null);

    if (response.status === 401 && authenticated) {
      const renewed = await refreshOnce();
      if (renewed) {
        response = await send(method, path, body, renewed);
      }
    }

    if (!response.ok) throw await toFailure(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('POST', path, body, options),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
