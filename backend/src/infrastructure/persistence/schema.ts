import { sql } from 'drizzle-orm';
import {
  bigserial,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import type { OutboxMessage } from '../../application/messages.ts';

import type { IdentityProvider } from '@contracts/auth/auth.ts';
import type { CommandAccepted } from '@contracts/commands/command-envelope.ts';
import type { Plan } from '@contracts/queries/get-entitlements.query.ts';
import type { EssayStatus } from '@contracts/queries/get-essay.query.ts';
import type { MockExamStatus } from '@contracts/queries/get-mock-exam-result.query.ts';

// Espelha o SQL do §5 do guia de implementação do back-end; mudanças entram por nova migração.

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const write = pgSchema('write');
export const read = pgSchema('read');

// E-mail e nome não são guardados: minimização de dados até haver necessidade (LGPD).
export const users = write.table(
  'users',
  {
    id: uuid('id').primaryKey(),
    provider: text('provider').$type<IdentityProvider>().notNull(),
    providerSub: text('provider_sub').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.provider, t.providerSub), check('users_provider_check', sql`${t.provider} IN ('google', 'apple')`)],
);

export const refreshTokens = write.table('refresh_tokens', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  familyId: uuid('family_id').notNull(),
  tokenHash: bytea('token_hash').notNull().unique(), // SHA-256; o token em si nunca é guardado
  expiresAt: timestamptz('expires_at').notNull(),
  revokedAt: timestamptz('revoked_at'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export const entitlements = write.table(
  'entitlements',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id),
    plan: text('plan').$type<Plan>().notNull(),
    validUntil: timestamptz('valid_until'), // nulo: sem expiração
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [check('entitlements_plan_check', sql`${t.plan} IN ('FREE', 'PREMIUM')`)],
);

export const commandLog = write.table(
  'command_log',
  {
    userId: uuid('user_id').notNull(),
    commandId: uuid('command_id').notNull(),
    commandType: text('command_type').notNull(),
    payloadHash: bytea('payload_hash').notNull(), // SHA-256 do payload em JSON canônico
    response: jsonb('response').$type<CommandAccepted>().notNull(),
    receivedAt: timestamptz('received_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.commandId] })],
);

export const essays = write.table(
  'essays',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    commandId: uuid('command_id').notNull(),
    text: text('text').notNull(),
    status: text('status').$type<EssayStatus>().notNull(),
    quotaPeriod: text('quota_period').notNull(), // 'AAAA-MM' em America/Sao_Paulo
    version: integer('version').notNull().default(1),
    result: jsonb('result').$type<Record<string, unknown>>(),
    promptVersion: text('prompt_version'),
    model: text('model'),
    failureCode: text('failure_code'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [
    check('essays_status_check', sql`${t.status} IN ('processing', 'completed', 'failed')`),
    index('essays_user_created').on(t.userId, t.createdAt.desc()),
  ],
);

export const essayQuota = write.table(
  'essay_quota',
  {
    userId: uuid('user_id').notNull(),
    period: text('period').notNull(),
    used: integer('used').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.period] }), check('essay_quota_used_check', sql`${t.used} >= 0`)],
);

export const questionAnswers = write.table('question_answers', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  commandId: uuid('command_id').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(), // campos finais definidos com o produto
  answeredAt: timestamptz('answered_at').notNull(),
});

export const routineProgress = write.table('routine_progress', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  commandId: uuid('command_id').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  recordedAt: timestamptz('recorded_at').notNull(),
});

export const mockExams = write.table(
  'mock_exams',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    commandId: uuid('command_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: text('status').$type<MockExamStatus>().notNull(),
    version: integer('version').notNull().default(1),
    result: jsonb('result').$type<Record<string, unknown>>(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [check('mock_exams_status_check', sql`${t.status} IN ('processing', 'completed', 'failed')`)],
);

export const outbox = write.table(
  'outbox',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    eventId: uuid('event_id').notNull().unique(),
    eventType: text('event_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    correlationId: uuid('correlation_id').notNull(),
    envelope: jsonb('envelope').$type<OutboxMessage>().notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    publishedAt: timestamptz('published_at'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
  },
  (t) => [index('outbox_pending').on(t.id).where(sql`${t.publishedAt} IS NULL`)],
);

export const processedEvents = write.table(
  'processed_events',
  {
    consumer: text('consumer').notNull(),
    eventId: uuid('event_id').notNull(),
    processedAt: timestamptz('processed_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.consumer, t.eventId] })],
);

export const aiUsage = write.table('ai_usage', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  essayId: uuid('essay_id').notNull(),
  attempt: integer('attempt').notNull(),
  model: text('model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  cachedInputTokens: integer('cached_input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  costUsd: numeric('cost_usd', { precision: 12, scale: 6, mode: 'number' }).notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

// write.push_tokens só nasce com a aprovação da proposta P4.

export const essayView = read.table(
  'essay_view',
  {
    essayId: uuid('essay_id').primaryKey(),
    userId: uuid('user_id').notNull(),
    status: text('status').$type<EssayStatus>().notNull(),
    result: jsonb('result').$type<Record<string, unknown>>(),
    failureCode: text('failure_code'),
    aggregateVersion: integer('aggregate_version').notNull(),
    createdAt: timestamptz('created_at').notNull(),
    asOf: timestamptz('as_of').notNull(),
  },
  (t) => [index('essay_view_user').on(t.userId, t.createdAt.desc())],
);

export const performanceSummary = read.table('performance_summary', {
  userId: uuid('user_id').primaryKey(),
  data: jsonb('data').$type<Record<string, unknown>>().notNull(), // campos definidos com o produto
  asOf: timestamptz('as_of').notNull(),
});

export const mockExamView = read.table(
  'mock_exam_view',
  {
    mockExamId: uuid('mock_exam_id').primaryKey(),
    userId: uuid('user_id').notNull(),
    status: text('status').$type<MockExamStatus>().notNull(),
    result: jsonb('result').$type<Record<string, unknown>>(),
    aggregateVersion: integer('aggregate_version').notNull(),
    createdAt: timestamptz('created_at').notNull(),
    asOf: timestamptz('as_of').notNull(),
  },
  (t) => [index('mock_exam_view_user').on(t.userId, t.createdAt.desc())],
);
