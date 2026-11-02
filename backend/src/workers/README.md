# backend/src/workers

Um processador BullMQ por fila (`essay-correction`, `mock-exam-processing`, `projections`). Cada handler é idempotente por `eventId`.

- Pode importar: `application` e `contracts`.
- Não pode importar: `infrastructure` (a ligação é feita em `bootstrap/`) e `api`.

Hoje: `essay-correction/`, `projections/` e `relay/` (relay do outbox, reconciliador e limpeza). `mock-exam-processing` espera as regras de simulado.

Regras completas em `docs/ARQUITETURA.md` (§10).
