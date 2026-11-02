import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Spacing } from '@/constants/theme';
import { useUpdatedAgo } from '@/hooks/relative-time';

import type { EssayScreenState } from '../queries/essay.mapper';
import { failureCopy, stateMessage } from './essay-messages';

export type EssayStatusCardProps = {
  state: EssayScreenState;
  quota: { limit: number; resetsAt: string } | null;
  onEditAndResend: () => void;
  onDiscard: () => void;
};

export function EssayStatusCard({ state, quota, onEditAndResend, onDiscard }: EssayStatusCardProps) {
  const updatedAgo = useUpdatedAgo(state.kind === 'completed' ? state.asOf : undefined);

  if (state.kind === 'failed') {
    const copy = failureCopy(state.reason, quota?.limit ?? null, quota?.resetsAt ?? null);
    const canResend = copy.recovery === 'edit-and-resend' || copy.recovery === 'resend';
    return (
      <Banner tone="error" announce message={copy.message}>
        <View style={styles.actions}>
          {canResend ? <Button label="Editar e reenviar" variant="outline" onPress={onEditAndResend} /> : null}
          <Button label="Descartar" variant="outline" onPress={onDiscard} />
        </View>
      </Banner>
    );
  }

  const message = stateMessage(state);
  switch (state.kind) {
    case 'sending':
      return (
        <Banner tone="info" announce message={message}>
          <ActivityIndicator accessibilityLabel="Enviando" />
        </Banner>
      );
    case 'received':
      return <Banner tone="success" announce message={message} />;
    case 'completed':
      return (
        <Banner tone="success" announce message={message}>
          {/* O formato do resultado depende da rubrica de correção, ainda em aberto. */}
          <AppText tone="muted">
            Sua correção está pronta, mas esta versão do app ainda não exibe o resultado.
          </AppText>
          {updatedAgo ? <AppText variant="caption" tone="muted">{updatedAgo}</AppText> : null}
        </Banner>
      );
    case 'loading':
      return <ActivityIndicator accessibilityLabel="Carregando" />;
    case 'queued-locally':
    case 'not-found':
      return <Banner tone={state.kind === 'queued-locally' ? 'warning' : 'error'} announce message={message} />;
    case 'processing':
      return <Banner tone="info" announce={!state.stalled} message={message} />;
  }
}

const styles = StyleSheet.create({
  actions: { gap: Spacing.two, marginTop: Spacing.two },
});
