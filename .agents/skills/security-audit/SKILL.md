---
name: security-audit
description: Auditar, somente em leitura, mudanças relacionadas a dados de medição, permissões, segredos, limites de dispositivo e dados sensíveis.
---

# Workflow de Auditoria de Segurança

Use este skill apenas no escopo delegado e nas fronteiras diretamente relacionadas.

1. Inspecione validação de entrada, tratamento de dados, permissões, segredos, configurações, erros e alterações de dependência.
2. Para futuras medições, verifique se origem, unidade, horário, validade e falhas são modelados e apresentados de forma inequívoca.
3. Não transforme recomendações genéricas em achados. Todo achado precisa de evidência no código.
4. Recomende a menor mitigação efetiva.

Para cada achado, informe severidade, arquivo e linha, evidência, cenário de falha e mitigação. Liste também o que foi inspecionado, o que não foi e as premissas adotadas.
