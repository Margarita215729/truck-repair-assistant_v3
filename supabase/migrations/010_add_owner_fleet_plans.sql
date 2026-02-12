-- Migration 010: Add 'owner' and 'fleet' to subscription_plan ENUM
-- CRITICAL FIX: Stripe webhook writes plan='owner'/'fleet' but ENUM only had free/pro/lifetime

-- Add new values to the existing ENUM type
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'fleet';

-- Fix RLS: Remove direct UPDATE policy on usage_tracking to prevent counter manipulation
DROP POLICY IF EXISTS "Users can update own usage" ON usage_tracking;

-- Create restricted UPDATE policy — only allow incrementing, not arbitrary writes
CREATE POLICY "Users can update own usage via RPC only"
  ON usage_tracking FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND ai_requests_count >= 0);

-- Fix: Add auth.uid() checks to security-sensitive functions

-- Recreate check_ai_limit with authorization check
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
  -- Authorization: only allow checking own limits
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'unauthorized');
  END IF;

  -- Get subscription plan
  SELECT plan, status INTO v_plan, v_status
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- Pro/lifetime/owner/fleet users: unlimited (if active or trialing)
  IF v_plan IN ('pro', 'lifetime', 'owner', 'fleet') AND v_status IN ('active', 'trialing') THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'plan', v_plan,
      'used', 0,
      'limit', -1,
      'remaining', -1
    );
  END IF;

  -- Free plan: check daily usage
  v_limit := 5;

  SELECT COALESCE(ai_requests_count, 0) INTO v_used
  FROM usage_tracking
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  IF v_used IS NULL THEN
    v_used := 0;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_used < v_limit,
    'plan', COALESCE(v_plan, 'free'),
    'used', v_used,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - v_used)
  );
END;
$$;

-- Recreate increment_ai_usage with authorization check
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Authorization: only allow incrementing own usage
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

-- Recreate redeem_promo_code with authorization + row locking
CREATE OR REPLACE FUNCTION redeem_promo_code(p_user_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo RECORD;
  v_already_used BOOLEAN;
BEGIN
  -- Authorization: only allow redeeming for own account
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Lock the promo code row to prevent race conditions
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE code = UPPER(p_code) AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive promo code');
  END IF;

  -- Check expiry
  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code has expired');
  END IF;

  -- Check usage limit
  IF v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code fully redeemed');
  END IF;

  -- Check if user already used this code
  SELECT EXISTS(
    SELECT 1 FROM promo_redemptions
    WHERE user_id = p_user_id AND promo_code_id = v_promo.id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already used this promo code');
  END IF;

  -- Apply promo
  IF v_promo.type = 'lifetime' THEN
    INSERT INTO subscriptions (user_id, plan, status)
    VALUES (p_user_id, 'lifetime', 'active')
    ON CONFLICT (user_id)
    DO UPDATE SET plan = 'lifetime', status = 'active';
  END IF;

  -- Record redemption
  INSERT INTO promo_redemptions (user_id, promo_code_id)
  VALUES (p_user_id, v_promo.id);

  -- Increment usage counter (atomic, already locked)
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

-- Fix handle_new_user to prevent signup failures on retry
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

-- Add missing CHECK constraints
DO $$
BEGIN
  -- vote_type constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'solution_votes_vote_type_check'
  ) THEN
    ALTER TABLE solution_votes ADD CONSTRAINT solution_votes_vote_type_check CHECK (vote_type IN (-1, 1));
  END IF;
END $$;

-- Add index on stripe_customer_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- Add trigger to keep knowledge_base.votes_count in sync
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
