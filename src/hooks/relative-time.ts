import { useEffect, useState } from 'react';

/** Texto de `asOf` para as telas de consulta: "Atualizado há X". Nunca apresenta data futura. */
export function formatUpdatedAgo(asOf: string, now: number = Date.now()): string {
  const timestamp = Date.parse(asOf);
  if (Number.isNaN(timestamp)) return 'Atualização indisponível';

  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return 'Atualizado agora há pouco';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Atualizado há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Atualizado há ${hours} h`;

  const days = Math.floor(hours / 24);
  return `Atualizado há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

/** Reavalia o texto a cada minuto para que a tela não mostre um atraso desatualizado. */
export function useUpdatedAgo(asOf: string | undefined): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return asOf ? formatUpdatedAgo(asOf, now) : null;
}
