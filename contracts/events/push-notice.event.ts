export type PushNoticeType = 'EssayCorrected' | 'EssayCorrectionFailed' | 'MockExamProcessed';

// Corpo do push do Expo: só um aviso para consultar de novo, nunca dado pessoal.
export type PushNotice = {
  type: PushNoticeType;
  aggregateId: string;
  correlationId: string;
};
