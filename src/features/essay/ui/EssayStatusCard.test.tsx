import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import type { EssayScreenState } from '../queries/essay.mapper';
import { EssayStatusCard } from './EssayStatusCard';

async function renderCard(state: EssayScreenState, quota: { limit: number; resetsAt: string } | null = null) {
  const onEditAndResend = jest.fn();
  const onDiscard = jest.fn();
  await render(<EssayStatusCard state={state} quota={quota} onEditAndResend={onEditAndResend} onDiscard={onDiscard} />);
  return { onEditAndResend, onDiscard };
}

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  jest.mocked(AccessibilityInfo.announceForAccessibility).mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('EssayStatusCard', () => {
  it('só confirma o recebimento no estado received e o anuncia a leitores de tela', async () => {
    await renderCard({ kind: 'received' });
    expect(screen.getByText('Redação recebida com sucesso!')).toBeOnTheScreen();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Redação recebida com sucesso!');
  });

  it.each<[EssayScreenState, string]>([
    [{ kind: 'queued-locally' }, 'Sem conexão no momento. Enviaremos assim que houver internet.'],
    [{ kind: 'sending' }, 'Enviando…'],
    [{ kind: 'processing', stalled: false }, 'Estamos corrigindo sua redação. Avisaremos quando terminar.'],
    [{ kind: 'processing', stalled: true }, 'Ainda estamos processando. Avisaremos quando terminar.'],
  ])('estado %j comunica texto próprio sem confirmar recebimento', async (state, text) => {
    await renderCard(state);
    expect(screen.getByText(text)).toBeOnTheScreen();
    expect(screen.queryByText('Redação recebida com sucesso!')).not.toBeOnTheScreen();
  });

  it('não repete o anúncio quando o mesmo estado é renderizado de novo', async () => {
    const { rerender } = await render(
      <EssayStatusCard state={{ kind: 'received' }} quota={null} onEditAndResend={jest.fn()} onDiscard={jest.fn()} />,
    );
    await rerender(
      <EssayStatusCard state={{ kind: 'received' }} quota={null} onEditAndResend={jest.fn()} onDiscard={jest.fn()} />,
    );
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
  });

  it('cota esgotada informa quando renova e não oferece reenvio', async () => {
    await renderCard(
      { kind: 'failed', reason: 'ESSAY_QUOTA_EXCEEDED' },
      { limit: 4, resetsAt: '2026-11-01T03:00:00Z' },
    );
    expect(screen.getByText('Você usou as 4 correções deste mês. Renova em 01/11.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editar e reenviar' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeOnTheScreen();
  });

  it('Premium necessário não oferece reenvio', async () => {
    await renderCard({ kind: 'failed', reason: 'PREMIUM_REQUIRED' });
    expect(screen.getByText('A correção de redação é um recurso Premium.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editar e reenviar' })).not.toBeOnTheScreen();
  });

  it('falha de correção oferece editar e reenviar e descartar', async () => {
    const { onEditAndResend, onDiscard } = await renderCard({ kind: 'failed', reason: 'CORRECTION_FAILED' });
    expect(screen.getByText('Não conseguimos corrigir sua redação. Você pode enviar de novo.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Editar e reenviar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Descartar' }));
    expect(onEditAndResend).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('nunca mostra identificadores nem código técnico na falha', async () => {
    await renderCard({ kind: 'failed', reason: 'UNKNOWN' });
    expect(screen.queryByText(/HTTP_|NETWORK|UNKNOWN/)).not.toBeOnTheScreen();
  });

  it('concluída avisa que o resultado ainda não é exibido, sem inventar nota', async () => {
    await renderCard({ kind: 'completed', result: { qualquer: 'coisa' }, asOf: '2026-10-31T12:00:00Z' });
    expect(screen.getByText('Correção concluída.')).toBeOnTheScreen();
    expect(screen.getByText(/ainda não exibe o resultado/)).toBeOnTheScreen();
    expect(screen.queryByText(/qualquer/)).not.toBeOnTheScreen();
  });
});
