import { describe, expect, it } from 'vitest';

import { quotaPeriod, startOfNextPeriod } from './quota-period.ts';

describe('quotaPeriod', () => {
  it('mantém 31/10/2026 às 23h59 de Brasília em outubro', () => {
    expect(quotaPeriod(new Date('2026-11-01T02:59:00Z'))).toBe('2026-10');
  });

  it('vira para novembro em 01/11/2026 às 00h00 de Brasília', () => {
    expect(quotaPeriod(new Date('2026-11-01T03:00:00Z'))).toBe('2026-11');
  });

  it('vira dezembro para janeiro do ano seguinte', () => {
    expect(quotaPeriod(new Date('2026-12-31T12:00:00Z'))).toBe('2026-12');
    expect(quotaPeriod(new Date('2027-01-01T03:00:00Z'))).toBe('2027-01');
    expect(startOfNextPeriod(new Date('2026-12-15T12:00:00Z')).toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });
});

describe('startOfNextPeriod', () => {
  it('devolve 2026-11-01T03:00:00Z como renovação de outubro', () => {
    expect(startOfNextPeriod(new Date('2026-10-31T12:00:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });

  it('usa o mês de São Paulo, não o de UTC, perto da virada', () => {
    expect(startOfNextPeriod(new Date('2026-11-01T02:59:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });
});
