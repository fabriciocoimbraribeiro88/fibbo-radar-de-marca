
# Corrigir Posts com Tipo "Unknown"

## Problema
92% dos posts (7.791 de 8.495) tem `post_type` como NULL no banco, aparecendo como "Unknown" nos graficos. Isso acontece porque os dados importados do Apify nem sempre incluem o campo `type`.

## Solucao (3 frentes)

### 1. Corrigir dados existentes via SQL Migration
Atualizar os 7.791 posts com base nos dados disponiveis:

- Se a URL contem `/reel/` -> tipo "Reel"
- Se a URL contem `/tv/` -> tipo "Video" (IGTV)
- Se tem `views_count > 0` -> tipo "Video"
- Se tem `media_urls` com mais de 1 item -> tipo "Sidecar"
- Todos os outros (`/p/` sem views) -> tipo "Image" (default mais provavel)

```sql
UPDATE instagram_posts SET post_type = 'Reel' WHERE post_type IS NULL AND post_url LIKE '%/reel/%';
UPDATE instagram_posts SET post_type = 'Video' WHERE post_type IS NULL AND post_url LIKE '%/tv/%';
UPDATE instagram_posts SET post_type = 'Video' WHERE post_type IS NULL AND views_count > 0;
UPDATE instagram_posts SET post_type = 'Sidecar' WHERE post_type IS NULL AND media_urls IS NOT NULL AND array_length(media_urls, 1) > 1;
UPDATE instagram_posts SET post_type = 'Image' WHERE post_type IS NULL;
```

### 2. Corrigir importacao futura (Edge Function)
No arquivo `supabase/functions/import-instagram-json/index.ts`, adicionar logica de inferencia quando `post.type` nao existe:

```
Se post.type existe -> usa post.type
Senao se URL contem /reel/ -> "Reel"
Senao se URL contem /tv/ -> "Video"
Senao se tem videoViewCount/videoPlayCount -> "Video"
Senao se tem images com mais de 1 item -> "Sidecar"
Senao -> "Image"
```

### 3. Frontend fallback (opcional)
Nos componentes `ContentMixChart` e `LikesTimelineChart`, trocar o fallback de `"Unknown"` para `"Image"` como medida de seguranca.

## Arquivos a alterar
1. **SQL Migration** - Corrigir os 7.791 posts existentes
2. **`supabase/functions/import-instagram-json/index.ts`** - Inferir tipo na importacao
3. **`src/components/dashboard/ContentMixChart.tsx`** - Fallback para "Image" (opcional)
4. **`src/components/dashboard/LikesTimelineChart.tsx`** - Fallback para "Image" (opcional)
