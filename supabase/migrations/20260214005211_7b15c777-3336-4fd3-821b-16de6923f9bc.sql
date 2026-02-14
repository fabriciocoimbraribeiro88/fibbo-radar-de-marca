
CREATE TABLE public.creative_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  planning_item_id UUID NOT NULL REFERENCES public.planning_items(id),
  option_a_url TEXT,
  option_b_url TEXT,
  selected_option TEXT,
  prompt_used TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.creative_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view creatives"
  ON public.creative_outputs FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can insert creatives"
  ON public.creative_outputs FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update creatives"
  ON public.creative_outputs FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can delete creatives"
  ON public.creative_outputs FOR DELETE
  USING (is_project_member(auth.uid(), project_id));

CREATE TRIGGER update_creative_outputs_updated_at
  BEFORE UPDATE ON public.creative_outputs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
