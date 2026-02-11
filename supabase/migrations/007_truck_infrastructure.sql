-- ============================================================================
-- 007: TRUCK INFRASTRUCTURE — Parking, Weigh Stations, Route Restrictions
-- Source: DOT/FMCSA public datasets, periodically ingested
-- ============================================================================

-- ============================================================================
-- 14. TRUCK PARKING (lots with occupancy data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.truck_parking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  address TEXT DEFAULT '',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  state_code CHAR(2) DEFAULT '',
  -- Capacity & occupancy
  total_spaces INT DEFAULT 0,
  available_spaces INT DEFAULT 0,
  occupancy_pct SMALLINT DEFAULT 0 CHECK (occupancy_pct >= 0 AND occupancy_pct <= 100),
  occupancy_status TEXT DEFAULT 'unknown' CHECK (occupancy_status IN ('open', 'partial', 'full', 'unknown')),
  occupancy_updated_at TIMESTAMPTZ,
  -- Amenities & meta
  parking_type TEXT DEFAULT 'public' CHECK (parking_type IN ('public_rest_area', 'truck_stop', 'private', 'public')),
  amenities TEXT[] DEFAULT '{}',          -- e.g. {'fuel','showers','food','wifi','scales','repair'}
  operator TEXT DEFAULT '',               -- e.g. 'Pilot Flying J', 'Love's'
  is24_hours BOOLEAN DEFAULT TRUE,
  phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  -- Data provenance
  source TEXT DEFAULT 'dot',              -- 'dot', 'fmcsa', 'manual'
  source_id TEXT DEFAULT '',              -- external ID from data source
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_truck_parking_coords ON public.truck_parking(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_truck_parking_state ON public.truck_parking(state_code);
CREATE INDEX IF NOT EXISTS idx_truck_parking_status ON public.truck_parking(occupancy_status);

-- ============================================================================
-- 15. WEIGH STATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weigh_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  address TEXT DEFAULT '',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  state_code CHAR(2) DEFAULT '',
  highway TEXT DEFAULT '',                -- e.g. 'I-95 NB'
  direction TEXT DEFAULT '',              -- NB, SB, EB, WB
  -- Status
  status TEXT DEFAULT 'unknown' CHECK (status IN ('open', 'closed', 'unknown')),
  status_updated_at TIMESTAMPTZ,
  -- Details
  scale_type TEXT DEFAULT 'static' CHECK (scale_type IN ('static', 'weigh_in_motion', 'both')),
  has_prepass BOOLEAN DEFAULT FALSE,
  has_bypass BOOLEAN DEFAULT FALSE,
  hours TEXT DEFAULT '',                  -- human-readable hours
  phone TEXT DEFAULT '',
  -- Data provenance
  source TEXT DEFAULT 'dot',
  source_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weigh_stations_coords ON public.weigh_stations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weigh_stations_state ON public.weigh_stations(state_code);
CREATE INDEX IF NOT EXISTS idx_weigh_stations_status ON public.weigh_stations(status);

-- ============================================================================
-- 16. TRUCK ROUTE RESTRICTIONS (point/segment-based clearance limits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.truck_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',          -- e.g. 'I-95 Bridge at Exit 42'
  description TEXT DEFAULT '',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  -- Optional second point for segment
  latitude_end DOUBLE PRECISION,
  longitude_end DOUBLE PRECISION,
  state_code CHAR(2) DEFAULT '',
  road_name TEXT DEFAULT '',
  -- Restriction values (NULL = no restriction of this type)
  height_ft DECIMAL(5,1),                 -- max height in feet
  weight_tons DECIMAL(6,1),               -- max weight in tons
  width_ft DECIMAL(5,1),                  -- max width in feet
  length_ft DECIMAL(6,1),                 -- max length in feet
  restriction_type TEXT DEFAULT 'height' CHECK (restriction_type IN ('height', 'weight', 'width', 'length', 'combined', 'bridge', 'tunnel', 'road')),
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  effective_date DATE,
  expiration_date DATE,                   -- NULL = permanent
  detour_info TEXT DEFAULT '',
  -- Data provenance
  source TEXT DEFAULT 'dot',
  source_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_truck_restrictions_coords ON public.truck_restrictions(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_truck_restrictions_state ON public.truck_restrictions(state_code);
CREATE INDEX IF NOT EXISTS idx_truck_restrictions_type ON public.truck_restrictions(restriction_type);
CREATE INDEX IF NOT EXISTS idx_truck_restrictions_active ON public.truck_restrictions(is_active);

-- ============================================================================
-- RLS POLICIES — Public read, service-role write (for ETL ingest)
-- ============================================================================

ALTER TABLE public.truck_parking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weigh_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_restrictions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read infrastructure data
CREATE POLICY "Anyone can read truck parking"
  ON public.truck_parking FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read weigh stations"
  ON public.weigh_stations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read truck restrictions"
  ON public.truck_restrictions FOR SELECT
  USING (true);

-- Service role can insert/update (for ETL ingest jobs)
CREATE POLICY "Service role can manage truck parking"
  ON public.truck_parking FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage weigh stations"
  ON public.weigh_stations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage truck restrictions"
  ON public.truck_restrictions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- updated_at triggers
-- ============================================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.truck_parking FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.weigh_stations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.truck_restrictions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- Helper: find nearby records by coord bounding box (used from client RPC)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.nearby_truck_parking(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_miles DOUBLE PRECISION DEFAULT 50
)
RETURNS SETOF public.truck_parking AS $$
DECLARE
  lat_delta DOUBLE PRECISION := p_radius_miles / 69.0;
  lng_delta DOUBLE PRECISION := p_radius_miles / (69.0 * COS(RADIANS(p_lat)));
BEGIN
  RETURN QUERY
    SELECT *
    FROM public.truck_parking
    WHERE latitude  BETWEEN p_lat - lat_delta AND p_lat + lat_delta
      AND longitude BETWEEN p_lng - lng_delta AND p_lng + lng_delta
    ORDER BY
      SQRT(POWER(latitude - p_lat, 2) + POWER(longitude - p_lng, 2))
    LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.nearby_weigh_stations(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_miles DOUBLE PRECISION DEFAULT 50
)
RETURNS SETOF public.weigh_stations AS $$
DECLARE
  lat_delta DOUBLE PRECISION := p_radius_miles / 69.0;
  lng_delta DOUBLE PRECISION := p_radius_miles / (69.0 * COS(RADIANS(p_lat)));
BEGIN
  RETURN QUERY
    SELECT *
    FROM public.weigh_stations
    WHERE latitude  BETWEEN p_lat - lat_delta AND p_lat + lat_delta
      AND longitude BETWEEN p_lng - lng_delta AND p_lng + lng_delta
    ORDER BY
      SQRT(POWER(latitude - p_lat, 2) + POWER(longitude - p_lng, 2))
    LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.nearby_truck_restrictions(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_miles DOUBLE PRECISION DEFAULT 50
)
RETURNS SETOF public.truck_restrictions AS $$
DECLARE
  lat_delta DOUBLE PRECISION := p_radius_miles / 69.0;
  lng_delta DOUBLE PRECISION := p_radius_miles / (69.0 * COS(RADIANS(p_lat)));
BEGIN
  RETURN QUERY
    SELECT *
    FROM public.truck_restrictions
    WHERE is_active = TRUE
      AND latitude  BETWEEN p_lat - lat_delta AND p_lat + lat_delta
      AND longitude BETWEEN p_lng - lng_delta AND p_lng + lng_delta
    ORDER BY
      SQRT(POWER(latitude - p_lat, 2) + POWER(longitude - p_lng, 2))
    LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;
