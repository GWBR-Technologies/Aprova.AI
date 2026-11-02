import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { EssayView } from '@contracts/queries/get-essay.query';

import { ApiRequestError } from '@/core/api/errors';
import { apiGet } from '@/core/api/http';
import { nextPollInterval } from '@/core/events/poll-interval';
import { getOutboxRowByResource, observeOutbox } from '@/core/outbox/instance';
import type { OutboxRow } from '@/core/outbox/outbox';

import { deriveEssayScreenState, type EssayScreenState } from './essay.mapper';

export const essayQueryKey = (essayId: string) => ['essay', essayId] as const;

/**
 * `GetEssay`. O `404` logo depois do `202` é a projeção ainda não aplicada: só vira "em
 * processamento" (`null`) quando este aparelho tem a linha do outbox (§7.3); sem ela, é erro.
 */
export function useEssay(userId: string, essayId: string) {
  return useQuery({
    queryKey: essayQueryKey(essayId),
    queryFn: async (): Promise<EssayView | null> => {
      try {
        return await apiGet<EssayView>(`/v1/essays/${essayId}`);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          const local = await getOutboxRowByResource(userId, essayId);
          if (local?.state === 'received') return null;
        }
        throw error;
      }
    },
    // O app em segundo plano não consulta (padrão do TanStack Query); quem avisa é o push.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return nextPollInterval(query.state.dataUpdateCount + query.state.errorUpdateCount);
    },
  });
}

/** Linha do outbox para o recurso, atualizada a cada mudança de estado do envio. */
export function useOutboxOfResource(userId: string, essayId: string): OutboxRow | null {
  const [row, setRow] = useState<OutboxRow | null>(null);

  useEffect(() => {
    let active = true;
    let unobserve: (() => void) | null = null;

    const refresh = () =>
      getOutboxRowByResource(userId, essayId).then((found) => {
        if (active) setRow(found);
      });

    refresh().then(() => {
      if (!active) return;
      getOutboxRowByResource(userId, essayId).then((found) => {
        if (found && active) unobserve = observeOutbox(found.commandId, () => void refresh());
      });
    });

    return () => {
      active = false;
      unobserve?.();
    };
  }, [userId, essayId]);

  return row;
}

/** Combina outbox e consulta no estado único da tela de acompanhamento. */
export function useEssayScreenState(userId: string, essayId: string): EssayScreenState {
  const outbox = useOutboxOfResource(userId, essayId);
  const query = useEssay(userId, essayId);
  const queryState = useQueryClient().getQueryState(essayQueryKey(essayId));
  const view = query.isSuccess ? query.data : undefined;
  const received = outbox?.state === 'received';
  const pollingStopped =
    query.isFetched &&
    !query.isFetching &&
    view?.status !== 'completed' &&
    view?.status !== 'failed' &&
    nextPollInterval((queryState?.dataUpdateCount ?? 0) + (queryState?.errorUpdateCount ?? 0)) === false;

  return deriveEssayScreenState({
    outbox: outbox ? { state: outbox.state, lastErrorCode: outbox.lastErrorCode } : null,
    // Enquanto o envio não chegou ao servidor, a consulta ainda não tem o que mostrar.
    view: outbox && !received && outbox.state !== 'failed' ? undefined : view,
    pollingStopped,
  });
}
