import { type JobsOptions, Queue, UnrecoverableError, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { z } from 'zod';

import type { OutboxMessage } from '../../application/messages.ts';
import type { Logger } from '../../application/ports/logger.port.ts';
import { PermanentFailure, type QueueName, type QueuePort } from '../../application/ports/queue.port.ts';

// Propostas iniciais do §9.2 do guia, a calibrar no teste de carga. Esperas de 10, 20, 40 e 80 s
// entre as tentativas; sem retenção limitada, o BullMQ guardaria jobs concluídos para sempre.
export const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 10_000, jitter: 0.5 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: { count: 5_000 },
};

// O job vem do próprio outbox, mas é validado na borda antes de chegar a um processador.
const envelopeSchema = z.object({
  eventId: z.uuid(),
  type: z.enum([
    'QuestionAnswered',
    'RoutineProgressRecorded',
    'EssaySubmitted',
    'EssayCorrected',
    'EssayCorrectionFailed',
    'MockExamCompleted',
    'MockExamProcessed',
    'MessageDeadLettered',
  ]),
  version: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
  aggregateId: z.uuid(),
  aggregateVersion: z.number().int().positive(),
  correlationId: z.uuid(),
  causationId: z.uuid(),
  payload: z.record(z.string(), z.unknown()),
}) satisfies z.ZodType<Omit<OutboxMessage, 'payload'> & { payload: Record<string, unknown> }>;

type Connections = { producer: Redis; createWorkerConnection: () => Redis; logger: Logger };

export function bullmqQueue({ producer, createWorkerConnection, logger }: Connections) {
  const queues = new Map<QueueName, Queue<OutboxMessage>>();
  const workers: Worker<OutboxMessage>[] = [];

  const queueFor = (name: QueueName) => {
    let queue = queues.get(name);
    if (!queue) {
      queue = new Queue<OutboxMessage>(name, { connection: producer, defaultJobOptions });
      queues.set(name, queue);
    }
    return queue;
  };

  const port: QueuePort = {
    async publish(queue, message, opts) {
      const target = queueFor(queue);
      // Um job falho continua retido (removeOnFail) e faria o BullMQ ignorar a republicação com o
      // mesmo jobId. Quando o reconciliador republica um agregado parado, o job falho volta à fila
      // com as tentativas zeradas, em vez de a redação ficar presa em 'processing' (§8.4 do guia).
      const existing = await target.getJob(opts.jobId);
      if (existing && (await existing.isFailed())) {
        await existing.retry('failed', { resetAttemptsMade: true });
        return;
      }
      await target.add(message.type, message, { jobId: opts.jobId });
    },

    consume(queue, handler, opts) {
      const worker = new Worker<OutboxMessage>(
        queue,
        async (job) => {
          if (!envelopeSchema.safeParse(job.data).success) throw new UnrecoverableError('Envelope de evento inválido');
          try {
            await handler({
              jobId: job.id ?? '',
              message: job.data,
              attemptsMade: job.attemptsMade,
              maxAttempts: job.opts.attempts ?? 1,
            });
          } catch (err) {
            if (err instanceof PermanentFailure) throw new UnrecoverableError(err.message);
            throw err;
          }
        },
        {
          connection: createWorkerConnection(),
          concurrency: opts.concurrency,
          limiter: opts.ratePerMinute ? { max: opts.ratePerMinute, duration: 60_000 } : undefined,
        },
      );
      worker.on('failed', (job, err) => {
        logger.warn(
          { queue, jobId: job?.id, eventId: job?.data.eventId, correlationId: job?.data.correlationId, attemptsMade: job?.attemptsMade, err: err.message },
          'Job falhou',
        );
      });
      worker.on('error', (err) => logger.error({ queue, err }, 'Erro no Worker do BullMQ'));
      workers.push(worker);
      return {
        pause: () => worker.pause(),
        resume: () => worker.resume(),
        close: () => worker.close(),
      };
    },

    async close() {
      // Fechar o Worker espera o job em andamento terminar, o que minimiza jobs travados.
      await Promise.all(workers.map((w) => w.close()));
      await Promise.all([...queues.values()].map((q) => q.close()));
    },
  };

  return {
    port,
    /** Métricas das filas no formato do Prometheus (§9.6 do guia). */
    async prometheusMetrics(names: QueueName[]) {
      const texts = await Promise.all(names.map((name) => queueFor(name).exportPrometheusMetrics()));
      return texts.join('\n');
    },
  };
}
