# Preferências Locais para Este Repositório

Estas preferências complementam `docs/CLAUDE.md` somente neste projeto.

## Antes de Implementar

- Baseie a decisão no código e na configuração existentes, não em suposições sobre o produto.
- Declare uma suposição somente quando ela afetar o resultado. Se a escolha alterar escopo, dados de medição, comportamento do sensor ou risco para o usuário, peça direção antes de seguir.
- Para uma tarefa com várias etapas, defina critérios observáveis de sucesso e mantenha o plano curto.

## Mudanças Enxutas

- Altere somente os arquivos necessários para cumprir o pedido.
- Não refatore, reformate ou remova código vizinho apenas para deixá-lo mais parecido com uma preferência pessoal.
- Remova somente imports, variáveis, funções ou arquivos que a própria alteração tenha tornado obsoletos.
- Não crie abstrações para um único uso nem opções de configuração sem uma necessidade real.

## Padrões de Implementação

- Siga os padrões já presentes de React Native, Expo Router, componentes temáticos e arquivos específicos de plataforma.
- Mantenha tipos próximos de um único consumidor; compartilhe-os apenas quando houver reutilização real.
- Use comentários para decisões, restrições e comportamento não óbvio. Não documente o que o código já torna evidente e não adicione comentários `TODO`.
- Quando documentação de uma função for solicitada, mantenha-a curta: propósito, parâmetros relevantes e retorno quando isso ajudar a entender o contrato.

## Interface

- Antes de criar uma tela ou componente, analise o percurso afetado, os componentes reutilizáveis e `src/constants/theme.ts`.
- Reutilize os tokens e os componentes existentes; não introduza uma biblioteca ou sistema visual novo sem aprovação.
- Prefira uma interface limpa, legível e orientada à tarefa, com estados de pressionado, foco, desabilitado, carregamento, vazio e erro quando aplicáveis.
- Preserve acessibilidade: rótulos claros, foco visível na web, contraste suficiente e alvos de toque confortáveis.
- Não use conteúdo fictício para representar leituras, unidades, sensores ou orientação clínica. Solicite o requisito de produto que estiver faltando.

## Verificação e Entrega

- Execute a validação local proporcional à mudança; `npm run lint` é o único comando de qualidade configurado.
- Informe comandos executados, resultados, limitações e plataformas que não puderam ser verificadas.
- Não afirme que uma alteração funciona sem evidência da validação correspondente.
