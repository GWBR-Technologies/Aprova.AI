import { createApiClient } from './client';
import { ApiRequestError, isRetryableStatus, parseRetryAfter } from './errors';

function jsonResponse(status: number, body?: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
}

function setup(responses: (Response | Error)[], overrides: { refresh?: () => Promise<string | null> } = {}) {
  const queue = [...responses];
  const fetchImpl = jest.fn(async () => {
    const next = queue.shift();
    if (!next) throw new Error('sem resposta configurada');
    if (next instanceof Error) throw next;
    return next;
  });
  const refreshAccessToken = jest.fn(overrides.refresh ?? (async () => 'novo-token'));
  const client = createApiClient({
    baseUrl: 'https://api.example.com/',
    getAccessToken: () => 'token-atual',
    refreshAccessToken,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    timeoutMs: 50,
  });
  return { client, fetchImpl, refreshAccessToken };
}

function headersOf(fetchImpl: jest.Mock, call: number) {
  const init = (fetchImpl.mock.calls[call] as unknown as [string, RequestInit])[1];
  return init.headers as Record<string, string>;
}

describe('classificação de erros', () => {
  it.each([
    [408, true],
    [429, true],
    [500, true],
    [503, true],
    [400, false],
    [401, false],
    [403, false],
    [404, false],
    [409, false],
  ])('status %i reenviável: %s', (status, retryable) => {
    expect(isRetryableStatus(status)).toBe(retryable);
  });

  it('interpreta Retry-After em segundos e em data HTTP', () => {
    expect(parseRetryAfter('7')).toBe(7000);
    expect(
      parseRetryAfter('Wed, 21 Oct 2026 07:28:10 GMT', Date.parse('Wed, 21 Oct 2026 07:28:00 GMT')),
    ).toBe(10_000);
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter('lixo')).toBeUndefined();
  });
});

describe('createApiClient', () => {
  it('recusa URL sem HTTPS', () => {
    expect(() =>
      createApiClient({
        baseUrl: 'http://api.example.com',
        getAccessToken: () => null,
        refreshAccessToken: async () => null,
      }),
    ).toThrow('HTTPS');
  });

  it('envia o token e devolve o corpo JSON', async () => {
    const { client, fetchImpl } = setup([jsonResponse(200, { ok: true })]);
    await expect(client.get('/v1/me/entitlements')).resolves.toEqual({ ok: true });
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe(
      'https://api.example.com/v1/me/entitlements',
    );
    expect(headersOf(fetchImpl, 0).Authorization).toBe('Bearer token-atual');
  });

  it('traduz o corpo de erro da API e classifica como permanente', async () => {
    const apiError = { code: 'PREMIUM_REQUIRED', message: 'Recurso Premium', correlationId: 'c1' };
    const { client } = setup([jsonResponse(403, apiError)]);
    const error = await client.post('/v1/commands/submit-essay', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).apiError?.code).toBe('PREMIUM_REQUIRED');
    expect((error as ApiRequestError).retryable).toBe(false);
  });

  it('classifica 503 sem corpo e 429 com Retry-After como reenviáveis', async () => {
    const { client } = setup([jsonResponse(503), jsonResponse(429, undefined, { 'Retry-After': '9' })]);
    const first = (await client.get('/x').catch((e: unknown) => e)) as ApiRequestError;
    const second = (await client.get('/x').catch((e: unknown) => e)) as ApiRequestError;
    expect(first.retryable).toBe(true);
    expect(second.retryable).toBe(true);
    expect(second.retryAfterMs).toBe(9000);
  });

  it('trata falha de rede como reenviável', async () => {
    const { client } = setup([new TypeError('Network request failed')]);
    const error = (await client.get('/x').catch((e: unknown) => e)) as ApiRequestError;
    expect(error.kind).toBe('network');
    expect(error.retryable).toBe(true);
  });

  it('aborta por tempo limite e classifica como timeout', async () => {
    const fetchImpl = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('abortado')));
        }),
    );
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getAccessToken: () => null,
      refreshAccessToken: async () => null,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 20,
    });
    const error = (await client.get('/x').catch((e: unknown) => e)) as ApiRequestError;
    expect(error.kind).toBe('timeout');
    expect(error.retryable).toBe(true);
  });

  it('renova o token uma única vez para requisições concorrentes e repete cada uma', async () => {
    const { client, refreshAccessToken, fetchImpl } = setup([
      jsonResponse(401),
      jsonResponse(401),
      jsonResponse(200, { n: 1 }),
      jsonResponse(200, { n: 2 }),
    ]);
    const results = await Promise.all([client.get('/a'), client.get('/b')]);
    expect(results).toEqual([{ n: 1 }, { n: 2 }]);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(headersOf(fetchImpl, 2).Authorization).toBe('Bearer novo-token');
    expect(headersOf(fetchImpl, 3).Authorization).toBe('Bearer novo-token');
  });

  it('não repete mais de uma vez quando o 401 persiste', async () => {
    const { client, refreshAccessToken } = setup([jsonResponse(401), jsonResponse(401)]);
    const error = (await client.get('/a').catch((e: unknown) => e)) as ApiRequestError;
    expect(error.status).toBe(401);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('devolve o 401 sem repetir quando a renovação falha', async () => {
    const { client, fetchImpl } = setup([jsonResponse(401)], { refresh: async () => null });
    const error = (await client.get('/a').catch((e: unknown) => e)) as ApiRequestError;
    expect(error.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('não envia token nem renova em endpoints não autenticados', async () => {
    const { client, refreshAccessToken, fetchImpl } = setup([jsonResponse(401)]);
    await client
      .post('/v1/auth/login', { provider: 'google' }, { authenticated: false })
      .catch(() => undefined);
    expect(headersOf(fetchImpl, 0).Authorization).toBeUndefined();
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});
