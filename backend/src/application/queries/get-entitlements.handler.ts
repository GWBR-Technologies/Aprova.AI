import type { EntitlementPort } from '../ports/entitlement.port.ts';

import type { EntitlementsView } from '@contracts/queries/get-entitlements.query.ts';

type Deps = {
  entitlements: EntitlementPort;
  now: () => Date;
  monthlyLimit: number;
};

// Exceção aprovada à regra "consultas só leem o read store": plano e cota precisam ser exatos,
// então são lidos do write store pela mesma EntitlementPort usada pelo SubmitEssay (§14 do guia).
export function makeGetEntitlementsHandler(deps: Deps) {
  return async (userId: string): Promise<EntitlementsView> => {
    const now = deps.now();
    const plan = await deps.entitlements.get(userId, now);
    if (plan !== 'PREMIUM') return { plan, essayQuota: null, asOf: now.toISOString() };

    const usage = await deps.entitlements.essayQuotaUsage(userId, now);
    return {
      plan,
      essayQuota: { limit: deps.monthlyLimit, used: usage.used, resetsAt: usage.resetsAt.toISOString() },
      asOf: now.toISOString(),
    };
  };
}
