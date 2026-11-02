export type MockExamStatus = 'processing' | 'completed' | 'failed';

export type MockExamView = {
  mockExamId: string;
  status: MockExamStatus;
  // Formato definido pelas regras de simulado (em aberto com o produto).
  result: Record<string, unknown> | null;
  createdAt: string; // ISO 8601 em UTC
  asOf: string; // ISO 8601 em UTC
};
