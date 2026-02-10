
# Melhorias no Dashboard — Filtros, Métricas Virais, Top Posts e Novas Funcionalidades

## 1. Novos modos de fonte no DashboardFilters

**Arquivo:** `src/components/dashboard/DashboardFilters.tsx`

Atualmente existem apenas 3 modos: `brand_only`, `brand_vs_all`, `brand_vs_selected`. Vamos expandir o tipo `SourceMode` e adicionar pills para cada categoria:

- Apenas Marca
- Marca vs Todos
- Marca vs Concorrentes (novo)
- Marca vs Influencers (novo)
- Marca vs Inspiração (novo)

Abaixo dessas pills, manter as pills individuais de cada entidade (para seleção granular).

**Tipo atualizado:**
```typescript
export type SourceMode = "brand_only" | "brand_vs_all" | "brand_vs_competitors" | "brand_vs_influencers" | "brand_vs_inspiration" | "brand_vs_selected";
```

## 2. Atualizar lógica de filtragem no ProjectDashboard

**Arquivo:** `src/pages/ProjectDashboard.tsx`

No `useMemo` de `visibleMetrics`, adicionar os novos modos:

```text
brand_vs_competitors -> brand + role === "competitor"
brand_vs_influencers -> brand + role === "influencer"  
brand_vs_inspiration -> brand + role === "inspiration"
```

## 3. Métricas virais — Hits e Taxa de Viral

**Arquivo:** `src/hooks/useProjectDashboardData.ts`

Adicionar campos ao `EntityMetrics`:
- `viralHits`: Posts com engajamento acima de 2x a média da entidade
- `viralRate`: % de posts virais em relacao ao total

**Arquivo:** `src/pages/ProjectDashboard.tsx`

Adicionar 2 novos big numbers na Visao Geral (total 8 cards, grid ajustado para `lg:grid-cols-4`):
- Total de Hits (posts virais)
- Taxa de Viral (%)

Na tab Individual, adicionar os mesmos 2 campos nos big numbers individuais (total 6 cards).

## 4. Top 10 Melhores e Piores Posts — Tab Individual

**Novo componente:** `src/components/dashboard/TopPostsTable.tsx`

Uma tabela/grid mostrando:
- Thumbnail (se disponivel via `thumbnail_url` — campo existe no DB mas nao esta sendo buscado)
- Data de publicacao
- Tipo (Image/Video/Sidecar/Reel)
- Likes, Comments, Views
- Engagement total
- Trecho da caption (primeiros 80 caracteres)

Recebe props: `posts: PostData[]`, `entityId: string`, `mode: "best" | "worst"`, `limit: number`

Os posts sao ordenados por `engagement_total` (desc para best, asc para worst).

**Arquivo:** `src/hooks/useProjectDashboardData.ts`

Atualizar a query de `instagram_posts` para incluir `thumbnail_url` e `post_url` no select e no tipo `PostData`.

**Arquivo:** `src/pages/ProjectDashboard.tsx`

Na tab Individual, adicionar uma nova secao apos os graficos existentes:
- Linha com 2 cards lado a lado: Top 10 Melhores | Top 10 Piores

## 5. Sugestoes de funcionalidades adicionais para o Dashboard

Alem das mudancas solicitadas, posso incluir:

- **Melhor dia/horario para postar**: Heatmap de engajamento medio por dia da semana e hora do dia (usando `posted_at`).
- **Crescimento de seguidores %**: Variacao percentual entre o primeiro e ultimo snapshot de seguidores no periodo.
- **Frequencia de postagem**: Posts por semana medio de cada entidade (barra comparativa).
- **Engajamento por formato comparativo**: Na tab comparativa, um chart mostrando qual formato performa melhor para cada entidade.

Essas 4 sugestoes ficam como opcoes futuras — vou implementar apenas as 4 mudancas principais agora (filtros, virais, top posts, thumbnail no hook).

---

## Resumo tecnico das mudancas

| Arquivo | Mudanca |
|---|---|
| `src/components/dashboard/DashboardFilters.tsx` | Novos SourceMode pills (vs concorrentes, vs influencers, vs inspiracao) + pills individuais abaixo |
| `src/hooks/useProjectDashboardData.ts` | Adicionar `thumbnail_url`, `post_url` ao PostData + `viralHits`, `viralRate` ao EntityMetrics |
| `src/pages/ProjectDashboard.tsx` | Novos modos no visibleMetrics, 2 novos big numbers (hits/viral), top posts na tab individual |
| `src/components/dashboard/TopPostsTable.tsx` | Novo componente — tabela de top 10 melhores/piores posts |
