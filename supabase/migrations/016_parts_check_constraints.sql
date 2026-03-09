-- ============================================================================
-- Migration 016: Add CHECK constraints on parts enum-like fields
-- Prevents invalid values from being written to urgency, driveability,
-- action_type, fitment_status, importance, and installation_difficulty.
-- ============================================================================

ALTER TABLE public.parts
  DROP CONSTRAINT IF EXISTS chk_parts_urgency,
  DROP CONSTRAINT IF EXISTS chk_parts_driveability,
  DROP CONSTRAINT IF EXISTS chk_parts_action_type,
  DROP CONSTRAINT IF EXISTS chk_parts_fitment_status,
  DROP CONSTRAINT IF EXISTS chk_parts_importance,
  DROP CONSTRAINT IF EXISTS chk_parts_installation_difficulty;

ALTER TABLE public.parts
  ADD CONSTRAINT chk_parts_urgency
    CHECK (urgency IS NULL OR urgency IN ('critical', 'high', 'medium', 'low')),
  ADD CONSTRAINT chk_parts_driveability
    CHECK (driveability IS NULL OR driveability IN ('do_not_drive', 'limp_mode', 'reduced_performance', 'safe_to_drive')),
  ADD CONSTRAINT chk_parts_action_type
    CHECK (action_type IS NULL OR action_type IN ('replace_now', 'inspect_first', 'order_ahead', 'monitor')),
  ADD CONSTRAINT chk_parts_fitment_status
    CHECK (fitment_status IS NULL OR fitment_status IN ('confirmed', 'likely', 'unverified')),
  ADD CONSTRAINT chk_parts_importance
    CHECK (importance IS NULL OR importance IN ('required', 'recommended', 'optional')),
  ADD CONSTRAINT chk_parts_installation_difficulty
    CHECK (installation_difficulty IS NULL OR installation_difficulty IN ('easy', 'moderate', 'difficult', 'professional'));
