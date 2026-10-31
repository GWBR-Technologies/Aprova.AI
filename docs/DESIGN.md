# DESIGN.md — Aprova.AI

Este documento é a referência de design deste repositório. Ele registra apenas decisões aprovadas ou verificáveis no código e não autoriza inventar domínio de produto, regra pedagógica, critério de correção ou sistema visual — qualquer lacuna deve ser tratada como pergunta para o usuário.

Ele substitui uma versão escrita para o `medidorPressao` (Multscan Monitor). As decisões daquele produto (paleta, tipografia, Gluestack UI, 11 telas, estados de sensor) não se aplicam ao Aprova.AI e não foram migradas; o conteúdo anterior permanece no histórico do repositório (`git log -- docs/DESIGN.md`).

## 1. Produto e Escopo

- Domínio: aplicativo de estudos para o Enem, a Fuvest e outros vestibulares brasileiros, com apoio e correção por IA (GPT 6.1 - Terra). Desenvolvido pela GWBR Technologies.
- Fluxos de negócio iniciais, derivados do pedido de arquitetura (`docs/ARQUITETURA.md`, §4 e §5): resposta de questões, registro da rotina de estudos, simulados, redação com correção por IA e acompanhamento de desempenho e evolução.
- Telas, navegação, conteúdo e copy desses fluxos ainda não estão definidos.
- A arquitetura exige uma experiência assíncrona: o app confirma o recebimento de imediato (por exemplo, “Redação recebida com sucesso!”), mostra o processamento e entrega o resultado depois.

## 2. O Que Já Está Definido

| Item | Valor | Fonte |
| --- | --- | --- |
| Plataformas | Android e iOS; web ainda sem as dependências declaradas | `app.json`, `package.json` |
| Orientação | Retrato | `app.json` |
| Estilo da interface | Claro (`userInterfaceStyle: light`) | `app.json` |
| Estilo dos componentes | React Native com `StyleSheet`; nenhuma biblioteca de UI instalada | `package.json` |
| Ícones e splash | Ativos iniciais do Expo, que não representam a identidade do produto | `assets/` |

## 3. O Que Ainda Não Está Definido

Peça direção antes de criar qualquer um destes itens:

- paleta, logotipo e personalidade da marca;
- tipografia, raios, sombras e escala de espaçamento (os tokens ficarão em `src/constants/theme.ts` quando forem aprovados);
- biblioteca de componentes e de ícones (nenhuma foi adotada; `docs/DesignIA_Regras.md` traz uma referência condicional sobre Gluestack UI);
- navegação (abas, pilha ou Expo Router) e a lista de telas;
- modo escuro;
- tom da copy e conteúdo pedagógico.

## 4. Estados Assíncronos da Interface

Os estados de um comando (`queued-locally`, `sending`, `received`, `processing`, `completed`, `failed`) e a regra de `asOf` para dados projetados estão em `docs/ARQUITETURA.md` (§9) e valem para toda tela que envie um comando ou mostre dados de consulta. Cada estado precisa de texto e, em caso de falha, de uma ação de recuperação compreensível.

## 5. Acessibilidade

- Alvos de toque de pelo menos 44 × 44 pt no iOS e 48 × 48 dp no Android.
- Contraste suficiente (WCAG AA) para texto e para controles.
- Nenhum estado depende só de cor, ícone, animação ou gesto: todo estado traz rótulo de texto.
- Rótulos e papéis acessíveis em controles e anúncio das mudanças de estado assíncronas a tecnologias assistivas.
- Foco visível na web e ordem de leitura coerente.
- Animações só comunicam mudança de estado e respeitam a preferência de movimento reduzido.

## 6. Contrato de Implementação

- Antes de criar uma tela ou componente, analise o percurso afetado, os componentes reutilizáveis e `src/constants/theme.ts`, quando existirem.
- Reutilize tokens e componentes existentes; não introduza biblioteca ou sistema visual novo sem aprovação.
- Não use dados fictícios de questões, notas, desempenho ou correções em nenhuma tela.
- Qualquer necessidade fora do escopo acima exige pedir direção antes de inventar comportamento (`docs/AGENTS.md`).
- Use `docs/DesignIA_Regras.md` como checklist contra aparência genérica.

## 7. Checklist de Aceitação

- [ ] A identidade visual aprovada está registrada neste documento antes de telas finais serem criadas.
- [ ] Cores, tipografia e espaçamento vêm de `src/constants/theme.ts`, sem valores soltos por tela.
- [ ] Os estados assíncronos de comando e consulta (§4) estão cobertos onde se aplicam.
- [ ] Alvos de toque, contraste, foco visível e rótulos acessíveis foram conferidos.
- [ ] Nenhuma tela usa dados fictícios para representar questões, notas, desempenho ou correções.
