

## Plano: Processamento de Dados em Grande Volume com IA

### Resumo

Criar um sistema que processa todos os posts de uma entidade (milhares de posts) usando Claude Opus, gerando um relatorio completo com big numbers, tabelas, rankings, distribuicao temporal e insights qualitativos. O sistema pre-computa metricas no servidor (como o Python fez no exemplo) e envia dados estruturados + amostra de posts para o AI gerar a analise narrativa.

---

### Arquitetura

O processamento sera dividido em 2 camadas na edge function:

1. **Camada computacional** (Deno/TypeScript): calcula todas as metricas quantitativas (big numbers, distribuicao por mes, top posts, top hashtags, distribuicao por tipo, etc.) - sem limite de posts
2. **Camada AI** (Claude via Anthropic API): recebe os dados pre-computados + top/bottom 20 posts completos e gera analise qualitativa (insights, padroes, recomendacoes)

Isso evita enviar 5000+ posts brutos para o AI (caro e lento), mas ainda permite analise qualitativa profunda.

---

### 1. Edge Function `process-entity-data` 

**Recebe via POST:**
- `entity_id` (string)
- `project_id` (string)
- `use_ai` (boolean, default true) - permite rodar so a parte computacional se quiser

**Processamento computacional (sem AI):**

```text
1. Busca TODOS os posts da entidade (sem .limit())
2. Busca perfil mais recente da entidade
3. Calcula:
   - Big numbers: total posts, total likes, total comments, total views, 
     media likes/post, mediana likes/post, media comments/post, 
     engajamento total, taxa de engajamento
   - Top 10 posts por likes
   - Top 10 posts por comentarios
   - Bottom 10 posts por likes
   - Distribuicao por mes (posts, likes, avg likes/post)
   - Distribuicao por ano (posts, likes, avg likes/post)
   - Distribuicao por tipo de post (Reel, Image, Sidecar, Video)
   - Performance por tipo (avg likes, avg comments por tipo)
   - Top 20 hashtags mais usadas
   - Distribuicao por dia da semana
   - Distribuicao por hora do dia
   - Posts virais (engagement > 2x media)
   - Tendencia de crescimento (comparando periodos)
```

**Processamento AI (Claude Opus):**

Envia para o Claude:
- Big numbers pre-computados
- Top 20 posts completos (com caption)
- Bottom 10 posts completos
- Distribuicao mensal resumida
- Distribuicao por tipo
- Top hashtags

O AI gera:
- Resumo executivo narrativo
- Insights de performance
- Analise de padroes de conteudo
- Analise temporal / sazonalidade
- Recomendacoes estrategicas priorizadas

**Retorna:** JSON com `computed_metrics` + `ai_analysis` (markdown)

---

### 2. Tabela de resultados

Usar a tabela `analysis_sections` existente ou criar um campo na tabela `data_fetch_logs` para armazenar o resultado. Melhor opcao: salvar no campo `metadata` da tabela existente ou criar uma tabela simples `entity_reports` para guardar os resultados.

**Nova tabela `entity_reports`:**

| Coluna | Tipo |
|---|---|
| id | uuid PK |
| entity_id | uuid FK |
| project_id | uuid FK |
| computed_metrics | jsonb |
| ai_analysis | text (markdown) |
| model_used | text |
| posts_analyzed | integer |
| created_at | timestamptz |

---

### 3. UI - Botao no Dashboard

Adicionar um botao "Processar com IA" no dashboard (secao individual), ao lado do seletor de entidade. Ao clicar:

1. Mostra dialog de confirmacao com estimativa (X posts serao analisados)
2. Inicia processamento (loading state com progresso)
3. Ao concluir, abre uma nova aba/secao com o resultado completo:
   - Big numbers em cards (como no exemplo React do usuario)
   - Tabelas interativas (top posts, distribuicao mensal, etc.)
   - Markdown renderizado da analise AI
   - Botao para exportar/copiar

**Alternativa mais simples:** Adicionar como uma nova pagina `ProjectReports.tsx` (que hoje esta "Em breve"), transformando-a no visualizador de relatorios processados.

---

### 4. Pagina de Relatorio (`ProjectReports.tsx`)

Substituir o placeholder atual por:
- Lista de relatorios ja processados (com data, entidade, nro de posts)
- Botao "Novo Relatorio" que abre seletor de entidade
- Visualizacao do relatorio com:
  - Abas: "Big Numbers" | "Rankings" | "Evolucao" | "Analise AI"
  - Cards de metricas
  - Tabelas de top/bottom posts
  - Graficos de distribuicao (Recharts)
  - Markdown renderizado da analise qualitativa

---

### 5. Detalhes Tecnicos

**Modelo AI:** Usara a ANTHROPIC_API_KEY ja configurada com `claude-opus-4-6` (ou fallback para `claude-sonnet-4-20250514`). O usuario pode escolher o modelo.

**Limite de contexto:** Os dados pre-computados + 30 posts completos cabem em ~15K tokens. O AI retorna ~3-5K tokens. Total seguro para qualquer modelo.

**Query sem limite:** A edge function usara `SUPABASE_SERVICE_ROLE_KEY` para buscar todos os posts sem o limite de 1000 rows do client. Paginacao com range se necessario.

**Tempo de execucao:** Edge functions tem timeout de 150s. O processamento computacional e rapido (~1s para 5000 posts). A chamada ao Claude pode levar 30-60s. Total dentro do limite.

---

### Arquivos criados/alterados

| Arquivo | Acao |
|---|---|
| `supabase/functions/process-entity-data/index.ts` | **Criar** - edge function principal |
| `supabase/config.toml` | **Alterar** - adicionar config da nova function |
| `src/pages/ProjectReports.tsx` | **Alterar** - substituir placeholder por pagina completa |
| `src/hooks/useEntityReports.ts` | **Criar** - hooks para listar/criar relatorios |
| Migration SQL | **Criar** - tabela `entity_reports` |

