import { formatDayMonth } from '@/hooks/format-day-month';

import type { EssayFailureReason, EssayScreenState } from '../queries/essay.mapper';

export const RECEIVED_MESSAGE = 'Redação recebida com sucesso!';

export type FailureCopy = {
  message: string;
  /** Ação de recuperação oferecida na tela. */
  recovery: 'edit-and-resend' | 'premium' | 'wait' | 'login' | 'resend' | 'automatic';
};

/**
 * Mensagens por código (§12.2 do guia). Nunca mostram identificadores, tokens, payloads nem texto
 * do provedor de IA; `resetsAt` vem do servidor.
 */
export function failureCopy(reason: EssayFailureReason, quotaLimit: number | null, resetsAt: string | null): FailureCopy {
  switch (reason) {
    case 'VALIDATION_FAILED':
      return { message: 'Não foi possível enviar. Confira o texto e tente de novo.', recovery: 'edit-and-resend' };
    case 'UNAUTHENTICATED':
      return { message: 'Sua sessão terminou. Entre de novo para continuar.', recovery: 'login' };
    case 'PREMIUM_REQUIRED':
      return { message: 'A correção de redação é um recurso Premium.', recovery: 'premium' };
    case 'ESSAY_QUOTA_EXCEEDED': {
      const used = quotaLimit === null ? 'as correções' : `as ${quotaLimit} correções`;
      const renewal = resetsAt ? ` Renova em ${formatDayMonth(resetsAt)}.` : '';
      return { message: `Você usou ${used} deste mês.${renewal}`, recovery: 'wait' };
    }
    case 'NOT_FOUND':
    case 'COMMAND_ID_CONFLICT':
      return { message: 'Algo deu errado ao enviar. Tente novamente.', recovery: 'resend' };
    case 'RATE_LIMITED':
    case 'SERVICE_UNAVAILABLE':
    case 'INTERNAL_ERROR':
      return { message: 'Estamos com instabilidade. Vamos tentar de novo automaticamente.', recovery: 'automatic' };
    case 'CORRECTION_FAILED':
      return { message: 'Não conseguimos corrigir sua redação. Você pode enviar de novo.', recovery: 'resend' };
    case 'UNKNOWN':
      return { message: 'Algo deu errado ao enviar. Tente novamente.', recovery: 'resend' };
  }
}

/** Texto de cada estado (§6.5); todo estado é comunicado por texto, nunca só por cor. */
export function stateMessage(state: Exclude<EssayScreenState, { kind: 'failed' }>): string {
  switch (state.kind) {
    case 'loading':
      return 'Carregando…';
    case 'not-found':
      return 'Não encontramos esta redação.';
    case 'queued-locally':
      return 'Sem conexão no momento. Enviaremos assim que houver internet.';
    case 'sending':
      return 'Enviando…';
    case 'received':
      return RECEIVED_MESSAGE;
    case 'processing':
      return state.stalled
        ? 'Ainda estamos processando. Avisaremos quando terminar.'
        : 'Estamos corrigindo sua redação. Avisaremos quando terminar.';
    case 'completed':
      return 'Correção concluída.';
  }
}
