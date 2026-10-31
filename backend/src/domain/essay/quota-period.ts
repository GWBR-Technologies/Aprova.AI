// Janela da cota: mês corrido em America/Sao_Paulo (premissa do §1.6, a confirmar com o produto).
const saoPaulo = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

function partsInSaoPaulo(date: Date) {
  const parts = saoPaulo.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') };
}

/** Período da cota no formato 'AAAA-MM'. */
export function quotaPeriod(now: Date): string {
  const { year, month } = partsInSaoPaulo(now);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Instante em que o próximo período começa. Confirma com o Intl que o candidato cai à meia-noite
 * do dia 1 em São Paulo, em vez de fixar o deslocamento, para tolerar mudança de regra de horário.
 */
export function startOfNextPeriod(now: Date): Date {
  const { year, month } = partsInSaoPaulo(now);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  for (const offsetHours of [3, 2, 4]) {
    const candidate = new Date(Date.UTC(nextYear, nextMonth - 1, 1, offsetHours, 0, 0));
    const p = partsInSaoPaulo(candidate);
    if (p.day === 1 && p.hour === 0) return candidate;
  }
  throw new Error('Início do mês em America/Sao_Paulo não encontrado');
}
