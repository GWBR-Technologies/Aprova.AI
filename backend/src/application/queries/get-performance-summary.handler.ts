import { NotFound } from '../errors.ts';
import type { ReadStore } from '../ports/read-models.port.ts';

import type { PerformanceSummaryView } from '@contracts/queries/get-performance-summary.query.ts';

/** 404 enquanto nenhuma projeção de desempenho foi aplicada para o usuário. */
export function makeGetPerformanceSummaryHandler(deps: { reads: ReadStore }) {
  return async (userId: string): Promise<PerformanceSummaryView> => {
    const row = await deps.reads.performanceSummary(userId);
    if (!row) throw new NotFound();
    return { data: row.data, asOf: row.asOf.toISOString() };
  };
}
