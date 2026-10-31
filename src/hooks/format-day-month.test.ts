import { formatDayMonth } from './format-day-month';

describe('formatDayMonth', () => {
  it('usa o fuso de Brasília na virada de mês', () => {
    // 31/10 às 23h59 em Brasília é 01/11 às 02h59 em UTC.
    expect(formatDayMonth('2026-11-01T02:59:00Z')).toBe('31/10');
    expect(formatDayMonth('2026-11-01T03:00:00Z')).toBe('01/11');
  });

  it('preenche dia e mês com zero à esquerda', () => {
    expect(formatDayMonth('2026-03-05T12:00:00Z')).toBe('05/03');
  });

  it('devolve um marcador para data inválida', () => {
    expect(formatDayMonth('lixo')).toBe('--/--');
  });
});
