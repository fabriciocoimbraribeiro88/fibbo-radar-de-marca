
-- Tabela para fontes de contexto de marca
CREATE TABLE public.brand_context_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('url', 'text', 'document')),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error')),
  extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_context_sources ENABLE ROW LEVEL SECURITY;

-- RLS: acesso via project_members
CREATE POLICY "Members can view brand sources"
  ON public.brand_context_sources FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can insert brand sources"
  ON public.brand_context_sources FOR INSERT
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update brand sources"
  ON public.brand_context_sources FOR UPDATE
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can delete brand sources"
  ON public.brand_context_sources FOR DELETE
  USING (public.is_project_member(auth.uid(), project_id));

-- Index para queries por projeto
CREATE INDEX idx_brand_context_sources_project ON public.brand_context_sources(project_id);

-- Bucket para documentos de marca
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-documents', 'brand-documents', false);

-- Storage policies
CREATE POLICY "Members can upload brand documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brand-documents');

CREATE POLICY "Members can view brand documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-documents');

CREATE POLICY "Members can delete brand documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'brand-documents');
