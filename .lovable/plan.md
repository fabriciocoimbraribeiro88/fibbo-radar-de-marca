
# Reestruturacao do FibboScore — CONCLUÍDO

## O que foi implementado

### Migração de banco
- Coluna `channel` adicionada à `fibbo_scores` com default 'instagram'
- Registros existentes atualizados
- Constraint único atualizado para incluir channel

### src/lib/fibboScoreConfig.ts (NOVO)
- Tipos: `SocialChannel`, `ChannelThresholds`, `FibboScoreConfig`
- `CHANNEL_DEFAULTS` com benchmarks calibrados para 6 redes sociais
- Helpers: `classifyScore`, `getChannelLabel`, `getChannelIcon`, `applySensitivity`, `deepMergeConfig`

### src/hooks/useFibboScores.ts (ATUALIZADO)
- Campo `channel` adicionado aos tipos
- `useLatestFibboScores` agrupa por entity_id + channel
- Novo hook `useLatestChannelScores` retorna scores por canal + general + activeChannels

### supabase/functions/calculate-fibbo-score/index.ts (REESCRITO)
- Thresholds parametrizados por canal (atualmente só instagram tem dados)
- Lê `fibbo_config` do briefing do projeto com deep merge
- Gera score 'general' (média ponderada) para entidades brand
- Upsert com constraint incluindo channel
- Breakdown detalhado no metrics_snapshot

### src/components/fibbo-score/FibboScoreAdmin.tsx (NOVO)
- Dialog com sliders de sensibilidade por canal (5 níveis)
- Pesos dos canais (0-200%)
- Presets globais (Rigoroso/Equilibrado/Generoso)
- Persistência via briefing.fibbo_config com merge strategy

### src/pages/ProjectFibboScore.tsx (REESCRITO)
- Score Geral destacado no topo com classificação
- Abas por canal ativo com score inline
- Gráficos (bar, radar, timeline) filtrados por canal
- Botão de configuração visível apenas para owner
- Cards detalhados por entidade dentro de cada canal
