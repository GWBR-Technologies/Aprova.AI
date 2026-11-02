import type { QueryClient } from '@tanstack/react-query';

import { handleEssayNotice } from './essay-events';

const id = '3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b';
const correlationId = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

function fakeClient() {
  const invalidateQueries = jest.fn(async () => undefined);
  return { client: { invalidateQueries } as unknown as QueryClient, invalidateQueries };
}

describe('handleEssayNotice', () => {
  it.each(['EssayCorrected', 'EssayCorrectionFailed'] as const)('%s invalida a redação e os direitos', (type) => {
    const { client, invalidateQueries } = fakeClient();
    handleEssayNotice({ type, aggregateId: id, correlationId }, client);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['essay', id] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['entitlements'] });
  });

  it('ignora avisos de simulado', () => {
    const { client, invalidateQueries } = fakeClient();
    handleEssayNotice({ type: 'MockExamProcessed', aggregateId: id, correlationId }, client);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
