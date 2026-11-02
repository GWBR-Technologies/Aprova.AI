# Guia do Codex

As instruções operacionais compartilhadas estão em `docs/AGENTS.md`, o único `AGENTS.md` do repositório. Ele consolida o contexto, as regras de implementação, validação, revisão, segurança e as preferências locais que antes estavam distribuídas nas instruções do Claude. A arquitetura e a organização de diretórios estão em `docs/ARQUITETURA.md`.

## Contexto Aplicado

- Aplicativo Expo 57 com React Native, React 19 e TypeScript estrito, para estudo para o Enem, a Fuvest e outros vestibulares, com apoio e correção por IA (GPT 6.1 - Terra).
- Arquitetura EDA + CQRS com BullMQ + Redis e Workers em segundo plano; camadas em `src/` (app), `contracts/` e `backend/src/`.
- Ponto de entrada `expo-router/entry`; `src/app/` só com rotas e layout raiz.
- App com navegação, rede, outbox, autenticação, redação e push, sem telas de questões, rotina, simulados e desempenho (faltam contratos do produto); backend em `backend/` implementado até o marco B4 e contratos em `contracts/`.

## Convenções Ativas

O `AGENTS.md` orienta o Codex a:

- realizar mudanças enxutas, baseadas no código existente e no pedido explícito;
- respeitar as camadas e as regras de importação de `docs/ARQUITETURA.md` (§10), as implementações específicas de plataforma e os tokens visuais quando existirem;
- não inventar questões, notas, desempenho, correções, regras de simulado ou comportamento da IA;
- executar e relatar `npm run lint`, `npm run typecheck` e `npm test` no app (não há testes de ponta a ponta nem build de produção); no `backend/` existem `npm run typecheck`, `npm run lint` e `npm test`;
- solicitar aprovação para dependências, commits, pushes e mudanças que ampliem escopo;
- informar verificações executadas e limitações de validação.

## Proteções de Comandos

Este repositório não contém `.codex/` (configuração, hooks ou regras). As proteções versionadas são as do Claude, em `.claude/settings.json` e `.claude/hooks/validate-base.sh`, que bloqueiam `git reset --hard`, `git clean`, exclusão recursiva, push forçado, push direto para `main` ou `master` e `npm publish`. Quem usa o Codex deve respeitar as mesmas proibições listadas em `docs/AGENTS.md`.

## Workflows Reutilizáveis

Os equivalentes de skills, comandos e agentes do Claude estão em `.agents/skills/`, localização reconhecida pelo Codex para skills versionadas no repositório. Estão disponíveis os workflows de interface, prontidão local, revisão de código, auditoria de segurança e correção de defeitos.

Não há configuração de conectores ou serviços remotos neste repositório.
