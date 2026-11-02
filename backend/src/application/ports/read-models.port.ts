import type { EssayFailureCode, EssayStatus } from '@contracts/queries/get-essay.query.ts';
import type { MockExamStatus } from '@contracts/queries/get-mock-exam-result.query.ts';

export type EssayViewRow = {
  essayId: string;
  userId: string;
  status: EssayStatus;
  result: Record<string, unknown> | null;
  failureCode: EssayFailureCode | null;
  aggregateVersion: number;
  createdAt: Date;
  asOf: Date;
};

export type MockExamViewRow = {
  mockExamId: string;
  userId: string;
  status: MockExamStatus;
  result: Record<string, unknown> | null;
  aggregateVersion: number;
  createdAt: Date;
  asOf: Date;
};

/** Escrita das projeções: só aplica quando a versão do agregado é maior que a já projetada. */
export interface ReadModelWriter {
  upsertEssayView(row: Omit<EssayViewRow, 'asOf'>): Promise<boolean>;
  upsertMockExamView(row: Omit<MockExamViewRow, 'asOf'>): Promise<boolean>;
}

/** Leitura do read store; toda leitura é filtrada pelo dono do dado. */
export interface ReadStore {
  essay(userId: string, essayId: string): Promise<EssayViewRow | null>;
  performanceSummary(userId: string): Promise<{ data: Record<string, unknown>; asOf: Date } | null>;
  mockExams(userId: string, page: { before: Date | null; limit: number }): Promise<MockExamViewRow[]>;
  mockExam(userId: string, mockExamId: string): Promise<MockExamViewRow | null>;
}
