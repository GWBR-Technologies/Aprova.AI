import type { RefreshTokenRepository, UserRepository } from './auth.port.ts';
import type { CommandLogRepository } from './command-log.port.ts';
import type { EntitlementPort } from './entitlement.port.ts';
import type { AiUsageRepository, EssayQuotaRepository, EssayRepository } from './essay-store.port.ts';
import type { OutboxRepository } from './outbox.port.ts';
import type { ProcessedEventsRepository } from './processed-events.port.ts';
import type { ReadModelWriter } from './read-models.port.ts';
import type { MockExamRepository, QuestionAnswerRepository, RoutineProgressRepository } from './study-records.port.ts';

/** Repositórios ligados a uma única transação do banco. */
export type Tx = {
  commandLog: CommandLogRepository;
  outbox: OutboxRepository;
  processedEvents: ProcessedEventsRepository;
  entitlements: EntitlementPort;
  essays: EssayRepository;
  essayQuota: EssayQuotaRepository;
  aiUsage: AiUsageRepository;
  questionAnswers: QuestionAnswerRepository;
  routineProgress: RoutineProgressRepository;
  mockExams: MockExamRepository;
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;
  readModels: ReadModelWriter;
};

export interface UnitOfWork {
  /** Confirma se `work` terminar; qualquer erro lançado desfaz tudo. */
  run<T>(work: (tx: Tx) => Promise<T>): Promise<T>;
}
