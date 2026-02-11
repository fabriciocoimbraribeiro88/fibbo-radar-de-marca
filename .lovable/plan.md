
# Grafico Comparativo de Hits e Virais por Entidade

## Resumo
Criar um novo componente `HitsVsViralChart` que exibe um grafico de barras agrupadas (stacked/grouped) comparando a quantidade de Hits e Virais de cada entidade lado a lado. Sera adicionado na secao comparativa do dashboard.

## Arquivos

### 1. Novo: `src/components/dashboard/HitsVsViralChart.tsx`
- Grafico de barras agrupadas (Recharts `BarChart`) com duas barras por entidade: **Hits** e **Virais**
- Cada entidade no eixo X, com barras coloridas usando a cor da entidade (tom mais claro para Hits, tom original para Virais)
- Tooltip mostrando valores absolutos e percentuais
- Labels no topo das barras
- Segue o mesmo padrao visual dos outros graficos comparativos (Card com titulo centralizado, `ResponsiveContainer` height 280)

### 2. Editar: `src/pages/ProjectDashboard.tsx`
- Importar `HitsVsViralChart`
- Adicionar na secao comparativa, na linha dos graficos `ViralHitsChart` e `ViralRateChart` (grid de 2 colunas), transformando em grid de 3 colunas com o novo grafico

## Detalhes Tecnicos

O componente recebera `metrics: EntityMetrics[]` e mapeara para:
```
data = metrics.map(m => ({
  name: m.name,
  hits: m.hits,
  virais: m.viralHits,
  color: m.color
}))
```

Usara barras agrupadas (`Bar` com diferentes `dataKey`) para Hits e Virais lado a lado, com cores distintas (ex: cor da entidade em opacidade 60% para Hits, 100% para Virais).
