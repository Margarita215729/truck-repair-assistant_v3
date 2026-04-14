-- ============================================================================
-- Migration 020: Marketing management tools schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.marketing_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  north_star_metric TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  target_audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  filter_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_size INTEGER,
  is_dynamic BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES public.marketing_strategies(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES public.marketing_segments(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  message_template TEXT,
  trigger_event TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed')),
  budget_usd NUMERIC(12,2) DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  goals JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hypothesis TEXT NOT NULL,
  success_metric TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'stopped')),
  variant_a JSONB NOT NULL DEFAULT '{}'::jsonb,
  variant_b JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  comparator TEXT NOT NULL CHECK (comparator IN ('lt', 'gt', 'eq', 'lte', 'gte')),
  threshold_value NUMERIC(12,4) NOT NULL,
  lookback_days INTEGER NOT NULL DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'muted')),
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_strategy ON public.marketing_campaigns(strategy_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_event_props_gin ON public.marketing_events USING GIN (event_props);

ALTER TABLE public.marketing_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_marketing_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'marketing_analyst')
  );
$$;

CREATE POLICY marketing_strategies_admin_all
  ON public.marketing_strategies FOR ALL
  USING (public.is_marketing_admin())
  WITH CHECK (public.is_marketing_admin());

CREATE POLICY marketing_segments_admin_all
  ON public.marketing_segments FOR ALL
  USING (public.is_marketing_admin())
  WITH CHECK (public.is_marketing_admin());

CREATE POLICY marketing_campaigns_admin_all
  ON public.marketing_campaigns FOR ALL
  USING (public.is_marketing_admin())
  WITH CHECK (public.is_marketing_admin());

CREATE POLICY marketing_experiments_admin_all
  ON public.marketing_experiments FOR ALL
  USING (public.is_marketing_admin())
  WITH CHECK (public.is_marketing_admin());

CREATE POLICY marketing_alert_rules_admin_all
  ON public.marketing_alert_rules FOR ALL
  USING (public.is_marketing_admin())
  WITH CHECK (public.is_marketing_admin());

CREATE TRIGGER trg_marketing_strategies_updated
  BEFORE UPDATE ON public.marketing_strategies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_marketing_segments_updated
  BEFORE UPDATE ON public.marketing_segments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_marketing_campaigns_updated
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_marketing_experiments_updated
  BEFORE UPDATE ON public.marketing_experiments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_marketing_alert_rules_updated
  BEFORE UPDATE ON public.marketing_alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
