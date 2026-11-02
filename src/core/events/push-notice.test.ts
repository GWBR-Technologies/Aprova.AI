import { parsePushNotice, routeForNotice } from './push-notice';

const id = '3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b';
const other = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

describe('parsePushNotice', () => {
  it('aceita um aviso bem formado e descarta campos extras', () => {
    expect(
      parsePushNotice({ type: 'EssayCorrected', aggregateId: id, correlationId: other, texto: 'segredo' }),
    ).toEqual({ type: 'EssayCorrected', aggregateId: id, correlationId: other });
  });

  it.each([
    ['sem corpo', undefined],
    ['não objeto', 'EssayCorrected'],
    ['tipo desconhecido', { type: 'Outro', aggregateId: id, correlationId: other }],
    ['aggregateId inválido', { type: 'EssayCorrected', aggregateId: '../../conta', correlationId: other }],
    ['correlationId ausente', { type: 'EssayCorrected', aggregateId: id }],
  ])('rejeita %s', (_name, data) => {
    expect(parsePushNotice(data)).toBeNull();
  });
});

describe('routeForNotice', () => {
  it('abre a tela da redação nos avisos de redação', () => {
    expect(routeForNotice({ type: 'EssayCorrected', aggregateId: id, correlationId: other })).toBe(`/redacao/${id}`);
    expect(routeForNotice({ type: 'EssayCorrectionFailed', aggregateId: id, correlationId: other })).toBe(`/redacao/${id}`);
  });

  it('não navega para simulado enquanto a tela não existir', () => {
    expect(routeForNotice({ type: 'MockExamProcessed', aggregateId: id, correlationId: other })).toBeNull();
  });
});
