import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PushNotice } from '@contracts/events/push-notice.event';

import { parsePushNotice } from './push-notice';

export type PushListener = {
  /** Aviso recebido com o app aberto: invalidar consultas. */
  onReceived: (notice: PushNotice) => void;
  /** O aluno tocou na notificação: abrir a tela do recurso. */
  onOpened: (notice: PushNotice) => void;
};

// Com o app aberto o aviso só invalida a consulta: a tela anuncia a mudança, então um banner
// do sistema seria duplicado.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Canal `essay` (importância padrão); precisa existir antes de pedir o token no Android. */
export async function ensureEssayChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('essay', {
    name: 'Correção de redação',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export function subscribePushNotices({ onReceived, onOpened }: PushListener): () => void {
  void ensureEssayChannel().catch(() => undefined);

  const received = Notifications.addNotificationReceivedListener((notification) => {
    const notice = parsePushNotice(notification.request.content.data);
    if (notice) onReceived(notice);
  });

  const opened = Notifications.addNotificationResponseReceivedListener((response) => {
    const notice = parsePushNotice(response.notification.request.content.data);
    if (notice) onOpened(notice);
  });

  return () => {
    received.remove();
    opened.remove();
  };
}
