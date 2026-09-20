# DESIGN.md — Multscan Monitor (Medidor de Pressão)

Este documento é a referência de design deste repositório. Ele substitui uma
versão anterior escrita para outro produto Multscan ("ECU Pro Max"); o app
`medidorPressao` implementa o **Multscan Monitor**, um app de leitura de
pressão de combustível via manômetro Bluetooth, aprovado como protótipo no
canvas de design (`https://claude.ai/artifact/NMpQuqRjxdnmBbAAnmVtkH`).

`design.md` registra apenas decisões já aprovadas. Ele não autoriza inventar
domínio de produto, protocolo de sensor, regra clínica ou sistema visual —
qualquer lacuna deve ser tratada como pergunta para o usuário, não como
espaço para criatividade.

## 1. Produto e Escopo

- Domínio: diagnóstico de sistema de combustível de motocicletas via
  manômetro de pressão Bluetooth Multscan.
- Não há login, cadastro de usuário ou conta neste app — decisão explícita
  do usuário ("Não temos login nesse projeto").
- 11 telas, cobrindo a navegação principal (5 abas) e fluxos secundários:
  Monitor, Telemetria, Diagnóstico, Banco de Dados Técnico,
  Rastreabilidade, Histórico, Relatórios, Configurações, Cadastro da
  Motocicleta, Onboarding e Produtos.
- Estado local/mock: nenhuma tela depende de Bluetooth real, persistência
  ou rede. Toda leitura de pressão, bateria, histórico e diagnóstico é
  simulada em memória (`useState`), até que um contrato de sensor real seja
  aprovado — ver `docs/AGENTS.md` §"Medições e Limites de Produto".

## 2. Cores

Paleta escura por padrão (o protótipo do canvas não define modo claro). Os
tokens abaixo existem como variáveis CSS custom properties do Gluestack UI
Pro (`src/components/ui/gluestack-ui-provider/config.ts`, via `nativewind`
`vars()`) e, para o restante do código React Native que ainda usa
`StyleSheet`, como o objeto `Colors` em `src/constants/theme.ts`.

| Token | Hex | Uso |
| --- | --- | --- |
| `brand-navy` | `#1E274A` | Logo Multscan, acento secundário (escala `secondary` do Gluestack) |
| `brand-red` / `accent` | `#C8353F` | Cor primária de marca: CTAs, aba ativa, foco (escala `primary`/`error`/`indicator`) |
| `surface` | `#0B0D14` | Fundo de tela (escala `background-0` no modo escuro) |
| `surface-raised` | `#14161C` | Cards, barras, superfícies elevadas (`background-50`) |
| `ink` | `#F5F6F8` | Texto principal sobre fundo escuro (`typography-900` no modo escuro) |
| `ink-muted` | `#9AA0AC` | Texto secundário, labels, ícones inativos |
| `border` | `#262A33` | Divisores sutis |
| `border-strong` | `#666666` | Bordas de botões secundários (outline) |
| `status-success` | `#0EA5A0` | Conectado, sucesso, tendência positiva (escala `success`) |
| `status-danger` | `#C8353F` | Erro, desconectado crítico — mesma cor do accent |

As classes Tailwind/NativeWind usadas pelos componentes Gluestack copiados
(`bg-primary-500`, `text-typography-900`, `border-outline-300` etc.) já
resolvem para esta paleta automaticamente: a adaptação foi feita
substituindo os valores RGB das variáveis, não reescrevendo os componentes.
Não hardcode cores fora dessas escalas — se um tom novo for necessário,
adicione-o a `config.ts`, não inline.

## 3. Raios, Espaçamento e Sombra

| Token | Valor |
| --- | --- |
| `radius-sm` | 6px |
| `radius-md` | 10px |
| `radius-lg` | 16px |
| `radius-pill` | 9999px |

Espaçamento segue a escala existente em `Spacing` (`src/constants/theme.ts`,
base 4: `half=2, one=4, two=8, three=16, four=24, five=32, six=64`) — não foi
alterada, pois já é compatível com o layout do canvas (paddings de
16/12/8px).

## 4. Tipografia

O protótipo do canvas especifica `'Eras Bold ITC', 'Poppins', sans-serif`
para títulos (peso 700, uppercase, letter-spacing ~0.02–0.06em) e
`'Share Tech', system-ui, sans-serif` para corpo de texto.

