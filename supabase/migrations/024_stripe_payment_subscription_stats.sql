-- Migration 024: Update get_subscription_stats() to distinguish Stripe-paid accounts
--
-- ever_paid     = all accounts that ever went through Stripe checkout (stripe_customer_id IS NOT NULL)
-- active_paid   = currently active Stripe subscriptions
-- paid_last_30d = active Stripe subscriptions whose billing cycle started within the last 30 days
--                 (i.e. the most recent payment occurred ≤ 30 days ago — "current subscribers")
--
-- The legacy `paying` column (which counted promo-code accounts as paid) is removed.

CREATE OR REPLACE FUNCTION public.get_subscription_stats()
RETURNS TABLE(
  ever_paid     integer,
  active_paid   integer,
  paid_last_30d integer,
  trialing      integer,
  free_plan     integer,
  canceled      integer,
  past_due      integer
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
    -- All accounts that ever completed a Stripe checkout
    COUNT(*) FILTER (
      WHERE stripe_customer_id IS NOT NULL
    )::integer AS ever_paid,

    -- Currently active Stripe subscriptions (basis for MRR)
    COUNT(*) FILTER (
      WHERE stripe_customer_id IS NOT NULL
        AND status = 'active'
    )::integer AS active_paid,

    -- Active Stripe subscriptions whose billing cycle started in the last 30 days
    -- For monthly plans this equals "paid within the last month" = current subscribers
    COUNT(*) FILTER (
      WHERE stripe_customer_id IS NOT NULL
        AND status = 'active'
        AND current_period_start >= now() - interval '30 days'
    )::integer AS paid_last_30d,

    COUNT(*) FILTER (WHERE status = 'trialing')::integer                         AS trialing,
    COUNT(*) FILTER (WHERE status = 'active' AND plan = 'free')::integer         AS free_plan,
    COUNT(*) FILTER (WHERE status = 'canceled')::integer                         AS canceled,
    COUNT(*) FILTER (WHERE status = 'past_due')::integer                         AS past_due
  FROM public.subscriptions;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_stats() TO authenticated;
