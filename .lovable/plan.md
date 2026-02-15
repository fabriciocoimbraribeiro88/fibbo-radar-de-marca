

# Estrutura Completa de Integrações: Ads e SEO

## Visao Geral

Construir toda a infraestrutura (tabelas, edge functions, UI) para conectar **6 fontes de dados via API** que alimentam os canais de Ads e SEO. As conexoes reais serao feitas depois -- agora criamos a estrutura completa.

## Integrações a construir

| # | Integracao | Canal | Dados principais |
|---|-----------|-------|-----------------|
| 1 | Meta Business API | Ads | Campanhas, ad sets, metricas (CPM, CPC, ROAS, conversoes) |
| 2 | Google Ads API | Ads | Campanhas, keywords, spend, conversoes |
| 3 | Google Analytics (GA4) | SEO | Trafego organico, bounce rate, sessoes, paginas |
| 4 | Google Search Console | SEO | Keywords, posicoes, CTR, impressoes |
| 5 | SEMrush API | SEO | Domain authority, backlinks, keyword research |
| 6 | TikTok Ads API | Ads | Campanhas, metricas de video ads |

## 1. Novas Tabelas no Banco de Dados

### `platform_connections` (gerencia status de cada integracao)
```text
id, project_id, platform (meta_ads | google_ads | tiktok_ads | ga4 | search_console | semrush),
status (disconnected | connected | error), credentials_ref, account_id, account_name,
last_sync_at, sync_frequency, metadata, created_at, updated_at
```

### `ads_campaigns` (dados detalhados de campanhas -- complementa ads_library)
```text
id, project_id, platform_connection_id, platform, campaign_id, campaign_name,
objective, status, budget_daily, budget_total, spend, impressions, clicks, ctr,
cpc, cpm, conversions, roas, cost_per_conversion, reach, frequency,
period_start, period_end, metadata, fetched_at
```

### `ads_adsets` (conjuntos de anuncios)
```text
id, campaign_id (FK ads_campaigns), adset_id, name, targeting,
budget, spend, impressions, clicks, conversions, metadata, fetched_at
```

### `ga4_traffic` (dados do Google Analytics)
```text
id, project_id, platform_connection_id,
date, source, medium, channel_group, sessions, users,
new_users, bounce_rate, avg_session_duration, pages_per_session,
conversions, revenue, metadata, fetched_at
```

### `ga4_pages` (performance por pagina)
```text
id, project_id, platform_connection_id,
date, page_path, page_title, views, unique_views,
avg_time_on_page, bounce_rate, entrances, exits, metadata, fetched_at
```

### `search_console_data` (dados do GSC -- complementa seo_data existente)
```text
id, project_id, platform_connection_id,
date, query, page, clicks, impressions, ctr, position,
device, country, metadata, fetched_at
```

Todas com RLS por `project_id` usando `is_project_member`.

## 2. Edge Functions (uma por plataforma)

Cada edge function tera a mesma estrutura:

- `sync-meta-ads/index.ts` -- busca campanhas + metricas da Meta Business API
- `sync-google-ads/index.ts` -- busca campanhas + keywords do Google Ads
- `sync-ga4/index.ts` -- busca metricas de trafego e paginas do GA4
- `sync-search-console/index.ts` -- busca queries e performance do GSC
- `sync-semrush/index.ts` -- busca DA, backlinks, keywords do SEMrush
- `sync-tiktok-ads/index.ts` -- busca campanhas + metricas do TikTok

Todas terao:
- Validacao de secrets/credentials
- CORS headers padrao
- Escrita nas tabelas correspondentes
- Log de execucao via `data_fetch_logs`
- Corpo placeholder (pronto para receber credenciais reais depois)

## 3. UI: Secao "Integrações" na pagina de Fontes

Na pagina `ProjectSources.tsx`, adicionar uma nova secao **"Integrações de API"** entre os Servicos Contratados e as Fontes de Dados:

```text
+------------------------------------------------------+
| Integrações de API                                    |
|                                                       |
| [ADS]                          [SEO]                  |
| +------------------+   +------------------+           |
| | Meta Ads    [--] |   | GA4         [--] |           |
| | Google Ads  [--] |   | Search C.   [--] |           |
| | TikTok Ads  [--] |   | SEMrush     [--] |           |
| +------------------+   +------------------+           |
|                                                       |
| Cada card mostra: status, ultima sync, botao conectar |
+------------------------------------------------------+
```

Cada card de integracao tera:
- Icone da plataforma
- Status (Desconectado / Conectado / Erro)
- Ultimo sync
- Botao "Conectar" (que futuramente abrira o fluxo OAuth ou pedira API key)
- Botao "Sincronizar" (quando conectado)
- Visibilidade condicionada ao canal contratado (ads cards so aparecem se `ads` esta ativo)

### Novo componente: `src/components/sources/PlatformIntegrations.tsx`

## 4. Secao Tecnica

### Migracao SQL
Uma unica migracao criando:
- 6 tabelas novas (platform_connections, ads_campaigns, ads_adsets, ga4_traffic, ga4_pages, search_console_data)
- RLS policies para todas
- Indices em project_id e date

### Edge Functions
- 6 novas functions, todas com `verify_jwt = false` no config.toml
- Estrutura placeholder com tratamento de erros, pronta para credenciais

### Componentes
- `PlatformIntegrations.tsx` -- secao de cards de integracao
- Atualizacao de `ProjectSources.tsx` para incluir a nova secao
- Hook `usePlatformConnections.ts` para gerenciar estado das conexoes

### Ordem de implementacao
1. Migracao SQL (tabelas + RLS)
2. Hook `usePlatformConnections`
3. Componente `PlatformIntegrations`
4. Integracao na pagina Sources
5. Edge functions (6 functions placeholder)
6. Deploy das functions

