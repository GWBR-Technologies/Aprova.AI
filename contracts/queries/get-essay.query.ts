export type EssayStatus = 'processing' | 'completed' | 'failed';

// GET /v1/essays/{essayId}
// O formato de `result` depende da rubrica de correção e `failure` não tem campos
// definidos nos guias; ambos ficam opacos até o produto e o Back-End os definirem.
export type EssayView = {
  essayId: string;
  status: EssayStatus;
  result?: Record<string, unknown>;
  failure?: Record<string, unknown>;
  asOf: string; // ISO 8601 em UTC
};
