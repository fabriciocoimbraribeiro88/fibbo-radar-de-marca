

# Plano: Importar Comentarios + Analise de Sentimento da Marca

## Visao Geral

Dois entregaveis principais:

1. **Extrair comentarios do metadata ja existente no banco** e importa-los na tabela `instagram_comments` (558 posts ja tem `latestComments` no campo metadata)
2. **Criar secao de Analise de Sentimento** no Dashboard do projeto, usando IA para classificar os comentarios

---

## Parte 1: Extração e Importação de Comentários

### 1.1 Edge Function: `extract-comments`
Nova edge function que:
- Recebe `entity_id` (ou `project_id`) como parametro
- Busca todos os `instagram_posts` da entidade que tem `metadata->'latestComments'` com itens
- Para cada post, extrai os comentarios do metadata e faz upsert na tabela `instagram_comments`
- Mapeamento Apify -> DB:
  - `id` -> `comment_id_instagram`
  - `text` -> `text`
  - `ownerUsername` -> `username`
  - `timestamp` -> `commented_at`
  - `likesCount` -> `likes_count`
  - `post.id` (UUID do Supabase) -> `post_id`
  - Objeto completo -> `metadata`

### 1.2 Atualizar `import-instagram-json`
- Apos importar posts, extrair `latestComments` de cada post e inserir na tabela `instagram_comments`
- Necessita primeiro fazer o upsert do post para obter o UUID (`post_id`) e depois inserir os comentarios vinculados

### 1.3 Atualizar `fetch-instagram` (check action)
- Apos importar posts do dataset Apify, tambem extrair e inserir comentarios do campo `latestComments` de cada post

---

## Parte 2: Analise de Sentimento com IA

### 2.1 Edge Function: `analyze-sentiment`
Nova edge function que:
- Recebe `entity_id` e opcionalmente um periodo (date range)
- Busca todos os comentarios da entidade que ainda nao tem `sentiment` preenchido
- Envia em lotes para o modelo Lovable AI (gemini-2.5-flash para custo/velocidade)
- Prompt classifica cada comentario como: `positive`, `neutral`, `negative`
- Categoriza temas (elogio, duvida, reclamacao, spam, etc.)
- Atualiza os campos `sentiment` e `sentiment_category` na tabela `instagram_comments`

### 2.2 Migration: Permitir UPDATE na tabela `instagram_comments`
- Adicionar RLS policy para UPDATE (necessario para salvar o sentimento)
- A tabela ja tem colunas `sentiment` e `sentiment_category`

### 2.3 Componente Dashboard: `SentimentAnalysisSection`
Nova secao no Dashboard por entidade que exibe:
- **Resumo**: Total de comentarios analisados, % positivo/neutro/negativo
- **Score geral**: Calculo 0-10 baseado na distribuicao
- **Grafico de pizza**: Distribuicao visual de sentimento
- **Temas positivos**: Agrupamento dos principais temas de elogios
- **Temas negativos**: Categorias com nivel de atencao
- **Top 5 situacoes que necessitam atencao**: Comentarios negativos mais relevantes com link para o post
- Botao "Analisar Sentimento" que dispara a edge function

---

## Parte 3: Integracao no Dashboard

### 3.1 Hook: `useProjectComments`
- Busca comentarios da tabela `instagram_comments` via join com `instagram_posts` filtrado por entidade
- Computa metricas de sentimento (contagens, percentuais, score)

### 3.2 Atualizar `ProjectDashboard.tsx`
- Adicionar a secao de sentimento abaixo dos graficos de cada entidade
- Mostrar apenas para entidade brand (ou todas, configuravel)

---

## Detalhes Tecnicos

### Arquivos a criar:
- `supabase/functions/extract-comments/index.ts`
- `supabase/functions/analyze-sentiment/index.ts`
- `src/components/dashboard/SentimentAnalysisSection.tsx`
- `src/hooks/useProjectComments.ts`

### Arquivos a modificar:
- `supabase/functions/import-instagram-json/index.ts` - extrair comentarios apos upsert de posts
- `supabase/functions/fetch-instagram/index.ts` - extrair comentarios na action check
- `src/pages/ProjectDashboard.tsx` - adicionar secao de sentimento

### Migration SQL:
- Adicionar RLS policy de UPDATE para `instagram_comments`
- Adicionar unique constraint em `comment_id_instagram` para permitir upsert

### Modelo de IA:
- `google/gemini-2.5-flash` via Lovable AI (sem API key necessaria)
- Prompt em portugues para classificacao de sentimento

