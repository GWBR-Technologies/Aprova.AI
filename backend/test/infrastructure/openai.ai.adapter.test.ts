import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { PermanentAiError, TransientAiError } from '../../src/application/ports/ai.port.ts';
import { openAiAdapter } from '../../src/infrastructure/ai/openai.ai.adapter.ts';
import type { EssayCorrectionPrompt } from '../../src/infrastructure/ai/prompts/essay-correction.prompt.ts';

// Servidor falso local no lugar da OpenAI: nenhuma chamada sai da máquina e nada é cobrado.
let server: Server;
let baseURL: string;
let nextStatus = 200;
let lastBody: { instructions?: string; input?: string; store?: boolean } = {};

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      lastBody = JSON.parse(raw);
      res.setHeader('content-type', 'application/json');
      res.statusCode = nextStatus;
      if (nextStatus !== 200) return res.end(JSON.stringify({ error: { message: 'detalhe interno do provedor', type: 'x' } }));
      res.end(
        JSON.stringify({
          id: 'resp_1',
          object: 'response',
          model: 'modelo-falso',
          output: [{ type: 'message', role: 'assistant', id: 'm1', status: 'completed', content: [{ type: 'output_text', text: '{"ok":true}', annotations: [] }] }],
          usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 40 }, output_tokens: 20, output_tokens_details: { reasoning_tokens: 0 }, total_tokens: 120 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const prompt: EssayCorrectionPrompt = {
  version: 'teste-v1',
  instructions: 'instruções de teste',
  buildInput: (text) => `REDAÇÃO:\n${text}`,
  resultSchema: z.record(z.string(), z.unknown()),
};

const adapter = () => openAiAdapter({ apiKey: 'chave-de-teste', model: 'modelo-falso', timeoutMs: 2_000, prompts: { 'teste-v1': prompt }, baseURL });
const signal = () => AbortSignal.timeout(2_000);

describe('openAiAdapter', () => {
  it('envia prefixo estável e texto por último e devolve saída e uso', async () => {
    nextStatus = 200;
    const result = await adapter().correctEssay({ essayText: 'meu texto', promptVersion: 'teste-v1' }, { signal: signal() });

    expect(lastBody).toMatchObject({ instructions: 'instruções de teste', input: 'REDAÇÃO:\nmeu texto', store: false });
    expect(result).toEqual({ raw: { ok: true }, model: 'modelo-falso', usage: { inputTokens: 100, cachedInputTokens: 40, outputTokens: 20 } });
  });

  it('traduz 429, 5xx e erros de configuração (401, 404) em erro transitório', async () => {
    for (const status of [429, 503, 401, 404]) {
      nextStatus = status;
      await expect(adapter().correctEssay({ essayText: 't', promptVersion: 'teste-v1' }, { signal: signal() })).rejects.toBeInstanceOf(TransientAiError);
    }
  });

  it('traduz 400 em erro permanente sem expor a mensagem do provedor', async () => {
    nextStatus = 400;
    const error = await adapter()
      .correctEssay({ essayText: 't', promptVersion: 'teste-v1' }, { signal: signal() })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PermanentAiError);
    expect(String(error)).not.toContain('detalhe interno');
  });

  it('recusa versão de prompt não registrada', async () => {
    await expect(adapter().correctEssay({ essayText: 't', promptVersion: 'v99' }, { signal: signal() })).rejects.toBeInstanceOf(PermanentAiError);
  });

  it('trata cancelamento por tempo limite como transitório', async () => {
    nextStatus = 200;
    await expect(
      adapter().correctEssay({ essayText: 't', promptVersion: 'teste-v1' }, { signal: AbortSignal.abort() }),
    ).rejects.toBeInstanceOf(TransientAiError);
  });
});
