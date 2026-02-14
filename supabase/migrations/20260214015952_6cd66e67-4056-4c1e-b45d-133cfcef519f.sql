
-- 1. Add contracted_services to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contracted_services JSONB DEFAULT '{}';

-- 2. Report schedules
CREATE TABLE public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  day_of_week INTEGER,
  day_of_month INTEGER,
  cron_expression TEXT,
  config JSONB DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(project_id, report_type)
);

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage schedules"
  ON public.report_schedules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), project_id));

CREATE INDEX idx_report_schedules_next_run
  ON public.report_schedules (next_run_at)
  WHERE is_active = true;

-- 3. Automated reports
CREATE TABLE public.automated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.report_schedules(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  quarter TEXT,
  year INTEGER,
  title TEXT NOT NULL,
  summary TEXT,
  status_color TEXT,
  sections JSONB NOT NULL DEFAULT '{}',
  big_numbers JSONB DEFAULT '{}',
  raw_data_snapshot JSONB,
  ai_analysis TEXT,
  ai_recommendations TEXT,
  model_used TEXT,
  status TEXT DEFAULT 'generating',
  exported_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  sent_at TIMESTAMPTZ
);

ALTER TABLE public.automated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage automated reports"
  ON public.automated_reports FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), project_id));

CREATE INDEX idx_automated_reports_project_type
  ON public.automated_reports (project_id, report_type, period_start DESC);

-- 4. NPS surveys
CREATE TABLE public.nps_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  automated_report_id UUID REFERENCES public.automated_reports(id),
  survey_type TEXT NOT NULL,
  period TEXT NOT NULL,
  score INTEGER,
  aspect_scores JSONB,
  feedback TEXT,
  liked_most TEXT,
  improvement TEXT,
  authorized_testimonial BOOLEAN DEFAULT false,
  interested_case_study BOOLEAN DEFAULT false,
  willing_to_refer BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  follow_up_at TIMESTAMPTZ,
  follow_up_notes TEXT,
  classification TEXT,
  action_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

ALTER TABLE public.nps_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage NPS"
  ON public.nps_surveys FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), project_id));
