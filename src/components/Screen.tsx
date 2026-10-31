import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfflineBanner } from './OfflineBanner';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Rodapé fixo (por exemplo, o botão principal), na zona de alcance do polegar. */
  footer?: ReactNode;
};

export function Screen({ children, footer }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.column}>
          <OfflineBanner />
          {children}
        </View>
      </ScrollView>
      {footer ? <View style={styles.footer}><View style={styles.column}>{footer}</View></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  content: { flexGrow: 1, padding: Spacing.three },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  footer: {
    padding: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
