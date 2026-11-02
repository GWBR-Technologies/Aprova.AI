---
name: frontend
description: Implementar, revisar ou corrigir telas, componentes, rotas, acessibilidade e comportamento responsivo no aplicativo Expo.
---

# Workflow de Interface

Use este skill para tarefas de UI, telas, componentes, navegação, formulários, responsividade ou acessibilidade.

1. Leia `docs/AGENTS.md` e inspecione o contexto afetado em `src/features/`, a composição em `src/app/`, componentes em `src/components/`, hooks e arquivos `.web.tsx` correspondentes.
2. Reutilize os tokens de `src/constants/theme.ts` e os componentes compartilhados, quando existirem, antes de criar uma primitiva visual.
3. Preserve os padrões de React Native (Expo Router; os arquivos de rota ficam finos e renderizam telas de `src/features/<contexto>/ui`) e a separação entre código compartilhado e comportamento específico de web.
4. Defina apenas os estados que se aplicam: padrão, pressionado, foco, desabilitado, carregamento, vazio, sucesso, erro, indisponível, offline, recebido ou em processamento.
5. Não invente questões, gabaritos, notas, desempenho, histórico ou correções de redação. Peça o contrato que estiver faltando.
6. Execute `npm run lint`, `npm run typecheck` e `npm test` e, quando houver um destino local adequado, valide na plataforma afetada.

Ao concluir, informe os padrões reutilizados, estados cobertos, validações executadas e requisitos de produto ou de contrato ainda necessários.
