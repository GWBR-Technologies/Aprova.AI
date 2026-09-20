---
name: code-review
description: Fazer uma revisão isolada e somente leitura de mudanças de implementação neste aplicativo Expo.
---

# Workflow de Revisão de Código

Use este skill para revisar um conjunto de arquivos ou o diff atual, sem editar o repositório.

1. Defina o escopo e inspecione o diff, os chamadores, as rotas, os componentes, os contratos e a validação disponível.
2. Verifique correção, regressões, Expo Router, comportamento nativo e web, acessibilidade, segurança, estados de interface e cobertura disponível.
3. Reporte somente problemas concretos e acionáveis; não reporte preferências de estilo.
4. Para cada problema, informe prioridade, arquivo e linha, evidência, impacto e a menor correção recomendada.

Retorne `No actionable findings found.` quando não houver um problema concreto. Declare o escopo que não foi possível verificar.
