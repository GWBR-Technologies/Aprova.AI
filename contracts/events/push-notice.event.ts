// Aviso por push: só pede ao app que consulte de novo; nunca leva texto, nota ou dado pessoal.
export type PushNotice = {
  type: 'EssayCorrected' | 'EssayCorrectionFailed' | 'MockExamProcessed';
  aggregateId: string;
  correlationId: string;
};
