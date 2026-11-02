import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** `true` até que o aparelho informe explicitamente que está sem conexão. */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        setOnline(state.isConnected !== false && state.isInternetReachable !== false);
      }),
    [],
  );

  return online;
}
