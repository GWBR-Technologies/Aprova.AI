import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'accent' | 'outline';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Motivo do bloqueio em texto, exibido abaixo do botão e lido por leitores de tela. */
  disabledReason?: string;
};

const palette: Record<Variant, { background: string; pressed: string; text: string; border: string }> = {
  primary: { background: Colors.primary, pressed: Colors.primaryPressed, text: Colors.onPrimary, border: Colors.primary },
  // Texto escuro sobre o coral: o branco não atinge 4,5:1 (ver theme.test.ts).
  accent: { background: Colors.accent, pressed: Colors.accentPressed, text: Colors.ink, border: Colors.accent },
  outline: { background: 'transparent', pressed: Colors.primaryTint, text: Colors.primary, border: Colors.primary },
};

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, disabledReason }: ButtonProps) {
  const blocked = disabled || loading;
  const colors = palette[variant];

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={disabled ? disabledReason : undefined}
        accessibilityState={{ disabled: blocked, busy: loading }}
        // Sem duplo toque: enquanto carrega, o toque é ignorado.
        onPress={blocked ? undefined : onPress}
        style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
          styles.base,
          {
            backgroundColor: disabled ? Colors.disabledSurface : pressed ? colors.pressed : colors.background,
            borderColor: disabled ? Colors.border : colors.border,
          },
          focused && styles.focused,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <AppText variant="bodyStrong" style={{ color: disabled ? Colors.inkMuted : colors.text }}>
            {label}
          </AppText>
        )}
      </Pressable>
      {disabled && disabledReason ? (
        <AppText variant="caption" tone="muted" style={styles.reason}>
          {disabledReason}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focused: { outlineColor: Colors.primary, outlineWidth: 2, outlineOffset: 2, outlineStyle: 'solid' },
  reason: { marginTop: Spacing.two, textAlign: 'center' },
});
