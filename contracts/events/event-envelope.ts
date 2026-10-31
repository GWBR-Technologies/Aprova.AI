export type EventEnvelope<TType extends string, TPayload> = {
  eventId: string; // UUID; chave de idempotência dos consumidores
  type: TType;
  version: number; // versão do esquema do evento
  occurredAt: string; // ISO 8601 em UTC
  aggregateId: string;
  aggregateVersion: number;
  correlationId: string; // commandId que originou a cadeia
  causationId: string; // id da mensagem que causou este evento
  payload: TPayload;
};
