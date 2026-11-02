export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'PREMIUM_REQUIRED'
  | 'ESSAY_QUOTA_EXCEEDED'
  | 'NOT_FOUND'
  | 'COMMAND_ID_CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export type ApiError = {
  code: ErrorCode;
  message: string; // texto compreensível para o aluno
  correlationId: string; // igual ao commandId quando houver
  details?: Record<string, unknown>;
};

export type EssayQuotaExceededDetails = {
  limit: number;
  used: number;
  resetsAt: string; // ISO 8601 em UTC
};
