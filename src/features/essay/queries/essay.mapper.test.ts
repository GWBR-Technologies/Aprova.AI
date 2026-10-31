import type { EntitlementsView } from '@contracts/queries/get-entitlements.query';
import type { EssayView } from '@contracts/queries/get-essay.query';

import { deriveEssayScreenState, toEssayAccess } from './essay.mapper';

const asOf = '2026-10-31T12:00:00Z';

function entitlements(plan: 'FREE' | 'PREMIUM', used: number | null): EntitlementsView {
  return {
    plan,
    asOf,
    essayQuota: used === null ? null : { limit: 4, used, resetsAt: '2026-11-01T03:00:00Z' },
  };
}

describe('toEssayAccess', () => {
  it('FREE fica bloqueado', () => {
    expect(toEssayAccess(entitlements('FREE', null))).toEqual({ kind: 'locked', asOf });
  });

  it.each([
    [0, 4],
    [3, 1],
    [4, 0],
  ])('Premium com %i usos tem %i restantes', (used, remaining) => {
    const access = toEssayAccess(entitlements('PREMIUM', used));
    expect(access).toMatchObject({ kind: 'premium', quota: { limit: 4, used, remaining } });
  });

  it('nunca mostra restante negativo se o servidor informar uso acima do limite', () => {
    const access = toEssayAccess(entitlements('PREMIUM', 6));
    expect(access.kind === 'premium' && access.quota.remaining).toBe(0);
  });

  it('Premium sem cota informada é tratado como bloqueado', () => {
    expect(toEssayAccess(entitlements('PREMIUM', null)).kind).toBe('locked');
  });
});

describe('deriveEssayScreenState', () => {
  const view = (status: EssayView['status'], result?: Record<string, unknown>): EssayView => ({
    essayId: 'e1',
    status,
    result,
    asOf,
  });

  it.each([
    ['queued-locally', { kind: 'queued-locally' }],
    ['sending', { kind: 'sending' }],
    ['received', { kind: 'received' }],
  ] as const)('outbox %s sem consulta', (state, expected) => {
    expect(
      deriveEssayScreenState({ outbox: { state, lastErrorCode: null }, view: undefined, pollingStopped: false }),
    ).toEqual(expected);
  });

  it('404 transitório depois do 202 vira em processamento', () => {
    expect(
      deriveEssayScreenState({ outbox: { state: 'received', lastErrorCode: null }, view: null, pollingStopped: false }),
    ).toEqual({ kind: 'processing', stalled: false });
  });

  it('404 sem registro local significa que a redação não existe', () => {
    expect(deriveEssayScreenState({ outbox: null, view: null, pollingStopped: false })).toEqual({ kind: 'not-found' });
  });

  it('sem registro local e ainda carregando', () => {
    expect(deriveEssayScreenState({ outbox: null, view: undefined, pollingStopped: false })).toEqual({ kind: 'loading' });
  });

  it('a consulta prevalece sobre o outbox e indica quando a consulta periódica parou', () => {
    expect(
      deriveEssayScreenState({ outbox: { state: 'received', lastErrorCode: null }, view: view('processing'), pollingStopped: true }),
    ).toEqual({ kind: 'processing', stalled: true });
  });

  it('concluída devolve o resultado e o asOf', () => {
    expect(
      deriveEssayScreenState({ outbox: null, view: view('completed', { a: 1 }), pollingStopped: false }),
    ).toEqual({ kind: 'completed', result: { a: 1 }, asOf });
  });

  it('falha da correção no servidor', () => {
    expect(deriveEssayScreenState({ outbox: null, view: view('failed'), pollingStopped: false })).toEqual({
      kind: 'failed',
      reason: 'CORRECTION_FAILED',
    });
  });

  it.each([
    ['PREMIUM_REQUIRED', 'PREMIUM_REQUIRED'],
    ['ESSAY_QUOTA_EXCEEDED', 'ESSAY_QUOTA_EXCEEDED'],
    ['HTTP_418', 'UNKNOWN'],
    [null, 'UNKNOWN'],
  ])('rejeição do outbox com código %s', (lastErrorCode, reason) => {
    expect(
      deriveEssayScreenState({ outbox: { state: 'failed', lastErrorCode }, view: undefined, pollingStopped: false }),
    ).toEqual({ kind: 'failed', reason });
  });
});
