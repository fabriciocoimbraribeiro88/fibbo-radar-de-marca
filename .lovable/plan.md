

## Plano: Corrigir importacao JSON (0 posts importados)

### Problema encontrado

O erro nos logs de rede diz:

```
"cannot insert a non-DEFAULT value into column \"engagement_total\""
```

A coluna `engagement_total` na tabela `instagram_posts` e uma **coluna gerada automaticamente** pelo banco (`likes_count + comments_count`). A edge function `import-instagram-json` esta tentando inserir um valor nessa coluna, o que o banco rejeita, fazendo com que **todos os batches falhem** e 0 posts sejam importados.

### Correcao

Remover o campo `engagement_total` do objeto retornado pela funcao `mapApifyPost` no arquivo `supabase/functions/import-instagram-json/index.ts`.

### Alteracao especifica

**Arquivo:** `supabase/functions/import-instagram-json/index.ts`

Na funcao `mapApifyPost`, remover as linhas que calculam e retornam `engagement_total`:

- Remover o calculo (linhas 26-29):
```typescript
const engagementTotal = ...
```

- Remover `engagement_total: engagementTotal` do objeto de retorno (linha 50)

O banco vai calcular esse valor automaticamente a partir de `likes_count + comments_count`.

### Resultado esperado

Apos essa correcao, a importacao do JSON do Tallis (~5.600 posts) vai funcionar normalmente, inserindo todos os posts em batches de 500.

