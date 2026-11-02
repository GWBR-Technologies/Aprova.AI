import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { AccountScreen } from './AccountScreen';

const mockSignOut = jest.fn(async () => undefined);
const mockCountPending = jest.fn<Promise<number>, [string]>();
const mockDiscardAll = jest.fn(async (_userId: string) => undefined);

jest.mock('@/core/api/http', () => ({ session: { signOut: () => mockSignOut() } }));
jest.mock('@/core/api/use-session', () => ({
  useSessionState: () => ({ status: 'signedIn', userId: 'user-1' }),
}));
jest.mock('@/core/outbox/instance', () => ({
  countPendingCommands: (userId: string) => mockCountPending(userId),
  discardAllCommands: (userId: string) => mockDiscardAll(userId),
}));
jest.mock('@/hooks/use-is-online', () => ({ useIsOnline: () => true }));

beforeEach(() => {
  mockSignOut.mockClear();
  mockCountPending.mockReset();
  mockDiscardAll.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AccountScreen', () => {
  it('sai direto quando não há envios pendentes', async () => {
    mockCountPending.mockResolvedValue(0);
    const alert = jest.spyOn(Alert, 'alert');
    await render(<AccountScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(alert).not.toHaveBeenCalled();
    expect(mockDiscardAll).not.toHaveBeenCalled();
  });

  it('exige confirmação explícita antes de descartar envios pendentes ao sair', async () => {
    mockCountPending.mockResolvedValue(2);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(<AccountScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));

    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockDiscardAll).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => {
      buttons.find((button) => button.text === 'Sair e descartar')?.onPress?.();
    });

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(mockDiscardAll).toHaveBeenCalledWith('user-1');
  });

  it('mostra erro com ação de tentar de novo quando a saída falha', async () => {
    mockCountPending.mockResolvedValue(0);
    mockSignOut.mockRejectedValueOnce(new Error('falha'));
    await render(<AccountScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));

    expect(await screen.findByText('Não foi possível sair agora. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toBeEnabled();
  });
});
