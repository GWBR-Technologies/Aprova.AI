---
name: fix-issue
description: Investigar e corrigir um defeito descrito com implementação enxuta e validação local proporcional.
---

# Workflow de Correção de Defeito

Use este skill para uma descrição de problema fornecida pelo usuário.

1. Leia o comportamento relatado, o código relevante, `docs/AGENTS.md` e qualquer teste ou contrato local aplicável.
2. Defina critérios observáveis de sucesso antes de editar.
3. Reproduza o problema com uma verificação focada quando isso for prático.
4. Faça apenas a menor correção necessária.
5. Execute a validação local disponível e relate limitações.

Não adicione dependências, dados persistidos, conexões de dispositivo, comunicação de rede ou refatorações não relacionadas sem aprovação. Pare e peça direção quando a correção exigir uma decisão de produto, medição, segurança ou modelo de dados que não esteja definida.
