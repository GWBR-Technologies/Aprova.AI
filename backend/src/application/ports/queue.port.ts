import type { OutboxMessage } from '../messages.ts';

// Filas do §6 da arquitetura. `notifications` só entra quando a proposta P4 for aprovada.
export type QueueName = 'essay-correction' | 'mock-exam-processing' | 'projections' | 'dead-letter';

export type Delivery = {
  jobId: string;
  message: OutboxMessage;
  /** Tentativas que já falharam antes desta. */
  attemptsMade: number;
  maxAttempts: number;
};

export type MessageHandler = (delivery: Delivery) => Promise<void>;

export interface Consumer {
  pause(): Promise<void>;
  resume(): void;
  close(): Promise<void>;
}

export interface QueuePort {
  publish(queue: QueueName, message: OutboxMessage, opts: { jobId: string }): Promise<void>;
  consume(queue: QueueName, handler: MessageHandler, opts: { concurrency: number; ratePerMinute?: number }): Consumer;
  close(): Promise<void>;
}

/** Falha não recuperável: o adaptador encerra o job sem novas tentativas. */
export class PermanentFailure extends Error {}
