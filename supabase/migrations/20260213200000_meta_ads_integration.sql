-- ============================================================
-- Meta Ads Integration: standalone multi-client agency support
-- No dependencies on external tables (monitored_entities, projects)
-- ============================================================

-- 0. Dependency tables (created only if they don't already exist)

-- ads_library: stores ad creatives fetched from Meta
CREATE TABLE IF NOT EXISTS public.ads_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID,
  platform TEXT CHECK (platform IN ('meta', 'google', 'tiktok')) DEFAULT 'meta',
  ad_id TEXT,
  ad_title TEXT,
  ad_body TEXT,
  ad_creative_url TEXT,
  ad_type TEXT,
  started_at DATE,
  ended_at DATE,
  is_active BOOLEAN DEFAULT TRUE,
  estimated_spend_min DECIMAL,
  estimated_spend_max DECIMAL,
  impressions_estimate TEXT,
  landing_page_url TEXT,
  cta_text TEXT,
  metadata JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ads_library ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ads_library' AND policyname = 'Authenticated users can view ads_library'
  ) THEN
    CREATE POLICY "Authenticated users can view ads_library"
      ON public.ads_library FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ads_library' AND policyname = 'Authenticated users can insert ads_library'
  ) THEN
    CREATE POLICY "Authenticated users can insert ads_library"
      ON public.ads_library FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ads_library' AND policyname = 'Authenticated users can update ads_library'
  ) THEN
    CREATE POLICY "Authenticated users can update ads_library"
      ON public.ads_library FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- data_fetch_logs: tracks fetch operations
CREATE TABLE IF NOT EXISTS public.data_fetch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  records_fetched INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  apify_run_id TEXT
);

ALTER TABLE public.data_fetch_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'data_fetch_logs' AND policyname = 'Authenticated users can view data_fetch_logs'
  ) THEN
    CREATE POLICY "Authenticated users can view data_fetch_logs"
      ON public.data_fetch_logs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'data_fetch_logs' AND policyname = 'Authenticated users can insert data_fetch_logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert data_fetch_logs"
      ON public.data_fetch_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'data_fetch_logs' AND policyname = 'Authenticated users can update data_fetch_logs'
  ) THEN
    CREATE POLICY "Authenticated users can update data_fetch_logs"
      ON public.data_fetch_logs FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================
-- 1. Table: meta_ad_accounts
-- Maps Meta ad accounts to clients (agency multi-client)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meta_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_account_id TEXT NOT NULL UNIQUE,
  account_name TEXT,
  business_name TEXT,
  currency TEXT DEFAULT 'BRL',
  timezone_name TEXT,
  account_status INTEGER DEFAULT 1,
  entity_id UUID,
  project_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meta_ad_accounts"
  ON public.meta_ad_accounts FOR SELECT TO authenticated
  USING (true);

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

-- ============================================================
-- 2. Table: meta_ad_insights
-- Stores daily performance metrics per account/campaign
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meta_ad_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_account_id TEXT NOT NULL,
  account_ref UUID REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  entity_id UUID,
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

-- ============================================================
-- 3. Add Meta columns to ads_library (if they don't exist)
-- ============================================================
ALTER TABLE public.ads_library
  ADD COLUMN IF NOT EXISTS meta_account_ref UUID,
  ADD COLUMN IF NOT EXISTS campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS campaign_name TEXT,
  ADD COLUMN IF NOT EXISTS campaign_objective TEXT;
