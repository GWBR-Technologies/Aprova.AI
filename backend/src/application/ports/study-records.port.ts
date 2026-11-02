import type { MockExamStatus } from '@contracts/queries/get-mock-exam-result.query.ts';

type StudyRecord = { id: string; userId: string; commandId: string; payload: Record<string, unknown> };

export interface QuestionAnswerRepository {
  insert(answer: StudyRecord & { answeredAt: Date }): Promise<void>;
}

export interface RoutineProgressRepository {
  insert(progress: StudyRecord & { recordedAt: Date }): Promise<void>;
}

export type MockExamRecord = {
  id: string;
  userId: string;
  status: MockExamStatus;
  version: number;
  result: Record<string, unknown> | null;
  createdAt: Date;
};

export interface MockExamRepository {
  /** false quando o mockExamId já existe. */
  insert(mockExam: StudyRecord): Promise<boolean>;
  find(id: string): Promise<MockExamRecord | null>;
}
