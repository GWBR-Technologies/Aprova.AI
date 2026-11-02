import type { Tx } from '../ports/unit-of-work.port.ts';

/**
 * Projeta o estado atual da redação em read.essay_view. Lê o write store em vez de copiar dados do
 * evento: o texto e o resultado não passam pelo Redis, e um evento atrasado nunca regride a linha,
 * porque a versão aplicada é a do agregado (§11.1 do guia).
 */
export async function projectEssayView(tx: Tx, essayId: string): Promise<boolean> {
  const essay = await tx.essays.find(essayId);
  if (!essay) return false;
  return tx.readModels.upsertEssayView({
    essayId: essay.id,
    userId: essay.userId,
    status: essay.status,
    result: essay.result,
    failureCode: essay.failureCode,
    aggregateVersion: essay.version,
    createdAt: essay.createdAt,
  });
}
