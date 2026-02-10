
-- =============================================
-- Fibbo Radar — Schema completo (Fase 1)
-- =============================================

-- 1. TYPES
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'viewer');
CREATE TYPE public.project_member_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE public.entity_type AS ENUM ('competitor', 'influencer', 'inspiration');

-- 2. PROFILES
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER ROLES (separate table — CRITICAL for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- 4. PROJECTS
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  brand_name TEXT NOT NULL,
  brand_description TEXT,
  target_audience TEXT,
  tone_of_voice TEXT,
  keywords TEXT[],
  segment TEXT,
  website_url TEXT,
  instagram_handle TEXT,
  logo_url TEXT,
  briefing JSONB,
  status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PROJECT MEMBERS
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role project_member_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 6. MONITORED ENTITIES (shared across projects)
CREATE TABLE public.monitored_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type entity_type NOT NULL,
  instagram_handle TEXT,
  website_url TEXT,
  description TEXT,
  segment TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PROJECT ↔ ENTITY junction
CREATE TABLE public.project_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  entity_id UUID REFERENCES public.monitored_entities(id) ON DELETE CASCADE NOT NULL,
  entity_role entity_type NOT NULL,
  priority INTEGER DEFAULT 0,
  UNIQUE(project_id, entity_id)
);

-- 8. INSTAGRAM PROFILES
CREATE TABLE public.instagram_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.monitored_entities(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  bio TEXT,
  profile_pic_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  snapshot_date DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(handle, snapshot_date)
);

-- 9. INSTAGRAM POSTS
CREATE TABLE public.instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.monitored_entities(id) ON DELETE CASCADE,
  post_id_instagram TEXT UNIQUE NOT NULL,
  shortcode TEXT,
  post_url TEXT,
  post_type TEXT CHECK (post_type IN ('Image', 'Sidecar', 'Video', 'Reel')),
  caption TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  engagement_total INTEGER GENERATED ALWAYS AS (likes_count + comments_count) STORED,
  hashtags TEXT[],
  mentions TEXT[],
  posted_at TIMESTAMPTZ,
  thumbnail_url TEXT,
  media_urls TEXT[],
  is_pinned BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. INSTAGRAM COMMENTS
CREATE TABLE public.instagram_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.instagram_posts(id) ON DELETE CASCADE,
  comment_id_instagram TEXT UNIQUE,
  username TEXT,
  text TEXT,
  likes_count INTEGER DEFAULT 0,
  replied_to TEXT,
  commented_at TIMESTAMPTZ,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_category TEXT,
  metadata JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ADS LIBRARY
CREATE TABLE public.ads_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.monitored_entities(id) ON DELETE CASCADE,
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

-- 12. SEO DATA
CREATE TABLE public.seo_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.monitored_entities(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  position INTEGER,
  search_volume INTEGER,
  url_ranking TEXT,
  domain_authority INTEGER,
  backlinks_count INTEGER,
  organic_traffic_estimate INTEGER,
  snapshot_date DATE NOT NULL,
  metadata JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. DATA FETCH CONFIGS
CREATE TABLE public.data_fetch_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.monitored_entities(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('instagram_posts', 'instagram_comments', 'instagram_profile', 'ads_library', 'seo', 'news')),
  apify_actor_id TEXT,
  apify_input JSONB,
  schedule TEXT CHECK (schedule IN ('manual', 'daily', 'weekly', 'monthly')) DEFAULT 'manual',
  last_fetch_at TIMESTAMPTZ,
  next_fetch_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. DATA FETCH LOGS
CREATE TABLE public.data_fetch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES public.data_fetch_configs(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  records_fetched INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  apify_run_id TEXT
);

-- 15. ANALYSES
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('brand_diagnosis', 'competitor_analysis', 'cross_analysis', 'influencer_analysis', 'inspiration_analysis', 'full_report')),
  status TEXT CHECK (status IN ('draft', 'collecting_data', 'analyzing', 'agents_running', 'synthesizing', 'review', 'approved', 'published')) DEFAULT 'draft',
  period_start DATE,
  period_end DATE,
  entities_included UUID[],
  parameters JSONB,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. ANALYSIS SECTIONS
CREATE TABLE public.analysis_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  entity_id UUID REFERENCES public.monitored_entities(id),
  section_type TEXT,
  agent_prompt TEXT,
  agent_response TEXT,
  structured_data JSONB,
  content_markdown TEXT,
  content_html TEXT,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed', 'edited')) DEFAULT 'pending',
  token_usage JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  edited_by UUID REFERENCES auth.users(id),
  edited_at TIMESTAMPTZ
);

