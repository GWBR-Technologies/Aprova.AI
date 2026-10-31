# src/core

Infraestrutura do cliente, sem regra de negócio: cliente HTTP (`api/`), outbox local de comandos (`outbox/`), persistência local (`storage/`) e canal de eventos do servidor (`events/`).

- Pode importar: `contracts`.
- Não pode importar: `src/features`, `src/app` e `src/components`.

Regras completas em `docs/ARQUITETURA.md` (§10).
