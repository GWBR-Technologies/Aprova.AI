# contracts

Contrato entre o app e o backend: comandos, consultas e eventos, como tipos, sem lógica nem código executável (valores de negócio, como o limite de correções por mês, são configuração do servidor e chegam ao app por consulta). Subpastas `commands/`, `queries/` e `events/` nascem com o primeiro contrato aprovado; `http/` guarda os tipos que não são comandos nem consultas (`ApiError` e os endpoints de autenticação, que devolvem tokens e não `202`).

- Pode importar: apenas outros arquivos de `contracts/`.
- Não pode importar: `src/` e `backend/`.

Regras completas em `docs/ARQUITETURA.md` (§10).
