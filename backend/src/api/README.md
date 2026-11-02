# backend/src/api

Camada HTTP. Rotas de comando (respondem `202 Accepted` com `commandId`) e rotas de consulta (devolvem DTO com `asOf`) ficam separadas.

- Pode importar: `application` e `contracts`.
- Não pode importar: `infrastructure` e `domain`.

Hoje: `server.ts` (Fastify, autenticação, limite de taxa), `errors.ts` (tradução para `ApiError`), `routes/commands/`, `routes/queries/`, `routes/auth.routes.ts` e `routes/health.routes.ts`.

Regras completas em `docs/ARQUITETURA.md` (§10).
