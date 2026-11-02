import type { Tx, UnitOfWork } from '../../application/ports/unit-of-work.port.ts';
import { refreshTokenRepository, userRepository } from './auth.repository.ts';
import { commandLogRepository } from './command-log.repository.ts';
import type { Database, Executor } from './database.ts';
import { entitlementRepository } from './entitlement.repository.ts';
import { aiUsageRepository, essayQuotaRepository, essayRepository } from './essay.repository.ts';
import { outboxRepository } from './outbox.repository.ts';
import { processedEventsRepository } from './processed-events.repository.ts';
import { readModelWriter } from './read-models.repository.ts';
import { mockExamRepository, questionAnswerRepository, routineProgressRepository } from './study-records.repository.ts';

function bind(db: Executor): Tx {
  return {
    commandLog: commandLogRepository(db),
    outbox: outboxRepository(db),
    processedEvents: processedEventsRepository(db),
    entitlements: entitlementRepository(db),
    essays: essayRepository(db),
    essayQuota: essayQuotaRepository(db),
    aiUsage: aiUsageRepository(db),
    questionAnswers: questionAnswerRepository(db),
    routineProgress: routineProgressRepository(db),
    mockExams: mockExamRepository(db),
    users: userRepository(db),
    refreshTokens: refreshTokenRepository(db),
    readModels: readModelWriter(db),
  };
}

export function drizzleUnitOfWork(db: Database): UnitOfWork {
  return {
    run: (work) => db.transaction((tx) => work(bind(tx))),
  };
}
