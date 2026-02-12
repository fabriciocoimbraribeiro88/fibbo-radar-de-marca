

# Resumo de Dados por Fonte

Adicionar um painel de resumo expandido em cada card de entidade na pagina de Fontes de Dados, mostrando o que ha de dados coletados.

## O que sera exibido

Para cada entidade, ao expandir o card, alem dos detalhes existentes (bibliotecas de anuncios e ultimas coletas), aparecera uma secao "Resumo dos Dados" com:

- **Periodo dos dados**: data do post mais antigo ao mais recente
- **Total de posts**: quantidade
- **Tipos de post**: quais formatos existem (Image, Video, Sidecar, Reel)
- **Engajamento total**: curtidas + comentarios
- **Views**: total de visualizacoes (ou "Indisponivel" se zero)
- **Comentarios reais**: quantidade de comentarios na tabela instagram_comments (diferente de comments_count do post)
- **Hashtags**: quantos posts possuem hashtags extraidas
- **Sentimento**: se ha comentarios com analise de sentimento ou nao

## Detalhes tecnicos

1. **Novo hook `useEntityDataSummary`** (`src/hooks/useEntityDataSummary.ts`):
   - Recebe uma lista de entity_ids
   - Faz 3 queries paralelas ao Supabase:
     - `instagram_posts`: count, min/max posted_at, sum likes/comments/views, post_types distintos, count de posts com hashtags
     - `instagram_comments`: count total e count com sentiment preenchido
     - `instagram_profiles`: ultimo snapshot com followers
   - Retorna um Map de entity_id para resumo

2. **Componente `EntityDataSummary`** (`src/components/sources/EntityDataSummary.tsx`):
   - Recebe os dados do resumo de uma entidade
   - Exibe em grid compacto com icones e badges
   - Indicadores visuais: badge verde "Disponivel" / amarelo "Indisponivel" para comentarios e sentimento
   - Formatacao de datas em pt-BR

3. **Integracao no `ProjectSources.tsx`**:
   - Chamar o hook com os entity_ids do projeto
   - Renderizar o componente `EntityDataSummary` dentro da area expandida de cada card (antes dos logs existentes)
   - Tambem exibir na secao de marca quando expandida

O resumo aparece apenas quando o card esta expandido, sem impacto no layout colapsado.
