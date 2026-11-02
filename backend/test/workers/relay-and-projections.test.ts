import { randomUUID } from 'node:crypto';

import pino from 'pino';
import { describe, expect, it } from 'vitest';

import { makeAnswerQuestionHandler } from '../../src/application/commands/answer-question.handler.ts';
import { makeCompleteMockExamHandler } from '../../src/application/commands/complete-mock-exam.handler.ts';
import type { OutboxMessage } from '../../src/application/messages.ts';
import type { QueueName, QueuePort } from '../../src/application/ports/queue.port.ts';
import { makeProjectionsProcessor } from '../../src/workers/projections/projections.worker.ts';
import { relayOnce } from '../../src/workers/relay/outbox-relay.ts';
import { memoryStore } from '../support/memory-store.ts';

const logger = pino({ level: 'silent' });

function fakeQueue(failOn?: QueueName) {
  const published: { queue: QueueName; message: OutboxMessage; jobId: string }[] = [];
  const port: QueuePort = {
    async publish(queue, message, opts) {
      if (queue === failOn) throw new Error('Redis fora do ar');
      published.push({ queue, message, jobId: opts.jobId });
    },
    consume: () => {
      throw new Error('não usado');
    },
    close: async () => undefined,
  };
  return { port, published };
}

const command = <P>(payload: P) => ({ commandId: randomUUID(), issuedAt: '2026-10-31T12:00:00.000Z', payload });

describe('relay do outbox', () => {
  it('publica em cada fila de destino com jobId determinístico e marca como publicado', async () => {
    const store = memoryStore();
    const deps = { uow: store.uow, now: () => new Date(), newId: randomUUID };
    const cmd = command({ mockExamId: randomUUID() });
    await makeCompleteMockExamHandler(deps)('user-1', cmd);
    const queue = fakeQueue();

    await expect(relayOnce({ uow: store.uow, queue: queue.port, now: () => new Date() })).resolves.toBe(1);
    expect(queue.published.map((p) => p.queue)).toEqual(['mock-exam-processing', 'projections']);
    expect(queue.published[0]?.jobId).toBe(`MockExamCompleted_${cmd.payload.mockExamId}_${cmd.commandId}`);
    await expect(relayOnce({ uow: store.uow, queue: queue.port, now: () => new Date() })).resolves.toBe(0);
  });

  it('mantém o lote pendente e registra a falha quando a fila está fora do ar', async () => {
    const store = memoryStore();
    await makeAnswerQuestionHandler({ uow: store.uow, now: () => new Date(), newId: randomUUID })('user-1', command({}));

    await expect(relayOnce({ uow: store.uow, queue: fakeQueue('projections').port, now: () => new Date() })).rejects.toThrow();
    expect(store.state.outbox[0]).toMatchObject({ publishedAt: null, attempts: 1, lastError: 'Redis fora do ar' });

    const recovered = fakeQueue();
    await expect(relayOnce({ uow: store.uow, queue: recovered.port, now: () => new Date() })).resolves.toBe(1);
  });

  it('reconciliador republica simulado ainda em processamento depois do limite', async () => {
    const store = memoryStore();
    await makeCompleteMockExamHandler({ uow: store.uow, now: () => new Date(), newId: randomUUID })('user-1', command({ mockExamId: randomUUID() }));
    await relayOnce({ uow: store.uow, queue: fakeQueue().port, now: () => new Date('2026-10-31T12:00:00Z') });

    const requeued = await store.uow.run((tx) => tx.outbox.requeueStalled(new Date('2026-10-31T12:20:00Z')));
    expect(requeued).toBe(1);
    expect(store.state.outbox[0]?.publishedAt).toBeNull();
  });
});

describe('projeções', () => {
  it('cria a visão do simulado e ignora reentrega', async () => {
    let now = new Date('2026-10-31T12:00:00Z');
    const store = memoryStore(() => now);
    const cmd = command({ mockExamId: randomUUID() });
    await makeCompleteMockExamHandler({ uow: store.uow, now: () => now, newId: randomUUID })('user-1', cmd);
    const message = store.state.outbox[0]!.message;
    const project = makeProjectionsProcessor({ uow: store.uow, logger });

    await project({ jobId: 'j', message, attemptsMade: 0, maxAttempts: 5 });
    now = new Date('2026-10-31T12:05:00Z');
    await project({ jobId: 'j', message, attemptsMade: 0, maxAttempts: 5 });

    expect(store.state.mockExamView.get(cmd.payload.mockExamId)).toMatchObject({ status: 'processing', aggregateVersion: 1, userId: 'user-1' });
    expect(store.state.mockExamView.get(cmd.payload.mockExamId)?.asOf).toEqual(new Date('2026-10-31T12:00:00Z'));
  });

  it('aceita evento sem projetor sem falhar o job', async () => {
    const store = memoryStore();
    await makeAnswerQuestionHandler({ uow: store.uow, now: () => new Date(), newId: randomUUID })('user-1', command({}));
    const project = makeProjectionsProcessor({ uow: store.uow, logger });

    await expect(project({ jobId: 'j', message: store.state.outbox[0]!.message, attemptsMade: 0, maxAttempts: 5 })).resolves.toBeUndefined();
  });
});
