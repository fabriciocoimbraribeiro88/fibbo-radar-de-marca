

## Plano: Edge Function para Importar JSON + Botao de Upload na UI

### Resumo
Criar uma edge function `import-instagram-json` que recebe posts do Apify em formato JSON e faz upsert no banco. Adicionar um botao "Importar JSON" na tela de Fontes de Dados, ao lado do botao de coleta de cada entidade.

---

### 1. Edge Function `supabase/functions/import-instagram-json/index.ts`

**Recebe via POST:**
- `entity_id` (string) - ID da entidade alvo
- `posts` (array) - Array de posts no formato Apify

**Mapeamento dos campos Apify para o banco:**

| Campo Apify | Campo DB |
|---|---|
| `id` ou URL extraido | `post_id_instagram` |
| `shortCode` (extraido da URL se ausente) | `shortcode` |
| `url` | `post_url` |
| `type` | `post_type` |
| `caption` | `caption` |
| `timestamp` | `posted_at` |
| `likesCount` (tratar -1 como null) | `likes_count` |
| `commentsCount` | `comments_count` |
| `videoViewCount` / `videoPlayCount` | `views_count` |
| `hashtags` | `hashtags` |
| `mentions` | `mentions` |
| `displayUrl` | `thumbnail_url` |
| `images` / `displayUrls` | `media_urls` |
| `isPinned` | `is_pinned` |

**Logica:**
- Processar em batches de 500 posts para nao estourar limites
- Usar upsert com `onConflict: "post_id_instagram"` para nao duplicar
- `likesCount: -1` vira `null`
- Extrair `shortCode` da URL quando o campo nao existir (ex: `/p/DUlAhm1gNjt/` -> `DUlAhm1gNjt`)
- Retornar total de posts importados

**CORS e config.toml:**
- Headers CORS padrao
- `verify_jwt = false` no config.toml

---

### 2. UI - Botao "Importar JSON" (`src/pages/ProjectSources.tsx`)

**Onde aparece:**
- No dialog de coleta (ao lado do botao "Iniciar Coleta"), adicionar um botao "Importar JSON"
- OU como um botao separado no card de cada entidade (ao lado do play de coleta)

**Melhor opcao:** Adicionar ao dialog de coleta como uma aba/opcao alternativa. O dialog fica:

```text
Opcoes de Coleta @handle
---------------------------------
POSTS DO INSTAGRAM

(o) Todos os Posts - via API
(o) Por quantidade - via API
(o) Importar arquivo JSON

    [Selecionar arquivo .json]
    arquivo_selecionado.json (5.649 posts)
---------------------------------
[Cancelar]          [Iniciar]
```

**Fluxo do upload:**
1. Usuario seleciona modo "Importar arquivo JSON"
2. Clica em input file para selecionar o `.json`
3. Frontend le o arquivo com `FileReader`, parseia o JSON
4. Mostra preview: "X posts encontrados no arquivo"
5. Ao clicar "Iniciar", envia o array para a edge function `import-instagram-json`
6. Como o arquivo pode ser grande (~5MB), envia em chunks de 500 posts por request
7. Mostra progresso da importacao
8. Ao final, invalida queries e mostra toast de sucesso

**Alteracoes no state:**
- `CollectOptions.mode`: mudar de `"all" | "count"` para `"all" | "count" | "json"`
- Adicionar state para o arquivo JSON selecionado e contagem de posts

---

### 3. Detalhes Tecnicos

**Edge function - tratamento do JSON grande:**
- O body do request pode ter ate ~100MB no edge functions
- Mas para seguranca, o frontend divide em batches de 500 posts por request
- Cada request faz upsert de 500 posts
- Frontend mostra progresso (batch 1/12, batch 2/12, etc.)

**Extracoes do shortCode da URL:**
```typescript
function extractShortCode(url: string): string | null {
  const match = url?.match(/\/(p|reel|tv)\/([^/?]+)/);
  return match ? match[2] : null;
}
```

**post_id_instagram - garantir unicidade:**
- Usar `post.id` se existir
- Senao, usar shortCode extraido da URL
- Senao, usar `${ownerUsername}_${timestamp}` como fallback

---

### Arquivos criados/alterados

| Arquivo | Acao |
|---|---|
| `supabase/functions/import-instagram-json/index.ts` | **Criar** - edge function de importacao |
| `supabase/config.toml` | **Alterar** - adicionar config da nova function |
| `src/pages/ProjectSources.tsx` | **Alterar** - adicionar opcao "Importar JSON" no dialog de coleta |

