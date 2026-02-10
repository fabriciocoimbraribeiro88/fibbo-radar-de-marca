
-- Fix permissive INSERT policies: tighten to require entity accessibility or project membership

-- Fix update_updated_at search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- monitored_entities: only project members can create
DROP POLICY "Auth users can create entities" ON public.monitored_entities;
CREATE POLICY "Authenticated can create entities" ON public.monitored_entities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- instagram_comments: require entity accessibility via post
DROP POLICY "Can insert comments" ON public.instagram_comments;
CREATE POLICY "Can insert comments" ON public.instagram_comments
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.instagram_posts ip
      WHERE ip.id = post_id AND public.is_entity_accessible(auth.uid(), ip.entity_id)
    )
  );

-- ads_library: require entity access
DROP POLICY "Can insert ads" ON public.ads_library;
CREATE POLICY "Can insert ads" ON public.ads_library
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), entity_id)
  );

-- seo_data: require entity access
DROP POLICY "Can insert seo data" ON public.seo_data;
CREATE POLICY "Can insert seo data" ON public.seo_data
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), entity_id)
  );

-- data_fetch_configs: require entity access
DROP POLICY "Can manage configs" ON public.data_fetch_configs;
CREATE POLICY "Can manage configs" ON public.data_fetch_configs
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), entity_id)
  );

-- data_fetch_logs: require config access
DROP POLICY "Can insert logs" ON public.data_fetch_logs;
CREATE POLICY "Can insert logs" ON public.data_fetch_logs
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.data_fetch_configs dfc
      WHERE dfc.id = config_id AND public.is_entity_accessible(auth.uid(), dfc.entity_id)
    )
  );

-- analysis_sections: require analysis membership
DROP POLICY "Can insert sections" ON public.analysis_sections;
CREATE POLICY "Can insert sections" ON public.analysis_sections
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.analyses a WHERE a.id = analysis_id AND public.is_project_member(auth.uid(), a.project_id))
  );

-- okr_key_results: require objective membership
DROP POLICY "Can manage key results" ON public.okr_key_results;
CREATE POLICY "Can manage key results" ON public.okr_key_results
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.okr_objectives o WHERE o.id = objective_id AND public.is_project_member(auth.uid(), o.project_id))
  );

-- okr_measurements: require key result membership
DROP POLICY "Can insert measurements" ON public.okr_measurements;
CREATE POLICY "Can insert measurements" ON public.okr_measurements
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.okr_key_results kr
      JOIN public.okr_objectives o ON kr.objective_id = o.id
      WHERE kr.id = key_result_id AND public.is_project_member(auth.uid(), o.project_id)
    )
  );

-- planning_items: require calendar membership
DROP POLICY "Can manage planning items" ON public.planning_items;
CREATE POLICY "Can manage planning items" ON public.planning_items
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.planning_calendars pc WHERE pc.id = calendar_id AND public.is_project_member(auth.uid(), pc.project_id))
  );

-- notifications: only system/own user
DROP POLICY "System can create notifications" ON public.notifications;
CREATE POLICY "Can create own notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
