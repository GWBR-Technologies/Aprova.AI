import { Platform } from 'react-native';

// Tokens do Design System do Aprova.Ai (somente modo claro nesta fase).
// Nenhum hex novo aparece fora deste arquivo: tons adicionais entram aqui com uso definido.
export const Colors = {
  primary: '#123C52',
  primaryPressed: '#1B5570',
  primaryTint: '#E3EDF1',
  accent: '#FF6B4D',
  accentPressed: '#E8543A',
  surface: '#FAFAF7',
  surfaceRaised: '#FFFFFF',
  border: '#E2E1DA',
  ink: '#1B1D21',
  inkMuted: '#5B5F66',
  onPrimary: '#FFFFFF',
  success: '#1E8E5A',
  warning: '#C97B0A',
  error: '#C6392B',
  // Variantes de texto: success e warning do Design System não atingem 4,5:1 em
  // texto pequeno sobre as superfícies claras (ver theme.test.ts).
  successText: '#17744A',
  warningText: '#8F5600',
  errorText: '#B02F22',
  disabledSurface: '#E9E8E2',
} as const;

// Base 4, como no Design System.
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 9999,
} as const;

// Alvo mínimo de toque: 44 pt no iOS e 48 dp no Android.
export const MinTouchTarget = Platform.OS === 'ios' ? 44 : 48;

export const MaxContentWidth = 640;

// Poppins e Inter são a escolha do Design System, mas os pacotes de fonte ainda não foram
// aprovados como dependência; até lá o app usa a fonte do sistema com os mesmos pesos.
export const Fonts = {
  heading: undefined,
  body: undefined,
} as const;

export const Typography = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  section: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
} as const;

export type TypographyVariant = keyof typeof Typography;
