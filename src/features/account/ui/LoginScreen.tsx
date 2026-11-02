import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { session } from '@/core/api/http';
import {
  getAppleIdToken,
  getGoogleIdToken,
  isAppleSignInAvailable,
  SignInUnavailableError,
} from '@/core/api/provider-sign-in';
import { useSessionState } from '@/core/api/use-session';
import type { AuthProvider } from '@contracts/http/auth';

const getIdToken: Record<AuthProvider, () => Promise<string | null>> = {
  google: getGoogleIdToken,
  apple: getAppleIdToken,
};

export function LoginScreen() {
  const state = useSessionState();
  const [pending, setPending] = useState<AuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  async function signIn(provider: AuthProvider) {
    setPending(provider);
    setError(null);
    try {
      const idToken = await getIdToken[provider]();
      // O usuário cancelou a tela do provedor: não é erro.
      if (idToken) await session.signIn(provider, idToken);
    } catch (failure) {
      setError(
        failure instanceof SignInUnavailableError
          ? failure.message
          : 'Não foi possível entrar. Verifique a conexão e tente de novo.',
      );
    } finally {
      setPending(null);
    }
  }

  const expired = state.status === 'signedOut' && state.reason === 'expired';

  return (
    <Screen>
      <View style={styles.brand}>
        <AppText variant="title" accessibilityLabel="Aprova ponto Ai">
          <AppText variant="title" tone="primary">Aprova</AppText>
          <AppText variant="title" style={styles.accentWord}>.Ai</AppText>
        </AppText>
      </View>

      <AppText variant="section">Bem-vindo</AppText>
      <AppText tone="muted">Continue de onde parou nos seus estudos para o vestibular.</AppText>

      {expired ? <Banner tone="warning" announce message="Sua sessão terminou. Entre de novo para continuar." /> : null}
      {error ? <Banner tone="error" announce message={error} /> : null}

      <View style={styles.actions}>
        <Button
          label="Continuar com Google"
          variant="primary"
          loading={pending === 'google'}
          disabled={pending !== null && pending !== 'google'}
          onPress={() => void signIn('google')}
        />
        {appleAvailable ? (
          <Button
            label="Continuar com Apple"
            variant="outline"
            loading={pending === 'apple'}
            disabled={pending !== null && pending !== 'apple'}
            onPress={() => void signIn('apple')}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { marginTop: Spacing.five, marginBottom: Spacing.three },
  // O "Ai" é texto grande (28 px, negrito): o coral escuro passa em 3:1 sobre a superfície;
  // o coral base (#FF6B4D) não passa.
  accentWord: { color: Colors.accentPressed },
  actions: { gap: Spacing.two },
});
