-- ============================================================================
-- Migration 019: Marketing analytics event layer + admin access policy
-- ============================================================================

-- Event stream for product, onboarding, retention and campaign analytics
CREATE TABLE IF NOT EXISTS public.marketing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  anon_id TEXT,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'product',
  source TEXT,
  page_path TEXT,
  event_props JSONB NOT NULL DEFAULT '{}'::jsonb,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_events_happened_at
  ON public.marketing_events (happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_events_event_name
  ON public.marketing_events (event_name, happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_events_user
  ON public.marketing_events (user_id, happened_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_events_category
  ON public.marketing_events (event_category, happened_at DESC);

ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;

-- Insert policy supports both authenticated and anonymous sessions.
-- Anonymous users can only insert events with user_id = NULL.
CREATE POLICY marketing_events_insert_client
  ON public.marketing_events
  FOR INSERT
  WITH CHECK (
    (
      auth.uid() IS NOT NULL
      AND user_id = auth.uid()
    )
    OR
    (
      auth.uid() IS NULL
      AND user_id IS NULL
    )
  );

-- Read access is restricted to admins/marketing analysts only.
CREATE POLICY marketing_events_select_admin
  ON public.marketing_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'marketing_analyst')
    )
  );

-- Optional admin write access for data correction/backfills.
CREATE POLICY marketing_events_admin_write
  ON public.marketing_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'marketing_analyst')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'marketing_analyst')
    )
  );
