import type { QueryClient } from '@tanstack/react-query';

import type { PushNotice } from '@contracts/events/push-notice.event';

import { entitlementsQueryKey, essayQueryKey } from '../queries/query-keys';

/**
 * Reação a um aviso de redação: invalida a consulta do `aggregateId` (o `asOf` novo substitui o
 * antigo) e a de direitos, porque uma falha permanente devolve a cota. Avisos de outros tipos
 * são ignorados.
 */
export function handleEssayNotice(notice: PushNotice, queryClient: QueryClient) {
  if (notice.type !== 'EssayCorrected' && notice.type !== 'EssayCorrectionFailed') return;
  void queryClient.invalidateQueries({ queryKey: essayQueryKey(notice.aggregateId) });
  void queryClient.invalidateQueries({ queryKey: entitlementsQueryKey });
}
