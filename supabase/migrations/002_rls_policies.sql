-- ============================================================================
-- Row Level Security Policies
-- Run AFTER 001_init_schema.sql
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_toolkits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_guide_ratings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES — Users can read/update their own profile
-- ============================================================================
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- SUBSCRIPTIONS — Users can read own subscription; writes via service_role only
-- ============================================================================
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Insert/Update policies for service_role (webhooks) are handled via service_role key
-- which bypasses RLS. Users cannot modify subscriptions directly.
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- PROMO CODES — Read active codes (for validation), writes via service_role
-- ============================================================================
CREATE POLICY "Anyone authenticated can read active promo codes"
  ON public.promo_codes FOR SELECT
  USING (auth.role() = 'authenticated' AND active = true);

-- ============================================================================
-- PROMO REDEMPTIONS — Users can view their own redemptions
-- ============================================================================
CREATE POLICY "Users can view own promo redemptions"
  ON public.promo_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own promo redemptions"
  ON public.promo_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- USAGE TRACKING — Users can view/modify own usage
-- ============================================================================
CREATE POLICY "Users can view own usage"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRUCKS — Users manage their own trucks
-- ============================================================================
CREATE POLICY "Users can view own trucks"
  ON public.trucks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trucks"
  ON public.trucks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trucks"
  ON public.trucks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trucks"
  ON public.trucks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CONVERSATIONS — Users manage their own conversations
-- ============================================================================
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DIAGNOSTIC REPORTS — Users manage their own reports
-- ============================================================================
CREATE POLICY "Users can view own reports"
  ON public.diagnostic_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON public.diagnostic_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
  ON public.diagnostic_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON public.diagnostic_reports FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- KNOWLEDGE BASE — Everyone can read, users manage their own
-- ============================================================================
CREATE POLICY "Authenticated users can view all solutions"
  ON public.knowledge_base FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own solutions"
  ON public.knowledge_base FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own solutions"
  ON public.knowledge_base FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own solutions"
  ON public.knowledge_base FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SOLUTION VOTES — Users manage their own votes
-- ============================================================================
CREATE POLICY "Authenticated users can view all votes"
  ON public.solution_votes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own votes"
  ON public.solution_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON public.solution_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.solution_votes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PARTS — Everyone authenticated can read
-- ============================================================================
CREATE POLICY "Authenticated users can view all parts"
  ON public.parts FOR SELECT
  USING (auth.role() = 'authenticated');

-- Parts are managed by admin/service_role

-- ============================================================================
-- SERVICE REVIEWS — Everyone can read, users manage their own
-- ============================================================================
CREATE POLICY "Authenticated users can view all reviews"
  ON public.service_reviews FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own reviews"
  ON public.service_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.service_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.service_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DIAGNOSTIC TOOLKITS — Users manage their own
-- ============================================================================
CREATE POLICY "Users can view own toolkits"
  ON public.diagnostic_toolkits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own toolkits"
  ON public.diagnostic_toolkits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own toolkits"
  ON public.diagnostic_toolkits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own toolkits"
  ON public.diagnostic_toolkits FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- REPAIR GUIDE RATINGS — Users manage their own, everyone can read
-- ============================================================================
CREATE POLICY "Authenticated users can view all guide ratings"
  ON public.repair_guide_ratings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own guide ratings"
  ON public.repair_guide_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own guide ratings"
  ON public.repair_guide_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own guide ratings"
  ON public.repair_guide_ratings FOR DELETE
  USING (auth.uid() = user_id);
