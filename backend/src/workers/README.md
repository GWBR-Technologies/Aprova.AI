# backend/src/workers

Um processador BullMQ por fila (`essay-correction`, `mock-exam-processing`, `projections`). Cada handler é idempotente por `eventId`.

- Pode importar: `application` e `contracts`.
- Não pode importar: `infrastructure` (a ligação é feita em `bootstrap/`) e `api`.

Regras completas em `docs/ARQUITETURA.md` (§10).
