import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { flushOutbox, purgeReceivedCommands } from './instance';

/**
 * Dispara o envio do outbox na abertura, na volta ao primeiro plano e na volta da rede.
 * O envio logo após gravar e o temporizador do próximo `next_attempt_at` vivem no próprio outbox.
 * Devolve a função que remove os ouvintes.
 */
export function startOutboxTriggers(userId: string): () => void {
  const flush = () => {
    flushOutbox(userId).catch(() => undefined);
  };

  purgeReceivedCommands().catch(() => undefined);
  flush();

  const appState = AppState.addEventListener('change', (status) => {
    if (status === 'active') flush();
  });

  let wasOnline: boolean | null = null;
  const unsubscribeNet = NetInfo.addEventListener((state) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    if (online && wasOnline === false) flush();
    wasOnline = online;
  });

  return () => {
    appState.remove();
    unsubscribeNet();
  };
}
