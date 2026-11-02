import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { EssayStatusScreen } from '@/features/essay/ui/EssayStatusScreen';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EssayStatusRoute() {
  const router = useRouter();
  const { essayId } = useLocalSearchParams<{ essayId: string }>();

  // Links profundos (aprovaai://redacao/<id>) abrem só identificadores válidos.
  if (typeof essayId !== 'string' || !UUID.test(essayId)) {
    return (
      <Screen>
        <AppText>Não encontramos esta redação.</AppText>
      </Screen>
    );
  }

  return (
    <EssayStatusScreen
      essayId={essayId}
      onEditAndResend={(commandId) => router.replace(`/redacao/nova?retry=${commandId}`)}
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
