/**
 * OAuth Start — Initiates OAuth flow for a telematics provider
 *
 * GET /api/telematics/oauth-start?provider=samsara|motive
 *
 * Requires authenticated Supabase user (JWT in Authorization header).
 * Creates an oauth_sessions row and redirects to the provider's OAuth URL.
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const PROVIDERS = {
  samsara: {
    authType: 'oauth',
    authUrl: 'https://api.samsara.com/oauth2/authorize',
    clientId: () => process.env.SAMSARA_CLIENT_ID,
    redirectUri: () => process.env.SAMSARA_REDIRECT_URI,
    scopes: 'vehicles:read fleet:read',
  },
  motive: {
    authType: 'oauth',
    authUrl: 'https://api.gomotive.com/oauth/authorize',
    clientId: () => process.env.MOTIVE_CLIENT_ID,
    redirectUri: () => process.env.MOTIVE_REDIRECT_URI,
    scopes: 'vehicles.read faults.read locations.read dvirs.read',
  },
  // Credential-based providers — these use /api/telematics/credential-connect instead
  geotab: {
    authType: 'credentials',
    requiredFields: ['database', 'userName', 'password'],
    optionalFields: ['server'],
    connectEndpoint: '/api/telematics/credential-connect',
  },
  verizonconnect: {
    authType: 'credentials',
    requiredFields: ['apiKey', 'apiSecret'],
    connectEndpoint: '/api/telematics/credential-connect',
  },
  omnitracs: {
    authType: 'credentials',
    requiredFields: ['apiKey', 'apiSecret'],
    connectEndpoint: '/api/telematics/credential-connect',
  },
};

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Auth
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const sb = getSupabase();
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    // Provider
    const provider = req.query.provider;
    const cfg = PROVIDERS[provider];
    if (!cfg) return res.status(400).json({ error: `Unsupported provider: ${provider}` });

    // Credential-based providers — return connection info instead of OAuth URL
    if (cfg.authType === 'credentials') {
      return res.status(200).json({
        authType: 'credentials',
        provider,
        requiredFields: cfg.requiredFields || [],
        optionalFields: cfg.optionalFields || [],
        connectEndpoint: cfg.connectEndpoint,
      });
    }

    const clientId = cfg.clientId();
    const redirectUri = cfg.redirectUri();
    if (!clientId || !redirectUri) {
      return res.status(500).json({ error: `${provider} OAuth not configured` });
    }

    // Generate secure state
    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Persist session
    const { error: insertErr } = await sb.from('oauth_sessions').insert({
      user_id: user.id,
      provider,
      state,
      expires_at: expiresAt.toISOString(),
    });
    if (insertErr) {
      console.error('oauth_sessions insert error:', insertErr);
      return res.status(500).json({ error: 'Failed to create OAuth session' });
    }

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: cfg.scopes,
      state,
    });

    const authorizationUrl = `${cfg.authUrl}?${params.toString()}`;
    return res.status(200).json({ url: authorizationUrl });
  } catch (err) {
    console.error('OAuth start error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