-- 17. REPORTS
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.analyses(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('intelligence_report', 'competitive_analysis', 'planning', 'okr_review')),
  content_markdown TEXT,
  content_html TEXT,
  big_numbers JSONB,
  sections_order UUID[],
  status TEXT CHECK (status IN ('draft', 'review', 'approved', 'published')) DEFAULT 'draft',
  exported_pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- 18. OKR OBJECTIVES
CREATE TABLE public.okr_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  channel TEXT CHECK (channel IN ('instagram', 'seo', 'ads', 'general')),
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT CHECK (status IN ('on_track', 'at_risk', 'behind', 'achieved')) DEFAULT 'on_track',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. OKR KEY RESULTS
CREATE TABLE public.okr_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES public.okr_objectives(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  metric_type TEXT,
  target_value DECIMAL NOT NULL,
  current_value DECIMAL DEFAULT 0,
  unit TEXT,
  data_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. OKR MEASUREMENTS
CREATE TABLE public.okr_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID REFERENCES public.okr_key_results(id) ON DELETE CASCADE NOT NULL,
  value DECIMAL NOT NULL,
  measured_at DATE NOT NULL,
  source TEXT CHECK (source IN ('automatic', 'manual')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. PLANNING CALENDARS
CREATE TABLE public.planning_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('social_media', 'seo', 'ads', 'integrated')),
  period_type TEXT CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start DATE,
  period_end DATE,
  generated_from_analysis UUID REFERENCES public.analyses(id),
  status TEXT CHECK (status IN ('draft', 'approved', 'active', 'completed')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. PLANNING ITEMS
CREATE TABLE public.planning_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES public.planning_calendars(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT,
  channel TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  theme TEXT,
  format TEXT,
  copy_text TEXT,
  visual_brief TEXT,
  hashtags TEXT[],
  target_audience TEXT,
  budget DECIMAL,
  keywords TEXT[],
  status TEXT CHECK (status IN ('idea', 'briefed', 'in_production', 'review', 'approved', 'published', 'cancelled')) DEFAULT 'idea',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_project_members_user ON public.project_members(user_id);
CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_entities_project ON public.project_entities(project_id);
CREATE INDEX idx_project_entities_entity ON public.project_entities(entity_id);
CREATE INDEX idx_instagram_posts_entity ON public.instagram_posts(entity_id);
CREATE INDEX idx_instagram_posts_posted ON public.instagram_posts(posted_at);
CREATE INDEX idx_instagram_comments_post ON public.instagram_comments(post_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_analyses_project ON public.analyses(project_id);
CREATE INDEX idx_reports_project ON public.reports(project_id);

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- is_project_member
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id
  )
$$;

-- is_entity_accessible
CREATE OR REPLACE FUNCTION public.is_entity_accessible(_user_id UUID, _entity_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_entities pe
    JOIN public.project_members pm ON pe.project_id = pm.project_id
    WHERE pe.entity_id = _entity_id AND pm.user_id = _user_id
  )
$$;

-- =============================================
-- TRIGGER: auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  -- First user gets admin role, rest get analyst
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'analyst');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TRIGGER: update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER analyses_updated_at BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitored_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_fetch_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_fetch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- USER ROLES (read own, admin manages all)
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PROJECTS
CREATE POLICY "Members can view projects" ON public.projects
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), id)
  );
CREATE POLICY "Authenticated can create projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), id)
  );
CREATE POLICY "Owner or admin can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR created_by = auth.uid()
  );

-- PROJECT MEMBERS
CREATE POLICY "Members can view project members" ON public.project_members
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );
CREATE POLICY "Can add members to own projects" ON public.project_members
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );
CREATE POLICY "Admin can delete members" ON public.project_members
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- MONITORED ENTITIES
CREATE POLICY "Accessible entities visible" ON public.monitored_entities
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), id)
  );
CREATE POLICY "Auth users can create entities" ON public.monitored_entities
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Accessible entities updatable" ON public.monitored_entities
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), id)
  );

-- PROJECT ENTITIES
CREATE POLICY "Members can view project entities" ON public.project_entities
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );
CREATE POLICY "Members can link entities" ON public.project_entities
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );
CREATE POLICY "Members can unlink entities" ON public.project_entities
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );

-- INSTAGRAM PROFILES
CREATE POLICY "Entity access controls instagram profiles" ON public.instagram_profiles
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), entity_id)
  );
CREATE POLICY "Can insert instagram profiles" ON public.instagram_profiles
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), entity_id)
  );

-- INSTAGRAM POSTS
CREATE POLICY "Entity access controls posts" ON public.instagram_posts
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), entity_id)
  );
