-- ============================================================================
-- Migration 015: Remediate DDL that was never executed from 003, 010, 013
-- Background: migrations 001-013 were marked as "applied" via supabase
-- migration repair but some had never actually been executed against the DB.
-- This migration idempotently applies all missing artefacts.
-- ============================================================================

-- ===================== MIGRATION 010 — ENUM VALUES ========================
-- subscription_plan currently has: free, pro, lifetime
-- Need to add: owner, fleet
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'fleet';

-- ===================== MIGRATION 010 — PROFILES.EMAIL =====================
-- handle_new_user (010 version) inserts email; column was never created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- ===================== MIGRATION 010 — POLICY FIX =========================
DROP POLICY IF EXISTS "Users can update own usage" ON usage_tracking;
DROP POLICY IF EXISTS "Users can update own usage via RPC only" ON usage_tracking;
CREATE POLICY "Users can update own usage via RPC only"
  ON usage_tracking FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND ai_requests_count >= 0);

-- ===================== MIGRATION 003/010 — FUNCTIONS ======================
-- Must DROP functions whose return type changed from JSON → JSONB
DROP FUNCTION IF EXISTS public.check_ai_limit(UUID);
DROP FUNCTION IF EXISTS public.redeem_promo_code(UUID, TEXT);
-- Also drop 003-era versions to ensure clean state
DROP FUNCTION IF EXISTS public.increment_ai_usage(UUID);
DROP FUNCTION IF EXISTS public.get_user_truck_count(UUID);
-- handle_new_user has a dependent trigger — drop trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- handle_new_user (010 version with ON CONFLICT DO NOTHING)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'technician')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO usage_tracking (user_id, date, ai_requests_count)
  VALUES (NEW.id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- check_ai_limit (010 version with auth + owner/fleet support)
CREATE OR REPLACE FUNCTION check_ai_limit(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan subscription_plan;
  v_status TEXT;
  v_limit INT;
  v_used INT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'unauthorized');
  END IF;

  SELECT plan, status INTO v_plan, v_status
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF v_plan IN ('pro', 'lifetime', 'owner', 'fleet') AND v_status IN ('active', 'trialing') THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'plan', v_plan,
      'used', 0,
      'limit', -1,
      'remaining', -1
    );
  END IF;

  v_limit := 5;

  SELECT COALESCE(ai_requests_count, 0) INTO v_used
  FROM usage_tracking
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  IF v_used IS NULL THEN v_used := 0; END IF;

  RETURN jsonb_build_object(
    'allowed', v_used < v_limit,
    'plan', COALESCE(v_plan, 'free'),
    'used', v_used,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - v_used)
  );
END;
$$;

-- increment_ai_usage (010 version with auth check)
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN -1;
  END IF;

  INSERT INTO usage_tracking (user_id, date, ai_requests_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET ai_requests_count = usage_tracking.ai_requests_count + 1
  RETURNING ai_requests_count INTO v_count;

  RETURN v_count;
END;
$$;

-- redeem_promo_code (010 version, fixed: uses 'active' not 'is_active')
CREATE OR REPLACE FUNCTION redeem_promo_code(p_user_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo RECORD;
  v_already_used BOOLEAN;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_promo
  FROM promo_codes
  WHERE code = UPPER(p_code) AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive promo code');
  END IF;

  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code has expired');
  END IF;

  IF v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code fully redeemed');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM promo_redemptions
    WHERE user_id = p_user_id AND promo_code_id = v_promo.id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already used this promo code');
  END IF;

  IF v_promo.type = 'lifetime' THEN
    INSERT INTO subscriptions (user_id, plan, status)
    VALUES (p_user_id, 'lifetime', 'active')
    ON CONFLICT (user_id)
    DO UPDATE SET plan = 'lifetime', status = 'active';
  END IF;

  INSERT INTO promo_redemptions (user_id, promo_code_id)
  VALUES (p_user_id, v_promo.id);

  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Promo code redeemed successfully!',
    'type', v_promo.type
  );
END;
$$;

-- get_user_truck_count (003 version)
CREATE OR REPLACE FUNCTION get_user_truck_count(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO v_count
  FROM trucks
  WHERE user_id = p_user_id;
  RETURN COALESCE(v_count, 0);
END;
$$;

-- update_votes_count (010 — keeps knowledge_base.votes_count in sync)
CREATE OR REPLACE FUNCTION update_votes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_solution_id UUID;
  v_count INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_solution_id := OLD.solution_id;
  ELSE
    v_solution_id := NEW.solution_id;
  END IF;

  SELECT COALESCE(SUM(vote_type), 0) INTO v_count
  FROM solution_votes
  WHERE solution_id = v_solution_id;

  UPDATE knowledge_base SET votes_count = v_count WHERE id = v_solution_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_votes_count ON solution_votes;
CREATE TRIGGER trigger_update_votes_count
  AFTER INSERT OR UPDATE OR DELETE ON solution_votes
  FOR EACH ROW EXECUTE FUNCTION update_votes_count();

-- ===================== MIGRATION 010 — CONSTRAINTS / INDEXES ==============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'solution_votes_vote_type_check'
  ) THEN
    ALTER TABLE solution_votes ADD CONSTRAINT solution_votes_vote_type_check CHECK (vote_type IN (-1, 1));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- ===================== MIGRATION 013 — PARTS DECISION COLUMNS =============
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS oem_part_number       TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS alt_part_numbers      JSONB DEFAULT '[]';
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS root_cause_confidence TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS urgency               TEXT DEFAULT 'medium';
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS driveability          TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS action_type           TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS roadside_possible     BOOLEAN DEFAULT false;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS shop_required         BOOLEAN DEFAULT false;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS programming_required  BOOLEAN DEFAULT false;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS inspection_steps      JSONB DEFAULT '[]';
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS pair_with_parts       JSONB DEFAULT '[]';
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS bundle_label          TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS fitment_status        TEXT;

CREATE INDEX IF NOT EXISTS idx_parts_urgency       ON public.parts (urgency)       WHERE urgency IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parts_action_type   ON public.parts (action_type)   WHERE action_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parts_driveability  ON public.parts (driveability)  WHERE driveability IS NOT NULL;

-- ============================================================================
-- Done — all missing artefacts from 003 / 010 / 013 are now applied.
-- ============================================================================
