import { type AiPort, type AiUsage, PermanentAiError } from '../../application/ports/ai.port.ts';
import type { Logger } from '../../application/ports/logger.port.ts';
import { type Delivery, type MessageHandler, PermanentFailure } from '../../application/ports/queue.port.ts';
import type { UnitOfWork } from '../../application/ports/unit-of-work.port.ts';

import type { EssaySubmitted } from '@contracts/events/essay.event.ts';
import type { EssayFailureCode } from '@contracts/queries/get-essay.query.ts';

const CONSUMER = 'essay-correction';

/** Preços por 1 milhão de tokens (§10.5 do guia), vindos da configuração. */
export type AiPrices = { inputPerM: number; cachedInputPerM: number; outputPerM: number };

type Deps = {
  uow: UnitOfWork;
  ai: AiPort;
  logger: Logger;
  now: () => Date;
  newId: () => string;
  promptVersion: string;
  /** Valida a saída bruta contra o esquema da versão do prompt; null quando ela não serve. */
  parseResult: (raw: unknown) => Record<string, unknown> | null;
  prices: AiPrices;
  timeoutMs: number;
  /** Saídas inválidas aceitas antes da falha permanente (proposta inicial: 2). */
  maxInvalidOutputAttempts: number;
};

class InvalidAiOutput extends Error {
  readonly final: boolean;

  constructor(final: boolean) {
    super('Saída da IA fora do esquema');
    this.final = final;
  }
}

export function aiCostUsd(usage: AiUsage, prices: AiPrices): number {
  const uncached = Math.max(usage.inputTokens - usage.cachedInputTokens, 0);
  return (uncached * prices.inputPerM + usage.cachedInputTokens * prices.cachedInputPerM + usage.outputTokens * prices.outputPerM) / 1_000_000;
}

/**
 * Pipeline do §10.1 do guia. O registro do eventId acontece só na transação que grava o resultado
 * (ou a falha), e a IA é chamada fora de transação para não segurar conexão do banco.
 */
export function makeEssayCorrectionProcessor(deps: Deps): MessageHandler {
  async function failPermanently(delivery: Delivery, message: EssaySubmitted, failureCode: EssayFailureCode, reason: string): Promise<never> {
    const now = deps.now();
    await deps.uow.run(async (tx) => {
      if (!(await tx.processedEvents.claim(CONSUMER, message.eventId))) return;
      const failed = await tx.essays.fail(message.aggregateId, failureCode, now);
      if (!failed) return;
      // A cota volta na mesma transação que grava a falha (§7.2 do guia).
      await tx.essayQuota.release(failed.userId, failed.quotaPeriod);
      await tx.outbox.add({
        eventId: deps.newId(),
        type: 'EssayCorrectionFailed',
        version: 1,
        occurredAt: now.toISOString(),
        aggregateId: failed.id,
        aggregateVersion: failed.version,
        correlationId: message.correlationId,
        causationId: message.eventId,
        payload: { essayId: failed.id, userId: failed.userId, failureCode },
      });
      await tx.outbox.add({
        eventId: deps.newId(),
        type: 'MessageDeadLettered',
        version: 1,
        occurredAt: now.toISOString(),
        aggregateId: failed.id,
        aggregateVersion: failed.version,
        correlationId: message.correlationId,
        causationId: message.eventId,
        payload: { queue: CONSUMER, jobId: delivery.jobId, attempts: delivery.attemptsMade + 1, error: reason, original: message },
      });
    });
    deps.logger.warn({ correlationId: message.correlationId, eventId: message.eventId, failureCode }, 'Correção encerrada com falha permanente');
    throw new PermanentFailure(reason);
  }

  async function correct(delivery: Delivery, message: EssaySubmitted) {
    const pending = await deps.uow.run(async (tx) =>
      (await tx.processedEvents.has(CONSUMER, message.eventId)) ? null : tx.essays.find(message.aggregateId),
    );
    if (!pending || pending.status !== 'processing') return;

    const correction = await deps.ai.correctEssay(
      { essayText: pending.text, promptVersion: deps.promptVersion },
      { signal: AbortSignal.timeout(deps.timeoutMs) },
    );

    // Registrado também quando a saída é inválida, porque a chamada foi cobrada. Enquanto a redação
    // está em processamento, cada linha de ai_usage dela é uma resposta que não pôde ser gravada:
    // a contagem limita as saídas inválidas, sem contar tempos limite e erros 5xx.
    const responses = await deps.uow.run(async (tx) => {
      await tx.aiUsage.record({
        essayId: pending.id,
        attempt: delivery.attemptsMade + 1,
        model: correction.model,
        promptVersion: deps.promptVersion,
        ...correction.usage,
        costUsd: aiCostUsd(correction.usage, deps.prices),
      });
      return tx.aiUsage.countForEssay(pending.id);
    });

    const result = deps.parseResult(correction.raw);
    if (!result) throw new InvalidAiOutput(responses >= deps.maxInvalidOutputAttempts);

    const now = deps.now();
    await deps.uow.run(async (tx) => {
      if (!(await tx.processedEvents.claim(CONSUMER, message.eventId))) return;
      const completed = await tx.essays.complete(pending.id, { result, promptVersion: deps.promptVersion, model: correction.model }, now);
      if (!completed) return;
      await tx.outbox.add({
        eventId: deps.newId(),
        type: 'EssayCorrected',
        version: 1,
        occurredAt: now.toISOString(),
        aggregateId: completed.id,
        aggregateVersion: completed.version,
        correlationId: message.correlationId,
        causationId: message.eventId,
        payload: { essayId: completed.id, userId: completed.userId },
      });
    });
    deps.logger.info({ correlationId: message.correlationId, eventId: message.eventId }, 'Redação corrigida');
  }

  return async (delivery) => {
    const { message } = delivery;
    if (message.type !== 'EssaySubmitted') throw new PermanentFailure(`Evento inesperado: ${message.type}`);
    const attempt = delivery.attemptsMade + 1;
    const isLastAttempt = attempt >= delivery.maxAttempts;
    try {
      await correct(delivery, message);
    } catch (err) {
      // Erros comuns são transitórios: o BullMQ repete com backoff. As falhas abaixo encerram o job.
      if (err instanceof PermanentAiError) await failPermanently(delivery, message, 'AI_REJECTED', err.message);
      if (err instanceof InvalidAiOutput && (err.final || isLastAttempt)) {
        await failPermanently(delivery, message, 'AI_INVALID_OUTPUT', err.message);
      }
      if (isLastAttempt) await failPermanently(delivery, message, 'PROCESSING_FAILED', err instanceof Error ? err.message : 'erro desconhecido');
      throw err;
    }
  };
}
