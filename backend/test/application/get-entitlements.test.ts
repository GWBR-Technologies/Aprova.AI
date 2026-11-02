import { describe, expect, it } from 'vitest';

import { makeGetEntitlementsHandler } from '../../src/application/queries/get-entitlements.handler.ts';
import { memoryStore } from '../support/memory-store.ts';

const now = new Date('2026-10-31T12:00:00Z');

describe('GetEntitlements', () => {
  it('devolve essayQuota nulo para quem não é Premium', async () => {
    const store = memoryStore(() => now);
    const handler = makeGetEntitlementsHandler({ entitlements: store.entitlements, now: () => now, monthlyLimit: 4 });

    await expect(handler('user-1')).resolves.toEqual({ plan: 'FREE', essayQuota: null, asOf: now.toISOString() });
  });

  it('devolve uso, limite e renovação do mês para o Premium', async () => {
    const store = memoryStore(() => now);
    store.setPlan('user-1', 'PREMIUM');
    store.state.quota.set('user-1|2026-10', 3);
    const handler = makeGetEntitlementsHandler({ entitlements: store.entitlements, now: () => now, monthlyLimit: 4 });

    await expect(handler('user-1')).resolves.toEqual({
      plan: 'PREMIUM',
      essayQuota: { limit: 4, used: 3, resetsAt: '2026-11-01T03:00:00.000Z' },
      asOf: now.toISOString(),
    });
  });

  it('trata Premium vencido como FREE', async () => {
    const store = memoryStore(() => now);
    store.setPlan('user-1', 'PREMIUM', new Date('2026-10-30T00:00:00Z'));
    const handler = makeGetEntitlementsHandler({ entitlements: store.entitlements, now: () => now, monthlyLimit: 4 });

    await expect(handler('user-1')).resolves.toMatchObject({ plan: 'FREE', essayQuota: null });
  });
});
