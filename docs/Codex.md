# Guia do Codex

As instruções operacionais compartilhadas estão em `docs/AGENTS.md`, o único `AGENTS.md` do repositório. O hook de início em `.codex/hooks.json` entrega esse conteúdo ao Codex ao abrir ou retomar uma sessão. Ele consolida o contexto, as regras de implementação, validação, revisão, segurança e as preferências locais que antes estavam distribuídas nas instruções do Claude.

## Contexto Aplicado

- Aplicativo Expo 57 com React Native, React 19, TypeScript e Expo Router.
- Rotas em `src/app/`, componentes em `src/components/`, hooks em `src/hooks/` e tokens em `src/constants/theme.ts`.
- Destinos iOS, Android e web estática; orientação preferencial em retrato.
- Projeto em estágio inicial, sem contrato de medição, sensor, unidade, persistência, autenticação ou regra clínica.

## Convenções Ativas

O `AGENTS.md` orienta o Codex a:

- realizar mudanças enxutas, baseadas no código existente e no pedido explícito;
- preservar Expo Router, implementações específicas de plataforma e os tokens visuais atuais;
- não inventar leituras, unidades, limites, alertas, comportamentos de sensor ou orientação clínica;
- validar com os scripts realmente existentes, principalmente `npm run lint`;
- solicitar aprovação para dependências, commits, pushes e mudanças que ampliem escopo;
- informar verificações executadas e limitações de validação.

## Proteções de Comandos

`.codex/config.toml`, `.codex/hooks.json` e `.codex/rules/safety.rules` fornecem configuração, carregamento das instruções e proteções para o Codex quando a configuração local do projeto é confiável. As regras e o hook bloqueiam `git reset --hard`, `git clean`, exclusão recursiva e `npm publish`; além disso, solicitam confirmação para commits, pushes e alterações de dependências.

## Workflows Reutilizáveis

Os equivalentes de skills, comandos e agentes do Claude estão em `.agents/skills/`, localização reconhecida pelo Codex para skills versionadas no repositório. Estão disponíveis os workflows de interface, prontidão local, revisão de código, auditoria de segurança e correção de defeitos.

Não há configuração de conectores ou serviços remotos neste repositório.
