import { eq } from 'drizzle-orm';

import type {
  MockExamRepository,
  QuestionAnswerRepository,
  RoutineProgressRepository,
} from '../../application/ports/study-records.port.ts';
import type { Executor } from './database.ts';
import { mockExams, questionAnswers, routineProgress } from './schema.ts';

export function questionAnswerRepository(db: Executor): QuestionAnswerRepository {
  return {
    async insert(answer) {
      await db.insert(questionAnswers).values(answer);
    },
  };
}

export function routineProgressRepository(db: Executor): RoutineProgressRepository {
  return {
    async insert(progress) {
      await db.insert(routineProgress).values(progress);
    },
  };
}

export function mockExamRepository(db: Executor): MockExamRepository {
  return {
    async insert(mockExam) {
      const rows = await db
        .insert(mockExams)
        .values({ ...mockExam, status: 'processing', version: 1 })
        .onConflictDoNothing({ target: mockExams.id })
        .returning({ id: mockExams.id });
      return rows.length > 0;
    },

    async find(id) {
      const [row] = await db
        .select({
          id: mockExams.id,
          userId: mockExams.userId,
          status: mockExams.status,
          version: mockExams.version,
          result: mockExams.result,
          createdAt: mockExams.createdAt,
        })
        .from(mockExams)
        .where(eq(mockExams.id, id));
      return row ?? null;
    },
  };
}
