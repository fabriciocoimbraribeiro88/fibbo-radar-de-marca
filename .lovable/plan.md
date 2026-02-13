

# Reestruturacao do FibboScore: Scores por Canal + Score Geral

## Analise da Situacao Atual

### O que existe hoje
- **Tabela `fibbo_scores`**: sem coluna `channel` -- scores sao por entidade, sem distincao de canal
- **Tabela `monitored_entities`**: sem coluna `platform` -- entidades sao tipadas como brand/competitor/inspiration, mas nao por rede social
- **Dados reais**: apenas tabelas de Instagram (`instagram_posts`, `instagram_profiles`, `instagram_comments`) existem no banco
- **Edge function**: calcula um score unico por entidade usando apenas dados Instagram
- **UI**: `ProjectFibboScore.tsx` exibe score unico com graficos comparativos
- **Hook**: `useFibboScores.ts` busca da tabela `fibbo_scores`

### Limitacao importante
O sistema atualmente so tem dados de Instagram. TikTok, YouTube, LinkedIn, Twitter e Facebook nao possuem tabelas de dados. A arquitetura sera preparada para multi-canal, mas inicialmente **apenas o canal Instagram produzira scores reais**. Os demais canais serao ativados quando suas respectivas tabelas de dados forem criadas.

---

## Plano de Implementacao

### FASE 1: Migracao de banco de dados

Adicionar coluna `channel` na tabela `fibbo_scores` para suportar scores por canal:

```sql
-- Adicionar coluna channel (nullable para retrocompatibilidade)
ALTER TABLE fibbo_scores ADD COLUMN channel text DEFAULT 'instagram';

-- Atualizar registros existentes
UPDATE fibbo_scores SET channel = 'instagram' WHERE channel IS NULL;

-- Remover o unique constraint antigo e criar novo incluindo channel
-- (precisa verificar se existe constraint de upsert)
ALTER TABLE fibbo_scores DROP CONSTRAINT IF EXISTS fibbo_scores_project_id_entity_id_score_date_key;
ALTER TABLE fibbo_scores ADD CONSTRAINT fibbo_scores_project_entity_date_channel_key 
  UNIQUE (project_id, entity_id, score_date, channel);
```

### FASE 2: Criar arquivo de tipos e configuracao compartilhada

**Novo arquivo**: `src/lib/fibboScoreConfig.ts`

Contera:
- Type `SocialChannel` = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter' | 'facebook'
- Interface `ChannelThresholds` com os thresholds por dimensao (presenca, engajamento, conteudo, competitividade)
- `CHANNEL_DEFAULTS` com todos os benchmarks calibrados por rede social (conforme definidos no prompt)
- Interface `FibboScoreConfig` com channels + weights
- `FIBBO_CONFIG_DEFAULTS` usando os defaults
- Funcao helper `classifyScore(score)` retornando "Excelente"/"Forte"/"Mediano"/"Em desenvolvimento"/"Critico"
- Funcao `getChannelLabel(channel)` e `getChannelIcon(channel)` para UI

### FASE 3: Atualizar Edge Function `calculate-fibbo-score`

**Arquivo**: `supabase/functions/calculate-fibbo-score/index.ts`

Mudancas:
1. Importar/replicar os `CHANNEL_DEFAULTS` e tipos (edge functions nao podem importar de `src/`)
2. Ler `fibbo_config` do campo `briefing` do projeto, fazer deep merge com defaults
3. Para cada entidade, detectar canal (por ora, sempre `instagram` ja que so existe dados IG)
4. Aplicar thresholds do canal especifico nos calculos de cada dimensao
5. Substituir magic numbers por valores do `ChannelThresholds`:
   - Presenca: `followerGrowthMaxPct`, `postsPerWeekMax`, `reachRateMaxPct` 
   - Engajamento: `engagementRateMaxPct`, `commentRateMaxPct`, `saveRateMaxPct`
   - Conteudo: `consistencyRatioThresholds`, `hashtagLiftThresholdPct`
   - Competitividade: `engRatioMin`, `engRatioMax`
