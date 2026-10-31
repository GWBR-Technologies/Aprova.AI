import type { Plan } from '@contracts/queries/get-entitlements.query.ts';

export interface EntitlementPort {
  /** Plano vigente do usuário no instante `at`; PREMIUM só se estiver dentro da validade. */
  get(userId: string, at: Date): Promise<Plan>;
  /** Correções consumidas no período de `at` e o instante em que o próximo período começa. */
  essayQuotaUsage(userId: string, at: Date): Promise<{ used: number; resetsAt: Date }>;
}
