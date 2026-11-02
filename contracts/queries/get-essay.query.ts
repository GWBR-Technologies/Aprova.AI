export type EssayStatus = 'processing' | 'completed' | 'failed';

/** Motivo da falha permanente da correção; o app mostra uma mensagem e a ação de reenviar. */
export type EssayFailureCode = 'AI_REJECTED' | 'AI_INVALID_OUTPUT' | 'PROCESSING_FAILED';

export type EssayView = {
  essayId: string;
  status: EssayStatus;
  // Formato definido pela rubrica de correção (em aberto com o produto).
  result: Record<string, unknown> | null;
  failure: { code: EssayFailureCode } | null;
  createdAt: string; // ISO 8601 em UTC
  asOf: string; // ISO 8601 em UTC
};
