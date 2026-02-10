-- ============================================================================
-- Database Functions & Triggers
-- Run AFTER 001 and 002
-- ============================================================================

-- ============================================================================
-- AUTO-CREATE PROFILE + FREE SUBSCRIPTION on new user signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'technician')
  );

  -- Create free subscription
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- INCREMENT AI USAGE — upsert daily counter
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.usage_tracking (user_id, date, ai_requests_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET ai_requests_count = usage_tracking.ai_requests_count + 1
  RETURNING ai_requests_count INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CHECK AI LIMIT — returns remaining requests (negative = over limit)
-- Free: 10/day, Pro/Lifetime: unlimited (returns 9999)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_ai_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan subscription_plan;
  v_status subscription_status;
  v_used INT;
  v_limit INT;
BEGIN
  -- Get user's subscription
  SELECT plan, status INTO v_plan, v_status
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  -- No subscription found → treat as free
  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;

  -- Pro/Lifetime with active status → unlimited
  IF v_plan IN ('pro', 'lifetime') AND v_status = 'active' THEN
    RETURN json_build_object(
      'allowed', true,
      'plan', v_plan::text,
      'used', 0,
      'limit', -1,
      'remaining', -1
    );
  END IF;

  -- Free plan: 10 requests per day
  v_limit := 10;

  SELECT COALESCE(ai_requests_count, 0) INTO v_used
  FROM public.usage_tracking
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  IF v_used IS NULL THEN
    v_used := 0;
  END IF;

  RETURN json_build_object(
    'allowed', v_used < v_limit,
    'plan', v_plan::text,
    'used', v_used,
    'limit', v_limit,
    'remaining', GREATEST(v_limit - v_used, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REDEEM PROMO CODE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_user_id UUID, p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_promo RECORD;
  v_already_redeemed BOOLEAN;
BEGIN
  -- Find the promo code
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE code = UPPER(TRIM(p_code))
    AND active = true
    AND (valid_until IS NULL OR valid_until > now())
    AND valid_from <= now();

  IF v_promo IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired promo code');
  END IF;

  -- Check if already redeemed
  SELECT EXISTS(
    SELECT 1 FROM public.promo_redemptions
    WHERE user_id = p_user_id AND promo_code_id = v_promo.id
  ) INTO v_already_redeemed;

  IF v_already_redeemed THEN
    RETURN json_build_object('success', false, 'error', 'You have already used this promo code');
  END IF;

  -- Check max uses
  IF v_promo.current_uses >= v_promo.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'This promo code has reached its usage limit');
  END IF;

  -- Apply promo
  IF v_promo.type = 'lifetime' THEN
    -- Grant lifetime subscription
    UPDATE public.subscriptions
    SET plan = 'lifetime',
        status = 'active',
        current_period_end = NULL,
        cancel_at_period_end = false,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Record redemption
  INSERT INTO public.promo_redemptions (user_id, promo_code_id)
  VALUES (p_user_id, v_promo.id);

  -- Increment usage counter
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo.id;

  RETURN json_build_object(
    'success', true,
    'type', v_promo.type::text,
    'message', 'Promo code applied successfully!'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET USER TRUCK COUNT — used to enforce limits
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_truck_count(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO v_count
  FROM public.trucks
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
