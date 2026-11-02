import { NotFound } from '../errors.ts';
import type { ReadStore } from '../ports/read-models.port.ts';

import type { EssayView } from '@contracts/queries/get-essay.query.ts';

/**
 * Lê só read.essay_view, filtrando pelo dono. Logo depois do 202 a projeção ainda pode não existir:
 * o 404 é transitório e o app o trata como "em processamento" (§11.2 do guia).
 */
export function makeGetEssayHandler(deps: { reads: ReadStore }) {
  return async (userId: string, essayId: string): Promise<EssayView> => {
    const row = await deps.reads.essay(userId, essayId);
    if (!row) throw new NotFound();
    return {
      essayId: row.essayId,
      status: row.status,
      result: row.status === 'completed' ? row.result : null,
      failure: row.status === 'failed' && row.failureCode ? { code: row.failureCode } : null,
      createdAt: row.createdAt.toISOString(),
      asOf: row.asOf.toISOString(),
    };
  };
}
