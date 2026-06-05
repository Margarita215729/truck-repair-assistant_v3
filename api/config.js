/**
 * Public client configuration endpoint.
 *
 * Returns Supabase URL and anon key so the frontend can initialise its client
 * at runtime even when VITE_SUPABASE_* vars were not embedded at build time.
 * The anon key is intentionally public (it is designed for client-side use).
 * Never include service-role keys or any other server-side secrets here.
 */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[api/config] Supabase configuration missing — set SUPABASE_URL and SUPABASE_ANON_KEY in environment variables.',
    );
    return res.status(503).json({
      error: 'Service configuration incomplete',
      supabaseUrl: '',
      supabaseAnonKey: '',
    });
  }

  // Cache aggressively — these values only change on redeploy.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({ supabaseUrl, supabaseAnonKey });
}
