-- ============================================================================
-- Migration 028: Atomic AI quotas for registered and guest users
--
-- Guest identifiers and network addresses are HMAC-hashed by the API before
-- reaching this table. No raw IP address or browser identifier is stored.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.guest_ai_usage (
  bucket_key TEXT NOT NULL,
  bucket_type TEXT NOT NULL CHECK (bucket_type IN ('guest', 'network')),
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ai_requests_count INTEGER NOT NULL DEFAULT 0 CHECK (ai_requests_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_key, usage_date),
  CONSTRAINT guest_ai_usage_bucket_key_format
    CHECK (bucket_key ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_guest_ai_usage_date
  ON public.guest_ai_usage (usage_date);

ALTER TABLE public.guest_ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.guest_ai_usage
  FROM PUBLIC, anon, authenticated;

-- Atomically reserve one of ten daily requests for a registered free user.
CREATE OR REPLACE FUNCTION public.reserve_user_ai_request(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_used INTEGER;
  v_limit CONSTANT INTEGER := 10;
BEGIN
  INSERT INTO public.usage_tracking (user_id, date, ai_requests_count)
  VALUES (p_user_id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  UPDATE public.usage_tracking
  SET ai_requests_count = ai_requests_count + 1
  WHERE user_id = p_user_id
    AND date = CURRENT_DATE
    AND ai_requests_count < v_limit
  RETURNING ai_requests_count INTO v_used;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'plan', 'free',
      'used', v_used,
      'limit', v_limit,
      'remaining', v_limit - v_used
    );
  END IF;

  SELECT COALESCE(ai_requests_count, 0)
  INTO v_used
  FROM public.usage_tracking
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'allowed', false,
    'plan', 'free',
    'used', COALESCE(v_used, v_limit),
    'limit', v_limit,
    'remaining', 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_user_ai_request(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  UPDATE public.usage_tracking
  SET ai_requests_count = GREATEST(0, ai_requests_count - 1)
  WHERE user_id = p_user_id
    AND date = CURRENT_DATE
    AND ai_requests_count > 0;
$$;

-- Reserve a guest slot and a broader per-network slot in one locked operation.
-- The network ceiling prevents clearing local storage from creating unbounded
-- provider spend while still allowing several drivers behind the same NAT.
CREATE OR REPLACE FUNCTION public.reserve_guest_ai_request(
  p_guest_key TEXT,
  p_network_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_guest_used INTEGER;
  v_network_used INTEGER;
  v_guest_limit CONSTANT INTEGER := 10;
  v_network_limit CONSTANT INTEGER := 100;
BEGIN
  IF p_guest_key !~ '^[0-9a-f]{64}$'
     OR p_network_key !~ '^[0-9a-f]{64}$'
     OR p_guest_key = p_network_key THEN
    RAISE EXCEPTION 'Invalid guest quota key';
  END IF;

  INSERT INTO public.guest_ai_usage (
    bucket_key, bucket_type, usage_date, ai_requests_count
  ) VALUES
    (p_guest_key, 'guest', CURRENT_DATE, 0),
    (p_network_key, 'network', CURRENT_DATE, 0)
  ON CONFLICT (bucket_key, usage_date) DO NOTHING;

  -- Lock in a stable order so simultaneous requests cannot overrun either cap.
  PERFORM 1
  FROM public.guest_ai_usage
  WHERE usage_date = CURRENT_DATE
    AND bucket_key IN (p_guest_key, p_network_key)
  ORDER BY bucket_key
  FOR UPDATE;

  SELECT ai_requests_count INTO v_guest_used
  FROM public.guest_ai_usage
  WHERE bucket_key = p_guest_key AND usage_date = CURRENT_DATE;

  SELECT ai_requests_count INTO v_network_used
  FROM public.guest_ai_usage
  WHERE bucket_key = p_network_key AND usage_date = CURRENT_DATE;

  IF v_guest_used >= v_guest_limit OR v_network_used >= v_network_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'plan', 'guest',
      'used', LEAST(v_guest_used, v_guest_limit),
      'limit', v_guest_limit,
      'remaining', GREATEST(0, v_guest_limit - v_guest_used)
    );
  END IF;

  UPDATE public.guest_ai_usage
  SET ai_requests_count = ai_requests_count + 1, updated_at = now()
  WHERE usage_date = CURRENT_DATE
    AND bucket_key IN (p_guest_key, p_network_key);

  v_guest_used := v_guest_used + 1;
  RETURN jsonb_build_object(
    'allowed', true,
    'plan', 'guest',
    'used', v_guest_used,
    'limit', v_guest_limit,
    'remaining', v_guest_limit - v_guest_used
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_guest_ai_request(
  p_guest_key TEXT,
  p_network_key TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  UPDATE public.guest_ai_usage
  SET ai_requests_count = GREATEST(0, ai_requests_count - 1),
      updated_at = now()
  WHERE usage_date = CURRENT_DATE
    AND bucket_key IN (p_guest_key, p_network_key)
    AND ai_requests_count > 0;
$$;

REVOKE ALL ON FUNCTION public.reserve_user_ai_request(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_user_ai_request(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_guest_ai_request(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_guest_ai_request(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_user_ai_request(UUID),
  public.release_user_ai_request(UUID),
  public.reserve_guest_ai_request(TEXT, TEXT),
  public.release_guest_ai_request(TEXT, TEXT)
  TO service_role;

-- Keep the client-visible free-tier counter consistent with the server limit.
CREATE OR REPLACE FUNCTION public.check_ai_limit(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_plan subscription_plan;
  v_status TEXT;
  v_limit CONSTANT INTEGER := 10;
  v_used INTEGER;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'unauthorized');
  END IF;

  SELECT plan, status INTO v_plan, v_status
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  IF v_plan IN ('pro', 'lifetime', 'owner', 'fleet')
     AND v_status IN ('active', 'trialing') THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'plan', v_plan,
      'used', 0,
      'limit', -1,
      'remaining', -1
    );
  END IF;

  SELECT COALESCE(ai_requests_count, 0) INTO v_used
  FROM public.usage_tracking
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'allowed', COALESCE(v_used, 0) < v_limit,
    'plan', COALESCE(v_plan, 'free'),
    'used', COALESCE(v_used, 0),
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - COALESCE(v_used, 0))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_limit(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_limit(UUID)
  TO authenticated, service_role;

COMMIT;
