import { randomBytes, randomUUID } from 'node:crypto';

import { CommandIdConflict } from '../../src/application/errors.ts';
import type { OutboxMessage } from '../../src/application/messages.ts';
import type { StoredRefreshToken } from '../../src/application/ports/auth.port.ts';
import type { AiUsageRecord, EssayRecord } from '../../src/application/ports/essay-store.port.ts';
import type { EssayViewRow, MockExamViewRow, ReadStore } from '../../src/application/ports/read-models.port.ts';
import type { MockExamRecord } from '../../src/application/ports/study-records.port.ts';
import type { Tx, UnitOfWork } from '../../src/application/ports/unit-of-work.port.ts';
import { quotaPeriod, startOfNextPeriod } from '../../src/domain/essay/quota-period.ts';
import { canonicalJson } from '../../src/infrastructure/persistence/canonical-json.ts';

import type { CommandAccepted } from '@contracts/commands/command-envelope.ts';
import type { Plan } from '@contracts/queries/get-entitlements.query.ts';

// Dublê de teste em memória com a mesma semântica dos repositórios Drizzle, para exercitar os
// handlers sem Postgres. Cada run() trabalha numa cópia do estado e só a confirma se não houver erro.
// Não reproduz concorrência: isso é coberto pelos testes de integração com o banco real.

type State = {
  commandLog: Map<string, { type: string; hash: string; response: CommandAccepted | null }>;
  outbox: { id: number; message: OutboxMessage; publishedAt: Date | null; attempts: number; lastError: string | null }[];
  processed: Set<string>;
  entitlements: Map<string, { plan: Plan; validUntil: Date | null }>;
  essays: Map<string, EssayRecord & { promptVersion: string | null; model: string | null; commandId: string }>;
  quota: Map<string, number>;
  aiUsage: AiUsageRecord[];
  questionAnswers: { id: string; payload: Record<string, unknown>; answeredAt: Date }[];
  routineProgress: { id: string; payload: Record<string, unknown>; recordedAt: Date }[];
  mockExams: Map<string, MockExamRecord & { payload: Record<string, unknown> }>;
  users: Map<string, string>;
  refreshTokens: (StoredRefreshToken & { token: string })[];
  essayView: Map<string, EssayViewRow>;
  mockExamView: Map<string, MockExamViewRow>;
  performance: Map<string, { data: Record<string, unknown>; asOf: Date }>;
  nextOutboxId: number;
};

const emptyState = (): State => ({
  commandLog: new Map(),
  outbox: [],
  processed: new Set(),
  entitlements: new Map(),
  essays: new Map(),
  quota: new Map(),
  aiUsage: [],
  questionAnswers: [],
  routineProgress: [],
  mockExams: new Map(),
  users: new Map(),
  refreshTokens: [],
  essayView: new Map(),
  mockExamView: new Map(),
  performance: new Map(),
  nextOutboxId: 1,
});

