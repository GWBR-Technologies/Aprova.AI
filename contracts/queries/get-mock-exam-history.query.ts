import type { MockExamView } from './get-mock-exam-result.query.ts';

export type MockExamHistoryRequest = {
  before?: string; // createdAt do último item recebido (ISO 8601), para a próxima página
  limit?: number; // de 1 a 100; padrão 20
};

export type MockExamHistoryView = {
  items: Omit<MockExamView, 'asOf'>[];
  nextBefore: string | null;
  asOf: string; // ISO 8601 em UTC
};
