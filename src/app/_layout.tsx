import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { session } from '@/core/api/http';
import { connectQueryLifecycle, queryClient } from '@/core/api/query-client';
import { useSessionState } from '@/core/api/use-session';
import { routeForNotice } from '@/core/events/push-notice';
import { subscribePushNotices } from '@/core/events/push-listeners';
import { startOutboxTriggers } from '@/core/outbox/triggers';
import { handleEssayNotice } from '@/features/essay/events/essay-events';

export default function RootLayout() {
  const state = useSessionState();
  const userId = state.status === 'signedIn' ? state.userId : null;
  const router = useRouter();

  useEffect(() => {
    void session.restore();
    return connectQueryLifecycle();
  }, []);

  useEffect(() => {
    if (!userId) {
      // Nada do usuário anterior pode aparecer para o próximo.
      queryClient.clear();
      return;
    }
    const stopOutbox = startOutboxTriggers(userId);
    const stopPush = subscribePushNotices({
      onReceived: (notice) => handleEssayNotice(notice, queryClient),
      onOpened: (notice) => {
        handleEssayNotice(notice, queryClient);
        const route = routeForNotice(notice);
        if (route) router.push(route);
      },
    });
    return () => {
      stopOutbox();
      stopPush();
    };
  }, [userId, router]);

  // A sessão é restaurada do SecureStore sem rede; até lá não há o que mostrar.
  if (state.status === 'loading') return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.primary,
          contentStyle: { backgroundColor: Colors.surface },
        }}
      >
        <Stack.Protected guard={state.status === 'signedOut'}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={state.status === 'signedIn'}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="redacao/nova" options={{ title: 'Nova redação' }} />
          <Stack.Screen name="redacao/foto" options={{ headerShown: false }} />
          <Stack.Screen name="redacao/[essayId]" options={{ title: 'Redação' }} />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
