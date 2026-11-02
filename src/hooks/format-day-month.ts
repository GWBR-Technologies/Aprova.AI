const SAO_PAULO_OFFSET_MS = -3 * 60 * 60_000;

/**
 * "dd/mm" no fuso America/Sao_Paulo. O Brasil não adota horário de verão desde 2019, então o
 * deslocamento fixo de -3 h evita depender do suporte a `timeZone` do `Intl` no Hermes.
 */
export function formatDayMonth(iso: string): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return '--/--';
  const local = new Date(timestamp + SAO_PAULO_OFFSET_MS);
  const day = String(local.getUTCDate()).padStart(2, '0');
  const month = String(local.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}
