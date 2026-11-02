import { nextPollInterval } from './poll-interval';

describe('nextPollInterval', () => {
  it('segue a sequência 3, 5, 8, 13, 20 e 30 s', () => {
    expect([0, 1, 2, 3, 4, 5].map(nextPollInterval)).toEqual([3000, 5000, 8000, 13000, 20000, 30000]);
  });

  it('mantém 30 s depois do último degrau', () => {
    expect(nextPollInterval(6)).toBe(30_000);
    expect(nextPollInterval(8)).toBe(30_000);
  });

  it('para quando o tempo acumulado chega a 5 minutos', () => {
    // 79 s nos seis primeiros degraus + 30 s por tentativa extra: 79 + 8 × 30 = 319 s.
    expect(nextPollInterval(13)).toBe(30_000);
    expect(nextPollInterval(14)).toBe(false);
    expect(nextPollInterval(100)).toBe(false);
  });
});
