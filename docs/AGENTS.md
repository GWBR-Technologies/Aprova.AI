# Instruções do Projeto para Claude e Codex

Este é o único `AGENTS.md` do repositório e contém as instruções compartilhadas pelos agentes. Não há configuração `.codex/` versionada; os workflows reutilizáveis ficam em `.agents/skills/` e, para o Claude, em `.claude/`.

## Contexto do Repositório

`Aprova.AI` é um aplicativo para Android e iOS, feito com Expo 57, React Native 0.86, React 19 e TypeScript estrito, para estudo para o Enem, a Fuvest e outros vestibulares brasileiros, com apoio e correção por IA (GPT 6.1 - Terra).

A arquitetura é Event-Driven Architecture + CQRS, com BullMQ + Redis para filas e Workers em segundo plano para a IA. A fonte de verdade é `docs/ARQUITETURA.md` (com o PDF `docs/ARQUITETURA.pdf`). Os guias `docs/IMPLEMENTACAO-FRONTEND.md`, `docs/IMPLEMENTACAO-BACKEND.md` e `docs/IMPLEMENTACAO-DEVOPS.md` detalham a implementação de cada equipe e derivam dela. A correção de redação por IA é exclusiva do plano Premium, com 4 correções por mês, e a regra é aplicada no servidor (D9). Recursos devem ter opção gratuita; custo só com aprovação explícita, exceto a IA (D10).

O app já tem navegação (Expo Router), cliente HTTP, sessão, outbox local em SQLite, redação com plano Premium e cota, aviso por push e a identidade visual (`docs/DESIGN.md`). Ainda não há telas de questões, rotina, simulados e desempenho (faltam contratos do produto). O backend em `backend/` está implementado até o marco B4 (estado no §21 de `docs/IMPLEMENTACAO-BACKEND.md`). A orientação é retrato e a interface é clara (`app.json`). O script `web` existe, mas as dependências web não estão declaradas.

## Arquitetura

- Comandos (escrita) e consultas (leitura) são separados. O trabalho pesado e a IA rodam em Workers que consomem filas BullMQ + Redis.
- O app responde ao aluno de imediato (`202 Accepted`, por exemplo “Redação recebida com sucesso!”) e acompanha o processamento por consultas e eventos.
- Estrutura: app Expo em `src/` (`app/`, `features/<contexto>/{commands,queries,events,ui}`, `core/`, `components/`, `hooks/`, `constants/`), contratos compartilhados em `contracts/` e API com Workers em `backend/src/`. As regras de dependência entre camadas estão em `docs/ARQUITETURA.md` (§10) e no `README.md` de cada camada.
- A IA só é chamada por Workers, atrás de `AiPort`. Chaves de API não ficam no app nem no repositório.

## Prioridade e Escopo

Em caso de conflito, siga esta ordem:

1. Pedido explícito do usuário e requisitos aprovados.
2. Código, `package.json`, `app.json`, `tsconfig.json`, testes e documentação deste repositório, incluindo `docs/ARQUITETURA.md`.
3. Estas instruções.
4. Convenções gerais.

Não escolha silenciosamente entre requisitos conflitantes. Explique o conflito e peça direção. Antes de editar, inspecione o menor conjunto relevante de camadas, componentes e configurações. Para uma tarefa com várias etapas, defina critérios observáveis de sucesso e mantenha o plano curto.

Altere apenas os arquivos necessários. Não refatore, reformate ou remova código adjacente sem relação direta com o pedido. Remova somente os itens que a própria alteração tiver tornado obsoletos. Não crie abstrações para um único uso, funcionalidades especulativas, dependências ou configurações sem aprovação.

## Convenções de Código

- Coloque cada código na camada definida em `docs/ARQUITETURA.md` (§10): composição em `src/app/`, contextos em `src/features/`, infraestrutura do cliente em `src/core/`, UI compartilhada em `src/components/`, hooks em `src/hooks/`, tokens em `src/constants/theme.ts`, contratos em `contracts/`, backend em `backend/src/`, implantação em `infra/` e fluxos de CI/CD em `.github/workflows/` (só configuração e scripts, nunca segredos). Subpastas e arquivos nascem junto do primeiro uso real.
- Respeite as regras de importação entre camadas descritas no `README.md` de cada camada. Contextos de `src/features/` não importam uns aos outros.
- O ponto de entrada é `expo-router/entry` (`main` do `package.json`). `src/app/` contém somente rotas finas e o layout raiz com os providers; as telas ficam em `src/features/<contexto>/ui` (`docs/ARQUITETURA.md`, §10.4).
- Preserve arquivos específicos de plataforma, como `*.web.tsx`.
- Use componentes React Native e `StyleSheet` para UI nativa compartilhada. Mantenha CSS específico de navegador em arquivos web.
- Preserve a estrutura, os exports e o estilo de imports existente. Agrupe imports de terceiros, relativos e `@/` com uma linha em branco entre grupos. Os aliases `@/` (para `src/`) e `@contracts/` (para `contracts/`) estão no `tsconfig.json`; imports de `contracts/` no app são `import type`.
- Use tipos explícitos nas fronteiras: props, parâmetros de rota, comandos, consultas, eventos, dados persistidos, payloads de rede e saída da IA. Evite `any`, supressões de tipo, casts amplos e regras de lint desativadas.
- Mantenha tipos próximos do único consumidor; mova-os para um local compartilhado somente após uma segunda reutilização real. Um tipo usado pelo app e pelo backend vai para `contracts/`.
- Não crie barramento genérico de comandos ou consultas: rotas e telas chamam o handler diretamente.
- Comente decisões, restrições ou comportamento não óbvio. Não documente o que o código já deixa claro e não adicione comentários `TODO`.

