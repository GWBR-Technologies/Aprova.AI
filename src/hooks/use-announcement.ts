import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Anuncia a mensagem a tecnologias assistivas quando ela muda para um texto novo, sem repetir o
 * mesmo anúncio a cada consulta ou renderização.
 */
export function useAnnouncement(message: string | null) {
  const lastAnnounced = useRef<string | null>(null);

  useEffect(() => {
    if (message && message !== lastAnnounced.current) {
      AccessibilityInfo.announceForAccessibility(message);
    }
    lastAnnounced.current = message;
  }, [message]);
}
