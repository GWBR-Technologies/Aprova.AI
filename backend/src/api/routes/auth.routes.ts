import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { makeLoginHandler } from '../../application/auth/login.handler.ts';
import type { makeLogoutHandler } from '../../application/auth/logout.handler.ts';
import type { makeRefreshHandler } from '../../application/auth/refresh.handler.ts';
import { parseInput } from '../errors.ts';

import type { LoginRequest, LogoutRequest, RefreshRequest } from '@contracts/auth/auth.ts';

export type AuthHandlers = {
  login: ReturnType<typeof makeLoginHandler>;
  refresh: ReturnType<typeof makeRefreshHandler>;
  logout: ReturnType<typeof makeLogoutHandler>;
};

const loginSchema = z.object({
  provider: z.enum(['google', 'apple']),
  idToken: z.string().min(1).max(8192),
}) satisfies z.ZodType<LoginRequest>;

const refreshTokenSchema = z.object({ refreshToken: z.string().min(1).max(256) }) satisfies z.ZodType<RefreshRequest & LogoutRequest>;

// Limite mais restrito que o global, por IP; valor inicial a calibrar no teste de carga.
const authRateLimit = { rateLimit: { max: 20, timeWindow: '1 minute' } };

/** Endpoints síncronos fora do modelo de comandos: devolvem tokens, não 202 (§13 do guia). */
export function registerAuthRoutes(app: FastifyInstance, handlers: AuthHandlers) {
  app.post('/login', { config: authRateLimit }, (request) => handlers.login(parseInput(loginSchema, request.body)));

  app.post('/refresh', { config: authRateLimit }, (request) => handlers.refresh(parseInput(refreshTokenSchema, request.body)));

  app.post('/logout', { config: authRateLimit }, async (request, reply) => {
    await handlers.logout(parseInput(refreshTokenSchema, request.body));
    return reply.status(204).send();
  });
}
