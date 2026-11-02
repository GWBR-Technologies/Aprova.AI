import { useRouter } from 'expo-router';

import { EssayPhotoScreen } from '@/features/essay/ui/EssayPhotoScreen';

export default function EssayPhotoRoute() {
  const router = useRouter();
  return <EssayPhotoScreen onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
