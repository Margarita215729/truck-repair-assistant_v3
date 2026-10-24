-- ============================================================================
-- Migration 029: UTM attribution columns on marketing_events
-- ============================================================================
-- Additive, nullable, no backfill. Existing RLS policies on
-- public.marketing_events (marketing_events_insert_client,
-- marketing_events_select_admin, marketing_events_admin_write) key only on
-- user_id / auth.uid() / profiles.role and need no change for this migration.

ALTER TABLE public.marketing_events
  ADD COLUMN IF NOT EXISTS utm_source   TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium   TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_term     TEXT,
  ADD COLUMN IF NOT EXISTS utm_content  TEXT,
  ADD COLUMN IF NOT EXISTS landing_path TEXT,
  ADD COLUMN IF NOT EXISTS referrer     TEXT;
