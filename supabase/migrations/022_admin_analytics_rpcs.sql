-- ─────────────────────────────────────────────────────────────
-- 021: Admin analytics RPC functions
-- ─────────────────────────────────────────────────────────────

-- Allow admins to read all profiles (for user-activity display)
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (is_marketing_admin());

-- ─── Subscription stats aggregate ───────────────────────────
CREATE OR REPLACE FUNCTION public.get_subscription_stats()
RETURNS TABLE(
  paying    integer,
  trialing  integer,
  free_plan integer,
  canceled  integer,
  past_due  integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_marketing_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'active'   AND plan IN ('pro','lifetime','owner','fleet'))::integer,
    COUNT(*) FILTER (WHERE status = 'trialing')::integer,
    COUNT(*) FILTER (WHERE status = 'active'   AND plan = 'free')::integer,
    COUNT(*) FILTER (WHERE status = 'canceled')::integer,
    COUNT(*) FILTER (WHERE status = 'past_due')::integer
  FROM public.subscriptions;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_stats() TO authenticated;

-- ─── Per-user activity summary ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_activity_summary()
RETURNS TABLE(
  user_id     uuid,
  email       text,
  event_count bigint,
  last_active timestamptz,
  first_seen  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_marketing_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    me.user_id,
    p.email,
    COUNT(*)::bigint                AS event_count,
    MAX(me.happened_at)             AS last_active,
    MIN(me.happened_at)             AS first_seen
  FROM public.marketing_events me
  LEFT JOIN public.profiles p ON me.user_id = p.id
  WHERE me.user_id IS NOT NULL
  GROUP BY me.user_id, p.email
  ORDER BY event_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_activity_summary() TO authenticated;
