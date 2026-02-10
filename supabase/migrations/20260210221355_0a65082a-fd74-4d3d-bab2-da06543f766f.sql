-- Optimize dashboard queries: indexes + read-only view
-- SAFE: No triggers, no ALTER on generated columns

-- Index: fast lookup of posts by entity
CREATE INDEX IF NOT EXISTS idx_instagram_posts_entity_id
  ON instagram_posts (entity_id);

-- Index: posts by entity sorted by date (for timeline charts)
CREATE INDEX IF NOT EXISTS idx_instagram_posts_entity_posted_at
  ON instagram_posts (entity_id, posted_at DESC);

-- Index: posts by entity sorted by engagement (for top/worst posts)
CREATE INDEX IF NOT EXISTS idx_instagram_posts_entity_engagement
  ON instagram_posts (entity_id, engagement_total DESC);

-- Index: profiles by entity + date (for latest snapshot)
CREATE INDEX IF NOT EXISTS idx_instagram_profiles_entity_date
  ON instagram_profiles (entity_id, snapshot_date DESC);

-- Index: project_entities by project
CREATE INDEX IF NOT EXISTS idx_project_entities_project_id
  ON project_entities (project_id);

-- Index: project_entities by entity
CREATE INDEX IF NOT EXISTS idx_project_entities_entity_id
  ON project_entities (entity_id);

-- Index: entity_reports by project + date
CREATE INDEX IF NOT EXISTS idx_entity_reports_project_date
  ON entity_reports (project_id, created_at DESC);

-- Index: brand_context_sources by project + date
CREATE INDEX IF NOT EXISTS idx_brand_context_sources_project_date
  ON brand_context_sources (project_id, created_at DESC);

-- View: pre-aggregated entity metrics for quick dashboard loads
CREATE OR REPLACE VIEW v_entity_dashboard_metrics AS
SELECT
  p.entity_id,
  me.name              AS entity_name,
  me.instagram_handle  AS instagram_handle,
  me.type              AS entity_type,
  COUNT(*)             AS posts_count,
  COALESCE(SUM(p.likes_count), 0)      AS total_likes,
  COALESCE(SUM(p.comments_count), 0)   AS total_comments,
  COALESCE(SUM(p.views_count), 0)      AS total_views,
  COALESCE(SUM(p.engagement_total), 0) AS total_engagement,
  CASE
    WHEN COUNT(*) > 0
    THEN ROUND(SUM(p.engagement_total)::numeric / COUNT(*), 2)
    ELSE 0
  END AS avg_engagement,
  (
    SELECT ip.followers_count
    FROM instagram_profiles ip
    WHERE ip.entity_id = p.entity_id
    ORDER BY ip.snapshot_date DESC
    LIMIT 1
  ) AS followers,
  (
    SELECT ip.following_count
    FROM instagram_profiles ip
    WHERE ip.entity_id = p.entity_id
    ORDER BY ip.snapshot_date DESC
    LIMIT 1
  ) AS following
FROM instagram_posts p
JOIN monitored_entities me ON me.id = p.entity_id
GROUP BY p.entity_id, me.name, me.instagram_handle, me.type;