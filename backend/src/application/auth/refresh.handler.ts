import { Unauthenticated } from '../errors.ts';
import type { AccessTokenPort } from '../ports/auth.port.ts';
import type { UnitOfWork } from '../ports/unit-of-work.port.ts';

import type { AuthTokens, RefreshRequest } from '@contracts/auth/auth.ts';

type Deps = {
  uow: UnitOfWork;
  accessTokens: AccessTokenPort;
  now: () => Date;
  refreshTtlMs: number;
};

export function makeRefreshHandler(deps: Deps) {
  return async (request: RefreshRequest): Promise<AuthTokens> => {
    const now = deps.now();
    // Recusas devolvem null em vez de lançar erro, para que a revogação da família seja confirmada.
    const rotated = await deps.uow.run(async (tx) => {
      const stored = await tx.refreshTokens.findForUpdate(request.refreshToken);
      if (!stored) return null;
      if (stored.revokedAt) {
        // Token já usado apresentado de novo: indício de roubo, a família inteira cai (§13.2 do guia).
        await tx.refreshTokens.revokeFamily(stored.familyId, now);
        return null;
      }
      if (stored.expiresAt <= now) return null;

      await tx.refreshTokens.revoke(stored.id, now);
      const refreshToken = await tx.refreshTokens.create(stored.userId, stored.familyId, new Date(now.getTime() + deps.refreshTtlMs));
      return { userId: stored.userId, refreshToken };
    });
    if (!rotated) throw new Unauthenticated();

    const access = await deps.accessTokens.issue(rotated.userId, now);
    return { accessToken: access.token, accessTokenExpiresAt: access.expiresAt.toISOString(), refreshToken: rotated.refreshToken };
  };
}
