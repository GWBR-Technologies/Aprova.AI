import { NotFound } from '../errors.ts';
import type { MockExamViewRow, ReadStore } from '../ports/read-models.port.ts';

import type { MockExamView } from '@contracts/queries/get-mock-exam-result.query.ts';

export function toMockExamView(row: MockExamViewRow): MockExamView {
  return {
    mockExamId: row.mockExamId,
    status: row.status,
    result: row.status === 'completed' ? row.result : null,
    createdAt: row.createdAt.toISOString(),
    asOf: row.asOf.toISOString(),
  };
}

export function makeGetMockExamResultHandler(deps: { reads: ReadStore }) {
  return async (userId: string, mockExamId: string): Promise<MockExamView> => {
    const row = await deps.reads.mockExam(userId, mockExamId);
    if (!row) throw new NotFound();
    return toMockExamView(row);
  };
}
