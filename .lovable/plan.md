

## Plano Atualizado: Fontes de Dados + Dashboard

### Resumo
Alterar a tela de **Fontes de Dados** (dialog de coleta), nao o dashboard. Substituir "Por periodo" por "Todos os Posts", remover "Bibliotecas de Anuncios" do dialog de coleta, adicionar botao de editar entidade, e remover imagens dos top posts no dashboard. Tambem remover limite da query do dashboard.

---

### 1. Dialog de Coleta (`src/pages/ProjectSources.tsx`)

**Substituir opcoes de coleta:**
- Remover opcao "Por periodo" (radio + campos de data)
- Remover secao "Fontes adicionais" com Bibliotecas de Anuncios (switch + URLs)
- Manter "Por quantidade" e adicionar nova opcao "Todos os Posts"
- As opcoes ficam: **"Todos os Posts"** e **"Ultimos X posts"** (input numerico, sem limite maximo de 200)

**Novo layout do dialog:**
```text
Opcoes de Coleta @handle
---------------------------------
POSTS DO INSTAGRAM

(o) Todos os Posts
    Coletar todos os posts disponiveis

(o) Por quantidade
    N posts mais recentes    [___]
---------------------------------
[Cancelar]          [Iniciar Coleta]
```

**Alteracoes no state/tipos:**
- `CollectOptions.mode`: mudar de `"count" | "date"` para `"all" | "count"`
- Remover campos `dateFrom`, `dateTo`, `collectAds`, `adPlatformUrls` do `CollectOptions`
- Remover `defaultCollectOptions.collectAds` e `adPlatformUrls`

**Alteracao na chamada da edge function:**
- Quando mode === "all": enviar `results_limit: 0` (ou nao enviar limite) para a edge function

**Adicionar botao "Editar":**
- Adicionar um botao de editar (icone lapis) ao lado do botao de lixeira em cada card de entidade
- Ao clicar, abrir um dialog de edicao com os campos: Nome, Instagram Handle, Website
- Salvar alteracoes via mutation que faz update na tabela `monitored_entities`

---

### 2. Edge Function `fetch-instagram` (`supabase/functions/fetch-instagram/index.ts`)

- Quando `results_limit` for 0 ou nao enviado: usar um valor alto (ex: 50000) para buscar todos os posts
- Remover logica de `collect_ads` e `collect_seo` (placeholders)

---

### 3. Dashboard - Remover limite da query (`src/hooks/useProjectDashboardData.ts`)

- Remover `.limit(3000)` da query de posts para trazer todos os dados disponiveis
- Remover `useFilteredPosts` e tipo `DateRange` (nao mais usados)

---

### 4. Dashboard - Remover filtro de periodo (`src/components/dashboard/DashboardFilters.tsx`)

- Remover Row 1 inteira (botoes de periodo + popover de datas customizadas)
- Remover tipos: `PeriodPreset`, `PeriodRange`, `getPresetRange`, `PRESETS`
- Remover props `period`/`onPeriodChange`
- Adicionar Row 1 com pills de quantidade: "Todos" | "Ultimos 50" | "Ultimos 100" | "Ultimos 200" | "Ultimos 500"
- Novo tipo exportado: `PostLimit = number | "all"`
- Novas props: `postLimit`/`onPostLimitChange`

---

### 5. Dashboard - Integrar novo filtro (`src/pages/ProjectDashboard.tsx`)

- Remover state `period` e chamada `useFilteredPosts`
- Adicionar state `postLimit` com default `"all"`
- Criar funcao `useLimitedPosts` que ordena por `posted_at` desc e pega os N mais recentes (ou todos)
- Atualizar props do `DashboardFilters`

---

### 6. Top Posts - Remover imagens (`src/components/dashboard/TopPostsTable.tsx`)

- Remover coluna "Imagem" do header
- Remover celula com thumbnail/placeholder do body
- Remover import de `Image as ImageIcon`

---

### Arquivos alterados

| Arquivo | O que muda |
|---|---|
| `src/pages/ProjectSources.tsx` | Dialog de coleta: remover periodo e ads, adicionar "Todos os Posts", adicionar botao editar entidade |
| `supabase/functions/fetch-instagram/index.ts` | Suportar results_limit=0 como "todos", remover placeholders de ads/seo |
| `src/hooks/useProjectDashboardData.ts` | Remover `.limit(3000)`, remover `useFilteredPosts`/`DateRange`, adicionar `useLimitedPosts` |
| `src/components/dashboard/DashboardFilters.tsx` | Remover periodo, adicionar pills de quantidade |
| `src/pages/ProjectDashboard.tsx` | Usar `postLimit` em vez de `period` |
| `src/components/dashboard/TopPostsTable.tsx` | Remover coluna de imagem |

