
-- Adicionar coluna channel na tabela fibbo_scores
ALTER TABLE fibbo_scores ADD COLUMN channel text DEFAULT 'instagram';

-- Atualizar registros existentes
UPDATE fibbo_scores SET channel = 'instagram' WHERE channel IS NULL;

-- Remover constraint antigo e criar novo incluindo channel
ALTER TABLE fibbo_scores DROP CONSTRAINT IF EXISTS fibbo_scores_project_id_entity_id_score_date_key;
ALTER TABLE fibbo_scores ADD CONSTRAINT fibbo_scores_project_entity_date_channel_key 
  UNIQUE (project_id, entity_id, score_date, channel);
