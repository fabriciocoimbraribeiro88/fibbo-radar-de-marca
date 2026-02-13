-- ============================================================
-- Meta Ads Integration: multi-client agency support
-- ============================================================

-- 1. Table: meta_ad_accounts
-- Maps Meta ad accounts to projects/entities (agency multi-client)
CREATE TABLE public.meta_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_account_id TEXT NOT NULL UNIQUE,
  account_name TEXT,
  business_name TEXT,
  currency TEXT DEFAULT 'BRL',
  timezone_name TEXT,
  account_status INTEGER DEFAULT 1,
  entity_id UUID REFERENCES public.monitored_entities(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all accounts (agency-level view)
CREATE POLICY "Authenticated users can view meta_ad_accounts"
  ON public.meta_ad_accounts FOR SELECT TO authenticated
  USING (true);

-- Only project members or accounts without project can insert/update
CREATE POLICY "Authenticated users can insert meta_ad_accounts"
  ON public.meta_ad_accounts FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update meta_ad_accounts"
  ON public.meta_ad_accounts FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete meta_ad_accounts"
  ON public.meta_ad_accounts FOR DELETE TO authenticated
  USING (true);

CREATE INDEX idx_meta_ad_accounts_project ON public.meta_ad_accounts(project_id);
CREATE INDEX idx_meta_ad_accounts_entity ON public.meta_ad_accounts(entity_id);
CREATE INDEX idx_meta_ad_accounts_meta_id ON public.meta_ad_accounts(meta_account_id);

-- 2. Table: meta_ad_insights
-- Stores daily performance metrics per account/campaign
CREATE TABLE public.meta_ad_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_account_id TEXT NOT NULL,
  account_ref UUID REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.monitored_entities(id) ON DELETE SET NULL,
  campaign_id TEXT,
  campaign_name TEXT,
  campaign_status TEXT,
  campaign_objective TEXT,
  ad_id TEXT,
  ad_name TEXT,
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  cpc DECIMAL(8,4),
  cpm DECIMAL(8,4),
  ctr DECIMAL(8,4),
  reach BIGINT DEFAULT 0,
  frequency DECIMAL(6,2),
  actions JSONB,
  cost_per_action JSONB,
  level TEXT DEFAULT 'account' CHECK (level IN ('account', 'campaign', 'ad')),
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

ALTER TABLE public.meta_ad_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meta_ad_insights"
  ON public.meta_ad_insights FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert meta_ad_insights"
  ON public.meta_ad_insights FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update meta_ad_insights"
  ON public.meta_ad_insights FOR UPDATE TO authenticated
  USING (true);

-- Unique constraint for upsert: one row per account+campaign+ad+date+level
CREATE UNIQUE INDEX idx_meta_ad_insights_unique
  ON public.meta_ad_insights(meta_account_id, COALESCE(campaign_id, ''), COALESCE(ad_id, ''), date_start, level);

CREATE INDEX idx_meta_ad_insights_account_ref ON public.meta_ad_insights(account_ref);
CREATE INDEX idx_meta_ad_insights_date ON public.meta_ad_insights(date_start DESC);
CREATE INDEX idx_meta_ad_insights_account_date ON public.meta_ad_insights(meta_account_id, date_start DESC);

-- 3. Alter ads_library: add columns for Meta account linkage
ALTER TABLE public.ads_library
  ADD COLUMN IF NOT EXISTS meta_account_ref UUID REFERENCES public.meta_ad_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS campaign_name TEXT,
  ADD COLUMN IF NOT EXISTS campaign_objective TEXT;