**Nenhum pacote de fonte foi instalado** para isso (nem os Google Fonts
Poppins/Share Tech, nem uma licença de Eras Bold ITC) — adicionar
dependências exige aprovação explícita (`docs/AGENTS.md`). Até que isso seja
aprovado, `Fonts.heading`/`Fonts.body` (`src/constants/theme.ts`) apontam
para a fonte de sistema em negrito, mantendo peso e caixa alta como
substitutos aceitáveis. Um card exibe essa limitação como próximo passo, não
como bloqueio: qualquer tela pode ser implementada normalmente com o
fallback.

## 5. Navegação

5 abas nativas (`src/components/app-tabs.tsx`, `NativeTabs`):

1. **Monitor** (`index`) — leitura de pressão ao vivo.
2. **Telemetria** — sessão de teste com eventos.
3. **Histórico** — lista de testes anteriores.
4. **Relatórios** — geração de relatório técnico.
5. **Config.** (Configurações) — unidade de medida, sensor, sobre.

Rotas empilhadas (fora da barra de abas, navegação por push a partir das
abas ou de Configurações):

- **Diagnóstico** — a partir de Monitor/Telemetria.
- **Banco de Dados Técnico** — consulta marca/modelo/ano.
- **Rastreabilidade** — consulta peça/série/lote.
- **Cadastro da Motocicleta** — formulário de dados da moto testada.
- **Onboarding** — reaberto a partir de Configurações ("Ver introdução
  novamente").
- **Produtos** — reaberto a partir de Configurações ("Outros produtos
  Multscan").

Nenhuma dessas 6 rotas aparece na barra de abas — todas são acessadas por
navegação explícita, replicando os links `<a href="X.dc.html">` do canvas.

## 6. Biblioteca de Componentes — Gluestack UI Pro

**Decisão aprovada explicitamente pelo usuário** (ver histórico de decisão
abaixo): as telas usam os primitivos do Gluestack UI Pro vendorizados em
`Design/GlueStackUI Pro/components/ui/`, copiados para
`src/components/ui/` e adaptados via tokens de cor (não reescritos
componente a componente). Isso introduz NativeWind + Tailwind CSS como
segundo sistema de estilo, além do `StyleSheet` já usado pelo restante do
app (`ThemedView`/`ThemedText`, splash animado, tab bar web) — uma exceção
deliberada e aprovada às regras de "não introduza uma biblioteca ou sistema
visual novo sem aprovação" (`docs/AGENTS.md`, `docs/CLAUDE.local.md`,
`.claude/rules/code-style.md`).

Componentes copiados (uso conforme necessidade de cada tela — não é
obrigatório usar todos): `box`, `text`, `heading`, `vstack`, `hstack`,
`center`, `button`, `card`, `badge`, `divider`, `icon`, `pressable`,
`switch`, `progress`, `input`, `textarea`, `form-control`, `spinner`,
`safe-area-view`, `scroll-view`, `image`, `checkbox`, `radio`, `select`,
`modal`, `alert-dialog`, `link`, `avatar`, `grid`, `skeleton`, mais o
`gluestack-ui-provider` (config de cor) e a dependência de animação
`@legendapp/motion` (exigida por `modal`, `alert-dialog` e
`select-actionsheet`).

Regras de adoção (`docs/DesignIA_Regras.md`):

- Copiar apenas o componente necessário; não importar cor, cópia de texto
  ou dado fictício dos templates prontos do Gluestack UI Pro
  (`Design/GlueStackUI Pro/app/templates/`) — apenas os primitivos de
  `components/ui/`.
- Adaptar ao token de cor do projeto (feito centralizadamente em
  `gluestack-ui-provider/config.ts`), nunca com cor hardcoded por tela.
- Cobrir estados normal/foco/pressionado/desabilitado/carregando/vazio/erro
  quando esses estados existirem no fluxo real da tela.
- `react-native-svg` é usado para os ícones de linha e o ponteiro/arco do
  gauge (réplica dos `<svg>` inline do canvas); `lucide-react-native` está
  disponível para ícones utilitários simples quando um SVG customizado não
  for necessário.

Elementos nativos que já existiam no projeto (`ThemedView`, `ThemedText`,
`Colors`/`Spacing` de `theme.ts`, `NativeTabs`) continuam em uso fora das 11
telas do Monitor — por exemplo no splash animado e na estrutura de layout —
e não foram migrados para Gluestack.

## 7. Iconografia

O canvas desenha todos os ícones como `<svg>` inline (paths customizados,
stroke `currentColor`/`var(--ink-muted)`, 1.6–2px). Em React Native isso é
recriado com `react-native-svg` (`Svg`, `Path`, `Circle`, `Line`),
preservando os mesmos `viewBox`/paths do canvas sempre que possível, para
manter a réplica visual fiel — não são ícones de uma biblioteca de terceiros
com formas diferentes.

Os 5 ícones da barra de abas (Monitor/Telemetria/Histórico/Relatórios/
Config.) já existem como PNG monocromático (`renderingMode="template"`) em
`assets/images/tabIcons/`, gerados para bater com o traço do canvas.

## 8. Estados de Conexão do Sensor

Réplica do padrão do canvas (não é um contrato de BLE real — ver
`docs/AGENTS.md` §"Medições e Limites de Produto"; a integração real fica
para uma tarefa futura explícita):

- **Conectado** — pill verde-teal, leitura ao vivo, ações de teste
  habilitadas.
- **Desconectado** — pill neutra, card de estado vazio com ação
  "Conectar sensor".

A tensão da bateria do sensor é exibida em Volts (`X,XX V`), nunca em
porcentagem — decisão explícita do usuário.

## 9. Padrões por Tela (resumo funcional)

- **Monitor** — abas Analógico (gauge em arco com ponteiro)/Digital
  (leitura grande)/Gráfico (linha de tendência); ciclo de unidade
  bar → psi → kPa; mínima/atual/máxima; iniciar/parar teste; zerar
  leituras.
- **Telemetria** — sessão com fases ociosa/em andamento/finalizada e lista
  de eventos detectados durante o teste.
- **Diagnóstico** — formulário do sistema de combustível e comparação com
  especificação de referência.
- **Banco de Dados Técnico** — busca por marca/modelo/ano retornando specs
  de referência.
- **Rastreabilidade** — busca por peça/série/lote.
- **Histórico** — lista pesquisável de testes anteriores.
- **Relatórios** — tipo diagnóstico/instalação, anexo de foto (mock) e
  compartilhamento.
- **Configurações** — alternância de unidade, card do sensor Bluetooth
  (conectar/esquecer, bateria em V), seção Sobre com atalhos para
  Produtos e Onboarding.
- **Cadastro da Motocicleta** — formulário com validação (marca, modelo,
  ano, placa/chassi).
- **Onboarding** — 3 passos com "Pular" e progresso por pontos.
- **Produtos** — 4 cards (CDI Profire-X, ECU Pro Max, Motoscan, Mult
  Injector Plus) mais contato (telefone/e-mail).

## 10. Acessibilidade

- Contraste AA: `ink` (#F5F6F8) sobre `surface`/`surface-raised` e
  `on-accent` (#FFFFFF) sobre `accent` (#C8353F) atendem AA para texto
  normal.
- Alvos de toque mínimos de 44×44 (botões e itens de navegação usam
  `min-height: 44–48px` no canvas; replicar com `minHeight`/padding
  equivalente em React Native).
- Nenhum estado depende só de cor — pills de status trazem rótulo de texto
  junto ao indicador colorido; abas ativas trazem `aria-pressed`/
  equivalente de acessibilidade nativa (`accessibilityState.selected`).
- Foco visível obrigatório na web (`outline` em `:focus-visible`,
  replicado via classe Tailwind `focus:` quando aplicável).

## 11. Contrato de Implementação

- UI com estado local/mock (`useState`), sem BLE, rede ou persistência
  real — decisão explícita do usuário nesta fase.
- Reutilizar os tokens deste documento e os componentes já copiados em
  `src/components/ui/` antes de criar um novo primitivo.
- Qualquer necessidade fora do escopo acima (nova leitura, nova unidade,
  novo estado de erro não coberto pelo canvas) exige pedir direção antes
  de inventar comportamento — `docs/AGENTS.md` §"Medições e Limites de
  Produto".

## 12. Checklist de Aceitação

- [ ] 5 abas nativas + 6 rotas empilhadas navegáveis, replicando os links
      do canvas.
- [ ] Paleta, raios e tipografia (com fallback de fonte) desta seção
      aplicados via `gluestack-ui-provider/config.ts` e `theme.ts`, sem
      cor hardcoded fora dos tokens.
- [ ] Tensão da bateria sempre em Volts, nunca porcentagem.
- [ ] Sem UI de login/conta em nenhuma tela.
- [ ] Estados conectado/desconectado presentes onde o canvas os define.
- [ ] `npm run lint` executado e resultado relatado.
