import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useSessionState } from '@/core/api/use-session';
import { listOutbox } from '@/core/outbox/instance';
import type { OutboxRow } from '@/core/outbox/outbox';
import { formatDayMonth } from '@/hooks/format-day-month';

import { useEssayScreenState } from '../queries/use-essay.query';
import { stateMessage, failureCopy } from './essay-messages';

export type EssayListScreenProps = {
  onNewEssay: () => void;
  onOpenEssay: (essayId: string) => void;
};

export function EssayListScreen(props: EssayListScreenProps) {
  const session = useSessionState();
  if (session.status !== 'signedIn') return null;
  return <List userId={session.userId} {...props} />;
}

function List({ userId, onNewEssay, onOpenEssay }: EssayListScreenProps & { userId: string }) {
  const [rows, setRows] = useState<OutboxRow[] | null>(null);

  // O acompanhamento vem do outbox deste aparelho: a consulta `GetEssayList` ainda é só
  // proposta e não foi aprovada (§1.7 do guia).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listOutbox(userId).then((all) => {
        if (active) setRows(all.filter((row) => row.route === 'submit-essay' && row.resourceId));
      });
      return () => {
        active = false;
      };
    }, [userId]),
  );

  return (
    <Screen footer={<Button label="Nova redação" variant="accent" onPress={onNewEssay} />}>
      <AppText variant="title">Redação</AppText>
      {rows === null ? null : rows.length === 0 ? (
        <AppText tone="muted">Você ainda não enviou redações neste aparelho.</AppText>
      ) : (
        <View style={styles.list}>
          {rows.map((row) => (
            <EssayListItem key={row.commandId} userId={userId} row={row} onOpen={onOpenEssay} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function EssayListItem({ userId, row, onOpen }: { userId: string; row: OutboxRow; onOpen: (essayId: string) => void }) {
  const essayId = row.resourceId ?? '';
  const state = useEssayScreenState(userId, essayId);
  const label = state.kind === 'failed' ? failureCopy(state.reason, null, null).message : stateMessage(state);
  const date = formatDayMonth(new Date(row.createdAt).toISOString());

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Redação de ${date}. ${label}`}
      onPress={() => onOpen(essayId)}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <AppText variant="bodyStrong">Redação de {date}</AppText>
      <AppText tone="muted">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  item: {
    minHeight: MinTouchTarget,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
  },
  pressed: { backgroundColor: Colors.primaryTint },
});
