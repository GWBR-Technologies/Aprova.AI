---
name: local-readiness
description: Verificar a prontidão local do aplicativo Expo sem publicar, liberar ou criar recursos remotos.
---

# Workflow de Prontidão Local

Use este skill para avaliar se a alteração está pronta para validação local.

1. Confirme os scripts existentes em `package.json`.
2. Não há script de lint; `npx tsc --noEmit` pode ser executado como verificação manual e deve ser relatado como tal.
3. Use `npm run web`, `npm run ios` ou `npm run android` somente se a mudança afetar a plataforma e houver um destino local disponível.
4. Não presuma scripts de lint, tipos, testes, testes de ponta a ponta ou build de produção: eles não estão configurados.

Relate cada comando executado, os comandos ignorados com justificativa, bloqueios locais e o que ainda precisa de validação.
