
-- Create entity_reports table
CREATE TABLE public.entity_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.monitored_entities(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  computed_metrics JSONB,
  ai_analysis TEXT,
  model_used TEXT,
  posts_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.entity_reports ENABLE ROW LEVEL SECURITY;

-- Users can view reports for projects they are members of
CREATE POLICY "Members can view entity reports"
ON public.entity_reports
FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));

-- Users can create reports for projects they are members of
CREATE POLICY "Members can create entity reports"
ON public.entity_reports
FOR INSERT
WITH CHECK (public.is_project_member(auth.uid(), project_id));

-- Users can delete reports for projects they are members of
CREATE POLICY "Members can delete entity reports"
ON public.entity_reports
FOR DELETE
USING (public.is_project_member(auth.uid(), project_id));

-- Index for fast lookups
CREATE INDEX idx_entity_reports_project ON public.entity_reports(project_id);
CREATE INDEX idx_entity_reports_entity ON public.entity_reports(entity_id);
