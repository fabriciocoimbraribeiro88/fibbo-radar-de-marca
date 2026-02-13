

# Recalibração do Fibbo Score: Apenas Redes Sociais

## Situacao Atual

Os scores atuais estao na faixa 42-58/100. Os componentes que usam SEO/Ads:

- **Presenca**: `seoScore` vale 0-3 pts (quase sempre 0, pois poucos tem dados SEO)
- **Competitividade**: `seoRelScore` vale 0-3 pts (idem)
- **Conteudo**: `planningAdherence` vale 0-4 pts (depende de planejamento interno, nao de redes sociais)

Total de 10 pontos "desperdicados" em metricas que quase nunca pontuam.

## O Que Sera Removido

1. Fetch de `seo_data` do banco
2. Funcao `calculateSeoPresenceScore()`
3. SEO relativo na Competitividade (`seoRelScore`)
4. `calculatePlanningAdherence()` (depende de planning items, nao de dados sociais)

## Nova Distribuicao de Pontos (100 pts, 4 dimensoes de 25)

### PRESENCA (0-25) -- era 22 efetivo, agora 25

| Sub-score | Antes | Depois | O que mede |
|---|---|---|---|
| Crescimento de seguidores | 0-8 | 0-8 | % crescimento 90d. Range: -0.5% a 1.5% |
| Volume de posts | 0-5 | 0-6 | Posts/semana. Max em 3/semana |
| Regularidade | 0-5 | 0-5 | Inverso do CV da distribuicao semanal |
| Alcance (views/followers) | 0-4 | 0-6 | Reach medio. Max em 12% |
| ~~SEO~~ | ~~0-3~~ | removido | -- |

### ENGAJAMENTO (0-25) -- sem mudanca estrutural, ajuste fino

| Sub-score | Antes | Depois | O que mede |
|---|---|---|---|
| Taxa de engajamento | 0-10 | 0-10 | (likes+comments)/followers. Max 1.5% |
| Taxa de comentarios | 0-5 | 0-5 | comments/followers. Max 0.1% |
| Taxa de saves | 0-5 | 0-5 | saves/followers. Baseline 2.5 se sem dados |
| Sentimento | 0-2 | 0-2.5 | % positivos nos comentarios |
| Tendencia | 0-2.5 | 0-2.5 | Variacao eng 30d vs 30-60d |

### CONTEUDO (0-25) -- remove planning adherence, redistribui

| Sub-score | Antes | Depois | O que mede |
|---|---|---|---|
| Performance de formato | 0-6 | 0-8 | Se o formato mais usado e o que mais engaja |
| Aderencia a pilares | 0-6 | 0-6 | Diversidade tematica do conteudo |
| Consistencia | 0-5 | 0-7 | Quao "nao-spiky" e o engajamento |
| Eficacia de hashtags | 0-4 | 0-4 | Engajamento com vs sem hashtags |
| ~~Planning adherence~~ | ~~0-4~~ | removido | -- |

### COMPETITIVIDADE (0-25) -- remove SEO relativo, redistribui

| Sub-score | Antes | Depois | O que mede |
|---|---|---|---|
| Eng. relativo | 0-8 | 0-9 | Taxa eng brand vs media concorrentes |
| Crescimento relativo | 0-6 | 0-6 | Crescimento seguidores brand vs concorrentes (BUG FIX: antes usava volume) |
| Volume relativo | 0-4 | 0-4 | Posts brand vs concorrentes |
| Share of engagement | 0-4 | 0-6 | % do engagement total do mercado |
| ~~SEO relativo~~ | ~~0-3~~ | removido | -- |

## Bug Fix na Competitividade

Atualmente `growthRelScore` e `volumeRelScore` usam a mesma formula (ambos comparam `brandPosts90d.length / avgCompVolume`). O crescimento relativo passara a comparar **taxa de crescimento de seguidores** entre brand e concorrentes.

## Mudancas Tecnicas

Arquivo: `supabase/functions/calculate-fibbo-score/index.ts`

1. Remover fetch de `seo_data` e `seoByEntity` do Promise.all
2. Remover `calculateSeoPresenceScore()` e chamada
3. Remover `calculatePlanningAdherence()` e chamada
4. Ajustar pesos nas 4 dimensoes conforme tabelas acima
5. Corrigir bug do `growthRelScore` para usar crescimento de seguidores
6. Remover parametros `seoByEntity`/`brandSeo` de `calculateCompetitiveness()`
7. Deploy e recalculo automatico

