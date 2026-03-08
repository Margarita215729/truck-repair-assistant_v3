-- ============================================================================
-- Truck Repair Assistant v3 — Parts Decision Fields
-- Migration 013: Add diagnostic-driven decision columns to parts table
-- ============================================================================

-- New decision-support columns for the Repair Parts module
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS oem_part_number       TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS alt_part_numbers      JSONB DEFAULT '[]';
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS root_cause_confidence TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS urgency               TEXT DEFAULT 'medium';
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS driveability          TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS action_type           TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS roadside_possible     BOOLEAN DEFAULT false;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS shop_required         BOOLEAN DEFAULT false;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS programming_required  BOOLEAN DEFAULT false;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS inspection_steps      JSONB DEFAULT '[]';
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS pair_with_parts       JSONB DEFAULT '[]';
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS bundle_label          TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS fitment_status        TEXT;

-- Index for common filter queries
CREATE INDEX IF NOT EXISTS idx_parts_urgency       ON public.parts (urgency)       WHERE urgency IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parts_action_type   ON public.parts (action_type)   WHERE action_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parts_driveability  ON public.parts (driveability)  WHERE driveability IS NOT NULL;
