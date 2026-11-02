import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { ApiRequestError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reenvios com atraso crescente ficam a cargo do outbox (comandos) e do intervalo de
      // consulta; erros permanentes (4xx) não devem ser repetidos.
      retry: (failureCount, error) =>
        error instanceof ApiRequestError && error.retryable && failureCount < 2,
    },
  },
});

/**
 * Liga a biblioteca ao ciclo de vida do React Native: consultas pausam sem rede e revalidam
 * quando o app volta ao primeiro plano. Chamar uma única vez, na composição do app.
 */
export function connectQueryLifecycle(): () => void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected === true && state.isInternetReachable !== false);
    }),
  );

  const appState = AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });

  return () => appState.remove();
}
