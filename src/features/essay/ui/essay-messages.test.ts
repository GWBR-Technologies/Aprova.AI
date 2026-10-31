import { failureCopy, stateMessage } from './essay-messages';

describe('failureCopy', () => {
  it('informa o limite e a renovação da cota no fuso de Brasília', () => {
    expect(failureCopy('ESSAY_QUOTA_EXCEEDED', 4, '2026-11-01T03:00:00Z')).toEqual({
      message: 'Você usou as 4 correções deste mês. Renova em 01/11.',
      recovery: 'wait',
    });
  });

  it('não inventa a data de renovação quando o servidor ainda não a informou', () => {
    expect(failureCopy('ESSAY_QUOTA_EXCEEDED', null, null).message).toBe('Você usou as correções deste mês.');
  });

  it.each([
    ['PREMIUM_REQUIRED', 'premium'],
    ['UNAUTHENTICATED', 'login'],
    ['VALIDATION_FAILED', 'edit-and-resend'],
    ['RATE_LIMITED', 'automatic'],
    ['SERVICE_UNAVAILABLE', 'automatic'],
    ['INTERNAL_ERROR', 'automatic'],
    ['CORRECTION_FAILED', 'resend'],
    ['COMMAND_ID_CONFLICT', 'resend'],
    ['UNKNOWN', 'resend'],
  ] as const)('%s leva à ação %s', (reason, recovery) => {
    expect(failureCopy(reason, null, null).recovery).toBe(recovery);
  });
});

describe('stateMessage', () => {
  it('a confirmação de recebimento só existe no estado received', () => {
    expect(stateMessage({ kind: 'received' })).toBe('Redação recebida com sucesso!');
    expect(stateMessage({ kind: 'sending' })).not.toContain('recebida');
    expect(stateMessage({ kind: 'queued-locally' })).not.toContain('recebida');
  });

  it('diferencia processamento normal de consulta parada', () => {
    expect(stateMessage({ kind: 'processing', stalled: false })).toContain('Estamos corrigindo');
    expect(stateMessage({ kind: 'processing', stalled: true })).toContain('Ainda estamos processando');
  });
});
