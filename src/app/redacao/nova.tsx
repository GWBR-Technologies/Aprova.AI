import { useLocalSearchParams, useRouter } from 'expo-router';

import { EssayComposerScreen } from '@/features/essay/ui/EssayComposerScreen';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function NewEssayRoute() {
  const router = useRouter();
  const { retry } = useLocalSearchParams<{ retry?: string }>();
  // Parâmetros de rota podem vir de link externo: só um UUID é aceito.
  const retryCommandId = typeof retry === 'string' && UUID.test(retry) ? retry : undefined;

  return (
    <EssayComposerScreen
      retryCommandId={retryCommandId}
      onSubmitted={(essayId) => router.replace(`/redacao/${essayId}`)}
    />
  );
}
