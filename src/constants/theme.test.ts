import { Colors } from './theme';

function luminance(hex: string) {
  const channels = [1, 3, 5].map((i) => {
    const value = parseInt(hex.slice(i, i + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe('contraste dos tokens (WCAG AA, texto normal 4,5:1)', () => {
  const pairs: [string, string, string][] = [
    ['ink sobre surface', Colors.ink, Colors.surface],
    ['ink sobre surfaceRaised', Colors.ink, Colors.surfaceRaised],
    ['inkMuted sobre surface', Colors.inkMuted, Colors.surface],
    ['inkMuted sobre surfaceRaised', Colors.inkMuted, Colors.surfaceRaised],
    ['onPrimary sobre primary', Colors.onPrimary, Colors.primary],
    ['onPrimary sobre primaryPressed', Colors.onPrimary, Colors.primaryPressed],
    ['primary sobre surface', Colors.primary, Colors.surface],
    ['primary sobre primaryTint', Colors.primary, Colors.primaryTint],
    ['ink sobre accent', Colors.ink, Colors.accent],
    ['ink sobre accentPressed', Colors.ink, Colors.accentPressed],
    ['successText sobre surfaceRaised', Colors.successText, Colors.surfaceRaised],
    ['warningText sobre surfaceRaised', Colors.warningText, Colors.surfaceRaised],
    ['errorText sobre surfaceRaised', Colors.errorText, Colors.surfaceRaised],
    ['inkMuted sobre disabledSurface', Colors.inkMuted, Colors.disabledSurface],
  ];

  it.each(pairs)('%s', (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('documenta que o texto branco sobre o coral do Design System não passa em AA', () => {
    expect(contrast(Colors.onPrimary, Colors.accent)).toBeLessThan(4.5);
  });
});