CREATE POLICY "Can insert posts" ON public.instagram_posts
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), entity_id)
  );

-- INSTAGRAM COMMENTS
CREATE POLICY "Post access controls comments" ON public.instagram_comments
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.instagram_posts ip
      WHERE ip.id = post_id AND public.is_entity_accessible(auth.uid(), ip.entity_id)
    )
  );
CREATE POLICY "Can insert comments" ON public.instagram_comments
  FOR INSERT TO authenticated WITH CHECK (true);

-- ADS LIBRARY
CREATE POLICY "Entity access controls ads" ON public.ads_library
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), entity_id)
  );
CREATE POLICY "Can insert ads" ON public.ads_library
  FOR INSERT TO authenticated WITH CHECK (true);

-- SEO DATA
CREATE POLICY "Entity access controls seo" ON public.seo_data
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), entity_id)
  );
CREATE POLICY "Can insert seo data" ON public.seo_data
  FOR INSERT TO authenticated WITH CHECK (true);

-- DATA FETCH CONFIGS
CREATE POLICY "Entity access controls configs" ON public.data_fetch_configs
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), entity_id)
  );
CREATE POLICY "Can manage configs" ON public.data_fetch_configs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Can update configs" ON public.data_fetch_configs
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_entity_accessible(auth.uid(), entity_id)
  );

-- DATA FETCH LOGS
CREATE POLICY "Config access controls logs" ON public.data_fetch_logs
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.data_fetch_configs dfc
      WHERE dfc.id = config_id AND public.is_entity_accessible(auth.uid(), dfc.entity_id)
    )
  );
CREATE POLICY "Can insert logs" ON public.data_fetch_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- ANALYSES
CREATE POLICY "Members can view analyses" ON public.analyses
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );
CREATE POLICY "Members can create analyses" ON public.analyses
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );
CREATE POLICY "Members can update analyses" ON public.analyses
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );

-- ANALYSIS SECTIONS
CREATE POLICY "Analysis access controls sections" ON public.analysis_sections
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.analyses a WHERE a.id = analysis_id AND public.is_project_member(auth.uid(), a.project_id))
  );
CREATE POLICY "Can insert sections" ON public.analysis_sections
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Can update sections" ON public.analysis_sections
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.analyses a WHERE a.id = analysis_id AND public.is_project_member(auth.uid(), a.project_id))
  );

-- REPORTS
CREATE POLICY "Members can view reports" ON public.reports
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );
CREATE POLICY "Members can create reports" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );
CREATE POLICY "Members can update reports" ON public.reports
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );

-- OKR OBJECTIVES
CREATE POLICY "Members can view objectives" ON public.okr_objectives
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );
CREATE POLICY "Members can manage objectives" ON public.okr_objectives
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );
CREATE POLICY "Members can update objectives" ON public.okr_objectives
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );

-- OKR KEY RESULTS
CREATE POLICY "Objective access controls key results" ON public.okr_key_results
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.okr_objectives o WHERE o.id = objective_id AND public.is_project_member(auth.uid(), o.project_id))
  );
CREATE POLICY "Can manage key results" ON public.okr_key_results
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Can update key results" ON public.okr_key_results
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.okr_objectives o WHERE o.id = objective_id AND public.is_project_member(auth.uid(), o.project_id))
  );

-- OKR MEASUREMENTS
CREATE POLICY "Key result access controls measurements" ON public.okr_measurements
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.okr_key_results kr
      JOIN public.okr_objectives o ON kr.objective_id = o.id
      WHERE kr.id = key_result_id AND public.is_project_member(auth.uid(), o.project_id)
    )
  );
CREATE POLICY "Can insert measurements" ON public.okr_measurements
  FOR INSERT TO authenticated WITH CHECK (true);

-- PLANNING CALENDARS
CREATE POLICY "Members can view calendars" ON public.planning_calendars
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );
CREATE POLICY "Members can manage calendars" ON public.planning_calendars
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );
CREATE POLICY "Members can update calendars" ON public.planning_calendars
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.is_project_member(auth.uid(), project_id)
  );

-- PLANNING ITEMS
CREATE POLICY "Calendar access controls items" ON public.planning_items
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.planning_calendars pc WHERE pc.id = calendar_id AND public.is_project_member(auth.uid(), pc.project_id))
  );
CREATE POLICY "Can manage planning items" ON public.planning_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Can update planning items" ON public.planning_items
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.planning_calendars pc WHERE pc.id = calendar_id AND public.is_project_member(auth.uid(), pc.project_id))
  );

-- NOTIFICATIONS
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());
