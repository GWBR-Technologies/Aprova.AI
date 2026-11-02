import { useRouter } from 'expo-router';

import { EssayListScreen } from '@/features/essay/ui/EssayListScreen';

export default function EssaysRoute() {
  const router = useRouter();
  return (
    <EssayListScreen
      onNewEssay={() => router.push('/redacao/nova')}
      onOpenEssay={(essayId) => router.push(`/redacao/${essayId}`)}
    />
  );
}
