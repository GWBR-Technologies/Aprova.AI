# backend/src/infrastructure

Adaptadores das portas: fila BullMQ e alternativas (`queue/`), write store, read store e outbox (`persistence/`), e a IA GPT 6.1 - Terra com prompts versionados (`ai/`).

- Pode importar: `application/ports`, `domain` e `contracts`.
- Não pode importar: `api` e `workers`.

Regras completas em `docs/ARQUITETURA.md` (§10).
