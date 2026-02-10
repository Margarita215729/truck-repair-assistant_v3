-- ============================================================================
-- Seed Data — Test promo codes
-- Run AFTER all migrations
-- ============================================================================

-- Lifetime promo code for testing / early adopters
INSERT INTO public.promo_codes (code, type, max_uses, valid_until, active)
VALUES
  ('EARLYBIRD2026', 'lifetime', 100, '2027-12-31 23:59:59+00', true),
  ('TRUCKPRO', 'lifetime', 50, '2026-12-31 23:59:59+00', true),
  ('BETATESTER', 'lifetime', 500, NULL, true)
ON CONFLICT (code) DO NOTHING;
