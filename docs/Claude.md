# Guia Operacional do Projeto

## Contexto do Repositório

`Aprova.AI` é um aplicativo para Android e iOS feito com Expo 57, React Native, React 19 e TypeScript estrito, para estudo para o Enem, a Fuvest e outros vestibulares brasileiros, com apoio e correção por IA (GPT 6.1 - Terra). A arquitetura é EDA + CQRS com BullMQ + Redis e Workers em segundo plano; a fonte de verdade é `docs/ARQUITETURA.md`.

O código do app fica em `src/` (composição em `src/app/`, contextos em `src/features/`, infraestrutura do cliente em `src/core/`), os contratos compartilhados em `contracts/` a API com os Workers em `backend/src/` e a implantação em `infra/` e `.github/` (só configuração e scripts, nunca segredos). O ponto de entrada é `expo-router/entry` (`main` do `package.json`).

O app já tem navegação (Expo Router), cliente HTTP, sessão, outbox local em SQLite, redação com plano Premium e cota, aviso por push e a identidade visual (`docs/DESIGN.md`). Ainda não há telas de questões, rotina, simulados e desempenho (faltam os contratos do produto, `docs/IMPLEMENTACAO-FRONTEND.md` §17). O backend em `backend/` está implementado até o marco B4 (estado no §21 de `docs/IMPLEMENTACAO-BACKEND.md`). A orientação é retrato (`app.json`).

Use `docs/AGENTS.md` como o guia compartilhado do projeto. Este arquivo adiciona os fluxos específicos disponíveis em `.claude/`.

## Mapa de Instruções

| Necessidade | Fonte |
| --- | --- |
| Arquitetura, decisões e organização de diretórios | `docs/ARQUITETURA.md` (e `docs/ARQUITETURA.pdf`) |
| Implementação por equipe (stack gratuita, contratos, Premium, custos, marcos) | `docs/IMPLEMENTACAO-FRONTEND.md`, `docs/IMPLEMENTACAO-BACKEND.md` e `docs/IMPLEMENTACAO-DEVOPS.md` (e os PDFs) |
| Regras de importação de cada camada | `README.md` dentro da camada (`contracts/`, `src/features/`, `src/core/`, `backend/src/*`) |
| Contexto e regras compartilhadas por agentes | `docs/AGENTS.md` |
| Convenções de TypeScript, React Native e camadas | `.claude/rules/code-style.md` |
| Limites de dados, contratos e fronteiras | `.claude/rules/api-conventions.md` |
| Regras de testes e validação local | `.claude/rules/testing.md` |
| Revisão de código | `.claude/commands/review.md` |
| Investigação e correção de defeitos | `.claude/commands/fix-issue.md` |
| Implementação de interface | `.claude/skills/frontend/SKILL.md` |
| Contexto visual e de produto | `.claude/skills/frontend/design.md` |
| Prontidão local | `.claude/skills/deploy/SKILL.md` |
| Revisões isoladas | `.claude/agents/` |
| Permissões e comandos destrutivos | `.claude/settings.json` e `.claude/hooks/validate-base.sh` |

Leia apenas as instruções aplicáveis à tarefa atual.

## Fontes de Verdade

Em caso de conflito, use esta ordem:

1. Pedido explícito do usuário e requisitos aprovados.
2. Código, `package.json`, `app.json`, `tsconfig.json`, testes e documentação deste repositório, incluindo `docs/ARQUITETURA.md`.
3. `docs/AGENTS.md` e regras do projeto em `.claude/`.
4. Convenções gerais.

Não escolha silenciosamente entre requisitos conflitantes. Explique o conflito e peça direção.

## Regras de Trabalho

- Inspecione as camadas, os componentes, os contratos e a configuração afetados antes de editar.
- Prefira a menor mudança completa, sem abstrações, dependências, configurações ou funcionalidades especulativas.
- Coloque cada código na camada definida em `docs/ARQUITETURA.md` (§10) e respeite as regras de importação do `README.md` da camada. Subpastas e arquivos nascem junto do primeiro uso real.
- Preserve os arquivos específicos de plataforma, como `*.web.tsx`, ao alterar comportamento compartilhado.
- Reutilize tokens de `src/constants/theme.ts` e componentes compartilhados quando existirem; a identidade visual está em `docs/DESIGN.md`.
- Não remova ou reformate código adjacente que não tenha sido afetado pela alteração solicitada.
- Relate o que foi verificado e o que permaneceu sem validação.

## Produto, Dados e Segurança

- Não invente questões, gabaritos, notas, pontuações, estatísticas de desempenho, correções de redação, conteúdo curricular, metas, prazos ou recomendações pedagógicas.
- Antes de implementar um comando, consulta ou evento, obtenha o contrato aprovado em `contracts/`: origem, formato, validade, horário, estados de erro e comportamento esperado.
- Mantenha dados exibidos, rascunhos editáveis e estados de carregamento, processamento ou erro separados.
- Não implemente comunicação de rede, persistência, autenticação, telemetria nem integração com a IA sem pedido explícito e contrato definido. Ao implementar, siga o fluxo da arquitetura: comando → outbox local → API de comandos; IA somente em Workers.
- Trate permissões, dados pessoais, saída da IA e ações irreversíveis como mudanças que exigem revisão cuidadosa.

## Desenvolvimento e Validação

Os scripts atualmente definidos são:

| Objetivo | Comando |
| --- | --- |
| Iniciar o ambiente Expo | `npm run start` |
| Abrir no Android | `npm run android` |
| Abrir no iOS | `npm run ios` |
| Iniciar a versão web | `npm run web` |
| Lint | `npm run lint` |
| Verificação de tipos | `npm run typecheck` |
| Testes | `npm test` |

No app (raiz) não há scripts de testes de ponta a ponta nem de build de produção; não os presuma. Login nativo, SQLite, push e câmera exigem build de desenvolvimento, não o Expo Go. No `backend/` existem `npm run typecheck`, `npm run lint` e `npm test` (execute dentro de `backend/`); os testes de integração só rodam com `TEST_DATABASE_URL` e `TEST_REDIS_URL` apontando para instâncias descartáveis.

Para uma mudança de interface, valide na plataforma afetada quando houver um destino local disponível. Para mudanças em componentes compartilhados, considere as implementações nativa e web.

## Dependências, Git e Dados Sensíveis

- Não adicione, atualize, remova ou substitua dependências sem aprovação explícita.
- Não leia, imprima, altere ou versione segredos, credenciais, arquivos `.env` ou `.npmrc`.
- Não faça commit, push, publicação ou release sem autorização explícita.
- Mensagens de commit seguem `(tipo): Frase no passado`, sem mencionar assistentes de IA nem `Co-Authored-By`; um commit por assunto.
- Não use comandos destrutivos, como exclusão recursiva, `git clean` ou `git reset --hard`.

As preferências locais complementares estão em `docs/CLAUDE.local.md`.
