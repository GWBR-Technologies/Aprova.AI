import { useQuery } from '@tanstack/react-query';

import type { EntitlementsView } from '@contracts/queries/get-entitlements.query';

import { apiGet } from '@/core/api/http';

import { toEssayAccess } from './essay.mapper';
import { entitlementsQueryKey } from './query-keys';

/**
 * Plano e cota vêm sempre do servidor. `staleTime: 0` revalida ao abrir a tela de redação, e a
 * chave é invalidada depois de rejeições `PREMIUM_REQUIRED` e `ESSAY_QUOTA_EXCEEDED` (§7.5).
 */
export function useEssayAccess(userId: string) {
  return useQuery({
    queryKey: [...entitlementsQueryKey, userId],
    queryFn: () => apiGet<EntitlementsView>('/v1/me/entitlements'),
    staleTime: 0,
    select: toEssayAccess,
  });
}
