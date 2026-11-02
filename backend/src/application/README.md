# backend/src/application

Casos de uso: handlers de comando (`commands/`), handlers de consulta (`queries/`), projetores e reações a eventos (`events/`) e portas (`ports/`: `QueuePort`, `AiPort`, repositórios, relógio). Handlers de consulta só leem o read store.

- Pode importar: `domain` e `contracts`.
- Não pode importar: `infrastructure`, `api`, `workers` e bibliotecas de fila, IA ou banco.

Hoje: `commands/` (com `accept-command.ts`, a idempotência comum), `queries/`, `events/` (projetores de `essay_view` e `mock_exam_view`), `auth/` (login, refresh e logout), `ports/`, `errors.ts` e `messages.ts`. `GetEntitlements` é a exceção aprovada que lê o write store pela `EntitlementPort`.

Regras completas em `docs/ARQUITETURA.md` (§10).
