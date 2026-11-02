import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts, Typography, type TypographyVariant } from '@/constants/theme';

type Tone = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'error' | 'onPrimary';

const toneColor: Record<Tone, string> = {
  default: Colors.ink,
  muted: Colors.inkMuted,
  primary: Colors.primary,
  success: Colors.successText,
  warning: Colors.warningText,
  error: Colors.errorText,
  onPrimary: Colors.onPrimary,
};

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
};

// `allowFontScaling` fica no padrão (ligado): o layout precisa suportar texto ampliado.
export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const isHeading = variant === 'title' || variant === 'section';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : rest.accessibilityRole}
      style={[styles.base, Typography[variant], { color: toneColor[tone] }, isHeading && styles.heading, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { fontFamily: Fonts.body },
  heading: { fontFamily: Fonts.heading },
});
