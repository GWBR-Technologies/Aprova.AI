# contracts

Contrato entre o app e o backend: comandos, consultas e eventos, como tipos, sem lógica nem código executável (valores de negócio, como o limite de correções por mês, são configuração do servidor e chegam ao app por consulta). Subpastas: `commands/` (envelope e payloads), `queries/` (DTOs de resposta), `events/` (envelope e eventos do catálogo) e `auth/` (login e tokens); `api-error.ts` define o corpo de erro. Todo import entre arquivos usa `import type` com a extensão `.ts`.

- Pode importar: apenas outros arquivos de `contracts/`.
- Não pode importar: `src/` e `backend/`.

Regras completas em `docs/ARQUITETURA.md` (§10).
