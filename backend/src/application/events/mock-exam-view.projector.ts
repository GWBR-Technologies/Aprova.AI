import type { Tx } from '../ports/unit-of-work.port.ts';

/** Mesma estratégia do projetor de redações: estado atual do agregado, aplicado por versão. */
export async function projectMockExamView(tx: Tx, mockExamId: string): Promise<boolean> {
  const exam = await tx.mockExams.find(mockExamId);
  if (!exam) return false;
  return tx.readModels.upsertMockExamView({
    mockExamId: exam.id,
    userId: exam.userId,
    status: exam.status,
    result: exam.result,
    aggregateVersion: exam.version,
    createdAt: exam.createdAt,
  });
}
