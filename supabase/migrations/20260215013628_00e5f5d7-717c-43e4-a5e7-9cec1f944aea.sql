
-- =============================================
-- Platform Connections (manages integration status)
-- =============================================
CREATE TABLE public.platform_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta_ads', 'google_ads', 'tiktok_ads', 'ga4', 'search_console', 'semrush')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connected', 'error')),
  credentials_ref TEXT,
  account_id TEXT,
  account_name TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_frequency TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, platform)
);

ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view connections" ON public.platform_connections FOR SELECT USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can insert connections" ON public.platform_connections FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can update connections" ON public.platform_connections FOR UPDATE USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can delete connections" ON public.platform_connections FOR DELETE USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_platform_connections_project ON public.platform_connections(project_id);

CREATE TRIGGER update_platform_connections_updated_at BEFORE UPDATE ON public.platform_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- Ads Campaigns
-- =============================================
CREATE TABLE public.ads_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform_connection_id UUID REFERENCES public.platform_connections(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta_ads', 'google_ads', 'tiktok_ads')),
  campaign_id TEXT,
  campaign_name TEXT,
  objective TEXT,
  status TEXT DEFAULT 'active',
  budget_daily NUMERIC,
  budget_total NUMERIC,
  spend NUMERIC DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr NUMERIC,
  cpc NUMERIC,
  cpm NUMERIC,
  conversions INTEGER DEFAULT 0,
  roas NUMERIC,
  cost_per_conversion NUMERIC,
  reach BIGINT DEFAULT 0,
  frequency NUMERIC,
  period_start DATE,
  period_end DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ads_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view campaigns" ON public.ads_campaigns FOR SELECT USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can insert campaigns" ON public.ads_campaigns FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can update campaigns" ON public.ads_campaigns FOR UPDATE USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can delete campaigns" ON public.ads_campaigns FOR DELETE USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ads_campaigns_project ON public.ads_campaigns(project_id);
CREATE INDEX idx_ads_campaigns_period ON public.ads_campaigns(period_start, period_end);

-- =============================================
-- Ads Adsets
-- =============================================
CREATE TABLE public.ads_adsets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
  adset_id TEXT,
  name TEXT,
  targeting JSONB DEFAULT '{}'::jsonb,
  budget NUMERIC,
  spend NUMERIC DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ads_adsets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view adsets" ON public.ads_adsets FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.ads_campaigns ac WHERE ac.id = ads_adsets.campaign_id AND is_project_member(auth.uid(), ac.project_id)
  )
);
CREATE POLICY "Members can insert adsets" ON public.ads_adsets FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.ads_campaigns ac WHERE ac.id = ads_adsets.campaign_id AND is_project_member(auth.uid(), ac.project_id)
  )
);
CREATE POLICY "Members can update adsets" ON public.ads_adsets FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.ads_campaigns ac WHERE ac.id = ads_adsets.campaign_id AND is_project_member(auth.uid(), ac.project_id)
  )
);
CREATE POLICY "Members can delete adsets" ON public.ads_adsets FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.ads_campaigns ac WHERE ac.id = ads_adsets.campaign_id AND is_project_member(auth.uid(), ac.project_id)
  )
);

-- =============================================
-- GA4 Traffic
-- =============================================
CREATE TABLE public.ga4_traffic (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform_connection_id UUID REFERENCES public.platform_connections(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  source TEXT,
  medium TEXT,
  channel_group TEXT,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  bounce_rate NUMERIC,
  avg_session_duration NUMERIC,
  pages_per_session NUMERIC,
  conversions INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ga4_traffic ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ga4 traffic" ON public.ga4_traffic FOR SELECT USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can insert ga4 traffic" ON public.ga4_traffic FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can update ga4 traffic" ON public.ga4_traffic FOR UPDATE USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can delete ga4 traffic" ON public.ga4_traffic FOR DELETE USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ga4_traffic_project_date ON public.ga4_traffic(project_id, date);

-- =============================================
-- GA4 Pages
-- =============================================
CREATE TABLE public.ga4_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform_connection_id UUID REFERENCES public.platform_connections(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  page_path TEXT,
  page_title TEXT,
  views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  avg_time_on_page NUMERIC,
  bounce_rate NUMERIC,
  entrances INTEGER DEFAULT 0,
  exits INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ga4_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ga4 pages" ON public.ga4_pages FOR SELECT USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can insert ga4 pages" ON public.ga4_pages FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can update ga4 pages" ON public.ga4_pages FOR UPDATE USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can delete ga4 pages" ON public.ga4_pages FOR DELETE USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ga4_pages_project_date ON public.ga4_pages(project_id, date);

-- =============================================
-- Search Console Data
-- =============================================
CREATE TABLE public.search_console_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform_connection_id UUID REFERENCES public.platform_connections(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  query TEXT,
  page TEXT,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC,
  position NUMERIC,
  device TEXT,
  country TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.search_console_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view search console data" ON public.search_console_data FOR SELECT USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can insert search console data" ON public.search_console_data FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can update search console data" ON public.search_console_data FOR UPDATE USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can delete search console data" ON public.search_console_data FOR DELETE USING (is_project_member(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_search_console_project_date ON public.search_console_data(project_id, date);
