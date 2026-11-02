import { useState } from 'react';
import { Alert } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { session } from '@/core/api/http';
import { useSessionState } from '@/core/api/use-session';
import { countPendingCommands, discardAllCommands } from '@/core/outbox/instance';

export function AccountScreen() {
  const state = useSessionState();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finishSignOut(userId: string, discardPending: boolean) {
    setSigningOut(true);
    setError(null);
    try {
      if (discardPending) await discardAllCommands(userId);
      await session.signOut();
    } catch {
      setError('Não foi possível sair agora. Tente de novo.');
      setSigningOut(false);
    }
  }

  async function handleSignOut() {
    if (state.status !== 'signedIn') return;
    const { userId } = state;
    const pending = await countPendingCommands(userId);
    if (pending === 0) {
      await finishSignOut(userId, false);
      return;
    }
    // Sair descarta o que ainda não chegou ao servidor; o aluno decide antes (§6.3 do guia).
    Alert.alert(
      'Há envios pendentes',
      `Você tem ${pending} ${pending === 1 ? 'envio pendente' : 'envios pendentes'} neste aparelho. Se sair agora, ${pending === 1 ? 'ele será descartado' : 'eles serão descartados'}.`,
      [
        { text: 'Continuar logado', style: 'cancel' },
        { text: 'Sair e descartar', style: 'destructive', onPress: () => void finishSignOut(userId, true) },
      ],
    );
  }

  return (
    <Screen>
      <AppText variant="title">Conta</AppText>
      {error ? <Banner tone="error" announce message={error} /> : null}
      <Button label="Sair da conta" variant="outline" loading={signingOut} onPress={() => void handleSignOut()} />
      {/* Exclusão de conta e privacidade dependem da decisão de LGPD, ainda em aberto (§9.4). */}
    </Screen>
  );
}
