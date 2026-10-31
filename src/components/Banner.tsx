import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAnnouncement } from '@/hooks/use-announcement';

type Tone = 'info' | 'success' | 'warning' | 'error';

const toneStyle: Record<Tone, { border: string; label: string; text: 'primary' | 'success' | 'warning' | 'error' }> = {
  info: { border: Colors.primary, label: 'Informação', text: 'primary' },
  success: { border: Colors.success, label: 'Sucesso', text: 'success' },
  warning: { border: Colors.warning, label: 'Atenção', text: 'warning' },
  error: { border: Colors.error, label: 'Erro', text: 'error' },
};

export type BannerProps = {
  tone: Tone;
  message: string;
  /** Anuncia a mudança a leitores de tela; cada texto novo é anunciado uma única vez. */
  announce?: boolean;
  children?: ReactNode;
};

// O estado é dito em texto ("Erro", "Sucesso"); a cor da borda apenas reforça.
export function Banner({ tone, message, announce = false, children }: BannerProps) {
  useAnnouncement(announce ? message : null);
  const style = toneStyle[tone];

  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessible
      accessibilityLabel={`${style.label}. ${message}`}
      style={[styles.container, { borderColor: style.border }]}
    >
      <AppText variant="caption" tone={style.text}>
        {style.label}
      </AppText>
      <AppText>{message}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
