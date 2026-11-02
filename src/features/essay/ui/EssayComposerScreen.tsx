import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import type { CommandEnvelope } from '@contracts/commands/command-envelope';
import type { SubmitEssayPayload } from '@contracts/commands/submit-essay.command';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useSessionState } from '@/core/api/use-session';
import { discardCommand, getOutboxRow } from '@/core/outbox/instance';
import { formatDayMonth } from '@/hooks/format-day-month';

import { submitEssay } from '../commands/submit-essay.command';
import { useEssayAccess } from '../queries/use-essay-quota.query';
import { PremiumGate } from './PremiumGate';

export type EssayComposerScreenProps = {
  /** Comando rejeitado cujo texto volta ao editor para ser corrigido e reenviado. */
  retryCommandId?: string;
  onSubmitted: (essayId: string) => void;
  /** Abre a captura da foto da folha, que vai substituir o texto digitado quando o envio existir. */
  onOpenPhoto?: () => void;
};

function textOfEnvelope(body: string | null): string {
  if (!body) return '';
  try {
    const envelope = JSON.parse(body) as CommandEnvelope<SubmitEssayPayload>;
    return typeof envelope.payload?.text === 'string' ? envelope.payload.text : '';
  } catch {
    return '';
  }
}

export function EssayComposerScreen(props: EssayComposerScreenProps) {
  const session = useSessionState();
  if (session.status !== 'signedIn') return null;
  return <Composer userId={session.userId} {...props} />;
}

function Composer({ userId, retryCommandId, onSubmitted, onOpenPhoto }: EssayComposerScreenProps & { userId: string }) {
  const access = useEssayAccess(userId);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (!retryCommandId) return;
    let active = true;
    getOutboxRow(retryCommandId).then((row) => {
      if (active && row) setText(textOfEnvelope(row.body));
    });
    return () => {
      active = false;
    };
  }, [retryCommandId]);

  if (access.isPending) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel="Carregando seu plano" />
        <AppText tone="muted">Carregando seu plano…</AppText>
      </Screen>
    );
  }

  if (access.isError) {
    return (
      <Screen>
        <Banner tone="error" announce message="Não foi possível carregar seu plano. Verifique a conexão e tente de novo.">
          <Button label="Tentar de novo" variant="outline" onPress={() => void access.refetch()} />
        </Banner>
      </Screen>
    );
  }

  if (access.data.kind === 'locked') {
    return (
      <Screen>
        <AppText variant="title">Nova redação</AppText>
        <PremiumGate />
      </Screen>
    );
  }

  const { quota } = access.data;
  const exhausted = quota.remaining === 0;
  const empty = text.trim().length === 0;
  const blockedReason = exhausted
    ? `Você usou as ${quota.limit} correções deste mês. Renova em ${formatDayMonth(quota.resetsAt)}.`
    : empty
      ? 'Escreva a redação para poder enviar.'
      : undefined;

  async function handleSubmit() {
    setSubmitting(true);
    setSaveFailed(false);
    try {
      const { essayId } = await submitEssay(userId, text.trim());
      if (retryCommandId) await discardCommand(retryCommandId);
      onSubmitted(essayId);
    } catch {
      setSaveFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      footer={
        <Button
          label="Enviar para correção"
          variant="accent"
          loading={submitting}
          disabled={exhausted || empty}
          disabledReason={blockedReason}
          onPress={() => void handleSubmit()}
        />
      }
    >
      <AppText variant="title">Nova redação</AppText>
      <AppText tone="muted">
        {exhausted
          ? `Você usou as ${quota.limit} correções deste mês. Renova em ${formatDayMonth(quota.resetsAt)}.`
          : `Restam ${quota.remaining} de ${quota.limit} correções neste mês. Renova em ${formatDayMonth(quota.resetsAt)}.`}
      </AppText>

      {saveFailed ? (
        <Banner tone="error" announce message="Não foi possível guardar a redação neste aparelho. Tente de novo." />
      ) : null}

      <View style={styles.field}>
        <AppText variant="bodyStrong">Texto da redação</AppText>
        <TextInput
          accessibilityLabel="Texto da redação"
          multiline
          textAlignVertical="top"
          value={text}
          onChangeText={setText}
          editable={!submitting}
          style={styles.input}
          placeholderTextColor={Colors.inkMuted}
        />
        <AppText variant="caption" tone="muted">
          {text.length} caracteres
        </AppText>
      </View>
      {onOpenPhoto ? <Button label="Fotografar a folha" variant="outline" onPress={onOpenPhoto} /> : null}
      <AppText variant="caption" tone="muted">
        A correção é feita por IA e traz uma nota estimada. Não substitui a nota oficial da prova.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
  input: {
    ...Typography.body,
    minHeight: 280,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
    color: Colors.ink,
  },
});
