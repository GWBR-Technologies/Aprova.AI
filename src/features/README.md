# src/features

Contextos de negócio do app (`questions`, `routine`, `mock-exams`, `essay`, `performance`). Cada contexto tem `commands/`, `queries/`, `events/` e `ui/`, criados junto do primeiro uso.

- Pode importar: `src/core`, `src/components`, `src/hooks`, `src/constants` e `contracts`.
- Não pode importar: outro contexto e `src/app`. Contextos se comunicam por eventos e contratos.

Regras completas em `docs/ARQUITETURA.md` (§10).
