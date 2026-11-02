import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { makeSubmitEssayHandler } from '../../src/application/commands/submit-essay.handler.ts';
import { EssayQuotaExceeded, InvalidCommand, PremiumRequired } from '../../src/application/errors.ts';
import { memoryStore } from '../support/memory-store.ts';

function setup(at = '2026-10-31T12:00:00Z') {
  let now = new Date(at);
  const store = memoryStore(() => now);
  const submit = makeSubmitEssayHandler({ uow: store.uow, now: () => now, newId: randomUUID, monthlyLimit: 4 });
  const command = (essayId = randomUUID()) => ({
    commandId: randomUUID(),
    issuedAt: now.toISOString(),
    payload: { essayId, text: 'Texto de teste da redação.' },
  });
  return { store, submit, command, setNow: (iso: string) => (now = new Date(iso)) };
}

describe('SubmitEssay', () => {
  it('recusa quem não é Premium sem gravar nada', async () => {
    const { store, submit, command } = setup();
    await expect(submit('user-1', command())).rejects.toBeInstanceOf(PremiumRequired);
    expect(store.state.essays.size).toBe(0);
    expect(store.state.outbox).toHaveLength(0);
    expect(store.state.commandLog.size).toBe(0);
  });

  it.each([0, 3])('aceita Premium com %i usos e consome 1 da cota', async (used) => {
    const { store, submit, command } = setup();
    store.setPlan('user-1', 'PREMIUM');
    if (used > 0) store.state.quota.set('user-1|2026-10', used);
    const cmd = command();

    const result = await submit('user-1', cmd);

    expect(result).toEqual({ accepted: { commandId: cmd.commandId, status: 'accepted', receivedAt: '2026-10-31T12:00:00.000Z' }, replayed: false });
    expect(store.state.quota.get('user-1|2026-10')).toBe(used + 1);
    expect(store.state.essays.get(cmd.payload.essayId)).toMatchObject({ status: 'processing', version: 1, quotaPeriod: '2026-10' });
    expect(store.state.outbox[0]?.message).toMatchObject({
      type: 'EssaySubmitted',
      aggregateId: cmd.payload.essayId,
      aggregateVersion: 1,
      correlationId: cmd.commandId,
      causationId: cmd.commandId,
      payload: { essayId: cmd.payload.essayId, userId: 'user-1' },
    });
  });

  it('recusa Premium com 4 usos informando limite, uso e renovação', async () => {
    const { store, submit, command } = setup();
    store.setPlan('user-1', 'PREMIUM');
    store.state.quota.set('user-1|2026-10', 4);

    const error = await submit('user-1', command()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EssayQuotaExceeded);
    expect(error instanceof EssayQuotaExceeded && error.details).toEqual({ limit: 4, used: 4, resetsAt: '2026-11-01T03:00:00.000Z' });
    expect(store.state.essays.size).toBe(0);
  });

  it('reenvio do mesmo commandId devolve o 202 original sem consumir de novo, mesmo sem Premium', async () => {
    const { store, submit, command } = setup();
    store.setPlan('user-1', 'PREMIUM');
    const cmd = command();
    const first = await submit('user-1', cmd);
    store.setPlan('user-1', 'FREE');

    const replay = await submit('user-1', cmd);

    expect(replay).toEqual({ accepted: first.accepted, replayed: true });
    expect(store.state.quota.get('user-1|2026-10')).toBe(1);
    expect(store.state.outbox).toHaveLength(1);
  });

  it('conta a cota no mês de São Paulo na virada de 31/10 para 01/11', async () => {
    const { store, submit, command, setNow } = setup('2026-11-01T02:59:00Z');
    store.setPlan('user-1', 'PREMIUM');
    store.state.quota.set('user-1|2026-10', 3);

    await submit('user-1', command());
    setNow('2026-11-01T03:00:00Z');
    await submit('user-1', command());

    expect(store.state.quota.get('user-1|2026-10')).toBe(4);
    expect(store.state.quota.get('user-1|2026-11')).toBe(1);
  });

  it('recusa essayId já usado por outro comando e devolve a cota reservada', async () => {
    const { store, submit, command } = setup();
    store.setPlan('user-1', 'PREMIUM');
    const essayId = randomUUID();
    await submit('user-1', command(essayId));

    await expect(submit('user-1', command(essayId))).rejects.toBeInstanceOf(InvalidCommand);
    expect(store.state.quota.get('user-1|2026-10')).toBe(1);
  });
});
