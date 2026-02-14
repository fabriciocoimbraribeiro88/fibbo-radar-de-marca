
-- Create checkins table
CREATE TABLE public.checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'weekly',
  title text NOT NULL,
  reference_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending',
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  nps_score integer,
  nps_feedback text,
  participants text[] DEFAULT '{}',
  created_by uuid,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- RLS policies using is_project_member
CREATE POLICY "Members can view checkins"
  ON public.checkins FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can create checkins"
  ON public.checkins FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update checkins"
  ON public.checkins FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can delete checkins"
  ON public.checkins FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), project_id));

-- Trigger for updated_at
CREATE TRIGGER update_checkins_updated_at
  BEFORE UPDATE ON public.checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
