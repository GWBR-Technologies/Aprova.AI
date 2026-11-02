import type { EssayFailureCode, EssayStatus } from '@contracts/queries/get-essay.query.ts';

export type EssayRecord = {
  id: string;
  userId: string;
  text: string;
  status: EssayStatus;
  quotaPeriod: string;
  version: number;
  result: Record<string, unknown> | null;
  failureCode: EssayFailureCode | null;
  createdAt: Date;
};

export interface EssayRepository {
  /** false quando o essayId já existe. */
  insert(essay: { id: string; userId: string; commandId: string; text: string; quotaPeriod: string }): Promise<boolean>;
  find(id: string): Promise<EssayRecord | null>;
  /** Só altera redações em processamento; devolve null quando nada mudou. */
  complete(
    id: string,
    outcome: { result: Record<string, unknown>; promptVersion: string; model: string },
    at: Date,
  ): Promise<EssayRecord | null>;
  fail(id: string, failureCode: EssayFailureCode, at: Date): Promise<EssayRecord | null>;
}

export interface EssayQuotaRepository {
  /** Incrementa o uso se estiver abaixo do limite (§7.2 do guia); devolve o novo uso ou null se esgotada. */
  reserve(userId: string, period: string, limit: number): Promise<number | null>;
  release(userId: string, period: string): Promise<void>;
}

export type AiUsageRecord = {
  essayId: string;
  attempt: number;
  model: string;
  promptVersion: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export interface AiUsageRepository {
  record(usage: AiUsageRecord): Promise<void>;
  costSince(since: Date): Promise<number>;
}
