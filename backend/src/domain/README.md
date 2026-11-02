# backend/src/domain

Agregados, eventos de domínio e regras de negócio, em código puro (sem I/O, fila, banco ou IA).

- Pode importar: apenas arquivos de `domain/`.
- Não pode importar: qualquer outra camada.

Hoje: `essay/quota-period.ts` (período da cota e `resetsAt` em America/Sao_Paulo).

Regras completas em `docs/ARQUITETURA.md` (§10).
