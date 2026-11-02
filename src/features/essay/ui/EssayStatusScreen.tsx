import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useSessionState } from '@/core/api/use-session';
import { discardCommand } from '@/core/outbox/instance';

import { useEssayScreenState, useOutboxOfResource } from '../queries/use-essay.query';
import { entitlementsQueryKey } from '../queries/query-keys';
import { useEssayAccess } from '../queries/use-essay-quota.query';
import { EssayStatusCard } from './EssayStatusCard';

export type EssayStatusScreenProps = {
  essayId: string;
  onEditAndResend: (commandId: string) => void;
  onClose: () => void;
};

export function EssayStatusScreen(props: EssayStatusScreenProps) {
  const session = useSessionState();
  if (session.status !== 'signedIn') return null;
  return <Status userId={session.userId} {...props} />;
}

function Status({ userId, essayId, onEditAndResend, onClose }: EssayStatusScreenProps & { userId: string }) {
  const state = useEssayScreenState(userId, essayId);
  const outbox = useOutboxOfResource(userId, essayId);
  const access = useEssayAccess(userId);
  const queryClient = useQueryClient();

  const quotaOrPlanRejection =
    state.kind === 'failed' && (state.reason === 'ESSAY_QUOTA_EXCEEDED' || state.reason === 'PREMIUM_REQUIRED');

  // Depois de uma rejeição de plano ou cota, a contagem local seria enganosa: revalida no servidor.
  useEffect(() => {
    if (quotaOrPlanRejection) void queryClient.invalidateQueries({ queryKey: entitlementsQueryKey });
  }, [quotaOrPlanRejection, queryClient]);

  const quota = access.data?.kind === 'premium' ? access.data.quota : null;

  return (
    <Screen>
      <AppText variant="title">Sua redação</AppText>
      <EssayStatusCard
        state={state}
        quota={quota}
        onEditAndResend={() => outbox && onEditAndResend(outbox.commandId)}
        onDiscard={() => {
          const discarding = outbox ? discardCommand(outbox.commandId) : Promise.resolve();
          void discarding.then(onClose);
        }}
      />
    </Screen>
  );
}
