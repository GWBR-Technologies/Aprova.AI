import type { OutboxMessage } from '../messages.ts';

export type PendingOutboxRow = { id: number; message: OutboxMessage };

export interface OutboxRepository {
  add(message: OutboxMessage): Promise<void>;
  /** Linhas ainda não publicadas, em ordem, bloqueadas com FOR UPDATE SKIP LOCKED. */
  claimPending(limit: number): Promise<PendingOutboxRow[]>;
  markPublished(ids: number[], at: Date): Promise<void>;
  recordFailure(ids: number[], error: string): Promise<void>;
  /** Devolve à publicação os eventos cujo agregado continua em processamento (§8.4 do guia). */
  requeueStalled(publishedBefore: Date): Promise<number>;
  deletePublishedBefore(before: Date): Promise<number>;
}
