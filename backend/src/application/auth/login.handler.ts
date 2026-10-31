import { Unauthenticated } from '../errors.ts';
import type { AccessTokenPort, IdentityProviderPort } from '../ports/auth.port.ts';
import type { UnitOfWork } from '../ports/unit-of-work.port.ts';

import type { AuthTokens, LoginRequest } from '@contracts/auth/auth.ts';

type Deps = {
  uow: UnitOfWork;
  identity: IdentityProviderPort;
  accessTokens: AccessTokenPort;
  now: () => Date;
  newId: () => string;
  refreshTtlMs: number;
};

export function makeLoginHandler(deps: Deps) {
  return async (request: LoginRequest): Promise<AuthTokens> => {
    // A validação do idToken fica fora da transação: ela pode buscar as chaves do provedor pela rede.
    const subject = await deps.identity.verify(request.provider, request.idToken);
    if (!subject) throw new Unauthenticated();

    const now = deps.now();
    const { userId, refreshToken } = await deps.uow.run(async (tx) => {
      const userId = await tx.users.findOrCreate(request.provider, subject);
      const refreshToken = await tx.refreshTokens.create(userId, deps.newId(), new Date(now.getTime() + deps.refreshTtlMs));
      return { userId, refreshToken };
    });

    const access = await deps.accessTokens.issue(userId, now);
    return { accessToken: access.token, accessTokenExpiresAt: access.expiresAt.toISOString(), refreshToken };
  };
}
