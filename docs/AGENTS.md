# Instruções do Projeto para Claude e Codex

Este é o único `AGENTS.md` do repositório. Ele contém as instruções compartilhadas pelos agentes; o Codex o recebe no início da sessão por meio do hook local em `.codex/hooks.json`.

## Contexto do Repositório

`medidorPressao` é um aplicativo Expo 57 com React Native, React 19 e TypeScript estrito. A navegação usa Expo Router; as rotas ficam em `src/app/`, componentes compartilhados em `src/components/`, hooks em `src/hooks/` e tokens visuais em `src/constants/theme.ts`.

O aplicativo é destinado a iOS, Android e web estática, com orientação preferencial em retrato. Ele está no estágio inicial: a tela inicial está vazia e não há contrato implementado para medições, sensor, unidades, persistência, autenticação ou regras clínicas. O nome e o histórico indicam um medidor digital de pressão e compressão, mas não substituem um requisito de produto aprovado.

## Prioridade e Escopo

Em caso de conflito, siga esta ordem:

1. Pedido explícito do usuário e requisitos aprovados.
2. Código, `package.json`, `app.json`, `tsconfig.json`, testes e documentação deste repositório.
3. Estas instruções.
4. Convenções gerais.

Não escolha silenciosamente entre requisitos conflitantes. Explique o conflito e peça direção. Antes de editar, inspecione o menor conjunto relevante de rotas, componentes, hooks e configurações. Para uma tarefa com várias etapas, defina critérios observáveis de sucesso e mantenha o plano curto.

Altere apenas os arquivos necessários. Não refatore, reformate ou remova código adjacente sem relação direta com o pedido. Remova somente os itens que a própria alteração tiver tornado obsoletos. Não crie abstrações para um único uso, funcionalidades especulativas, dependências ou configurações sem aprovação.

## Convenções de Código

- Mantenha rotas em `src/app/`, componentes reutilizáveis em `src/components/`, hooks em `src/hooks/` e tokens compartilhados em `src/constants/theme.ts`.
- Preserve a convenção de rotas do Expo Router e os arquivos específicos de plataforma, como `*.web.tsx`.
- Use componentes React Native e `StyleSheet` para UI nativa compartilhada. Mantenha CSS específico de navegador em arquivos web e em `src/global.css`.
- Preserve a estrutura, os exports e o estilo de imports existente. Agrupe imports de terceiros, relativos e `@/` com uma linha em branco entre grupos.
- Use tipos explícitos nas fronteiras: props, parâmetros de rota, dados persistidos e dados de dispositivos ou rede. Evite `any`, supressões de tipo, casts amplos e regras de lint desativadas.
- Mantenha tipos próximos do único consumidor; mova-os para um local compartilhado somente após uma segunda reutilização real.
- Comente decisões, restrições ou comportamento não óbvio. Não documente o que o código já deixa claro e não adicione comentários `TODO`.

## Interface e Acessibilidade

- Reutilize `Colors`, `Fonts`, `Spacing`, `MaxContentWidth`, `ThemedView` e `ThemedText` antes de criar primitivas visuais.
- Preserve os modos claro e escuro ao mudar UI compartilhada.
- Projete primeiro para telas estreitas em retrato; preserve ordem de leitura, foco visível e largura útil na implementação web.
- Use rótulos claros, nomes acessíveis, contraste adequado e alvos de toque confortáveis. Não dependa apenas de cor, ícone, animação ou gesto para comunicar estado.
- Cubra estados de pressionado, foco, desabilitado, carregamento, vazio, erro e recuperação quando eles forem relevantes.
- Não trate os rótulos, ativos, rotas ou componentes iniciais do Expo como requisitos de produto.
- Evite efeitos decorativos, painéis de métricas, leituras fictícias e elementos que não apoiem uma tarefa real.

## Medições e Limites de Produto

- Não invente leituras, unidades, faixas, alertas, tendências, calibração, conexão de sensor, histórico, diagnósticos ou orientação clínica.
- Antes de implementar uma medição, obtenha um contrato que defina origem, unidade, validade, horário, estados de erro e comportamento esperado.
- Mantenha valores exibidos, rascunhos editáveis e estados de carregamento ou erro separados.
- Não introduza comunicação de rede, conexão com dispositivo, persistência, autenticação ou telemetria sem pedido explícito e contrato definido.
- Ao implementar uma fronteira de dados, valide dados antes que eles afetem UI ou cálculos e modele unidade, horário, origem e validade explicitamente.

## Validação Local

Os scripts existentes são `npm run start`, `npm run android`, `npm run ios`, `npm run web`, `npm run lint` e `npm run reset-project`.

- Execute `npm run lint` quando aplicável à alteração.
- Valide na plataforma afetada somente quando houver um destino local adequado. Mudanças em rotas ou componentes compartilhados exigem considerar as versões nativa e web.
- Não há scripts configurados para verificação de tipos, testes, testes de ponta a ponta ou build de produção. Não os presuma nem os apresente como disponíveis.
- `npm run reset-project` reorganiza o conteúdo inicial; só o execute quando isso fizer parte explícita da tarefa.
- Relate os comandos executados, resultados e o que não pôde ser validado. Não alegue sucesso sem evidência.

## Segurança e Git

- Não leia, imprima, altere ou versione segredos, credenciais, `.env` ou `.npmrc`.
- Não adicione, atualize, remova ou substitua dependências sem aprovação explícita.
- Não faça commit, push, publicação ou release sem autorização explícita.
- Não use exclusão recursiva, `git clean` ou `git reset --hard`.
- Solicite direção antes de mudanças que definam dados de medição, ações irreversíveis, permissões, segurança ou comportamento do sensor.

## Regras de Revisão de Código

Ao revisar mudanças, reporte apenas problemas concretos e acionáveis. Verifique correção, regressões, comportamento de plataforma, Expo Router, acessibilidade, segurança, estados de UI e cobertura disponível. Para cada problema, informe prioridade, arquivo e linha, evidência, impacto e a menor correção recomendada. Não reporte preferências puramente estilísticas.

Se não houver um problema concreto, responda: `No actionable findings found.`
