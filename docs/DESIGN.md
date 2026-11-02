# DESIGN.md — Aprova.AI

Este documento é a referência de design deste repositório. Ele registra as decisões de identidade visual aprovadas e implementadas no código (`src/constants/theme.ts` e `src/components/`), e não autoriza inventar domínio de produto, regra pedagógica, critério de correção ou sistema visual — qualquer lacuna deve ser tratada como pergunta para o usuário.

Fontes da identidade: o documento “Design System — Aprova.Ai” (Claude Docs, `https://claude.ai/artifact/7ABSfSyj4G6TccPjY9pXmd`) e o canvas de telas “Aprova.Ai — Telas” (`https://claude.ai/artifact/PnmSqMpwALfXzYmEY5cvJV`). Este arquivo registra o que o app implementa e onde o código se afasta dessas fontes, com o motivo.

## 1. Produto e Escopo

- Domínio: aplicativo de estudos para o Enem, a Fuvest e outros vestibulares brasileiros, com apoio e correção por IA (GPT 6.1 - Terra). Desenvolvido pela GWBR Technologies.
- Fluxos de negócio iniciais (`docs/ARQUITETURA.md`, §4 e §5): resposta de questões, rotina de estudos, simulados, redação com correção por IA e desempenho.
- A arquitetura exige uma experiência assíncrona: o app confirma o recebimento de imediato (“Redação recebida com sucesso!”, só depois do `202`), mostra o processamento e entrega o resultado depois.
- Personalidade de marca: mentor calmo, direto e factual; foco antes de gamificação; honesto sobre o que ainda não tem dado real (estado vazio verdadeiro, nunca histórico fabricado).

## 2. Cores (`Colors`)

Somente modo claro nesta fase (`userInterfaceStyle: light`). Nenhum hex aparece fora de `theme.ts`; um tom novo entra primeiro nesse arquivo, com uso definido.

| Token | Hex | Uso |
| --- | --- | --- |
| `primary` (Azul Foco) | `#123C52` | Navegação ativa, cabeçalhos, botão primário |
| `primaryPressed` | `#1B5570` | Pressionado do primário |
| `primaryTint` | `#E3EDF1` | Fundo tintado sutil e item pressionado |
| `accent` (Coral Aprovação) | `#FF6B4D` | CTA principal; uso restrito, nunca fundo de tela |
| `accentPressed` | `#E8543A` | Pressionado do CTA e “Ai” do wordmark (texto grande) |
| `surface` / `surfaceRaised` | `#FAFAF7` / `#FFFFFF` | Fundo de tela e cards |
| `border` | `#E2E1DA` | Divisores e contornos |
| `ink` / `inkMuted` | `#1B1D21` / `#5B5F66` | Texto principal e secundário |
| `success`, `warning`, `error` | `#1E8E5A`, `#C97B0A`, `#C6392B` | Semânticas (bordas de `Banner`) |
| `successText`, `warningText`, `errorText` | `#17744A`, `#8F5600`, `#B02F22` | Variantes para texto pequeno |
| `disabledSurface` | `#E9E8E2` | Fundo de botão desabilitado |

Divergências do Design System, por contraste (WCAG AA, 4,5:1, verificado em `src/constants/theme.test.ts`):

- Texto branco sobre o coral `#FF6B4D` tem cerca de 2,8:1 e falha. O botão `accent` usa texto `ink`. O canvas mostra texto branco; o próprio Design System pede validar essa combinação.
- `success` e `warning` não atingem 4,5:1 como texto pequeno sobre superfície clara; por isso existem as variantes `*Text`, que escurecem o mesmo matiz. Precisam de aprovação do design.

Cores por vestibular (Enem `#1351B4`, Fuvest `#1CADEA`/`#266897`/`#B86E18`, Unicamp `#E2231A`/`#10181F`) estão no Design System, mas só entram junto das telas de questões, que ainda não existem.

## 3. Espaçamento, Raios e Elevação

- `Spacing` (base 4): `half=2`, `one=4`, `two=8`, `three=16`, `four=24`, `five=32`, `six=64`.
- `Radius`: `sm=6`, `md=10`, `lg=16`, `pill=9999`.
- Elevação em dois níveis: padrão sem sombra (separação por cor de fundo e borda de 1 px) e sombra suave só em elementos que flutuam (modal, menu). Sem cards dentro de cards.

## 4. Tipografia

O Design System escolhe Poppins (títulos) e Inter (corpo). Os pacotes de fonte não foram instalados (dependência sem aprovação); `Fonts.heading` e `Fonts.body` apontam para a fonte do sistema e `Typography` mantém tamanhos e pesos do Design System (título 28/700, seção 20/600, corpo 16/400, destaque 16/600, legenda 13/500). Instalar as fontes é só trocar esses dois valores. O layout não desliga `allowFontScaling`.

