-- ============================================================================
-- Truck Repair Assistant v3 — Telematics / Truck Computer State Module
-- Migration 012: Complete schema for event-driven telematics ingestion
-- ============================================================================

-- ============================================================================
-- 1. TELEMATICS CONNECTIONS — OAuth-linked provider accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.telematics_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('samsara','motive')),
  provider_org_id     TEXT,
  provider_company_id TEXT,
  provider_vehicle_id TEXT,
  provider_device_id  TEXT,
  token_ref           TEXT NOT NULL,
  access_expires_at   TIMESTAMPTZ,
  scopes_granted      TEXT[],
  status        TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','needs_reauth','revoked','error')),
  webhook_secret_ref  TEXT,
  webhook_id          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telematics_connections_user ON public.telematics_connections(user_id);
CREATE INDEX idx_telematics_connections_provider ON public.telematics_connections(provider, provider_vehicle_id);

-- ============================================================================
-- 2. OAUTH SESSIONS — Temporary state for OAuth flow
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.oauth_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  state            TEXT NOT NULL UNIQUE,
  code_verifier_hash TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_oauth_sessions_state ON public.oauth_sessions(state);

-- ============================================================================
-- 3. FAULT EVENTS RAW — Immutable webhook/sync payload archive
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fault_events_raw (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  provider_event_id TEXT,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature_valid  BOOLEAN NOT NULL,
  payload_json     JSONB NOT NULL
);

CREATE INDEX idx_fault_events_raw_user ON public.fault_events_raw(user_id, received_at DESC);

-- ============================================================================
-- 4. FAULT EVENTS NORMALIZED — Unified fault/event layer
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fault_events_normalized (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_profile_id  UUID,
  provider            TEXT NOT NULL,
  provider_vehicle_id TEXT,
  code_type           TEXT NOT NULL CHECK (code_type IN ('J1939','OBDII','OEM','UNKNOWN')),
  spn                 INT,
  fmi                 INT,
  dtc                 TEXT,
  oem_code            TEXT,
  severity            TEXT NOT NULL DEFAULT 'warning'
                         CHECK (severity IN ('info','warning','critical')),
  status              TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','cleared')),
  first_seen_at       TIMESTAMPTZ NOT NULL,
  last_seen_at        TIMESTAMPTZ NOT NULL,
  observed_at         TIMESTAMPTZ NOT NULL,
  source_raw_id       UUID REFERENCES public.fault_events_raw(id)
);

-- Idempotency index: prevent duplicate fault inserts
CREATE UNIQUE INDEX idx_fault_normalized_idempotent
  ON public.fault_events_normalized(provider, provider_vehicle_id, COALESCE(dtc,''), COALESCE(oem_code,''), spn, fmi, first_seen_at);

CREATE INDEX idx_fault_normalized_user ON public.fault_events_normalized(user_id, observed_at DESC);
CREATE INDEX idx_fault_normalized_vehicle ON public.fault_events_normalized(provider_vehicle_id, observed_at DESC);

-- ============================================================================
-- 5. VEHICLE SIGNAL EVENTS — Time-series truck-computer signals
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vehicle_signal_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_profile_id  UUID,
  provider            TEXT NOT NULL,
  provider_vehicle_id TEXT,
  signal_name         TEXT NOT NULL,
  numeric_value       DOUBLE PRECISION,
  text_value          TEXT,
  bool_value          BOOLEAN,
  unit                TEXT,
  observed_at         TIMESTAMPTZ NOT NULL,
  source_raw_id       UUID REFERENCES public.fault_events_raw(id)
);

CREATE INDEX idx_vehicle_signals_user ON public.vehicle_signal_events(user_id, observed_at DESC);
CREATE INDEX idx_vehicle_signals_vehicle ON public.vehicle_signal_events(provider_vehicle_id, signal_name, observed_at DESC);

-- ============================================================================
-- 6. VEHICLE OPERATIONAL EVENTS — Non-fault state transitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vehicle_operational_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_profile_id  UUID,
  provider            TEXT NOT NULL,
  provider_vehicle_id TEXT,
  event_type          TEXT NOT NULL,
  event_payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at         TIMESTAMPTZ NOT NULL,
  source_raw_id       UUID REFERENCES public.fault_events_raw(id)
);

CREATE INDEX idx_vehicle_ops_user ON public.vehicle_operational_events(user_id, observed_at DESC);
CREATE INDEX idx_vehicle_ops_vehicle ON public.vehicle_operational_events(provider_vehicle_id, event_type, observed_at DESC);

-- ============================================================================
-- 7. VEHICLE DEFECT EVENTS — Inspection / DVIR context
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vehicle_defect_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_profile_id  UUID,
  provider            TEXT,
  provider_vehicle_id TEXT,
  defect_type         TEXT,
  severity            TEXT,
  status              TEXT,
  notes               TEXT,
  reported_at         TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  source_raw_id       UUID REFERENCES public.fault_events_raw(id)
);

CREATE INDEX idx_vehicle_defects_user ON public.vehicle_defect_events(user_id);

-- ============================================================================
-- 8. VEHICLE SYSTEM SNAPSHOTS — Analysis-ready assembled view
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vehicle_system_snapshots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_profile_id      UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_freshness_seconds  INT NOT NULL,
  signals_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
  active_faults_json      JSONB NOT NULL DEFAULT '[]'::jsonb,
  operational_context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeline_json           JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_status          TEXT NOT NULL DEFAULT 'unknown'
                             CHECK (summary_status IN ('ok','warning','critical','unknown')),
  explanation_text        TEXT,
  actions_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
  improbability_flag      BOOLEAN NOT NULL DEFAULT false,
  improbability_reason    TEXT
);

CREATE INDEX idx_vehicle_snapshots_user ON public.vehicle_system_snapshots(user_id, created_at DESC);
CREATE INDEX idx_vehicle_snapshots_vehicle ON public.vehicle_system_snapshots(vehicle_profile_id, created_at DESC);

-- ============================================================================
-- 9. ENCRYPTED TOKEN STORE — For OAuth refresh/access tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.encrypted_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_ref    TEXT NOT NULL UNIQUE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_encrypted_tokens_ref ON public.encrypted_tokens(token_ref);

-- ============================================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.telematics_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fault_events_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fault_events_normalized ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_signal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_operational_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_defect_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_system_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encrypted_tokens ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see/modify their own rows
CREATE POLICY telematics_connections_owner ON public.telematics_connections
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY oauth_sessions_owner ON public.oauth_sessions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY fault_events_raw_owner ON public.fault_events_raw
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY fault_events_normalized_owner ON public.fault_events_normalized
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY vehicle_signal_events_owner ON public.vehicle_signal_events
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY vehicle_operational_events_owner ON public.vehicle_operational_events
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY vehicle_defect_events_owner ON public.vehicle_defect_events
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY vehicle_system_snapshots_owner ON public.vehicle_system_snapshots
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY encrypted_tokens_owner ON public.encrypted_tokens
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 11. updated_at TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_telematics_connections_updated
  BEFORE UPDATE ON public.telematics_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_encrypted_tokens_updated
  BEFORE UPDATE ON public.encrypted_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
