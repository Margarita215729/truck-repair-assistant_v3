-- ============================================================
--  021: Signal events TTL cleanup
--  Adds a scheduled function to delete vehicle_signal_events
--  older than 30 days, keeping the table from growing unbounded.
-- ============================================================

-- 1) Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_signal_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.vehicle_signal_events
  WHERE observed_at < now() - interval '30 days';
$$;

-- 2) pg_cron schedule (runs daily at 03:00 UTC)
--    Requires pg_cron extension enabled in Supabase dashboard.
--    If pg_cron is not enabled, run the function manually or via
--    a Vercel cron / GitHub Action instead.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-signal-events',
      '0 3 * * *',
      'SELECT public.cleanup_old_signal_events()'
    );
  END IF;
END $$;
