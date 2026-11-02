import type { CommandAccepted, CommandEnvelope } from '@contracts/commands/command-envelope.ts';

export type CommandType = 'AnswerQuestion' | 'RecordRoutineProgress' | 'SubmitEssay' | 'CompleteMockExam';

export type CommandClaim = { replayed: true; response: CommandAccepted } | { replayed: false };

export interface CommandLogRepository {
  /**
   * Reivindica (userId, commandId) dentro da transação corrente (§6 do guia). Um reenvio com o
   * mesmo payload devolve a resposta guardada; com payload ou tipo diferente lança CommandIdConflict.
   */
  claim(userId: string, cmd: CommandEnvelope<unknown>, type: CommandType): Promise<CommandClaim>;
  complete(userId: string, commandId: string, response: CommandAccepted): Promise<void>;
}
