-- ─────────────────────────────────────────────────────────────────────────────
-- 025_admin_marketing_operations.sql
--
-- Makes the admin marketing tools fully operational instead of write-only:
--   * compute_marketing_metric()   → resolves a metric_key to a live numeric value
--   * evaluate_marketing_alerts()   → runs every alert rule against live data,
--                                      records breaches in last_triggered_at and
--                                      returns the current value + breach state
--   * refresh_segment_sizes()       → recomputes estimated_size for dynamic
--                                      event-count segments from marketing_events
--
-- All functions are SECURITY DEFINER and gated by is_marketing_admin().
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Metric resolver ──────────────────────────────────────────────────────────
-- Resolves a supported metric_key into a single numeric value over the given
-- lookback window. Internal helper; not granted to clients directly. It is only
-- reachable through evaluate_marketing_alerts() (which enforces admin access).
CREATE OR REPLACE FUNCTION public.compute_marketing_metric(
  p_metric_key    text,
  p_lookback_days integer
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz := now() - make_interval(days => GREATEST(COALESCE(p_lookback_days, 7), 1));
  v_value        numeric := 0;
  v_n            integer;
  v_total        integer;
  v_retained     integer;
BEGIN
  IF p_metric_key IN ('active_users', 'wau', 'mau') THEN
    SELECT COUNT(DISTINCT user_id)
      INTO v_value
      FROM public.marketing_events
     WHERE user_id IS NOT NULL
       AND happened_at >= v_window_start;

  ELSIF p_metric_key = 'new_users' THEN
    SELECT COUNT(*)
      INTO v_value
      FROM (
        SELECT user_id
          FROM public.marketing_events
         WHERE user_id IS NOT NULL
         GROUP BY user_id
        HAVING MIN(happened_at) >= v_window_start
      ) t;

  ELSIF p_metric_key IN ('paid_conversions', 'checkout_conversions') THEN
    SELECT COUNT(DISTINCT user_id)
      INTO v_value
      FROM public.marketing_events
     WHERE user_id IS NOT NULL
       AND event_name = 'checkout_completed'
       AND happened_at >= v_window_start;

  ELSIF p_metric_key = 'checkout_conversion_rate' THEN
    SELECT CASE
             WHEN COUNT(DISTINCT user_id) > 0
               THEN COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'checkout_completed')::numeric
                    / COUNT(DISTINCT user_id) * 100
             ELSE 0
           END
      INTO v_value
      FROM public.marketing_events
     WHERE user_id IS NOT NULL
       AND happened_at >= v_window_start;

  ELSIF p_metric_key = 'signups' THEN
    SELECT COUNT(*)
      INTO v_value
      FROM public.marketing_events
     WHERE event_name = 'auth_signup_completed'
       AND happened_at >= v_window_start;

  ELSIF p_metric_key = 'events_total' THEN
    SELECT COUNT(*)
      INTO v_value
      FROM public.marketing_events
     WHERE happened_at >= v_window_start;

  ELSIF p_metric_key = 'active_subscribers' THEN
    SELECT COUNT(*)
      INTO v_value
      FROM public.subscriptions
     WHERE status = 'active'
       AND stripe_customer_id IS NOT NULL;

  ELSIF p_metric_key = 'churn_rate' THEN
    SELECT CASE
             WHEN (active_cnt + canceled_cnt) > 0
               THEN canceled_cnt::numeric / (active_cnt + canceled_cnt) * 100
             ELSE 0
           END
      INTO v_value
      FROM (
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')   AS active_cnt,
          COUNT(*) FILTER (WHERE status = 'canceled') AS canceled_cnt
          FROM public.subscriptions
      ) s;

  ELSIF p_metric_key ~ '^d[0-9]+_retention$' THEN
    v_n := substring(p_metric_key FROM 'd([0-9]+)_retention')::integer;

    WITH first_seen AS (
      SELECT user_id, date_trunc('day', MIN(happened_at)) AS start_day, MIN(happened_at) AS fs
        FROM public.marketing_events
       WHERE user_id IS NOT NULL
       GROUP BY user_id
    ),
    cohort AS (
      SELECT user_id, start_day
        FROM first_seen
       WHERE fs <= now() - make_interval(days => v_n)
    )
    SELECT
      COUNT(*)::integer,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
            FROM public.marketing_events e
           WHERE e.user_id = c.user_id
             AND date_trunc('day', e.happened_at) = c.start_day + make_interval(days => v_n)
        )
      )::integer
      INTO v_total, v_retained
      FROM cohort c;

    v_value := CASE WHEN v_total > 0 THEN v_retained::numeric / v_total * 100 ELSE 0 END;

  ELSE
    v_value := 0;
  END IF;

  RETURN COALESCE(v_value, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compute_marketing_metric(text, integer) FROM PUBLIC;

-- ── Alert rule evaluator ─────────────────────────────────────────────────────
-- Runs every alert rule against live metrics. For active rules that breach their
-- threshold, last_triggered_at is stamped with now(). Returns every rule with its
-- freshly computed value and breach flag so the dashboard can surface alerts.
CREATE OR REPLACE FUNCTION public.evaluate_marketing_alerts()
RETURNS TABLE(
  id                uuid,
  name              text,
  metric_key        text,
  comparator        text,
  threshold_value   numeric,
  lookback_days     integer,
  current_value     numeric,
  breached          boolean,
  status            text,
  last_triggered_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r          record;
  v_value    numeric;
  v_breached boolean;
BEGIN
  IF NOT is_marketing_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR r IN
    SELECT * FROM public.marketing_alert_rules ORDER BY created_at DESC
  LOOP
    v_value := public.compute_marketing_metric(r.metric_key, r.lookback_days);

    v_breached := CASE r.comparator
      WHEN 'lt'  THEN v_value <  r.threshold_value
      WHEN 'lte' THEN v_value <= r.threshold_value
      WHEN 'gt'  THEN v_value >  r.threshold_value
      WHEN 'gte' THEN v_value >= r.threshold_value
      WHEN 'eq'  THEN v_value =  r.threshold_value
      ELSE false
    END;

    IF v_breached AND r.status = 'active' THEN
      UPDATE public.marketing_alert_rules
         SET last_triggered_at = now()
       WHERE public.marketing_alert_rules.id = r.id;
      r.last_triggered_at := now();
    END IF;

    id                := r.id;
    name              := r.name;
    metric_key        := r.metric_key;
    comparator        := r.comparator;
    threshold_value   := r.threshold_value;
    lookback_days     := r.lookback_days;
    current_value     := round(v_value, 2);
    breached          := v_breached;
    status            := r.status;
    last_triggered_at := r.last_triggered_at;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.evaluate_marketing_alerts() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.evaluate_marketing_alerts() TO authenticated;

-- ── Segment size refresher ───────────────────────────────────────────────────
-- Recomputes estimated_size for every active dynamic segment that uses the
-- event_count_threshold filter and returns the recomputed sizes.
CREATE OR REPLACE FUNCTION public.refresh_segment_sizes()
RETURNS TABLE(
  id             uuid,
  name           text,
  estimated_size integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r       record;
  v_size  integer;
  v_event text;
  v_min   integer;
BEGIN
  IF NOT is_marketing_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR r IN
    SELECT * FROM public.marketing_segments WHERE status = 'active'
  LOOP
    IF (r.filter_definition->>'type') = 'event_count_threshold' THEN
      v_event := r.filter_definition->>'event';
      v_min   := COALESCE(NULLIF(r.filter_definition->>'min_count', '')::integer, 1);

      SELECT COUNT(*)
        INTO v_size
        FROM (
          SELECT user_id
            FROM public.marketing_events
           WHERE user_id IS NOT NULL
             AND event_name = v_event
           GROUP BY user_id
          HAVING COUNT(*) >= v_min
        ) t;
    ELSE
      v_size := NULL;
    END IF;

    UPDATE public.marketing_segments
       SET estimated_size = v_size
     WHERE public.marketing_segments.id = r.id;

    id             := r.id;
    name           := r.name;
    estimated_size := v_size;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_segment_sizes() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.refresh_segment_sizes() TO authenticated;
