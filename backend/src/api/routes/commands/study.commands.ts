import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { makeAnswerQuestionHandler } from '../../../application/commands/answer-question.handler.ts';
import type { makeCompleteMockExamHandler } from '../../../application/commands/complete-mock-exam.handler.ts';
import type { makeRecordRoutineProgressHandler } from '../../../application/commands/record-routine-progress.handler.ts';
import { registerCommand } from './command-route.ts';

import type { AnswerQuestionPayload } from '@contracts/commands/answer-question.command.ts';
import type { CompleteMockExamPayload } from '@contracts/commands/complete-mock-exam.command.ts';
import type { RecordRoutineProgressPayload } from '@contracts/commands/record-routine-progress.command.ts';

export type StudyCommandHandlers = {
  answerQuestion: ReturnType<typeof makeAnswerQuestionHandler>;
  recordRoutineProgress: ReturnType<typeof makeRecordRoutineProgressHandler>;
  completeMockExam: ReturnType<typeof makeCompleteMockExamHandler>;
};

// Os campos de negócio ainda não foram definidos com o produto: por ora só se exige um objeto JSON,
// limitado pelo bodyLimit do servidor. Os esquemas ficam mais estritos quando os contratos crescerem.
const productFields = z.record(z.string(), z.unknown());

const answerQuestionSchema = productFields satisfies z.ZodType<AnswerQuestionPayload>;
const recordRoutineProgressSchema = productFields satisfies z.ZodType<RecordRoutineProgressPayload>;
const completeMockExamSchema = z.looseObject({ mockExamId: z.uuid() }) satisfies z.ZodType<CompleteMockExamPayload>;

export function registerStudyCommands(app: FastifyInstance, handlers: StudyCommandHandlers) {
  registerCommand(app, 'answer-question', answerQuestionSchema, handlers.answerQuestion);
  registerCommand(app, 'record-routine-progress', recordRoutineProgressSchema, handlers.recordRoutineProgress);
  registerCommand(app, 'complete-mock-exam', completeMockExamSchema, handlers.completeMockExam);
}
