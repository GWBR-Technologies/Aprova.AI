# backend/src/api

Camada HTTP. Rotas de comando (respondem `202 Accepted` com `commandId`) e rotas de consulta (devolvem DTO com `asOf`) ficam separadas.

- Pode importar: `application` e `contracts`.
- Não pode importar: `infrastructure` e `domain`.

Regras completas em `docs/ARQUITETURA.md` (§10).
