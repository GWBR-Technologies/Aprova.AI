import type { FastifyInstance } from 'fastify';
import type { z } from 'zod';

import {
  CommandIdConflict,
  EssayQuotaExceeded,
  InvalidCommand,
  NotFound,
  PremiumRequired,
  Unauthenticated,
} from '../application/errors.ts';

import type { ApiError, ErrorCode } from '@contracts/api-error.ts';

/** Corpo, parâmetro ou cabeçalho fora do esquema esperado. */
export class ValidationFailed extends Error {
  readonly fields: string[];

  constructor(fields: string[]) {
    super('Entrada inválida');
    this.fields = fields;
  }
}

export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ValidationFailed(parsed.error.issues.map((i) => i.path.join('.') || '(raiz)'));
  return parsed.data;
}

// Textos para o aluno; nunca levam identificadores, tokens nem detalhes internos.
const messages: Record<ErrorCode, string> = {
  VALIDATION_FAILED: 'Os dados enviados são inválidos.',
  UNAUTHENTICATED: 'Sua sessão expirou. Entre novamente.',
  PREMIUM_REQUIRED: 'A correção de redação é exclusiva do plano Premium.',
  ESSAY_QUOTA_EXCEEDED: 'Você já usou todas as correções de redação deste mês.',
  NOT_FOUND: 'Não encontramos o que você procurou.',
  COMMAND_ID_CONFLICT: 'Não foi possível processar esta solicitação.',
  RATE_LIMITED: 'Muitas solicitações em pouco tempo. Tente novamente em instantes.',
  INTERNAL_ERROR: 'Algo deu errado. Tente novamente em instantes.',
  SERVICE_UNAVAILABLE: 'O serviço está temporariamente indisponível. Tente novamente em instantes.',
};

const statuses: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  PREMIUM_REQUIRED: 403,
  ESSAY_QUOTA_EXCEEDED: 403,
  NOT_FOUND: 404,
  COMMAND_ID_CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Falhas de conexão com o Postgres ou o Redis: dependência fora do ar, e o app reenvia depois.
const unavailableCodes = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '57P01', '57P03', '53300']);

function errorProps(err: unknown): { statusCode?: number; code?: string } {
  if (typeof err !== 'object' || err === null) return {};
  return {
    statusCode: 'statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : undefined,
    code: 'code' in err && typeof err.code === 'string' ? err.code : undefined,
  };
}

function classify(err: unknown): { code: ErrorCode; details?: Record<string, unknown> } {
  if (err instanceof ValidationFailed) return { code: 'VALIDATION_FAILED', details: { fields: err.fields } };
  if (err instanceof InvalidCommand) return { code: 'VALIDATION_FAILED' };
  if (err instanceof Unauthenticated) return { code: 'UNAUTHENTICATED' };
  if (err instanceof PremiumRequired) return { code: 'PREMIUM_REQUIRED' };
  if (err instanceof EssayQuotaExceeded) return { code: 'ESSAY_QUOTA_EXCEEDED', details: err.details };
  if (err instanceof NotFound) return { code: 'NOT_FOUND' };
  if (err instanceof CommandIdConflict) return { code: 'COMMAND_ID_CONFLICT' };

  const { statusCode, code } = errorProps(err);
  if (statusCode === 429) return { code: 'RATE_LIMITED' };
  // Erros do próprio Fastify antes do handler: JSON malformado, corpo grande demais, tipo de conteúdo.
  if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) return { code: 'VALIDATION_FAILED' };
  if (code !== undefined && unavailableCodes.has(code)) return { code: 'SERVICE_UNAVAILABLE' };
  return { code: 'INTERNAL_ERROR' };
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, request, reply) => {
    const { code, details } = classify(err);
    const status = statuses[code];
    if (status >= 500) {
      // O corpo da requisição nunca vai para o log: pode conter texto de redação ou tokens.
      request.log.error({ err, correlationId: request.correlationId }, 'Falha inesperada na requisição');
    }
    const body: ApiError = { code, message: messages[code], correlationId: request.correlationId };
    if (details) body.details = details;
    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ApiError = { code: 'NOT_FOUND', message: messages.NOT_FOUND, correlationId: request.correlationId };
    return reply.status(404).send(body);
  });
}
