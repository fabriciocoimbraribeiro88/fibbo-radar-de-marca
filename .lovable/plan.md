

# Plano: Sistema Completo Fibbo Radar -- Roadmap por Modulos

## Situacao Atual

O sistema ja possui:
- Autenticacao (login/signup)
- Dashboard geral (lista de projetos + stats)
- CRUD de Projetos (wizard de criacao)
- Gerenciamento de Entidades (concorrentes/influencers/inspiracoes)
- Coleta Instagram via Apify (edge function funcionando)
- Modulo de Analises (wizard 5 steps + pipeline Claude + visualizacao)
- Settings (teste de conexao Apify + Anthropic)

## O Que Falta (Mapeamento Completo)

Comparando com a visao descrita, os modulos ausentes sao:

### 1. Navegacao por Projeto (Sub-Sidebar)
Atualmente ao clicar num projeto, vai direto para Entidades. Falta uma navegacao interna do projeto com todas as secoes:
- Visao Geral (dashboard do projeto)
- Marca (briefing)
- Entidades
- Fontes de Dados
- Dashboard (dados quantitativos)
- Analises
- Planejamento
- OKRs
- Relatorios

### 2. Pagina da Marca (/projects/:id/brand)
Formulario editavel com o briefing completo:
- Descricao, publico-alvo, tom de voz, keywords
- Auto-save com indicador visual

### 3. Fontes de Dados (/projects/:id/data-sources)
Configuracao e gerenciamento de coletas:
- Grid de todas as configuracoes (entidade x fonte x schedule)
- Botao "Executar Agora" por fonte
- Toggle de schedule (manual/semanal/mensal)
- Log das ultimas execucoes com status
- Configuracao de quais fontes baixar uma vez vs. recorrente

### 4. Dashboard do Projeto (/projects/:id/dashboard)
Visualizacao quantitativa dos dados coletados (sem analise IA):
- Sub-tabs: Overview / Social / Ads / SEO
- Big Numbers com sparklines (posts, comentarios, curtidas, engajamento, virais, hit%, views)
- Graficos comparativos marca vs concorrentes (Recharts)
- Tabela de posts com filtros e sort
- Metricas de perfil (seguidores, evolucao)

### 5. Planejamento (/projects/:id/planning)
- Calendario Social: visualizacao mensal, drag-and-drop, banco de ideias
- Plano de Ads: campanhas, conjuntos, anuncios
- Plano de SEO: keywords prioritarias, briefing de artigos
- Botao "Gerar com IA" baseado nas analises existentes
- Edge function `generate-planning`

### 6. OKRs (/projects/:id/okrs)
- Seletor de trimestre
- Cards de objetivos expandiveis com key results
- Progress bars com trend arrows
- Graficos de acompanhamento (line chart semana a semana)
- Automacao: puxar dados mais recentes de instagram_profiles, instagram_posts, seo_data
- Alertas visuais (amarelo <70%, vermelho <50% do esperado)

### 7. Relatorios do Projeto (/projects/:id/reports)
- Lista de relatorios gerados a partir das analises
- Visualizacao do relatorio em markdown formatado
- Exportacao PDF (jsPDF + html2canvas)
- Exportacao Markdown

### 8. Analises Programadas
- Opcao de agendar analises (diaria/semanal/mensal)
- Notificacao por email com resumo e big numbers
- Edge function de cron para disparar

## Plano de Execucao (Fases)

Dado o tamanho, recomendo implementar em **4 fases sequenciais**:

---

### Fase 1: Navegacao + Marca + Fontes de Dados
**Prioridade: Alta** -- e a base para tudo funcionar bem

**Rotas novas:**
```text
/projects/:id              -> ProjectOverview (visao geral)
/projects/:id/brand        -> ProjectBrand (briefing editavel)
/projects/:id/data-sources -> ProjectDataSources (config de coletas)
```

