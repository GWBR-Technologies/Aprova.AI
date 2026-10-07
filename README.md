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

O repositório contém uma única aplicação Expo. A interface usa componentes
React Native e `StyleSheet`; o registro do componente principal é feito com
`registerRootComponent`, do Expo.

| Arquivo ou diretório | Responsabilidade |
| --- | --- |
| `src/app/App.tsx` | Componente principal e estilos da tela inicial |
| `src/app/index.ts` | Registro do componente principal no Expo |
| `assets/` | Ícones e imagens do aplicativo |
| `app.json` | Nome, orientação e configuração das plataformas |
| `tsconfig.json` | Configuração do TypeScript, estendendo a base do Expo |
| `docs/` | Documentação de apoio e instruções de trabalho |
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

**Há uma pendência no ponto de entrada:** `package.json` aponta para
`index.ts` na raiz, mas o arquivo existente está em `src/app/index.ts`.
Essa configuração precisa ser alinhada antes de carregar o aplicativo.

Após resolver essa pendência, inicie o servidor de desenvolvimento:

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

O `package.json` ainda não possui scripts de lint, testes, verificação de
tipos ou build de produção. Esses comandos devem ser documentados quando
forem configurados no projeto.

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
├── docs/                # Documentação de apoio
├── src/
│   └── app/
│       ├── App.tsx      # Tela inicial
│       └── index.ts     # Registro do componente principal
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
- Consulte as instruções de trabalho em `docs/AGENTS.md`, conferindo suas
  referências com o código e a configuração atuais.

## Estado atual e limites conhecidos

- **Interface inicial:** `App.tsx` renderiza apenas um contêiner branco.
  Ainda não há funcionalidades de produto implementadas.
- **Ponto de entrada:** o campo `main` de `package.json` referencia um
  arquivo ausente na raiz; o registro do aplicativo está em `src/app/index.ts`.
- **Suporte web:** existe o script `web`, mas `react-dom` e
  `react-native-web` ainda não estão declarados nas dependências.
- **Navegação:** Expo Router não está instalado na base atual.
- **Validação:** não há scripts de lint, testes ou build de produção
  configurados, nem uma suíte de testes versionada.
- **Documentação herdada:** parte dos arquivos de `docs/` e `.claude/`
  descreve `medidorPressao` e Multscan Monitor, além de componentes e
  comandos que não existem nesta aplicação. Esse material precisa ser
  revisado para refletir o Aprova.AI.

## Documentação complementar

- [Instruções compartilhadas do projeto](docs/AGENTS.md)
- [Guia operacional para Claude](docs/Claude.md)
- [Guia do Codex](docs/Codex.md)
- [Preferências locais de desenvolvimento](docs/CLAUDE.local.md)
- [Workflows para Codex](.agents/skills/)
- [Regras para Claude](.claude/rules/)

As referências acima devem ser lidas considerando as divergências
registradas em [Estado atual e limites conhecidos](#estado-atual-e-limites-conhecidos).

## Licença

Este projeto utiliza a [licença MIT](LICENSE).

---

<p align="center">Desenvolvido por <a href="https://github.com/GWBR-Technologies">GWBR Technologies</a>.</p>
