export type Plan = 'FREE' | 'PREMIUM';

export type EssayQuota = {
  limit: number;
  used: number;
  resetsAt: string; // ISO 8601 em UTC
};

// GET /v1/me/entitlements
export type EntitlementsView = {
  plan: Plan;
  essayQuota: EssayQuota | null; // nulo quando o plano não dá direito
  asOf: string; // ISO 8601 em UTC
};
