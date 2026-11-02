import { and, eq } from 'drizzle-orm';

import type { EntitlementPort } from '../../application/ports/entitlement.port.ts';
import { quotaPeriod, startOfNextPeriod } from '../../domain/essay/quota-period.ts';
import type { Executor } from './database.ts';
import { entitlements, essayQuota } from './schema.ts';

// Lê write.entitlements; quem preenche essa tabela ainda é decisão em aberto (§1.6 do guia).
export function entitlementRepository(db: Executor): EntitlementPort {
  return {
    async get(userId, at) {
      const [row] = await db
        .select({ plan: entitlements.plan, validUntil: entitlements.validUntil })
        .from(entitlements)
        .where(eq(entitlements.userId, userId));
      if (!row || row.plan !== 'PREMIUM') return 'FREE';
      return row.validUntil === null || row.validUntil > at ? 'PREMIUM' : 'FREE';
    },

    async essayQuotaUsage(userId, at) {
      const [row] = await db
        .select({ used: essayQuota.used })
        .from(essayQuota)
        .where(and(eq(essayQuota.userId, userId), eq(essayQuota.period, quotaPeriod(at))));
      return { used: row?.used ?? 0, resetsAt: startOfNextPeriod(at) };
    },
  };
}
