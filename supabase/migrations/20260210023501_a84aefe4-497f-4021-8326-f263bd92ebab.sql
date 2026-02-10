
-- RPC for dashboard aggregated stats (avoids 1000 row limit)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'projects_count', (
      SELECT count(*) FROM public.projects p
      WHERE EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = _user_id)
    ),
    'entities_count', (
      SELECT count(DISTINCT pe.entity_id) FROM public.project_entities pe
      JOIN public.project_members pm ON pm.project_id = pe.project_id AND pm.user_id = _user_id
    ),
    'analyses_count', (
      SELECT count(*) FROM public.analyses a
      JOIN public.project_members pm ON pm.project_id = a.project_id AND pm.user_id = _user_id
    ),
    'approved_analyses', (
      SELECT count(*) FROM public.analyses a
      JOIN public.project_members pm ON pm.project_id = a.project_id AND pm.user_id = _user_id
      WHERE a.status = 'approved'
    ),
    'posts_count', (
      SELECT count(*) FROM public.instagram_posts ip
      WHERE EXISTS (
        SELECT 1 FROM public.project_entities pe
        JOIN public.project_members pm ON pm.project_id = pe.project_id AND pm.user_id = _user_id
        WHERE pe.entity_id = ip.entity_id
      )
    ),
    'total_likes', (
      SELECT coalesce(sum(ip.likes_count), 0) FROM public.instagram_posts ip
      WHERE EXISTS (
        SELECT 1 FROM public.project_entities pe
        JOIN public.project_members pm ON pm.project_id = pe.project_id AND pm.user_id = _user_id
        WHERE pe.entity_id = ip.entity_id
      )
    ),
    'total_comments', (
      SELECT coalesce(sum(ip.comments_count), 0) FROM public.instagram_posts ip
      WHERE EXISTS (
        SELECT 1 FROM public.project_entities pe
        JOIN public.project_members pm ON pm.project_id = pe.project_id AND pm.user_id = _user_id
        WHERE pe.entity_id = ip.entity_id
      )
    ),
    'total_views', (
      SELECT coalesce(sum(ip.views_count), 0) FROM public.instagram_posts ip
      WHERE EXISTS (
        SELECT 1 FROM public.project_entities pe
        JOIN public.project_members pm ON pm.project_id = pe.project_id AND pm.user_id = _user_id
        WHERE pe.entity_id = ip.entity_id
      )
    ),
    'total_engagement', (
      SELECT coalesce(sum(ip.engagement_total), 0) FROM public.instagram_posts ip
      WHERE EXISTS (
        SELECT 1 FROM public.project_entities pe
        JOIN public.project_members pm ON pm.project_id = pe.project_id AND pm.user_id = _user_id
        WHERE pe.entity_id = ip.entity_id
      )
    ),
    'avg_engagement', (
      SELECT coalesce(round(avg(ip.engagement_total)), 0) FROM public.instagram_posts ip
      WHERE EXISTS (
        SELECT 1 FROM public.project_entities pe
        JOIN public.project_members pm ON pm.project_id = pe.project_id AND pm.user_id = _user_id
        WHERE pe.entity_id = ip.entity_id
      ) AND ip.engagement_total IS NOT NULL
    ),
    'profiles_count', (
      SELECT count(DISTINCT ip.entity_id) FROM public.instagram_profiles ip
      WHERE EXISTS (
        SELECT 1 FROM public.project_entities pe
        JOIN public.project_members pm ON pm.project_id = pe.project_id AND pm.user_id = _user_id
        WHERE pe.entity_id = ip.entity_id
      )
    ),
    'total_followers', (
      SELECT coalesce(sum(sub.followers_count), 0) FROM (
        SELECT DISTINCT ON (ip.entity_id) ip.followers_count
        FROM public.instagram_profiles ip
        WHERE EXISTS (
          SELECT 1 FROM public.project_entities pe
          JOIN public.project_members pm ON pm.project_id = pe.project_id AND pm.user_id = _user_id
          WHERE pe.entity_id = ip.entity_id
        )
        ORDER BY ip.entity_id, ip.snapshot_date DESC
      ) sub
    ),
    'ads_count', (
      SELECT count(*) FROM public.ads_library al
      WHERE EXISTS (
        SELECT 1 FROM public.project_entities pe
        JOIN public.project_members pm ON pm.project_id = pe.project_id AND pm.user_id = _user_id
        WHERE pe.entity_id = al.entity_id
      )
    ),
    'recent_posts', (
      SELECT coalesce(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb) FROM (
        SELECT ip.id, ip.caption, ip.likes_count, ip.comments_count, ip.views_count, 
               ip.engagement_total, ip.post_type, ip.posted_at, ip.shortcode,
               me.name as entity_name, me.instagram_handle
        FROM public.instagram_posts ip
        JOIN public.monitored_entities me ON me.id = ip.entity_id
        WHERE EXISTS (
          SELECT 1 FROM public.project_entities pe
          JOIN public.project_members pm ON pm.project_id = pe.project_id AND pm.user_id = _user_id
          WHERE pe.entity_id = ip.entity_id
        )
        ORDER BY ip.posted_at DESC NULLS LAST
        LIMIT 10
      ) sub
    )
  );
$$;
