-- ============================================================================
-- Truck Repair Assistant v3 — Initial Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES — Extends auth.users with app-specific data
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  company_name TEXT DEFAULT '',
  avatar_url TEXT,
  role TEXT DEFAULT 'technician',
  preferred_language TEXT DEFAULT 'en',
  notification_preferences JSONB DEFAULT '{"email_reports": true, "maintenance_reminders": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. SUBSCRIPTIONS — User subscription plans
-- ============================================================================
CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'lifetime');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan subscription_plan DEFAULT 'free',
  status subscription_status DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id)
);

-- ============================================================================
-- 3. PROMO CODES
-- ============================================================================
CREATE TYPE promo_type AS ENUM ('lifetime', 'discount');

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type promo_type DEFAULT 'lifetime',
  discount_percent INT DEFAULT 0,
  max_uses INT DEFAULT 1,
  current_uses INT DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT promo_redemptions_unique UNIQUE (user_id, promo_code_id)
);

-- ============================================================================
-- 4. USAGE TRACKING — AI request limits
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  ai_requests_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT usage_tracking_user_date_unique UNIQUE (user_id, date)
);

-- ============================================================================
-- 5. TRUCKS — User's truck fleet
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT DEFAULT '',
  manufacturer TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  year INT,
  vin TEXT DEFAULT '',
  mileage INT,
  engine_type TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trucks_user_id ON public.trucks(user_id);

-- ============================================================================
-- 6. CONVERSATIONS — Chat sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  truck_id UUID REFERENCES public.trucks(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  error_codes TEXT[] DEFAULT '{}',
  symptoms TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

-- ============================================================================
-- 7. DIAGNOSTIC REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.diagnostic_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  truck_id UUID REFERENCES public.trucks(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'Diagnostic Report',
  content JSONB DEFAULT '{}'::jsonb,
  error_codes TEXT[] DEFAULT '{}',
  summary TEXT DEFAULT '',
  severity TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_user_id ON public.diagnostic_reports(user_id);

-- ============================================================================
-- 8. KNOWLEDGE BASE — Community solutions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'repairs',
  truck_manufacturer TEXT DEFAULT '',
  truck_model TEXT DEFAULT '',
  solution TEXT DEFAULT '',
  votes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON public.knowledge_base(category);

-- ============================================================================
-- 9. SOLUTION VOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.solution_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  solution_id UUID NOT NULL REFERENCES public.knowledge_base(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL DEFAULT 1, -- 1 = upvote, -1 = downvote
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT solution_votes_unique UNIQUE (user_id, solution_id)
);

-- ============================================================================
-- 10. PARTS CATALOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  part_number TEXT DEFAULT '',
  manufacturer TEXT DEFAULT '',
  category TEXT DEFAULT '',
  price DECIMAL(10, 2),
  compatibility JSONB DEFAULT '[]'::jsonb,
  description TEXT DEFAULT '',
  image_url TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parts_category ON public.parts(category);
CREATE INDEX IF NOT EXISTS idx_parts_manufacturer ON public.parts(manufacturer);

-- ============================================================================
-- 11. SERVICE REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL DEFAULT '',
  service_address TEXT DEFAULT '',
  location TEXT DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT DEFAULT '',
  specializations TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_reviews_user_id ON public.service_reviews(user_id);

-- ============================================================================
-- 12. DIAGNOSTIC TOOLKITS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.diagnostic_toolkits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  truck_make TEXT DEFAULT '',
  truck_model TEXT DEFAULT '',
  truck_year INT,
  error_codes TEXT[] DEFAULT '{}',
  symptoms TEXT[] DEFAULT '{}',
  tools JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_toolkits_user_id ON public.diagnostic_toolkits(user_id);

-- ============================================================================
-- 13. REPAIR GUIDE RATINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.repair_guide_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id TEXT NOT NULL,
  rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT repair_guide_ratings_unique UNIQUE (user_id, guide_id)
);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.trucks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.diagnostic_reports FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.knowledge_base FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.service_reviews FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.diagnostic_toolkits FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
