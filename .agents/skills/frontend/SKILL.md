---
name: frontend
description: Implementar, revisar ou corrigir telas, componentes, rotas, acessibilidade e comportamento responsivo no aplicativo Expo.
---

# Workflow de Interface

Use este skill para tarefas de UI, telas, componentes, navegação, formulários, responsividade ou acessibilidade.

1. Leia `docs/AGENTS.md` e inspecione a rota afetada em `src/app/`, componentes em `src/components/`, hooks e arquivos `.web.tsx` correspondentes.
2. Reutilize `Colors`, `Fonts`, `Spacing`, `MaxContentWidth`, `ThemedView` e `ThemedText` antes de criar uma primitiva visual.
3. Preserve Expo Router, React Native e a separação entre código compartilhado e comportamento específico de web.
4. Defina apenas os estados que se aplicam: padrão, pressionado, foco, desabilitado, carregamento, vazio, sucesso, erro, indisponível ou pendente.
5. Não invente leituras, sensores, unidades, faixas, alertas, histórico ou orientação clínica. Peça o contrato que estiver faltando.
6. Valide com `npm run lint` e, quando houver um destino local adequado, na plataforma afetada.

Ao concluir, informe os padrões reutilizados, estados cobertos, validações executadas e requisitos de produto ou dispositivo ainda necessários.