function bind(s: State, now: () => Date): Tx {
  return {
    commandLog: {
      async claim(userId, cmd, type) {
        const key = `${userId}|${cmd.commandId}`;
        const hash = canonicalJson(cmd.payload);
        const existing = s.commandLog.get(key);
        if (!existing) {
          s.commandLog.set(key, { type, hash, response: null });
          return { replayed: false };
        }
        if (existing.type !== type || existing.hash !== hash || !existing.response) throw new CommandIdConflict();
        return { replayed: true, response: existing.response };
      },
      async complete(userId, commandId, response) {
        const entry = s.commandLog.get(`${userId}|${commandId}`);
        if (entry) entry.response = response;
      },
    },
    outbox: {
      async add(message) {
        s.outbox.push({ id: s.nextOutboxId++, message, publishedAt: null, attempts: 0, lastError: null });
      },
      async claimPending(limit) {
        return s.outbox.filter((r) => r.publishedAt === null).slice(0, limit).map((r) => ({ id: r.id, message: r.message }));
      },
      async markPublished(ids, at) {
        for (const r of s.outbox) if (ids.includes(r.id)) r.publishedAt = at;
      },
      async recordFailure(ids, error) {
        for (const r of s.outbox) {
          if (!ids.includes(r.id)) continue;
          r.attempts += 1;
          r.lastError = error;
        }
      },
      async requeueStalled(before) {
        let count = 0;
        for (const r of s.outbox) {
          const stalledEssay = r.message.type === 'EssaySubmitted' && s.essays.get(r.message.aggregateId)?.status === 'processing';
          const stalledExam = r.message.type === 'MockExamCompleted' && s.mockExams.get(r.message.aggregateId)?.status === 'processing';
          if ((stalledEssay || stalledExam) && r.publishedAt !== null && r.publishedAt < before) {
            r.publishedAt = null;
            count += 1;
          }
        }
        return count;
      },
      async deletePublishedBefore(before) {
        const kept = s.outbox.filter((r) => r.publishedAt === null || r.publishedAt >= before);
        const removed = s.outbox.length - kept.length;
        s.outbox = kept;
        return removed;
      },
    },
    processedEvents: {
      async claim(consumer, eventId) {
        const key = `${consumer}|${eventId}`;
        if (s.processed.has(key)) return false;
        s.processed.add(key);
        return true;
      },
      async has(consumer, eventId) {
        return s.processed.has(`${consumer}|${eventId}`);
      },
    },
    entitlements: {
      async get(userId, at) {
        const row = s.entitlements.get(userId);
        if (!row || row.plan !== 'PREMIUM') return 'FREE';
        return row.validUntil === null || row.validUntil > at ? 'PREMIUM' : 'FREE';
      },
      async essayQuotaUsage(userId, at) {
        return { used: s.quota.get(`${userId}|${quotaPeriod(at)}`) ?? 0, resetsAt: startOfNextPeriod(at) };
      },
    },
    essays: {
      async insert(essay) {
        if (s.essays.has(essay.id)) return false;
        s.essays.set(essay.id, {
          ...essay,
          status: 'processing',
          version: 1,
          result: null,
          failureCode: null,
          promptVersion: null,
          model: null,
          createdAt: now(),
        });
        return true;
      },
      async find(id) {
        return s.essays.get(id) ?? null;
      },
      async complete(id, outcome) {
        const essay = s.essays.get(id);
        if (!essay || essay.status !== 'processing') return null;
        Object.assign(essay, { status: 'completed', ...outcome, version: essay.version + 1 });
        return essay;
      },
      async fail(id, failureCode) {
        const essay = s.essays.get(id);
        if (!essay || essay.status !== 'processing') return null;
        Object.assign(essay, { status: 'failed', failureCode, version: essay.version + 1 });
        return essay;
      },
    },
    essayQuota: {
      async reserve(userId, period, limit) {
        const key = `${userId}|${period}`;
        const used = s.quota.get(key) ?? 0;
        if (used >= limit) return null;
        s.quota.set(key, used + 1);
        return used + 1;
      },
      async release(userId, period) {
        const key = `${userId}|${period}`;
        const used = s.quota.get(key) ?? 0;
        if (used > 0) s.quota.set(key, used - 1);
      },
    },
    aiUsage: {
      async record(usage) {
        s.aiUsage.push(usage);
      },
      async countForEssay(essayId) {
        return s.aiUsage.filter((u) => u.essayId === essayId).length;
      },
      async costSince() {
        return s.aiUsage.reduce((sum, u) => sum + u.costUsd, 0);
      },
    },
    questionAnswers: {
      async insert(answer) {
        s.questionAnswers.push(answer);
      },
    },
    routineProgress: {
      async insert(progress) {
        s.routineProgress.push(progress);
      },
    },
    mockExams: {
      async insert(exam) {
        if (s.mockExams.has(exam.id)) return false;
        s.mockExams.set(exam.id, { ...exam, status: 'processing', version: 1, result: null, createdAt: now() });
        return true;
      },
      async find(id) {
        return s.mockExams.get(id) ?? null;
      },
    },
    users: {
      async findOrCreate(provider, subject) {
        const key = `${provider}|${subject}`;
        const existing = s.users.get(key);
        if (existing) return existing;
        const id = randomUUID();
        s.users.set(key, id);
        return id;
      },
    },
    refreshTokens: {
      async create(userId, familyId, expiresAt) {
        const token = randomBytes(32).toString('base64url');
        s.refreshTokens.push({ id: randomUUID(), userId, familyId, expiresAt, revokedAt: null, token });
        return token;
      },
      async findForUpdate(token) {
        return s.refreshTokens.find((t) => t.token === token) ?? null;
      },
      async revoke(id, at) {
        for (const t of s.refreshTokens) if (t.id === id && !t.revokedAt) t.revokedAt = at;
      },
      async revokeFamily(familyId, at) {
        for (const t of s.refreshTokens) if (t.familyId === familyId && !t.revokedAt) t.revokedAt = at;
      },
    },
    readModels: {
      async upsertEssayView(row) {
        const current = s.essayView.get(row.essayId);
        if (current && current.aggregateVersion >= row.aggregateVersion) return false;
        s.essayView.set(row.essayId, { ...row, asOf: now() });
        return true;
      },
      async upsertMockExamView(row) {
        const current = s.mockExamView.get(row.mockExamId);
        if (current && current.aggregateVersion >= row.aggregateVersion) return false;
        s.mockExamView.set(row.mockExamId, { ...row, asOf: now() });
        return true;
      },
    },
  };
}

export function memoryStore(now: () => Date = () => new Date()) {
  let state = emptyState();

  const uow: UnitOfWork = {
    async run(work) {
      const draft = structuredClone(state);
      const result = await work(bind(draft, now));
      state = draft;
      return result;
    },
  };

  const reads: ReadStore = {
    async essay(userId, essayId) {
      const row = state.essayView.get(essayId);
      return row && row.userId === userId ? row : null;
    },
    async performanceSummary(userId) {
      return state.performance.get(userId) ?? null;
    },
    async mockExams(userId, page) {
      return [...state.mockExamView.values()]
        .filter((r) => r.userId === userId && (!page.before || r.createdAt < page.before))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, page.limit);
    },
    async mockExam(userId, mockExamId) {
      const row = state.mockExamView.get(mockExamId);
      return row && row.userId === userId ? row : null;
    },
  };

  return {
    uow,
    reads,
    /** Acesso direto ao estado confirmado, para montar cenários e verificar efeitos. */
    get state() {
      return state;
    },
    get entitlements() {
      return bind(state, now).entitlements;
    },
    setPlan(userId: string, plan: Plan, validUntil: Date | null = null) {
      state.entitlements.set(userId, { plan, validUntil });
    },
  };
}
