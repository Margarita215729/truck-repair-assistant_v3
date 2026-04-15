-- Clean up old vehicle_signal_events rows (>30 days)
CREATE OR REPLACE FUNCTION cleanup_old_signal_events()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM vehicle_signal_events
  WHERE created_at < now() - interval '30 days';
END;
$$;

-- Schedule daily at 03:00 UTC via pg_cron (requires pg_cron extension)
SELECT cron.schedule(
  'cleanup_old_signal_events',
  '0 3 * * *',
  $$SELECT cleanup_old_signal_events()$$
);
