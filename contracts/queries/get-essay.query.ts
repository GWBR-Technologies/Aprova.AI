export type EssayStatus = 'processing' | 'completed' | 'failed';

export type EssayView = {
  essayId: string;
  status: EssayStatus;
  // Formato definido pela rubrica de correção (em aberto com o produto).
  result: Record<string, unknown> | null;
  failure: { code: string } | null;
  createdAt: string; // ISO 8601 em UTC
  asOf: string; // ISO 8601 em UTC
};
