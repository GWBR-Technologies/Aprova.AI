import { createServer } from 'node:http';

import { Counter, collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client';

// Métricas do §15.2 do guia. Cada processo cria o seu registro e usa só as que lhe dizem respeito.
export function createMetrics(service: string) {
  const registry = new Registry();
  registry.setDefaultLabels({ service });
  collectDefaultMetrics({ register: registry });
  const registers = [registry];

  return {
    registry,
    httpDuration: new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Latência das requisições HTTP por rota e status',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers,
    }),
    quotaRejections: new Counter({
      name: 'essay_quota_rejections_total',
      help: 'Envios de redação recusados por falta de Premium ou de cota',
      labelNames: ['reason'],
      registers,
    }),
    aiRequests: new Counter({
      name: 'ai_requests_total',
      help: 'Chamadas à IA por resultado',
      labelNames: ['outcome'],
      registers,
    }),
    aiTokens: new Counter({
      name: 'ai_tokens_total',
      help: 'Tokens consumidos na IA por tipo',
      labelNames: ['kind'],
      registers,
    }),
    aiCost: new Counter({
      name: 'ai_cost_usd_total',
      help: 'Custo acumulado estimado da IA em dólares',
      registers,
    }),
    deadLetter: new Counter({
      name: 'dead_letter_total',
      help: 'Mensagens publicadas na fila dead-letter pelo relay',
      registers,
    }),
    /** Profundidade por estado e idade do job mais antigo à espera, lidas do Redis a cada coleta. */
    queueGauges(
      read: () => Promise<{ queue: string; counts: Record<string, number>; oldestWaitingAgeSeconds: number }[]>,
    ) {
      let last: ReturnType<typeof read> | undefined;
      const snapshot = () => (last ??= read().finally(() => (last = undefined)));
      new Gauge({
        name: 'queue_jobs',
        help: 'Jobs por fila e estado',
        labelNames: ['queue', 'state'],
        registers,
        async collect() {
          for (const { queue, counts } of await snapshot()) {
            for (const [state, value] of Object.entries(counts)) this.set({ queue, state }, value);
          }
        },
      });
      new Gauge({
        name: 'queue_oldest_waiting_age_seconds',
        help: 'Idade do job mais antigo à espera, por fila',
        labelNames: ['queue'],
        registers,
        async collect() {
          for (const { queue, oldestWaitingAgeSeconds } of await snapshot()) this.set({ queue }, oldestWaitingAgeSeconds);
        },
      });
    },
    /** Custo da IA no mês corrente (UTC, como a cobrança do provedor) e o orçamento configurado. */
    aiBudgetGauges(readMonthCost: () => Promise<number>, monthlyBudgetUsd: number | undefined) {
      new Gauge({
        name: 'ai_cost_month_to_date_usd',
        help: 'Custo estimado da IA desde o início do mês em UTC, lido de ai_usage',
        registers,
        async collect() {
          this.set(await readMonthCost());
        },
      });
      if (monthlyBudgetUsd !== undefined) {
        new Gauge({ name: 'ai_monthly_budget_usd', help: 'Orçamento mensal da IA (AI_MONTHLY_BUDGET_USD)', registers }).set(monthlyBudgetUsd);
      }
    },
    /** Gauges do outbox; o valor é lido do banco a cada coleta. */
    outboxGauges(read: () => Promise<{ pending: number; oldestAgeSeconds: number }>) {
      let last: Promise<{ pending: number; oldestAgeSeconds: number }> | undefined;
      const snapshot = () => (last ??= read().finally(() => (last = undefined)));
      new Gauge({
        name: 'outbox_pending',
        help: 'Linhas do outbox ainda não publicadas',
        registers,
        async collect() {
          this.set((await snapshot()).pending);
        },
      });
      new Gauge({
        name: 'outbox_oldest_pending_age_seconds',
        help: 'Idade da linha pendente mais antiga do outbox',
        registers,
        async collect() {
          this.set((await snapshot()).oldestAgeSeconds);
        },
      });
    },
  };
}

export type Metrics = ReturnType<typeof createMetrics>;

/** Servidor da porta interna de métricas; nunca exposto pelo proxy (§12.1 do guia). */
export function startMetricsServer(port: number, render: () => Promise<string>, contentType: string) {
  const server = createServer((req, res) => {
    if (req.method !== 'GET' || req.url !== '/metrics') {
      res.statusCode = 404;
      res.end();
      return;
    }
    render().then(
      (body) => {
        res.setHeader('content-type', contentType);
        res.end(body);
      },
      () => {
        res.statusCode = 500;
        res.end();
      },
    );
  });
  server.listen(port, '0.0.0.0');
  return server;
}
