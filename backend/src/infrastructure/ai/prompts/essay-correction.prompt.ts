import type OpenAI from 'openai';
import type { z } from 'zod';

/**
 * Uma versão do prompt de correção. O conteúdo (instruções, rubrica, formato do resultado) vem do
 * produto e não é definido pela engenharia (§10.4 do guia). Cada versão nasce num arquivo próprio,
 * `essay-correction.v<N>.ts`, e entra no registro abaixo.
 */
export type EssayCorrectionPrompt = {
  version: string;
  /** Prefixo estável (instruções e rubrica), enviado primeiro para aproveitar o cache de entrada. */
  instructions: string;
  /** Monta a entrada com o texto da redação por último. Nunca inclui dados do aluno. */
  buildInput: (essayText: string) => string;
  /** Formato de saída estruturada pedido ao modelo, conforme a documentação da API. */
  textFormat?: OpenAI.Responses.ResponseTextConfig;
  /** Esquema do resultado; a saída da IA só é gravada depois de passar por ele. */
  resultSchema: z.ZodType<Record<string, unknown>>;
};

// Vazio até o produto entregar o prompt e a rubrica: sem versão registrada, o Worker de correção
// não consome a fila e as redações aceitas aguardam nela, sem se perder.
export const essayCorrectionPrompts: Record<string, EssayCorrectionPrompt> = {};
