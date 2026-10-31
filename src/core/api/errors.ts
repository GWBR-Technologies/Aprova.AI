import type { ApiError } from '@contracts/http/api-error';

export type ApiFailureKind = 'network' | 'timeout' | 'http';

/** Reenviáveis: erro de rede, 408, 429 e 5xx. Os demais 4xx são permanentes (§1.7 do guia). */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/** Interpreta `Retry-After` (segundos ou data HTTP) e devolve milissegundos. */
export function parseRetryAfter(header: string | null, now: number = Date.now()): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

export class ApiRequestError extends Error {
  readonly kind: ApiFailureKind;
  readonly status?: number;
  readonly apiError?: ApiError;
  readonly retryAfterMs?: number;

  constructor(init: {
    kind: ApiFailureKind;
    status?: number;
    apiError?: ApiError;
    retryAfterMs?: number;
  }) {
    // A mensagem do servidor é para o aluno; nunca carrega detalhes internos (§1.7).
    super(init.apiError?.message ?? `Falha de requisição (${init.kind}${init.status ? ` ${init.status}` : ''})`);
    this.name = 'ApiRequestError';
    this.kind = init.kind;
    this.status = init.status;
    this.apiError = init.apiError;
    this.retryAfterMs = init.retryAfterMs;
  }

  get retryable(): boolean {
    if (this.kind !== 'http') return true;
    return this.status === undefined ? true : isRetryableStatus(this.status);
  }
}
