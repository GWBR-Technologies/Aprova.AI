import { formatUpdatedAgo } from './relative-time';

const now = Date.parse('2026-10-31T12:00:00Z');

describe('formatUpdatedAgo', () => {
  it.each([
    ['2026-10-31T11:59:40Z', 'Atualizado agora há pouco'],
    ['2026-10-31T11:55:00Z', 'Atualizado há 5 min'],
    ['2026-10-31T09:00:00Z', 'Atualizado há 3 h'],
    ['2026-10-30T11:00:00Z', 'Atualizado há 1 dia'],
    ['2026-10-28T11:00:00Z', 'Atualizado há 3 dias'],
  ])('%s → %s', (asOf, expected) => {
    expect(formatUpdatedAgo(asOf, now)).toBe(expected);
  });

  it('trata data futura como agora e data inválida como indisponível', () => {
    expect(formatUpdatedAgo('2026-10-31T12:05:00Z', now)).toBe('Atualizado agora há pouco');
    expect(formatUpdatedAgo('não é data', now)).toBe('Atualização indisponível');
  });
});
