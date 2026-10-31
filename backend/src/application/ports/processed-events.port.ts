export interface ProcessedEventsRepository {
  /** Registra o eventId para o consumidor; false quando ele já tinha sido processado. */
  claim(consumer: string, eventId: string): Promise<boolean>;
  has(consumer: string, eventId: string): Promise<boolean>;
}
