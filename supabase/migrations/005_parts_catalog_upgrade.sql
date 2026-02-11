-- ============================================================================
-- 005: Parts Catalog Upgrade
-- Adds columns needed for production-ready parts catalog.
-- Run AFTER 004_seed_data.sql
-- ============================================================================

-- New columns for rich part data
ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS part_type TEXT DEFAULT 'aftermarket',
  ADD COLUMN IF NOT EXISTS installation_difficulty TEXT DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS price_min DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS price_max DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS compatible_makes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS year_range_from INT,
  ADD COLUMN IF NOT EXISTS year_range_to INT,
  ADD COLUMN IF NOT EXISTS average_lifespan TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS related_error_codes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_symptoms TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vendor_links JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS installation_guides JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai_suggested',
  ADD COLUMN IF NOT EXISTS importance TEXT DEFAULT 'recommended',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS why_needed TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fitment_confidence TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS installation_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS interchangeable_parts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS truck_context JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_parts_part_type ON public.parts(part_type);
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON public.parts(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_installation_difficulty ON public.parts(installation_difficulty);
CREATE INDEX IF NOT EXISTS idx_parts_source ON public.parts(source);
CREATE INDEX IF NOT EXISTS idx_parts_compatible_makes ON public.parts USING GIN(compatible_makes);
CREATE INDEX IF NOT EXISTS idx_parts_related_error_codes ON public.parts USING GIN(related_error_codes);

-- Full-text search index on name + description + part_number
CREATE INDEX IF NOT EXISTS idx_parts_search ON public.parts USING GIN(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(part_number, ''))
);

-- ============================================================================
-- RLS: Allow authenticated users to INSERT parts (from AI suggestions)
-- ============================================================================
CREATE POLICY "Authenticated users can insert parts"
  ON public.parts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update parts they added (for ratings, reviews, etc.)
CREATE POLICY "Users can update parts they added"
  ON public.parts FOR UPDATE
  USING (added_by = auth.uid());
