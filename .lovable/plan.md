

## Plano: Remover filtros de periodo, limites e imagens dos tops

### Resumo
Os dados coletados no Apify ja estao no banco (200 posts por entidade, coletados com limite antigo). O dashboard vai ser simplificado para mostrar todos os posts ou os ultimos X posts, sem filtro de periodo. As imagens dos top posts serao removidas.

### Problema dos dados
- `tallisgomes` tem 200 posts no banco (de 5.649 disponiveis no Apify)
- `layerupbr` tem 200 posts no banco (de 2.142 disponiveis)
- Isso ocorreu porque a coleta anterior usou `results_limit: 200`
- **Sera necessario re-coletar esses perfis** usando "Todos os Posts" na tela de coleta para que os dados completos entrem no banco

### Mudancas

**1. `src/components/dashboard/DashboardFilters.tsx`**
- Remover toda a Row 1 (botoes de periodo, popover de datas customizadas)
- Remover tipos/funcoes: `PeriodPreset`, `PeriodRange`, `getPresetRange`, `PRESETS`
- Adicionar nova Row 1 com pills de quantidade: "Todos" | "Ultimos 50" | "Ultimos 100" | "Ultimos 200" | "Ultimos 500"
- Exportar novo tipo `PostLimit` (number | "all")
- Remover props `period`/`onPeriodChange`, adicionar `postLimit`/`onPostLimitChange`

**2. `src/hooks/useProjectDashboardData.ts`**
- Remover `.limit(3000)` da query de posts (trazer todos)
- Remover `useFilteredPosts` e tipo `DateRange`
- Adicionar `useLimitedPosts(posts, limit)` que ordena por `posted_at` desc e pega os N mais recentes (ou todos)

**3. `src/pages/ProjectDashboard.tsx`**
- Remover state `period` e chamada `useFilteredPosts`
- Adicionar state `postLimit` com default `"all"`
- Usar `useLimitedPosts` no lugar de `useFilteredPosts`
- Atualizar props passadas ao `DashboardFilters`

**4. `src/components/dashboard/TopPostsTable.tsx`**
- Remover coluna "Imagem" do header
- Remover celula com thumbnail/placeholder do body
- Remover import de `Image as ImageIcon`

### Apos implementar
- Sera necessario re-coletar `tallisgomes` e `layerupbr` com o modo "Todos os Posts" para que os 5.649 e 2.142 posts entrem no banco

