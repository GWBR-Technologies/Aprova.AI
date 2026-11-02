import OpenAI, { APIConnectionError, APIError, APIUserAbortError } from 'openai';

import { type AiPort, PermanentAiError, TransientAiError } from '../../application/ports/ai.port.ts';
import type { EssayCorrectionPrompt } from './prompts/essay-correction.prompt.ts';

type Config = {
  apiKey: string;
  model: string;
  timeoutMs: number;
  prompts: Record<string, EssayCorrectionPrompt>;
  /** Permite apontar para um servidor falso nos testes. */
  baseURL?: string;
};

function parseOutput(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Adaptador do GPT 6.1 - Terra pela API Responses. As mensagens de erro carregam só o tipo e o
 * status: nunca o texto enviado, a resposta bruta ou o corpo de erro do provedor (§10.3 do guia).
 */
export function openAiAdapter(config: Config): AiPort {
  // Sem retentativas no SDK: quem repete é o BullMQ, com backoff, limite de taxa e contagem.
  const client = new OpenAI({ apiKey: config.apiKey, maxRetries: 0, timeout: config.timeoutMs, baseURL: config.baseURL });

  return {
    async correctEssay({ essayText, promptVersion }, { signal }) {
      const prompt = config.prompts[promptVersion];
      if (!prompt) throw new PermanentAiError(`Versão de prompt não registrada: ${promptVersion}`);

      try {
        const response = await client.responses.create(
          {
            model: config.model,
            instructions: prompt.instructions,
            input: prompt.buildInput(essayText),
            text: prompt.textFormat,
            store: false,
          },
          { signal },
        );
        return {
          raw: parseOutput(response.output_text),
          model: response.model,
          usage: {
            inputTokens: response.usage?.input_tokens ?? 0,
            cachedInputTokens: response.usage?.input_tokens_details.cached_tokens ?? 0,
            outputTokens: response.usage?.output_tokens ?? 0,
          },
        };
      } catch (err) {
        if (err instanceof APIUserAbortError || err instanceof APIConnectionError) {
          throw new TransientAiError('IA: tempo limite ou falha de conexão');
        }
        if (err instanceof APIError) {
          const status = err.status ?? 0;
          if (status === 408 || status === 409 || status === 429 || status >= 500) throw new TransientAiError(`IA: status ${status}`);
          // Chave inválida, sem permissão ou modelo inexistente são erros de configuração, não do
          // texto: a redação não deve ser marcada como recusada. As tentativas seguem até a correção.
          if (status === 401 || status === 403 || status === 404) throw new TransientAiError(`IA: configuração recusada com status ${status}`);
          throw new PermanentAiError(`IA: requisição recusada com status ${status}`);
        }
        throw err;
      }
    },
  };
}
