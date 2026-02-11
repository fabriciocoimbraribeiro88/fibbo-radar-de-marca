
-- Nova tabela: brand_references
CREATE TABLE public.brand_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('kv', 'post_success', 'post_failure', 'campaign')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  external_url TEXT,
  platform TEXT,
  format TEXT,
  metrics JSONB,
  why_it_worked TEXT,
  pillar_id TEXT,
  tags TEXT[],
  campaign_period_start DATE,
  campaign_period_end DATE,
  campaign_results TEXT,
  campaign_learnings TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.brand_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage brand references" ON public.brand_references
  FOR ALL USING (public.is_project_member(auth.uid(), project_id));

CREATE INDEX idx_brand_refs_project ON public.brand_references(project_id);
CREATE INDEX idx_brand_refs_type ON public.brand_references(project_id, type);

-- Nova tabela: brand_memory_entries
CREATE TABLE public.brand_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  summary TEXT,
  pillar_performance JSONB,
  learnings JSONB,
  metrics JSONB,
  tags TEXT[],
  confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, month, year)
);

ALTER TABLE public.brand_memory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage brand memory" ON public.brand_memory_entries
  FOR ALL USING (public.is_project_member(auth.uid(), project_id));

CREATE INDEX idx_brand_memory ON public.brand_memory_entries(project_id, year DESC, month DESC);
