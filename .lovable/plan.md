
# Dashboard do Projeto -- Redesign Apple-like com Secoes e Filtros

## Resumo

Reescrever completamente `ProjectDashboard.tsx` com um design minimalista inspirado na Apple, organizando os dados em 4 secoes (Marca, Influencers, Concorrentes, Inspiracoes) e adicionando um sistema de filtros que permite selecionar entidades individuais, multiplas ou por classificacao.

## O que muda para o usuario

1. **Barra de filtros no topo** com pills selecionaveis:
   - "Todos" (padrao)
   - "Marca" / "Concorrentes" / "Influencers" / "Inspiracoes" (filtro por categoria)
   - Cada entidade individual tambem aparece como pill clicavel
   - Selecao multipla: clicar em varias entidades ou categorias combina os filtros

2. **Cards de metricas redesenhados** -- estilo limpo com numeros grandes, sem bordas pesadas, fundo sutil, tipografia mono para numeros

3. **Secoes visuais separadas** por tipo de entidade, cada uma com:
   - Header com icone e nome da categoria
   - Grid de cards de entidades com metricas resumidas
   - Graficos comparativos dentro da secao (quando ha mais de 1 entidade)

4. **Graficos comparativos globais** que respeitam o filtro ativo:
   - Comparativo de engajamento (bar chart)
   - Evolucao de seguidores (line chart)
   - Os graficos atualizam dinamicamente conforme a selecao

## Detalhes Tecnicos

### Arquivo: `src/pages/ProjectDashboard.tsx` (reescrita completa)

**Estado de filtro:**
```text
selectedCategories: Set<string>  -- 'brand' | 'competitor' | 'influencer' | 'inspiration'
selectedEntities: Set<string>    -- entity_id's individuais
filterMode: 'all' | 'category' | 'individual'
```

**Logica de filtragem:**
- "Todos" selecionado: mostra todas as entidades
- Categoria selecionada: mostra apenas entidades daquela categoria
- Entidades individuais: mostra apenas as selecionadas
- Combinacao: uniao dos filtros ativos

**Query de dados:**
- Reutiliza o hook `useProjectDashboard` existente (busca tudo de uma vez)
- Filtragem acontece no frontend via `useMemo` sobre os dados ja carregados
- A marca (instagram_handle do projeto) e identificada e exibida na secao "Marca"

**Identificacao da Marca:**
- Busca o `project.instagram_handle` e cruza com as entidades do projeto
- A entidade correspondente e destacada na secao "Marca" com icone Crown

**Componentes internos:**
- `FilterBar` -- barra horizontal de pills com scroll horizontal no mobile
- `EntityCard` -- card individual com metricas (redesign Apple-like: numeros grandes, label pequeno embaixo, cores sutis)
- `SectionHeader` -- titulo da secao com icone e contagem
- `MetricNumber` -- numero grande em font-mono com label

**Design dos cards (Apple-like):**
- Fundo `bg-card` sem borda visivel (ou borda muito sutil `border-border/50`)
- Border-radius grande (`rounded-2xl`)
- Padding generoso
- Numeros em `text-2xl font-bold font-mono`
- Labels em `text-xs text-muted-foreground uppercase tracking-wider`
- Hover com sombra suave e translate -1px
- Separacao visual com linhas finas entre metricas

**Cores por categoria:**
- Marca: coral/primary
- Concorrentes: azul (#6366f1)
- Influencers: rosa (#ec4899)
- Inspiracoes: verde (#10b981)

### Arquivos a editar

| Arquivo | Acao |
|---|---|
| `src/pages/ProjectDashboard.tsx` | Reescrita completa com filtros e secoes |

Nenhuma alteracao de banco de dados necessaria -- todos os dados ja existem nas tabelas `project_entities`, `monitored_entities`, `instagram_posts` e `instagram_profiles`.
