export type Plan = 'FREE' | 'PREMIUM';

export type EntitlementsView = {
  plan: Plan;
  essayQuota: {
    limit: number;
    used: number;
    resetsAt: string; // ISO 8601 em UTC
  } | null; // null quando o plano não dá direito à correção
  asOf: string; // ISO 8601 em UTC
};