## 5. Componentes (`src/components/`)

| Componente | Estados cobertos |
| --- | --- |
| `Button` | normal, pressionado, foco visível, desabilitado com motivo em texto, carregando (ignora toque duplo), variantes `primary`, `accent` e `outline`; alvo mínimo 44 pt (iOS) e 48 dp (Android) |
| `Banner` | `info`, `success`, `warning` e `error`; o estado é dito em texto e a borda só reforça; anuncia mudanças a leitores de tela sem repetir |
| `OfflineBanner` | exibido sem conexão: “Sem conexão. Suas ações serão enviadas quando houver internet.” |
| `Screen` | área segura, rolagem, largura útil máxima, rodapé fixo para a ação principal |
| `AppText` | variantes de `Typography` e tons; títulos com papel `header` |

## 6. Navegação

Expo Router, com rotas protegidas pela sessão: `login` quando deslogado; abas `Redação` e `Conta` e as telas empilhadas `redacao/nova` e `redacao/[essayId]` quando logado. Só existem abas para o que tem contrato aprovado. O canvas desenha cinco abas (Estudo, Simulados, Início, Redação, Perfil) e várias telas (Home, Pomodoro, Flowtime, assistente de IA e de voz, conquistas, compartilhar, paywall, cronograma, questões, simulados, revisão); elas dependem de contratos, dados e decisões que ainda não existem (`docs/IMPLEMENTACAO-FRONTEND.md`, §17) e não foram implementadas.

## 7. Estados Assíncronos da Interface

Os estados de um comando (`queued-locally`, `sending`, `received`, `processing`, `completed`, `failed`) e a regra de `asOf` estão em `docs/ARQUITETURA.md` (§9) e `docs/IMPLEMENTACAO-FRONTEND.md` (§6.5 e §12.2). Cada estado tem texto próprio em `src/features/essay/ui/essay-messages.ts`; a confirmação de recebimento só aparece depois do `202`.

## 8. Acessibilidade

- Alvos de toque de pelo menos 44 × 44 pt (iOS) e 48 × 48 dp (Android).
- Contraste WCAG AA, conferido por teste automatizado para os pares de `Colors` em uso.
- Nenhum estado depende só de cor, ícone, animação ou gesto: todo estado traz rótulo de texto.
- Rótulos e papéis acessíveis, `accessibilityState` (`disabled`, `busy`) e anúncio das mudanças assíncronas com `AccessibilityInfo.announceForAccessibility`, sem repetir.
- Foco visível na web e ordem de leitura coerente.
- Pendente: conferência com TalkBack e VoiceOver em aparelho real (guia Front-End, §11.4).

## 9. Divergências do canvas em relação à arquitetura

| Tela do canvas | Mostra | Arquitetura | Tratamento |
| --- | --- | --- | --- |
| Login | E-mail e senha, “Esqueci minha senha” e “Criar conta gratuita” | Login com Google e Apple, sem senha (proposta P1) | O app implementa Google e Apple; aguarda decisão do produto |
| Redação — envio | Foto da folha manuscrita | `SubmitEssay` recebe `text` | O app implementa o texto; foto exige contrato novo e dependências |
| Paywall e anúncios | Planos, preço e AdMob | Fonte do Premium em aberto | Não implementado |

## 10. Biblioteca de componentes

O Design System cita o Gluestack UI v5. O app usa React Native com `StyleSheet` e os componentes acima: a biblioteca não foi aprovada como dependência e não está instalada. Adotá-la exige aprovação e adaptação aos tokens deste documento.

## 11. Contrato de Implementação

- Reutilize `theme.ts` e `src/components/` antes de criar um primitivo novo.
- Não use dados fictícios de questões, notas, desempenho ou correções em nenhuma tela.
- Qualquer necessidade fora do escopo exige pedir direção antes de inventar comportamento (`docs/AGENTS.md`).
- Use `docs/DesignIA_Regras.md` como checklist contra aparência genérica.

## 12. Checklist de Aceitação

- [x] Cores, espaçamento e raios vêm de `src/constants/theme.ts`, sem valores soltos por tela.
- [x] Estados assíncronos de comando e consulta cobertos na redação.
- [x] Nenhuma tela usa dados fictícios.
- [ ] Fontes Poppins e Inter instaladas (depende de aprovação).
- [ ] Conferência com TalkBack e VoiceOver em aparelho real.
- [ ] Variantes `successText`, `warningText` e `errorText` aprovadas pelo design.
