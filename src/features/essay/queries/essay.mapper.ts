import type { ErrorCode } from '@contracts/api-error';
import type { EntitlementsView } from '@contracts/queries/get-entitlements.query';
import type { EssayView } from '@contracts/queries/get-essay.query';

import type { OutboxState } from '@/core/outbox/outbox';

export type EssayQuotaModel = {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
};

export type EssayAccess =
  | { kind: 'premium'; quota: EssayQuotaModel; asOf: string }
  | { kind: 'locked'; asOf: string };

/** Plano e cota vêm do servidor; o app nunca conta localmente (§1.6). */
export function toEssayAccess(view: EntitlementsView): EssayAccess {
  if (view.plan !== 'PREMIUM' || view.essayQuota === null) {
    return { kind: 'locked', asOf: view.asOf };
  }
  const { limit, used, resetsAt } = view.essayQuota;
  return {
    kind: 'premium',
    asOf: view.asOf,
    quota: { limit, used, remaining: Math.max(0, limit - used), resetsAt },
  };
}

export type EssayFailureReason = ErrorCode | 'CORRECTION_FAILED' | 'UNKNOWN';

/** Estado único de tela, combinando outbox e consulta (§6.5 do guia). */
export type EssayScreenState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'queued-locally' }
  | { kind: 'sending' }
  | { kind: 'received' }
  | { kind: 'processing'; stalled: boolean }
  | { kind: 'completed'; result: Record<string, unknown> | null; asOf: string }
  | { kind: 'failed'; reason: EssayFailureReason };

const KNOWN_CODES: readonly ErrorCode[] = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'PREMIUM_REQUIRED',
  'ESSAY_QUOTA_EXCEEDED',
  'NOT_FOUND',
  'COMMAND_ID_CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
];

function toReason(code: string | null): EssayFailureReason {
  return KNOWN_CODES.find((known) => known === code) ?? 'UNKNOWN';
}

export type EssayStateInput = {
  /** Linha do outbox para este recurso, quando existe neste aparelho. */
  outbox: { state: OutboxState; lastErrorCode: string | null } | null;
  /** `undefined` carregando; `null` é o 404 transitório da projeção ainda não aplicada. */
  view: EssayView | null | undefined;
  /** A consulta periódica parou depois de 5 minutos sem conclusão. */
  pollingStopped: boolean;
};

export function deriveEssayScreenState({ outbox, view, pollingStopped }: EssayStateInput): EssayScreenState {
  if (view?.status === 'completed') return { kind: 'completed', result: view.result, asOf: view.asOf };
  if (view?.status === 'failed') return { kind: 'failed', reason: 'CORRECTION_FAILED' };
  if (view?.status === 'processing') return { kind: 'processing', stalled: pollingStopped };

  if (outbox) {
    switch (outbox.state) {
      case 'failed':
        return { kind: 'failed', reason: toReason(outbox.lastErrorCode) };
      case 'queued-locally':
        return { kind: 'queued-locally' };
      case 'sending':
        return { kind: 'sending' };
      case 'received':
        // 404 transitório: a projeção é assíncrona, então é "em processamento" e não "inexistente".
        return view === null ? { kind: 'processing', stalled: pollingStopped } : { kind: 'received' };
    }
  }

  // Sem registro local (por exemplo, enviada de outro aparelho), 404 significa que não existe.
  return view === null ? { kind: 'not-found' } : { kind: 'loading' };
}
