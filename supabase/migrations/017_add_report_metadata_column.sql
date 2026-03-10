-- ============================================================================
-- Add metadata column to diagnostic_reports
-- The generateReport() function writes a metadata JSONB object with
-- schema_version, model_version, generation_timestamp, etc.
-- Run AFTER 016_parts_check_constraints.sql
-- ============================================================================

ALTER TABLE public.diagnostic_reports
  ADD COLUMN IF NOT EXISTS metadata JSONB;
