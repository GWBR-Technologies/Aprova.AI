<h1 align="center">Aprova.AI</h1>

<p align="center">
  Aplicativo multiplataforma da GWBR Technologies, desenvolvido com Expo, React Native e TypeScript.
  <br />
  Projeto em fase inicial, com uma base compartilhada para o desenvolvimento das versões Android, iOS e web.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-blue" alt="Status do Projeto" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="Licença MIT" />
  <img src="https://img.shields.io/badge/Platform-Mobile%20%26%20Web-green" alt="Plataformas: Mobile e Web" />
</p>

---

## Tecnologias / Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&amp;logo=react&amp;logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&amp;logo=expo&amp;logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&amp;logo=react&amp;logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&amp;logo=typescript&amp;logoColor=white" alt="TypeScript" />
</p>

| Tecnologia | Versão declarada | Uso |
| --- | --- | --- |
| Expo | `~57.0.24` | Ambiente de desenvolvimento e integração com as plataformas |
| React Native | `0.86.3` | Componentes e interface do aplicativo |
| React | `19.2.3` | Composição de componentes |
| TypeScript | `~6.0.3` | Tipagem estática, com modo estrito habilitado |

---

## Sumário

- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Obter o projeto](#obter-o-projeto)
- [Configuração de ambiente](#configuração-de-ambiente)
- [Instalação e primeira execução](#instalação-e-primeira-execução)
- [Comandos de desenvolvimento](#comandos-de-desenvolvimento)
- [Estrutura de arquivos](#estrutura-de-arquivos)
- [Boas práticas para colaboração](#boas-práticas-para-colaboração)
- [Estado atual e limites conhecidos](#estado-atual-e-limites-conhecidos)
- [Documentação complementar](#documentação-complementar)
- [Licença](#licença)

## Arquitetura

O Aprova.AI adota **Event-Driven Architecture + CQRS**. O que o aluno faz na
tela (comandos) é separado do que o sistema processa em segundo plano
(consultas e IA): o app responde de imediato (`202 Accepted`, por exemplo
“Redação recebida com sucesso!”) e Workers consomem filas **BullMQ + Redis**
para chamar a IA (GPT 6.1 - Terra) sem risco de timeout na API. A arquitetura
completa, as decisões, os fluxos e as regras de organização de diretórios estão
em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md), também disponível em PDF
([`docs/ARQUITETURA.pdf`](docs/ARQUITETURA.pdf)). Cada equipe tem um guia de
implementação (Front-End, Back-End e DevOps) em `docs/`, com o PDF correspondente.

Hoje o repositório contém o aplicativo Expo (Expo Router, outbox local, cliente
HTTP, sessão, redação com Premium e cota, aviso por push) e os contratos do app
com o backend; BullMQ, Redis e o backend ainda não estão implementados.

| Arquivo ou diretório | Responsabilidade |
| --- | --- |
| `src/app/` | Somente rotas do Expo Router (`main` do `package.json` é `expo-router/entry`) e providers do layout raiz |
| `src/components/` | UI compartilhada: `AppText`, `Button`, `Banner`, `Screen`, `OfflineBanner` |
| `src/constants/theme.ts` | Tokens visuais do Design System (cores, espaçamento, raios, tipografia) |
| `src/features/` | Contextos de negócio do app, cada um com comandos, consultas, eventos e UI |
| `src/core/` | Infraestrutura do cliente: HTTP, outbox local, persistência e eventos |
| `contracts/` | Contrato entre app e backend: comandos, consultas e eventos |
| `backend/src/` | API de comandos e consultas e Workers (domínio, aplicação, infraestrutura) |
| `assets/` | Ícones e imagens do aplicativo |
| `app.json` | Nome, orientação e configuração das plataformas |
| `tsconfig.json` | Configuração do TypeScript, estendendo a base do Expo |
| `docs/` | Arquitetura, guias de implementação por equipe, guias de trabalho e design |
| `.claude/` e `.agents/` | Regras e workflows para assistência ao desenvolvimento |

O aplicativo está configurado com orientação em retrato e interface clara.
A configuração de iOS permite uso em tablets. A base atual ainda não inclui
navegação entre telas, serviços de backend ou persistência de dados.

## Pré-requisitos

- Git para clonar o repositório;
- Node.js 24.x, a partir de 24.3.0, dentro da faixa aceita pelo React Native
  declarado no `package-lock.json`;
- npm para instalar as dependências e executar os scripts;
- para Android, um emulador configurado no Android Studio ou dispositivo
  compatível com o fluxo de desenvolvimento Expo;
- para iOS, macOS com Xcode e simulador, ou dispositivo compatível com o
  fluxo de desenvolvimento Expo;
- para web, um navegador e as dependências web descritas nas
  [pendências atuais](#estado-atual-e-limites-conhecidos).

Confira as ferramentas instaladas:

```bash
git --version
node --version
npm --version
```

## Obter o projeto

Clone o repositório e acesse a pasta raiz:

```bash
git clone https://github.com/GWBR-Technologies/Aprova.AI.git
cd Aprova.AI
```

> Execute os comandos deste documento na raiz do projeto.

## Configuração de ambiente

A aplicação atual não exige variáveis de ambiente, chaves de API ou banco de
dados. As configurações do Expo ficam em `app.json`, e os scripts e as
dependências ficam em `package.json`.

## Instalação e primeira execução

Instale as dependências respeitando o `package-lock.json` versionado:

```bash
npm ci
```

O ponto de entrada é o `expo-router/entry`, declarado em `main` no
`package.json`; as rotas ficam em `src/app/`. Copie `.env.example` para
`.env.local` e preencha `EXPO_PUBLIC_API_URL` (HTTPS) e, para o login com
Google, `EXPO_PUBLIC_GOOGLE_CLIENT_ID`. Inicie o servidor de desenvolvimento:

```bash
npm run start
```

Para abrir uma plataforma específica, use um dos comandos abaixo:

```bash
npm run android
npm run ios
npm run web
```

Cada comando inicia o Expo para a plataforma escolhida; execute apenas o
correspondente ao destino que deseja usar. A versão web também depende da
preparação descrita em [Estado atual e limites conhecidos](#estado-atual-e-limites-conhecidos).

## Comandos de desenvolvimento

| Comando | Objetivo |
| --- | --- |
| `npm ci` | Instalar as dependências conforme o lockfile |
| `npm run start` | Iniciar o servidor de desenvolvimento Expo |
| `npm run android` | Iniciar o Expo e abrir o destino Android |
| `npm run ios` | Iniciar o Expo e abrir o destino iOS |
| `npm run web` | Iniciar o Expo para web |
| `npm run lint` | Executar o ESLint (`expo lint`, com `eslint-config-expo`) |
| `npm run typecheck` | Verificar os tipos (`tsc --noEmit`) |
| `npm test` | Executar os testes (`jest-expo` e Testing Library) |

Não há script de build de produção: ele nasce com o `eas.json` (DevOps).
O login nativo, o SQLite e o push exigem um build de desenvolvimento
(`developmentClient`); não funcionam no Expo Go.

## Estrutura de arquivos

```text
Aprova.AI/
├── .agents/
│   └── skills/          # Workflows de desenvolvimento para Codex
├── .claude/
│   ├── agents/          # Instruções de revisão e auditoria
│   ├── commands/        # Fluxos de revisão e correção de defeitos
│   ├── hooks/           # Validação de comandos
│   ├── rules/           # Convenções de código, dados e testes
│   └── skills/          # Fluxos de interface e prontidão local
├── assets/              # Ícones e imagens
├── backend/
│   └── src/             # domain, application, infrastructure, api, workers, bootstrap
├── contracts/           # Contrato app <-> backend (comandos, consultas, eventos)
├── docs/                # Arquitetura, guias de implementação (.md e .pdf), guias e design
├── src/
│   ├── app/             # Rotas do Expo Router e layout raiz (providers)
│   ├── components/      # UI compartilhada
│   ├── constants/       # theme.ts (tokens visuais)
│   ├── core/            # Cliente HTTP e sessão, outbox (SQLite), storage, eventos (polling e push)
│   ├── features/        # account e essay (comandos, consultas, eventos e UI)
│   └── hooks/           # Hooks e formatadores compartilhados
├── .env.example         # Variáveis públicas esperadas pelo app
├── app.json             # Configuração do Expo
├── package.json         # Dependências e scripts
├── package-lock.json    # Versões resolvidas das dependências
├── tsconfig.json        # Configuração do TypeScript
├── LICENSE              # Licença MIT
└── README.md
```

## Boas práticas para colaboração

- Use `npm ci` em instalações novas para respeitar as versões do lockfile.
- Mantenha as alterações focadas no requisito solicitado e preserve as
  convenções do código existente.
- Não versione dependências instaladas, arquivos gerados ou credenciais.
- Ao alterar comportamento, valide na plataforma afetada e registre o
  resultado e as limitações da verificação.
- Consulte as instruções de trabalho em `docs/AGENTS.md` e a organização de
  camadas em `docs/ARQUITETURA.md`, conferindo-as com o código e a configuração
  atuais.
- Ao mudar estrutura ou decisões, atualize `docs/ARQUITETURA.md`, este arquivo
  e os guias, e regenere o PDF (`docs/ARQUITETURA.md`, seção 13).
- Siga o padrão de commits do histórico, `(tipo): Frase no passado`.

## Estado atual e limites conhecidos

- **Funcionalidades:** login (Google e Apple), redação ponta a ponta com plano
  Premium e cota, outbox local, consulta periódica e aviso por push. Questões,
  rotina, simulados e desempenho não têm tela: faltam os contratos do produto
  (`docs/IMPLEMENTACAO-FRONTEND.md`, seção 17).
- **Suporte web:** existe o script `web`, mas `react-dom` e
  `react-native-web` ainda não estão declarados nas dependências.
- **Navegação:** Expo Router, com rotas protegidas pela sessão.
- **Validação:** `lint`, `typecheck` e `test` existem; não há teste de ponta a
  ponta nem verificação em aparelho real (TalkBack e VoiceOver) registrada.
- **Arquitetura:** o app e os contratos existem; não há backend, filas nem
  infraestrutura. As decisões em aberto estão em `docs/ARQUITETURA.md` (seção 14).
- **Design:** identidade registrada em `docs/DESIGN.md`. Poppins e Inter ainda
  não foram instaladas (dependência não aprovada); o app usa a fonte do sistema.

## Documentação complementar

- [Arquitetura EDA + CQRS](docs/ARQUITETURA.md) ([PDF](docs/ARQUITETURA.pdf))
- [Implementação Front-End](docs/IMPLEMENTACAO-FRONTEND.md) ([PDF](docs/IMPLEMENTACAO-FRONTEND.pdf))
- [Implementação Back-End](docs/IMPLEMENTACAO-BACKEND.md) ([PDF](docs/IMPLEMENTACAO-BACKEND.pdf))
- [Implementação DevOps](docs/IMPLEMENTACAO-DEVOPS.md) ([PDF](docs/IMPLEMENTACAO-DEVOPS.pdf))
- [Instruções compartilhadas do projeto](docs/AGENTS.md)
- [Guia operacional para Claude](docs/Claude.md)
- [Guia do Codex](docs/Codex.md)
- [Preferências locais de desenvolvimento](docs/CLAUDE.local.md)
- [Design](docs/DESIGN.md)
- [Workflows para Codex](.agents/skills/)
- [Regras para Claude](.claude/rules/)

As referências acima descrevem o Aprova.AI; as pendências conhecidas estão em
[Estado atual e limites conhecidos](#estado-atual-e-limites-conhecidos).

## Licença

Este projeto utiliza a [licença MIT](LICENSE).

---

<p align="center">Desenvolvido por <a href="https://github.com/GWBR-Technologies">GWBR Technologies</a>.</p>
