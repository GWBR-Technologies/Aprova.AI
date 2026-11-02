import { randomUUID } from 'node:crypto';

import pino from 'pino';
import { describe, expect, it } from 'vitest';

import { makeSubmitEssayHandler } from '../../src/application/commands/submit-essay.handler.ts';
import { type AiCorrection, type AiPort, PermanentAiError, TransientAiError } from '../../src/application/ports/ai.port.ts';
import { PermanentFailure } from '../../src/application/ports/queue.port.ts';
import { aiCostUsd, makeEssayCorrectionProcessor } from '../../src/workers/essay-correction/essay-correction.worker.ts';
import { memoryStore } from '../support/memory-store.ts';

// IA falsa e determinística: um dublê de teste, não dado de produto (§17 do guia).
const validOutput: AiCorrection = {
  raw: { resumo: 'saída de teste' },
  model: 'modelo-de-teste',
  usage: { inputTokens: 3_500, cachedInputTokens: 1_500, outputTokens: 1_000 },
};

function scriptedAi(steps: (AiCorrection | Error)[]) {
  let calls = 0;
  const ai: AiPort = {
    async correctEssay() {
      const step = steps[Math.min(calls, steps.length - 1)];
      calls += 1;
      if (step instanceof Error) throw step;
      return step!;
    },
  };
  return { ai, calls: () => calls };
}

async function setup(steps: (AiCorrection | Error)[]) {
  const store = memoryStore(() => new Date('2026-10-31T12:00:00Z'));
  store.setPlan('user-1', 'PREMIUM');
  const essayId = randomUUID();
  await makeSubmitEssayHandler({ uow: store.uow, now: () => new Date('2026-10-31T12:00:00Z'), newId: randomUUID, monthlyLimit: 4 })('user-1', {
    commandId: randomUUID(),
    issuedAt: '2026-10-31T12:00:00.000Z',
    payload: { essayId, text: 'Texto da redação.' },
  });
  const message = store.state.outbox[0]!.message;
  const fake = scriptedAi(steps);
  const process = makeEssayCorrectionProcessor({
    uow: store.uow,
    ai: fake.ai,
    logger: pino({ level: 'silent' }),
    now: () => new Date('2026-10-31T12:01:00Z'),
    newId: randomUUID,
    promptVersion: 'teste-v1',
    parseResult: (raw) => (typeof raw === 'object' && raw !== null && 'resumo' in raw ? { ...raw } : null),
    prices: { inputPerM: 1, cachedInputPerM: 0.05, outputPerM: 5 },
    timeoutMs: 1_000,
    maxInvalidOutputAttempts: 2,
  });
  const deliver = (attemptsMade: number) => process({ jobId: 'job-1', message, attemptsMade, maxAttempts: 5 });
  const outboxTypes = () => store.state.outbox.map((r) => r.message.type);
  return { store, essayId, deliver, calls: fake.calls, outboxTypes };
}

describe('Worker de correção de redação', () => {
  it('grava o resultado, publica EssayCorrected e mantém a cota consumida', async () => {
    const { store, essayId, deliver, outboxTypes } = await setup([validOutput]);
    await deliver(0);

    expect(store.state.essays.get(essayId)).toMatchObject({ status: 'completed', version: 2, promptVersion: 'teste-v1', model: 'modelo-de-teste' });
    expect(outboxTypes()).toEqual(['EssaySubmitted', 'EssayCorrected']);
    expect(store.state.outbox[1]?.message).toMatchObject({ aggregateVersion: 2 });
    expect(store.state.quota.get('user-1|2026-10')).toBe(1);
    expect(store.state.aiUsage).toHaveLength(1);
  });

  it('não chama a IA de novo numa reentrega do evento já processado', async () => {
    const { deliver, calls, outboxTypes } = await setup([validOutput]);
    await deliver(0);
    await deliver(0);

    expect(calls()).toBe(1);
    expect(outboxTypes()).toEqual(['EssaySubmitted', 'EssayCorrected']);
  });

  it('repete após erro transitório e conclui na tentativa seguinte', async () => {
    const { store, essayId, deliver } = await setup([new TransientAiError('429'), validOutput]);

    await expect(deliver(0)).rejects.toBeInstanceOf(TransientAiError);
    expect(store.state.essays.get(essayId)?.status).toBe('processing');
    await deliver(1);
    expect(store.state.essays.get(essayId)?.status).toBe('completed');
  });

  it('saída inválida repete uma vez e depois falha devolvendo a cota e indo para a dead-letter', async () => {
    const invalid: AiCorrection = { ...validOutput, raw: 'texto livre' };
    const { store, essayId, deliver, outboxTypes } = await setup([invalid]);

    await expect(deliver(0)).rejects.not.toBeInstanceOf(PermanentFailure);
    await expect(deliver(1)).rejects.toBeInstanceOf(PermanentFailure);

    expect(store.state.essays.get(essayId)).toMatchObject({ status: 'failed', failureCode: 'AI_INVALID_OUTPUT' });
    expect(store.state.quota.get('user-1|2026-10')).toBe(0);
    expect(outboxTypes()).toEqual(['EssaySubmitted', 'EssayCorrectionFailed', 'MessageDeadLettered']);
    expect(store.state.aiUsage).toHaveLength(2);
  });

  it('conta só saídas inválidas: tempo limite seguido de saída inválida ainda repete', async () => {
    const invalid: AiCorrection = { ...validOutput, raw: 'texto livre' };
    const { store, essayId, deliver } = await setup([new TransientAiError('timeout'), invalid, validOutput]);

    await expect(deliver(0)).rejects.toBeInstanceOf(TransientAiError);
    await expect(deliver(1)).rejects.not.toBeInstanceOf(PermanentFailure);
    await deliver(2);

    expect(store.state.essays.get(essayId)?.status).toBe('completed');
  });

  it('conteúdo recusado pela IA falha na hora, sem novas tentativas', async () => {
    const { store, essayId, deliver } = await setup([new PermanentAiError('recusado')]);

    await expect(deliver(0)).rejects.toBeInstanceOf(PermanentFailure);
    expect(store.state.essays.get(essayId)).toMatchObject({ status: 'failed', failureCode: 'AI_REJECTED' });
    expect(store.state.quota.get('user-1|2026-10')).toBe(0);
  });

  it('esgota as tentativas com erro transitório e encerra como PROCESSING_FAILED', async () => {
    const { store, essayId, deliver } = await setup([new TransientAiError('timeout')]);

    await expect(deliver(4)).rejects.toBeInstanceOf(PermanentFailure);
    expect(store.state.essays.get(essayId)).toMatchObject({ status: 'failed', failureCode: 'PROCESSING_FAILED' });
  });

  it('a devolução da cota nunca deixa o contador negativo', async () => {
    const { store, deliver } = await setup([new PermanentAiError('recusado')]);
    store.state.quota.set('user-1|2026-10', 0);

    await expect(deliver(0)).rejects.toBeInstanceOf(PermanentFailure);
    expect(store.state.quota.get('user-1|2026-10')).toBe(0);
  });
});

describe('aiCostUsd', () => {
  it('aplica os preços por milhão de tokens separando a entrada em cache', () => {
    expect(aiCostUsd(validOutput.usage, { inputPerM: 1, cachedInputPerM: 0.05, outputPerM: 5 })).toBeCloseTo(0.007075, 6);
  });
});
