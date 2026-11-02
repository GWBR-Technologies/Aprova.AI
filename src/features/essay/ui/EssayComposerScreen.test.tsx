import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { EntitlementsView } from '@contracts/queries/get-entitlements.query';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { EssayComposerScreen } from './EssayComposerScreen';

const mockApiGet = jest.fn();
const mockEnqueue = jest.fn(async () => undefined);

jest.mock('@/core/api/http', () => ({ apiGet: (path: string) => mockApiGet(path) }));
jest.mock('@/core/api/use-session', () => ({
  useSessionState: () => ({ status: 'signedIn', userId: 'user-1' }),
}));
jest.mock('@/core/outbox/instance', () => ({
  enqueueCommand: (input: unknown) => mockEnqueue(input),
  discardCommand: jest.fn(async () => undefined),
  getOutboxRow: jest.fn(async () => null),
}));
jest.mock('expo-crypto', () => {
  let counter = 0;
  return { randomUUID: () => `uuid-${++counter}` };
});
jest.mock('@/hooks/use-is-online', () => ({ useIsOnline: () => true }));

function entitlements(plan: 'FREE' | 'PREMIUM', used: number | null): EntitlementsView {
  return {
    plan,
    asOf: '2026-10-31T12:00:00Z',
    essayQuota: used === null ? null : { limit: 4, used, resetsAt: '2026-11-01T03:00:00Z' },
  };
}

let client: QueryClient;

async function renderComposer(onSubmitted = jest.fn()) {
  // gcTime 0 evita temporizadores abertos depois do teste.
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await render(
    <QueryClientProvider client={client}>
      <EssayComposerScreen onSubmitted={onSubmitted} />
    </QueryClientProvider>,
  );
  return onSubmitted;
}

beforeEach(() => {
  mockApiGet.mockReset();
  mockEnqueue.mockClear();
});

afterEach(() => {
  client.clear();
});

describe('EssayComposerScreen', () => {
  it('FREE vê o gate Premium e não vê o editor', async () => {
    mockApiGet.mockResolvedValue(entitlements('FREE', null));
    await renderComposer();

    expect(await screen.findByText(/recurso Premium/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Texto da redação')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Enviar para correção' })).not.toBeOnTheScreen();
  });

  it.each([
    [0, 'Restam 4 de 4 correções neste mês. Renova em 01/11.'],
    [3, 'Restam 1 de 4 correções neste mês. Renova em 01/11.'],
  ])('Premium com %i usos mostra a cota restante do servidor', async (used, text) => {
    mockApiGet.mockResolvedValue(entitlements('PREMIUM', used));
    await renderComposer();
    expect(await screen.findByText(text)).toBeOnTheScreen();
    expect(screen.getByLabelText('Texto da redação')).toBeOnTheScreen();
  });

  it('mantém o envio desabilitado, com motivo, enquanto o texto está vazio', async () => {
    mockApiGet.mockResolvedValue(entitlements('PREMIUM', 0));
    await renderComposer();
    const button = await screen.findByRole('button', { name: 'Enviar para correção' });

    expect(button).toBeDisabled();
    expect(screen.getByText('Escreva a redação para poder enviar.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Texto da redação'), 'Primeiro parágrafo');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar para correção' })).toBeEnabled());
  });

  it('com a cota esgotada mantém o editor para rascunho e desabilita o envio com o motivo', async () => {
    mockApiGet.mockResolvedValue(entitlements('PREMIUM', 4));
    await renderComposer();

    const button = await screen.findByRole('button', { name: 'Enviar para correção' });
    await fireEvent.changeText(screen.getByLabelText('Texto da redação'), 'Rascunho');

    expect(button).toBeDisabled();
    expect(screen.getAllByText('Você usou as 4 correções deste mês. Renova em 01/11.').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Texto da redação')).toBeOnTheScreen();
  });

  it('envia pelo outbox com novo commandId e vai ao acompanhamento sem confirmar recebimento', async () => {
    mockApiGet.mockResolvedValue(entitlements('PREMIUM', 0));
    const onSubmitted = await renderComposer();

    await fireEvent.changeText(await screen.findByLabelText('Texto da redação'), '  Texto final  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar para correção' }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    const input = (mockEnqueue.mock.calls[0] as unknown as [{
      userId: string;
      route: string;
      resourceId: string;
      command: { commandId: string; payload: { essayId: string; text: string } };
    }])[0];
    expect(input.route).toBe('submit-essay');
    expect(input.userId).toBe('user-1');
    expect(input.command.payload.text).toBe('Texto final');
    expect(input.resourceId).toBe(input.command.payload.essayId);
    expect(input.command.commandId).not.toBe(input.command.payload.essayId);
    // A confirmação só existe depois do 202, na tela de acompanhamento.
    expect(screen.queryByText('Redação recebida com sucesso!')).not.toBeOnTheScreen();
    expect(onSubmitted).toHaveBeenCalledWith(input.command.payload.essayId);
  });

  it('mostra erro com ação de recuperação quando o plano não carrega', async () => {
    mockApiGet.mockRejectedValue(new Error('rede'));
    await renderComposer();

    expect(await screen.findByText(/Não foi possível carregar seu plano/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });
});
