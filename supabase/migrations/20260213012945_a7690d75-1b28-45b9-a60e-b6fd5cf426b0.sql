CREATE TABLE public.fibbo_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  entity_id UUID REFERENCES public.monitored_entities(id) ON DELETE CASCADE,
  score_date DATE NOT NULL,
  total_score DECIMAL NOT NULL DEFAULT 0,
  presenca_score DECIMAL NOT NULL DEFAULT 0,
  engajamento_score DECIMAL NOT NULL DEFAULT 0,
  conteudo_score DECIMAL NOT NULL DEFAULT 0,
  competitividade_score DECIMAL NOT NULL DEFAULT 0,
  metrics_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, entity_id, score_date)
);

ALTER TABLE public.fibbo_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view fibbo scores" ON public.fibbo_scores
  FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can insert fibbo scores" ON public.fibbo_scores
  FOR INSERT TO authenticated
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update fibbo scores" ON public.fibbo_scores
  FOR UPDATE TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE INDEX idx_fibbo_scores_project_date ON public.fibbo_scores(project_id, score_date DESC);
CREATE INDEX idx_fibbo_scores_entity_date ON public.fibbo_scores(entity_id, score_date DESC);