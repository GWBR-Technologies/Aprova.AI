# backend/src/bootstrap

Composition roots (`api.ts` e `worker.ts`): ligam portas a adaptadores e iniciam a API ou os Workers.

- Pode importar: todas as camadas.
- Não pode importar: —

Hoje: `api.ts`, `worker.ts`, `relay.ts`, `migrate.ts`, `env.ts` (variáveis do §18 do guia de back-end) e `shutdown.ts`.

Regras completas em `docs/ARQUITETURA.md` (§10).
