import { randomUUID } from 'node:crypto';

import { type AiPort, PermanentAiError } from '../application/ports/ai.port.ts';
import type { QueueName } from '../application/ports/queue.port.ts';
import { openAiAdapter } from '../infrastructure/ai/openai.ai.adapter.ts';
import { essayCorrectionPrompts } from '../infrastructure/ai/prompts/essay-correction.prompt.ts';
import { createLogger } from '../infrastructure/observability/logger.ts';
import { createMetrics, type Metrics, startMetricsServer } from '../infrastructure/observability/metrics.ts';
import { createDatabase } from '../infrastructure/persistence/database.ts';
import { drizzleUnitOfWork } from '../infrastructure/persistence/unit-of-work.ts';
import { bullmqQueue } from '../infrastructure/queue/bullmq.queue.adapter.ts';
import { createProducerConnection, createWorkerConnection } from '../infrastructure/queue/connections.ts';
import { type AiPrices, aiCostUsd, makeEssayCorrectionProcessor } from '../workers/essay-correction/essay-correction.worker.ts';
import { makeProjectionsProcessor } from '../workers/projections/projections.worker.ts';
import { intEnv, numberEnv, optionalEnv, requireEnv, requirePositiveInt } from './env.ts';
import { onShutdown } from './shutdown.ts';

const PROJECTIONS_CONCURRENCY = 5;
const MAX_INVALID_OUTPUT_ATTEMPTS = 2;
const ALL_QUEUES: QueueName[] = ['essay-correction', 'mock-exam-processing', 'projections', 'dead-letter'];

const logger = createLogger('worker', optionalEnv('LOG_LEVEL'));
const metrics = createMetrics('worker');
const redisUrl = requireEnv('REDIS_URL');
const db = createDatabase(requireEnv('DATABASE_URL'));
const producer = createProducerConnection(redisUrl, logger);
const queue = bullmqQueue({ producer, createWorkerConnection: () => createWorkerConnection(redisUrl, logger), logger });
const uow = drizzleUnitOfWork(db);
const now = () => new Date();

queue.port.consume('projections', makeProjectionsProcessor({ uow, logger }), { concurrency: PROJECTIONS_CONCURRENCY });

/** Conta chamadas, tokens e custo da IA sem mudar o comportamento do adaptador. */
function metered(ai: AiPort, prices: AiPrices, m: Metrics): AiPort {
  return {
    async correctEssay(input, opts) {
      try {
        const correction = await ai.correctEssay(input, opts);
        m.aiRequests.inc({ outcome: 'success' });
        m.aiTokens.inc({ kind: 'input' }, correction.usage.inputTokens);
        m.aiTokens.inc({ kind: 'cached_input' }, correction.usage.cachedInputTokens);
        m.aiTokens.inc({ kind: 'output' }, correction.usage.outputTokens);
        m.aiCost.inc(aiCostUsd(correction.usage, prices));
        return correction;
      } catch (err) {
        m.aiRequests.inc({ outcome: err instanceof PermanentAiError ? 'rejected' : 'failed' });
        throw err;
      }
    },
  };
}

// A correção depende do prompt e da rubrica do produto. Sem a versão configurada registrada, a fila
// não é consumida: as redações aceitas continuam nela, sem se perder, até o Worker poder atendê-las.
const promptVersion = optionalEnv('AI_PROMPT_VERSION');
const prompt = promptVersion ? essayCorrectionPrompts[promptVersion] : undefined;
if (prompt) {
  const prices: AiPrices = {
    inputPerM: numberEnv('AI_PRICE_INPUT_PER_M') ?? fail('AI_PRICE_INPUT_PER_M'),
    cachedInputPerM: numberEnv('AI_PRICE_CACHED_INPUT_PER_M') ?? fail('AI_PRICE_CACHED_INPUT_PER_M'),
    outputPerM: numberEnv('AI_PRICE_OUTPUT_PER_M') ?? fail('AI_PRICE_OUTPUT_PER_M'),
  };
  const timeoutMs = requirePositiveInt('AI_TIMEOUT_MS');
  const ai = openAiAdapter({ apiKey: requireEnv('OPENAI_API_KEY'), model: requireEnv('AI_MODEL'), timeoutMs, prompts: essayCorrectionPrompts });
  queue.port.consume(
    'essay-correction',
    makeEssayCorrectionProcessor({
      uow,
      ai: metered(ai, prices, metrics),
      logger,
      now,
      newId: randomUUID,
      promptVersion: prompt.version,
      parseResult: (raw) => {
        const parsed = prompt.resultSchema.safeParse(raw);
        return parsed.success ? parsed.data : null;
      },
      prices,
      timeoutMs,
      maxInvalidOutputAttempts: MAX_INVALID_OUTPUT_ATTEMPTS,
    }),
    { concurrency: intEnv('ESSAY_WORKER_CONCURRENCY', 2), ratePerMinute: numberEnv('ESSAY_RATE_LIMIT_PER_MIN') },
  );
} else {
  logger.warn({ promptVersion }, 'Prompt de correção não registrado: a fila essay-correction não será consumida');
}

// A fila mock-exam-processing só ganha consumidor quando as regras de simulado forem definidas
// pelo produto; até lá os jobs aguardam nela.

const metricsServer = startMetricsServer(
  intEnv('METRICS_PORT', 9100),
  async () => `${await metrics.registry.metrics()}\n${await queue.prometheusMetrics(ALL_QUEUES)}`,
  metrics.registry.contentType,
);
logger.info({}, 'Workers iniciados');

onShutdown(logger, async () => {
  // Fecha os Workers primeiro: o job em andamento termina antes de o banco ser desconectado.
  await queue.port.close();
  metricsServer.close();
  await Promise.all([db.$client.end(), producer.quit()]);
});

function fail(name: string): never {
  throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
}