**Arquivos novos:**
```text
src/components/ProjectLayout.tsx     -- Layout com sub-sidebar do projeto
src/pages/ProjectOverview.tsx        -- Visao geral do projeto
src/pages/ProjectBrand.tsx           -- Briefing editavel com auto-save
src/pages/ProjectDataSources.tsx     -- Config de fontes de dados
```

**Arquivos modificados:**
```text
src/App.tsx                          -- Novas rotas aninhadas
src/components/AppLayout.tsx         -- Navegacao atualizada
```

**Funcionalidades:**
- Sub-sidebar com links: Overview, Marca, Entidades, Fontes, Dashboard, Analises, Planejamento, OKRs, Relatorios
- ProjectBrand: formulario com campos do briefing, auto-save com debounce
- ProjectDataSources: tabela de data_fetch_configs, botao executar agora, toggle schedule, log de execucoes

---

### Fase 2: Dashboard de Dados Quantitativos
**Prioridade: Alta** -- o usuario precisa ver os dados coletados

**Rotas novas:**
```text
/projects/:id/dashboard          -> ProjectDashboard
/projects/:id/dashboard/social   -> sub-tab social
/projects/:id/dashboard/ads      -> sub-tab ads
/projects/:id/dashboard/seo      -> sub-tab seo
```

**Arquivos novos:**
```text
src/pages/ProjectDashboard.tsx       -- Dashboard com sub-tabs
src/components/BigNumberCard.tsx     -- Card de metrica com sparkline
src/components/ComparisonChart.tsx   -- Grafico comparativo multi-entidade
```

**Funcionalidades:**
- Big Numbers: total posts, comentarios, curtidas, engajamento medio, virais, hit%, views
- Comparativo: bar chart marca vs concorrentes por metrica
- Tabela de posts: filtros (data, formato, entidade), sort, expandir detalhes
- Graficos de perfil: evolucao de seguidores (line chart)
- Distribuicao por formato (pie chart), por dia da semana (bar chart)

---

### Fase 3: Planejamento + OKRs
**Prioridade: Media** -- depende de ter analises prontas

**Rotas novas:**
```text
/projects/:id/planning           -> ProjectPlanning
/projects/:id/okrs               -> ProjectOKRs
```

**Arquivos novos:**
```text
src/pages/ProjectPlanning.tsx        -- Calendario + planos
src/pages/ProjectOKRs.tsx            -- Objetivos e acompanhamento
src/components/CalendarGrid.tsx      -- Grid mensal de posts
src/components/OKRProgressCard.tsx   -- Card de objetivo com KRs
supabase/functions/generate-planning/index.ts  -- Geracao IA
```

**Funcionalidades:**
- Calendario mensal visual com cards de posts planejados
- CRUD de itens de planejamento (posts, ads, artigos SEO)
- Geracao com IA baseada nas analises
- OKRs: CRUD de objetivos e key results por trimestre
- Progress bars automaticas (puxando dados de instagram_profiles, posts, seo_data)
- Alertas visuais de desempenho

---

### Fase 4: Relatorios + Agendamento + Notificacoes
**Prioridade: Media-Baixa** -- refinamento

**Arquivos novos:**
```text
src/pages/ProjectReports.tsx         -- Relatorios do projeto
supabase/functions/scheduled-fetch/index.ts     -- Cron coleta
supabase/functions/scheduled-analysis/index.ts  -- Cron analise
supabase/functions/send-notification/index.ts   -- Email
```

**Funcionalidades:**
- Lista e visualizacao de relatorios com markdown formatado
- Exportacao PDF e Markdown
- Agendamento de coletas automaticas (cron)
- Agendamento de analises (diaria/semanal/mensal)
- Notificacoes por email com resumo

---

## Recomendacao

Sugiro comecar pela **Fase 1** (Navegacao + Marca + Fontes de Dados) pois ela reestrutura a experiencia do projeto inteiro e torna todas as outras fases mais faceis de implementar. Cada fase subsequente pode ser aprovada e implementada individualmente.

