import type { UnitOfWork } from '../ports/unit-of-work.port.ts';

import type { LogoutRequest } from '@contracts/auth/auth.ts';

type Deps = { uow: UnitOfWork; now: () => Date };

/** Revoga a família do token apresentado. Um token desconhecido não gera erro, para não revelar nada. */
export function makeLogoutHandler(deps: Deps) {
  return (request: LogoutRequest): Promise<void> =>
    deps.uow.run(async (tx) => {
      const stored = await tx.refreshTokens.findForUpdate(request.refreshToken);
      if (stored) await tx.refreshTokens.revokeFamily(stored.familyId, deps.now());
    });
}
