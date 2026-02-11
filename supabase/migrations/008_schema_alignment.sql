-- ============================================================================
-- Schema Alignment — Add missing columns expected by application code
-- Run AFTER 007_truck_infrastructure.sql
-- ============================================================================

-- ============================================================================
-- 1. TRUCKS — Add extended vehicle detail columns
--    TruckDetailModal sends these fields but the table didn't have them.
-- ============================================================================

ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS engine_displacement TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS transmission_model  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fuel_type           TEXT DEFAULT 'diesel',
  ADD COLUMN IF NOT EXISTS tire_size           TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fluid_capacities    JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS modifications       TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS maintenance_notes   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS images              TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS manuals             JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- 2. DIAGNOSTIC REPORTS — Add columns expected by generateReport() and
--    ReportCard / ReportDetail components.
--    Original table only had: title, content, error_codes, summary, severity.
--    The app writes and reads: truck_info, report_type, diagnosis_summary,
--    report_data, error_codes_analysis, identified_issues, recommendations,
--    estimated_costs, sources.
-- ============================================================================

ALTER TABLE public.diagnostic_reports
  ADD COLUMN IF NOT EXISTS truck_info           JSONB,
  ADD COLUMN IF NOT EXISTS report_type          TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS diagnosis_summary    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS report_data          JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS error_codes_analysis JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS identified_issues    JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommendations      JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_costs      JSONB,
  ADD COLUMN IF NOT EXISTS sources              JSONB DEFAULT '[]'::jsonb;
