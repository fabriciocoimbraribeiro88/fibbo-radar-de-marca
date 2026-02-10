-- Indexes for dashboard query performance

CREATE INDEX IF NOT EXISTS idx_instagram_posts_entity_id
  ON instagram_posts (entity_id);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_entity_posted
  ON instagram_posts (entity_id, posted_at DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_entity_engagement
  ON instagram_posts (entity_id, engagement_total DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_profiles_entity_date
  ON instagram_profiles (entity_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_project_entities_project_id
  ON project_entities (project_id);

CREATE INDEX IF NOT EXISTS idx_project_entities_entity_id
  ON project_entities (entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_reports_project_id
  ON entity_reports (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brand_context_sources_project
  ON brand_context_sources (project_id, created_at DESC);