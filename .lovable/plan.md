

# Analise de Sentimento Automatica no Upload

## Objetivo
Tornar a extracão de comentarios e analise de sentimento automatica no momento do upload do JSON, eliminando os botoes manuais. A seção de sentimento no dashboard passa a ser apenas visualização.

## Mudanças

### 1. Edge Function `import-instagram-json` -- Chamar analise automaticamente
Apos importar posts e extrair comentarios, a funcao vai invocar `analyze-sentiment` automaticamente para a entidade, sem necessidade de acao do usuario.

- Ao final do loop de importacao, se `totalComments > 0`, chamar a funcao `analyze-sentiment` via fetch interno (Deno `fetch` para o proprio Supabase)
- Retornar tambem o resultado da analise no response (`sentiment_analyzed`)

### 2. Frontend `ProjectSources.tsx` -- Feedback de analise
Apos importacao JSON, o toast ja informara que comentarios foram analisados automaticamente (ex: "150 posts importados, 45 comentarios analisados").

### 3. Componente `SentimentAnalysisSection.tsx` -- Remover botoes manuais
- Remover os botoes "Extrair Comentarios" e "Analisar N comentarios"
- Manter apenas a visualizacao: big numbers, pie chart, temas positivos/negativos, top comentarios negativos
- Se nao houver dados de sentimento, mostrar mensagem informativa ("Os comentarios serao analisados automaticamente na proxima importacao")

### 4. Adicionar secao de comentarios positivos destacados
Alem dos negativos que ja existem, adicionar um card com os top 5 comentarios positivos (ordenados por likes), com mesma estrutura visual dos negativos.

---

## Detalhes Tecnicos

### Edge Function `import-instagram-json/index.ts`
```typescript
// Apos o loop de batches, adicionar:
if (totalComments > 0) {
  try {
    const sentimentResp = await fetch(
      `${supabaseUrl}/functions/v1/analyze-sentiment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entity_id }),
      }
    );
    const sentimentData = await sentimentResp.json();
    // incluir no response
  } catch (e) {
    // log mas nao bloqueia
  }
}
```

### `SentimentAnalysisSection.tsx`
- Remover estados `analyzing` e `extracting`
- Remover funcoes `handleExtract` e `handleAnalyze`
- Remover botoes de acao
- Adicionar card "Top 5 Comentarios Positivos" com mesma estrutura do card de negativos (thumbs up, link para post, username, texto)
- Ajustar `computeSentimentMetrics` para incluir `topPositive` (top 5 positivos por likes)

### `useProjectComments.ts`
- Adicionar `topPositive: CommentWithPost[]` ao `SentimentMetrics`
- Calcular top 5 positivos ordenados por likes

### `ProjectSources.tsx`
- Ajustar toast apos `executeJsonImport` para exibir contagem de comentarios analisados se retornada pela funcao

