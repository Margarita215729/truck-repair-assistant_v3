-- ============================================================================
-- Migration 018: Extend telematics_connections for credential-based providers
-- (Geotab, Verizon Connect, Omnitracs) and feed poller metadata
-- ============================================================================

-- 1. Drop old CHECK and widen provider enum to include credential-based providers
ALTER TABLE public.telematics_connections
  DROP CONSTRAINT IF EXISTS telematics_connections_provider_check;

ALTER TABLE public.telematics_connections
  ADD CONSTRAINT telematics_connections_provider_check
  CHECK (provider IN ('samsara','motive','geotab','verizonconnect','omnitracs'));

-- 2. Add missing columns used by geotab-feed.js and credential-connect.js
ALTER TABLE public.telematics_connections
  ADD COLUMN IF NOT EXISTS vehicle_profile_id UUID,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auth_type TEXT DEFAULT 'oauth'
    CHECK (auth_type IN ('oauth','credentials'));
