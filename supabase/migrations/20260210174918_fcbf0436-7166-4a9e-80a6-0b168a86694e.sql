
-- Fix #1: OKR channel constraint - add 'social'
ALTER TABLE public.okr_objectives DROP CONSTRAINT IF EXISTS okr_objectives_channel_check;
ALTER TABLE public.okr_objectives ADD CONSTRAINT okr_objectives_channel_check 
  CHECK (channel IN ('instagram', 'social', 'seo', 'ads', 'general'));

-- Fix #2: Planning items status constraint - add missing statuses
ALTER TABLE public.planning_items DROP CONSTRAINT IF EXISTS planning_items_status_check;
ALTER TABLE public.planning_items ADD CONSTRAINT planning_items_status_check 
  CHECK (status IN ('idea', 'planned', 'briefed', 'in_production', 'scheduled', 'review', 'approved', 'published', 'cancelled'));

-- Fix #5: Add 'brand' to entity_type enum
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'brand';
