
# Plano: Limpeza de Arquitetura + Correcoes

## Problemas Identificados

### 1. Secoes Duplicadas na Sidebar Principal
A sidebar principal (`AppLayout.tsx`) tem links para "Analises" (`/analyses`) e "Relatorios" (`/reports`) que sao paginas placeholder vazias. Essas funcionalidades ja existem DENTRO de cada projeto (`/projects/:id/analyses` e futuramente `/projects/:id/reports`). Nao faz sentido existirem globalmente.

**Solucao:** Remover "Analises" e "Relatorios" da sidebar principal. Manter apenas: Dashboard, Projetos e Configuracoes. Deletar os arquivos `src/pages/Analyses.tsx` e `src/pages/Reports.tsx` e remover as rotas de `/analyses` e `/reports` do `App.tsx`.

### 2. Marca Ausente nas Fontes de Dados
A pagina de Fontes de Dados (`ProjectDataSources.tsx`) lista apenas entidades da tabela `monitored_entities` (concorrentes, influencers, inspiracoes). A propria marca do projeto (que tem `instagram_handle` na tabela `projects`) nao aparece como fonte de dados.

**Solucao:** Adicionar a marca do projeto como primeira linha na lista de fontes de dados. Sera mostrada com destaque (badge "Marca") e tera o mesmo botao "Executar" para coletar dados do Instagram. A coleta usara o mesmo edge function `fetch-instagram`, mas precisara criar uma `monitored_entity` para a marca (ou usar diretamente o handle do projeto).

A abordagem mais limpa: ao coletar dados da marca, o sistema criara automaticamente uma entidade `monitored_entity` do tipo "brand" (ou reutilizara se ja existir) e associara ao projeto. Isso mantem a mesma estrutura de dados.

### 3. Barra de Progresso na Coleta
Atualmente, ao clicar "Executar" na coleta, aparece apenas um spinner (`Loader2`). O usuario nao tem nocao de progresso.

**Solucao:** Adicionar uma barra de progresso animada com etapas visuais durante a coleta:
- Fase 1: "Conectando ao Apify..." (0-20%)
- Fase 2: "Baixando perfil..." (20-50%)
- Fase 3: "Baixando posts..." (50-80%)
- Fase 4: "Salvando dados..." (80-100%)

Como o edge function e sincrono (espera o Apify terminar), a barra sera uma **animacao simulada** com etapas automaticas a cada poucos segundos, dando sensacao de movimento. Quando o fetch retorna, a barra pula para 100%.

### 4. Analise Aprovada Nao Aparece na Lista
Ao aprovar uma analise na `AnalysisView.tsx`, o `handleApprove` atualiza o status no banco mas:
- Nao invalida o cache do React Query (a lista de analises nao atualiza)
- Nao redireciona o usuario de volta para a lista

**Solucao:** Apos aprovar, invalidar as queries `["analysis", analysisId]` e `["project-analyses", projectId]`, e redirecionar para `/projects/:id/analyses` com um toast de confirmacao.

## Arquivos Modificados

```text
src/components/AppLayout.tsx      -- Remover links "Analises" e "Relatorios" da sidebar
src/App.tsx                       -- Remover rotas /analyses e /reports
src/pages/ProjectDataSources.tsx  -- Adicionar marca como fonte + barra de progresso
src/pages/AnalysisView.tsx        -- Fix aprovacao (invalidar cache + redirecionar)
```

## Arquivos Deletados

```text
src/pages/Analyses.tsx            -- Pagina placeholder vazia (duplicada)
src/pages/Reports.tsx             -- Pagina placeholder vazia (duplicada)
```

## Detalhes Tecnicos

### Sidebar Principal (AppLayout.tsx)
Navegacao simplificada:
- Dashboard (/)
- Projetos (/projects)
- Configuracoes (/settings)

### Marca nas Fontes de Dados (ProjectDataSources.tsx)
A marca do projeto sera exibida como primeiro item na lista, usando os dados de `projects.instagram_handle`. Ao clicar "Executar":
1. Verificar se ja existe uma `monitored_entity` para esse handle
2. Se nao existir, criar uma com `type: 'competitor'` (reutilizavel) e associar ao projeto
3. Chamar `fetch-instagram` com o `entity_id`

### Barra de Progresso na Coleta
Componente de progresso inline no card durante a execucao:
- Progress bar com animacao suave
- Texto descritivo da etapa atual
- Timer simulado que avanca a cada 3-5 segundos
- Ao completar (resposta do edge function), pula para 100% e mostra resultado

### Fix Aprovacao (AnalysisView.tsx)
```text
handleApprove:
  1. await supabase.update(status: "approved")
  2. queryClient.invalidateQueries(["analysis", analysisId])
  3. queryClient.invalidateQueries(["project-analyses", projectId])
  4. toast("Analise aprovada!")
  5. navigate(`/projects/${projectId}/analyses`)
```
