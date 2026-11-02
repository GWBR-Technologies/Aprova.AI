export type AiUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};

export type AiCorrection = {
  raw: unknown; // saída bruta; só o Worker a vê e ela é validada antes de qualquer uso
  model: string;
  usage: AiUsage;
};

export interface AiPort {
  correctEssay(input: { essayText: string; promptVersion: string }, opts: { signal: AbortSignal }): Promise<AiCorrection>;
}

/** Tempo limite, 429 ou 5xx: o BullMQ repete. */
export class TransientAiError extends Error {}

/** Conteúdo rejeitado ou requisição inválida: sem novas tentativas. */
export class PermanentAiError extends Error {}