6. Incluir `channel` no upsert de cada score
7. Apos calcular todos os scores por canal, gerar um registro `channel = 'general'` com a media ponderada
8. Gravar `metrics_snapshot` com breakdown detalhado de cada sub-score

### FASE 4: Atualizar hook `useFibboScores.ts`

**Arquivo**: `src/hooks/useFibboScores.ts`

Mudancas:
1. Adicionar `channel` ao tipo `FibboScore` e `FibboScoreWithEntity`
2. `useLatestFibboScores` agora agrupa por `entity_id + channel` em vez de so `entity_id`
3. Novo helper `useLatestChannelScores(projectId)` que retorna scores agrupados por canal
4. Expor `generalScore` (o registro com `channel = 'general'`) separado dos canal-especificos

### FASE 5: Criar componente de config admin

**Novo arquivo**: `src/components/fibbo-score/FibboScoreAdmin.tsx`

Componente dialog com:
- Abas por canal ativo
- Slider de sensibilidade (5 niveis: Rigoroso 0.6x a Muito Generoso 1.6x) que multiplica os thresholds
- Secao de pesos dos canais (sliders 0-200%)
- Preview em tempo real do score
- Botoes "Salvar", "Restaurar Padrao"
- Presets globais (Rigoroso/Equilibrado/Generoso) que aplicam a todos os canais
- Caps de seguranca (engagement max 15%, reach max 30%, posts/semana max 14)
- Persistencia via `projects.briefing.fibbo_config` com merge strategy

### FASE 6: Reescrever UI `ProjectFibboScore.tsx`

**Arquivo**: `src/pages/ProjectFibboScore.tsx`

Nova estrutura visual:
1. **Score Geral** destacado no topo (numero grande + classificacao "Forte"/"Mediano"/etc)
2. **Abas por canal** usando `Tabs` do shadcn -- cada aba mostra:
   - Score total do canal (0-100)
   - 4 barras de dimensao (Presenca, Engajamento, Conteudo, Competitividade)
   - Breakdown detalhado de cada sub-score
   - Metricas snapshot do canal
3. **Botao de configuracao** (engrenagem) visivel apenas para owner/admin -- abre `FibboScoreAdmin`
4. Radar comparativo agora por canal selecionado (brand vs concorrentes no canal)
5. Evolucao temporal por canal
6. Canais sem dados nao aparecem nas abas

### FASE 7: Verificacao de permissao owner

Para exibir o botao de config apenas para owner:
- Buscar `project.created_by` e comparar com `auth.uid()`
- Ou verificar role do usuario via `user_roles`

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---|---|---|
| Migracao SQL | Criar | Adicionar coluna `channel` em `fibbo_scores` |
| `src/lib/fibboScoreConfig.ts` | Criar | Tipos, thresholds por canal, defaults, helpers |
| `supabase/functions/calculate-fibbo-score/index.ts` | Reescrever | Calculos parametrizados por canal, deep merge config, upsert com channel |
| `src/hooks/useFibboScores.ts` | Modificar | Adicionar channel ao tipo, novo hook por canal |
| `src/components/fibbo-score/FibboScoreAdmin.tsx` | Criar | Painel admin com sliders por canal e pesos |
| `src/pages/ProjectFibboScore.tsx` | Reescrever | Score geral + abas por canal + botao config |

## Riscos e Mitigacoes

- **Dados so de Instagram**: A arquitetura suporta multi-canal mas so Instagram tera scores inicialmente. A UI mostrara apenas canais com dados.
- **Retrocompatibilidade**: Registros existentes em `fibbo_scores` serao marcados como `channel = 'instagram'` pela migracao.
- **Duplicacao de logica edge function vs frontend**: Os thresholds defaults serao duplicados na edge function (necessario pois ela nao importa de `src/`). Manter sincronizados manualmente.
- **Race condition no briefing**: O save da config lera o briefing atual antes de gravar, fazendo merge.

