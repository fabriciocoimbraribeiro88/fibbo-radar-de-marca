

# Plano: Modulo Completo de Analises

## Problema Atual
1. **Erro na coleta (Apify)**: O edge function `fetch-instagram` usa actor IDs com `/` (ex: `apify/instagram-profile-scraper`) mas a API do Apify espera `~` (ex: `apify~instagram-profile-scraper`). Isso causa o erro 404 que aparece no screenshot.
2. **Pagina de Analises**: Atualmente e apenas um placeholder vazio, sem funcionalidade.
3. **Rotas**: As analises nao estao vinculadas a projetos (`/analyses` global em vez de `/projects/:id/analyses`).

## O Que Sera Implementado

### Fase A: Corrigir Coleta Apify (pre-requisito)

Corrigir o edge function `fetch-instagram/index.ts` para usar `~` no lugar de `/` nos actor IDs:
- `apify/instagram-profile-scraper` -> `apify~instagram-profile-scraper`
- `apify/instagram-post-scraper` -> `apify~instagram-post-scraper`

### Fase B: Pagina de Analises do Projeto

**Rota:** `/projects/:id/analyses`

Lista de analises do projeto com:
- Cards de cada analise (titulo, tipo, status, data, entidades)
- Badge de status com cores (draft, analyzing, review, approved)
- Botao "Nova Analise" que leva ao wizard

**Rota:** `/projects/:id/analyses/new` -- Wizard de 5 Steps

**Step 1 - Tipo de Analise:**
Cards selecionaveis com icones:
- Diagnostico da Marca
- Analise de Concorrentes
- Analise Cruzada
- Analise de Influencers
- Analise de Inspiracoes

**Step 2 - Selecionar Entidades:**
Checkboxes com as entidades do projeto, agrupadas por tipo. A marca (projeto) e sempre incluida.

**Step 3 - Periodo:**
Date range picker. Mostra aviso sobre dados disponiveis baseado nos dados ja coletados no banco.

**Step 4 - Parametros:**
Checkboxes para selecionar secoes do relatorio:
- Big Numbers, Performance, Sentimento, Formatos, Temas, Temporal, Hashtags, Recomendacoes, Banco de Conteudo
- Secoes condicionais por tipo (ex: Oceanos Azuis so para analise cruzada)

**Step 5 - Revisar e Iniciar:**
Resumo completo + botao "Iniciar Analise"

### Fase C: Pipeline de Analise (Edge Function)

**Edge Function:** `run-analysis-pipeline`

Fluxo:
1. Recebe `analysis_id`
2. Busca config da analise, briefing do projeto, dados das entidades (posts, perfis, comentarios)
3. Pre-calcula metricas quantitativas (medias, totais, rankings)
4. Cria `analysis_sections` para cada entidade (status: pending)
5. Executa agentes em paralelo via `Promise.all` -- cada agente chama a API do Claude com:
   - System prompt contextualizado (segmento, marca, publico-alvo)
   - Dados quantitativos + posts da entidade
6. Agente Orquestrador: apos todos completarem, sintetiza analise cruzada
7. Salva resultados em `analysis_sections` com markdown + dados estruturados
8. Atualiza status da analise para `review`

### Fase D: Pagina de Acompanhamento e Revisao

**Rota:** `/projects/:id/analyses/:analysisId`

**Modo Execucao** (status: analyzing/agents_running):
- Status board visual tipo pipeline
- Grid de cards dos agentes com progresso em tempo real (polling)
- Preview das secoes conforme vao sendo completadas

**Modo Revisao** (status: review):
- Relatorio renderizado em Markdown com formatacao
- Secoes clicaveis para expandir detalhes
- Botoes: Aprovar, Exportar Markdown

## Detalhes Tecnicos

### Novas Rotas no App.tsx
```text
/projects/:id/analyses          -> ProjectAnalyses (lista)
/projects/:id/analyses/new      -> NewAnalysis (wizard)
/projects/:id/analyses/:aid     -> AnalysisView (execucao/revisao)
```

### Novos Arquivos
```text
src/pages/ProjectAnalyses.tsx      -- Lista de analises do projeto
src/pages/NewAnalysis.tsx          -- Wizard de 5 steps
src/pages/AnalysisView.tsx         -- Acompanhamento + revisao
supabase/functions/run-analysis-pipeline/index.ts  -- Pipeline IA
```

### Arquivos Modificados
```text
src/App.tsx                        -- Novas rotas
src/pages/ProjectEntities.tsx      -- Link para analises
src/components/AppLayout.tsx       -- Navegacao atualizada
supabase/functions/fetch-instagram/index.ts  -- Fix actor IDs (~ em vez de /)
```

### Modelo Claude
O edge function usara o modelo selecionado nas configuracoes. Inicialmente, o modelo sera passado como parametro na analise. Caso nao definido, usara `claude-sonnet-4-20250514` como fallback.

### Polling de Status
A pagina de acompanhamento fara polling a cada 3 segundos consultando `analysis_sections` para atualizar o progresso dos agentes em tempo real.

### Prompts dos Agentes
Seguirao exatamente o template do prompt original:
- Agente Individual: analista senior de inteligencia digital, com contexto do projeto (marca, segmento, publico-alvo, prioridades)
- Orquestrador: estrategista-chefe, sintetiza todas as analises em visao integrada com oceanos azuis e matriz de diferenciacao

