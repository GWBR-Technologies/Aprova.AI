import { Banner } from './Banner';
import { useIsOnline } from '@/hooks/use-is-online';

export function OfflineBanner() {
  const online = useIsOnline();
  if (online) return null;
  return <Banner tone="warning" announce message="Sem conexão. Suas ações serão enviadas quando houver internet." />;
}