## Interface e Acessibilidade

- A identidade visual está em `docs/DESIGN.md` e implementada em `src/constants/theme.ts`. Reutilize os tokens e os componentes de `src/components/` e peça direção antes de inventar paleta, tipografia ou sistema visual.
- Respeite `userInterfaceStyle` de `app.json` (hoje `light`). Se o modo escuro for introduzido, cubra os dois modos na UI compartilhada.
- Projete primeiro para telas estreitas em retrato; preserve ordem de leitura, foco visível e largura útil na implementação web.
- Use rótulos claros, nomes acessíveis, contraste adequado e alvos de toque confortáveis. Não dependa apenas de cor, ícone, animação ou gesto para comunicar estado.
- Cubra os estados que se aplicam: pressionado, foco, desabilitado, carregamento, vazio, erro, recuperação, offline, recebido e em processamento (`docs/ARQUITETURA.md`, §9).
- Não trate os rótulos, ativos ou telas iniciais do Expo como requisitos de produto.
- Evite efeitos decorativos, painéis de métricas, dados fictícios de desempenho e elementos que não apoiem uma tarefa real.

## Dados, Contratos e Limites de Produto

- Não invente questões, gabaritos, notas, pontuações, estatísticas de desempenho, correções de redação, conteúdo curricular, metas, prazos ou recomendações pedagógicas.
- Antes de implementar um comando, consulta ou evento, obtenha um contrato aprovado em `contracts/` que defina origem, formato, validade, horário (`occurredAt` e `asOf`), estados de erro e comportamento esperado.
- A identidade do aluno, a rubrica de correção de redação, as regras de simulado, a fonte do plano Premium e a política de dados pessoais são requisitos em aberto (`docs/ARQUITETURA.md`, §14). Peça direção antes de depender deles.
- Mantenha dados exibidos, rascunhos editáveis (como o texto de uma redação) e estados de carregamento, processamento ou erro separados.
- Não implemente comunicação de rede, persistência, autenticação, telemetria nem integração com a IA sem pedido explícito e contrato definido. Ao implementar, siga a arquitetura: comando → outbox local → API de comandos (`202`); consulta → API de consultas; IA somente em Workers.
- Ao implementar uma fronteira de dados, valide os dados antes que eles afetem UI ou cálculos e modele horário, origem e validade explicitamente.
- Nunca mostre ao aluno a saída bruta da IA nem detalhes de erro do provedor.

## Validação Local

Os scripts existentes são `npm run start`, `npm run android`, `npm run ios`, `npm run web`, `npm run lint`, `npm run typecheck` e `npm test`.

- No app (raiz), execute `npm run lint`, `npm run typecheck` e `npm test` e relate o resultado real de cada um. Não há scripts de testes de ponta a ponta nem de build de produção; não os presuma nem os apresente como disponíveis.
- No `backend/` existem `npm run typecheck`, `npm run lint` e `npm test` (execute dentro de `backend/`); os testes de integração só rodam com `TEST_DATABASE_URL` e `TEST_REDIS_URL` apontando para instâncias descartáveis.
- Valide na plataforma afetada somente quando houver um destino local adequado. Mudanças em componentes compartilhados exigem considerar as versões nativa e web.
- Relate os comandos executados, resultados e o que não pôde ser validado. Não alegue sucesso sem evidência.

## Segurança e Git

- Não leia, imprima, altere ou versione segredos, credenciais, `.env` ou `.npmrc`. O `.gitignore` atual cobre `.env*.local`, não `.env`.
- Não adicione, atualize, remova ou substitua dependências sem aprovação explícita.
- Não faça commit, push, publicação ou release sem autorização explícita.
- Mensagens de commit seguem o padrão do histórico, `(tipo): Frase no passado`, como em `(docs): Adicionado README.md completo e estruturado desta fase inicial`. Não mencione assistentes de IA nem `Co-Authored-By` em commits ou descrições de PR. Um commit por assunto.
- Não use exclusão recursiva, `git clean` ou `git reset --hard`.
- Solicite direção antes de mudanças que definam dados de estudo, ações irreversíveis, permissões, segurança, dados pessoais ou o contrato com a IA.

## Regras de Revisão de Código

Ao revisar mudanças, reporte apenas problemas concretos e acionáveis. Verifique correção, regressões, comportamento de plataforma, regras de importação entre camadas, idempotência e tratamento de falhas em comandos, eventos e Workers, acessibilidade, segurança, estados de UI e cobertura disponível. Para cada problema, informe prioridade, arquivo e linha, evidência, impacto e a menor correção recomendada. Não reporte preferências puramente estilísticas.

Se não houver um problema concreto, responda: `No actionable findings found.`
