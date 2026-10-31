# backend/src/application

Casos de uso: handlers de comando (`commands/`), handlers de consulta (`queries/`), projetores e reações a eventos (`events/`) e portas (`ports/`: `QueuePort`, `AiPort`, repositórios, relógio). Handlers de consulta só leem o read store.

- Pode importar: `domain` e `contracts`.
- Não pode importar: `infrastructure`, `api`, `workers` e bibliotecas de fila, IA ou banco.

Regras completas em `docs/ARQUITETURA.md` (§10).
