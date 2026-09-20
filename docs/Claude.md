# Guia Operacional do Projeto

## Contexto do Repositório

`medidorPressao` é um aplicativo Expo 57 construído com React Native, React 19 e TypeScript estrito. A navegação é feita com Expo Router, com rotas em `src/app/`; os componentes compartilhados estão em `src/components/`, os hooks em `src/hooks/` e os tokens visuais em `src/constants/theme.ts`.

O aplicativo é configurado para iOS, Android e web estática, com orientação preferencial em retrato. O repositório está no estágio inicial: a tela inicial ainda está vazia e não há contrato implementado para medições, sensor, unidades, persistência, autenticação ou regras clínicas. O nome e o histórico do projeto indicam um medidor digital de pressão e compressão, mas não substituem requisitos de produto.

Use `docs/AGENTS.md` como o guia compartilhado do projeto. Este arquivo adiciona os fluxos específicos disponíveis em `.claude/`.

## Mapa de Instruções

| Necessidade | Fonte |
| --- | --- |
| Contexto e regras compartilhadas por agentes | `docs/AGENTS.md` |
| Convenções de TypeScript, React Native e Expo Router | `.claude/rules/code-style.md` |
| Limites de dados e medições | `.claude/rules/api-conventions.md` |
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
2. Código, `package.json`, `app.json`, `tsconfig.json`, testes e documentação deste repositório.
3. `docs/AGENTS.md` e regras do projeto em `.claude/`.
4. Convenções gerais.

Não escolha silenciosamente entre requisitos conflitantes. Explique o conflito e peça direção.

## Regras de Trabalho

- Inspecione as rotas, os componentes, os hooks e a configuração afetados antes de editar.
- Prefira a menor mudança completa, sem abstrações, dependências, configurações ou funcionalidades especulativas.
- Mantenha as rotas em `src/app/`, o código reutilizável em `src/components/`, os hooks em `src/hooks/` e os tokens compartilhados em `src/constants/theme.ts`.
- Preserve os arquivos específicos de plataforma, como `*.web.tsx`, ao alterar comportamento compartilhado.
- Reutilize `Colors`, `Fonts`, `Spacing`, `MaxContentWidth`, `ThemedView` e `ThemedText` antes de criar novas primitivas visuais.
- Não remova ou reformate código adjacente que não tenha sido afetado pela alteração solicitada.
- Relate o que foi verificado e o que permaneceu sem validação.

## Produto, Medições e Segurança

- Não invente leituras, unidades, intervalos, alertas, tendências, calibração, conectividade de sensores, histórico, diagnósticos ou recomendações de saúde.
- Antes de implementar uma funcionalidade de medição, obtenha o contrato para origem do dado, unidade, validade, horário, estados de erro e comportamento esperado.
- Mantenha valores exibidos, rascunhos editáveis e estados de carregamento ou erro separados.
- Não adicione comunicação de rede, conexão com dispositivo, persistência, autenticação ou telemetria sem pedido explícito e contrato definido.
- Trate permissões, dados de medição e ações irreversíveis como mudanças que exigem revisão cuidadosa.

## Desenvolvimento e Validação

Os scripts atualmente definidos são:

| Objetivo | Comando |
| --- | --- |
| Iniciar o ambiente Expo | `npm run start` |
| Abrir no Android | `npm run android` |
| Abrir no iOS | `npm run ios` |
| Iniciar a versão web | `npm run web` |
| Executar lint | `npm run lint` |
| Recriar o projeto inicial | `npm run reset-project` |

Não há scripts configurados para verificação de tipos, testes, testes de ponta a ponta ou build de produção. Não os presuma nem os execute como se existissem. `npm run reset-project` reorganiza o conteúdo inicial e só deve ser usado quando isso fizer parte explícita da tarefa.

Para uma mudança de interface, execute `npm run lint` quando aplicável e valide na plataforma afetada quando houver um destino local disponível. Para mudanças de rotas ou componentes compartilhados, considere as implementações nativa e web.

## Dependências, Git e Dados Sensíveis

- Não adicione, atualize, remova ou substitua dependências sem aprovação explícita.
- Não leia, imprima, altere ou versione segredos, credenciais, arquivos `.env` ou `.npmrc`.
- Não faça commit, push, publicação ou release sem autorização explícita.
- Não use comandos destrutivos, como exclusão recursiva, `git clean` ou `git reset --hard`.

As preferências locais complementares estão em `docs/CLAUDE.local.md`.
