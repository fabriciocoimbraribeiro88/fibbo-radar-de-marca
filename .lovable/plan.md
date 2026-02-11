

# Novos Critérios de Hit e Viral (Relativos)

## Resumo

Alterar os critérios de **Hit** e **Viral** de absolutos para relativos, baseados na media de views de cada entidade:

- **Hit**: posts com views > 2x a media de views da entidade
- **Viral**: posts com views > 10x a media de views da entidade
- **% Viral**: porcentagem de posts virais sobre o total

## Arquivos a alterar

### 1. `src/hooks/useProjectDashboardData.ts` (logica principal)

Na funcao `useEntityMetrics`, substituir os calculos atuais:

```
// ANTES:
hits = posts com views > 5x followers
viralHits = posts com views >= 1M

// DEPOIS:
avgViews = totalViews / totalPosts
hits = posts com views > 2 * avgViews
viralHits = posts com views > 10 * avgViews
viralRate = (viralHits / total) * 100
```

Adicionar `avgViews` ao tipo `EntityMetrics` para exibicao nos graficos.

### 2. `src/components/dashboard/ViralHitsChart.tsx`

Atualizar o subtitulo de "Posts Virais (1M+ views)" para "Posts Virais (>10x media views)".

### 3. `src/components/dashboard/ViralRateChart.tsx`

Atualizar o subtitulo de "% Posts Virais (1M+ views)" para "% Posts Virais (>10x media views)".

### 4. `src/components/dashboard/RadarComparisonChart.tsx`

O eixo "% Virais" ja usa `m.viralHits / total` -- nenhuma mudanca de codigo necessaria, apenas reflete os novos valores.

### 5. `src/pages/ProjectReports.tsx`

Nenhuma mudanca de codigo necessaria -- ja consome `viralHits` e `viralRate` do hook.

## Detalhes Tecnicos

- O calculo e feito por entidade, garantindo que perfis menores tambem tenham hits e virais proporcionais ao seu desempenho
- `avgViews` sera adicionado como campo em `EntityMetrics` para possivel uso futuro em tooltips ou graficos
- Nenhuma mudanca de banco de dados necessaria

