

# Plano: Serviços Contratados + Limite de 3 Fontes por Tipo

## Resumo

Duas mudanças estruturantes no sistema:

1. **Serviços Contratados como filtro global**: Os canais ativados (Social, Ads, SEO) passam a controlar o que aparece em todo o sistema -- wizards de planejamento, wizard de analise, dashboard e resultados so mostram opcoes dos canais contratados.

2. **Limite de 3 fontes por tipo no Dashboard e Analise**: O usuario pode cadastrar quantas fontes quiser na pagina de Fontes, mas no Dashboard e no wizard de Analise, ele seleciona no maximo 3 por tipo (concorrente, influencer, inspiracao).

---

## Parte 1: Serviços Contratados como filtro global

### 1.1 Hook centralizado: `useContractedServices`

Criar um hook reutilizavel que carrega os canais contratados do projeto:

**Arquivo:** `src/hooks/useContractedServices.ts`

```typescript
// Retorna { channels: string[], isLoading }
// Ex: channels = ["social"] significa que Ads e SEO estao desativados
```

### 1.2 Onde aplicar o filtro

| Local | Arquivo | O que muda |
|---|---|---|
| Wizard de Analise - Step 1 | `AnalysisStep1.tsx` | Os cards de canal (Social/Ads/SEO) ficam desabilitados se o canal nao esta contratado |
| Wizard de Planejamento - Step 1 | `PlanningWizardStep1.tsx` | Idem: canais nao contratados ficam desabilitados com badge "Nao contratado" |
| Resultados - Overview | `ResultsOverview.tsx` | Ja usa `contractedChannels` -- sem mudanca |
| Sidebar / Navegacao | `ProjectLayout.tsx` | Nao oculta paginas, mas pode exibir badge no futuro |

A logica e simples: os canais nao contratados aparecem visualmente mas ficam **desabilitados** (opacity + tooltip "Servico nao contratado"), impedindo selecao.

### 1.3 Mover "Servicos Contratados" para a pagina de Fontes

Atualmente a configuracao de servicos contratados fica na aba "Configuracao" dentro de Contexto (via `ResultsSettings`). A proposta e **mover esse bloco para a pagina de Fontes** (`ProjectSources.tsx`), ja que e uma configuracao inicial do projeto. O `ResultsSettings` continua existindo mas sem a secao de servicos (apenas agenda de relatorios).

---

## Parte 2: Limite de 3 fontes por tipo

### 2.1 Conceito

- **Fontes (ProjectSources.tsx)**: sem limite. O usuario cadastra quantas quiser.
- **Dashboard (ProjectDashboard.tsx)**: ao carregar, mostra no maximo 3 por tipo. Se houver mais de 3, exibe um seletor para o usuario escolher quais 3 quer ver.
- **Analise (AnalysisStep2.tsx)**: na selecao de entidades, limita a 3 por tipo (concorrente, influencer, inspiracao). A marca sempre e incluida separadamente.

### 2.2 Dashboard - Seletor de entidades

No `DashboardFilters.tsx`, adicionar um filtro que agrupa entidades por tipo e limita a selecao a 3 por grupo:

- Se o projeto tem 2 concorrentes: mostra todos, sem restricao
- Se tem 5 concorrentes: mostra checkboxes mas trava apos 3 selecionados por tipo
- A marca e sempre incluida (nao conta no limite)

O estado `selectedEntityIds` ja existe. A mudanca e adicionar validacao no `handleToggleEntity` para impedir mais de 3 por tipo.

### 2.3 Wizard de Analise - Step 2

No `AnalysisStep2.tsx`, adicionar a mesma logica:

- Exibir contador "(2/3 selecionados)" por grupo
- Desabilitar checkboxes do grupo quando ja tem 3 selecionados
- Mensagem clara: "Selecione ate 3 por categoria"

### 2.4 Nenhuma mudanca no banco

Nao e necessario alterar schema. O limite e apenas no frontend (selecao).

---

## Detalhes Tecnicos

### Arquivos a criar

| Arquivo | Descricao |
|---|---|
| `src/hooks/useContractedServices.ts` | Hook centralizado para buscar canais contratados |

### Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `src/pages/ProjectSources.tsx` | Adicionar secao "Servicos Contratados" no topo da pagina |
| `src/components/results/ResultsSettings.tsx` | Remover bloco de servicos contratados (manter apenas agenda de relatorios) |
| `src/components/analysis/AnalysisStep1.tsx` | Desabilitar canais nao contratados |
| `src/components/analysis/AnalysisStep2.tsx` | Limitar selecao a 3 por tipo com contador visual |
| `src/components/planning/PlanningWizardStep1.tsx` | Desabilitar canais nao contratados |
| `src/components/dashboard/DashboardFilters.tsx` | Adicionar validacao de max 3 por tipo no seletor de entidades |
| `src/pages/ProjectDashboard.tsx` | Passar info de tipo das entidades para o filtro |

### Fluxo do usuario

1. Vai em **Fontes** e ativa os servicos contratados (ex: apenas Social)
2. Cadastra suas fontes (marca, concorrentes, influencers, etc.)
3. No **Dashboard**, ve os dados filtrados com max 3 por tipo
4. No **Wizard de Analise**, so consegue criar analises do tipo Social, e seleciona max 3 entidades por categoria
5. No **Editorial**, so ve a opcao Social no wizard de planejamento

