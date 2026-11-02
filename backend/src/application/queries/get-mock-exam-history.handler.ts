import type { ReadStore } from '../ports/read-models.port.ts';
import { toMockExamView } from './get-mock-exam-result.handler.ts';

import type { MockExamHistoryView } from '@contracts/queries/get-mock-exam-history.query.ts';

const DEFAULT_LIMIT = 20;

/** Página do histórico, do mais recente ao mais antigo, com cursor por createdAt. */
export function makeGetMockExamHistoryHandler(deps: { reads: ReadStore; now: () => Date }) {
  return async (userId: string, page: { before?: Date; limit?: number }): Promise<MockExamHistoryView> => {
    const limit = page.limit ?? DEFAULT_LIMIT;
    const rows = await deps.reads.mockExams(userId, { before: page.before ?? null, limit });
    const last = rows.at(-1);
    // asOf é a projeção mais recente da página; sem itens, é o instante da leitura.
    const asOf = rows.reduce((latest, r) => (r.asOf > latest ? r.asOf : latest), rows[0]?.asOf ?? deps.now());
    return {
      items: rows.map((row) => ({
        mockExamId: row.mockExamId,
        status: row.status,
        result: toMockExamView(row).result,
        createdAt: row.createdAt.toISOString(),
      })),
      nextBefore: rows.length === limit && last ? last.createdAt.toISOString() : null,
      asOf: asOf.toISOString(),
    };
  };
}
