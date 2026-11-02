import type { PushNotice } from '@contracts/events/push-notice.event';

const TYPES: readonly PushNotice['type'][] = ['EssayCorrected', 'EssayCorrectionFailed', 'MockExamProcessed'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida o corpo de um push: o dado vem de fora do app, então só um aviso bem formado
 * (`type` conhecido e identificadores UUID) é aceito. Qualquer outro campo é ignorado.
 */
export function parsePushNotice(data: unknown): PushNotice | null {
  if (typeof data !== 'object' || data === null) return null;
  const { type, aggregateId, correlationId } = data as Record<string, unknown>;

  const knownType = TYPES.find((candidate) => candidate === type);
  if (!knownType) return null;
  if (typeof aggregateId !== 'string' || !UUID.test(aggregateId)) return null;
  if (typeof correlationId !== 'string' || !UUID.test(correlationId)) return null;

  return { type: knownType, aggregateId, correlationId };
}

/** Telas permitidas para abrir a partir de um aviso; os demais tipos só invalidam consultas. */
export function routeForNotice(notice: PushNotice): string | null {
  switch (notice.type) {
    case 'EssayCorrected':
    case 'EssayCorrectionFailed':
      return `/redacao/${notice.aggregateId}`;
    case 'MockExamProcessed':
      return null;
  }
}
