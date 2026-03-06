/**
 * OAuth Callback — Handles the provider’s OAuth redirect
 *
 * GET /api/telematics/oauth-callback?code=...&state=...
 *
 * 1. Validates state against oauth_sessions
 * 2. Exchanges auth code for tokens
 * 3. Encrypts & stores tokens via TokenVault
 * 4. Upserts telematics_connections
 * 5. Fetches vehicles and auto-maps if single vehicle
 * 6. Redirects to app
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { saveTokens } from './lib/tokenVault.js';

const PROVIDERS = {
  samsara: {
    tokenUrl: 'https://api.samsara.com/oauth2/token',
    clientId: () => process.env.SAMSARA_CLIENT_ID,
    clientSecret: () => process.env.SAMSARA_CLIENT_SECRET,
    redirectUri: () => process.env.SAMSARA_REDIRECT_URI,
    fetchVehicles: async (accessToken) => {
      const { fetchVehicles } = await import('./lib/providers/samsara.js');
      return fetchVehicles({ accessToken });
    },
  },
  motive: {
    tokenUrl: 'https://api.gomotive.com/oauth/token',
    clientId: () => process.env.MOTIVE_CLIENT_ID,
    clientSecret: () => process.env.MOTIVE_CLIENT_SECRET,
    redirectUri: () => process.env.MOTIVE_REDIRECT_URI,
    fetchVehicles: async (accessToken) => {
      const { fetchVehicles } = await import('./lib/providers/motive.js');
      return fetchVehicles({ accessToken });
    },
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

  const { code, state, error: oauthError } = req.query;
  const appBaseUrl = process.env.APP_BASE_URL || 'https://truck-repair-assistant.vercel.app';

  if (oauthError) {
    return res.redirect(302, `${appBaseUrl}/Profile?telematics_error=${encodeURIComponent(oauthError)}`);
  }

  if (!code || !state) {
    return res.redirect(302, `${appBaseUrl}/Profile?telematics_error=missing_params`);
  }

  const sb = getSupabase();

  try {
    // 1. Validate state
    const { data: session, error: sessErr } = await sb
      .from('oauth_sessions')
      .select('*')
      .eq('state', state)
      .single();

    if (sessErr || !session) {
      return res.redirect(302, `${appBaseUrl}/Profile?telematics_error=invalid_state`);
    }

    if (new Date(session.expires_at) < new Date()) {
      await sb.from('oauth_sessions').delete().eq('id', session.id);
      return res.redirect(302, `${appBaseUrl}/Profile?telematics_error=expired`);
    }

    // Constant-time state comparison
    const stateValid = crypto.timingSafeEqual(
      Buffer.from(state),
      Buffer.from(session.state)
    );
    if (!stateValid) {
      return res.redirect(302, `${appBaseUrl}/Profile?telematics_error=invalid_state`);
    }

    const provider = session.provider;
    const cfg = PROVIDERS[provider];
    if (!cfg) {
      return res.redirect(302, `${appBaseUrl}/Profile?telematics_error=unknown_provider`);
    }

    // 2. Exchange code for tokens
    const tokenResp = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: cfg.clientId(),
        client_secret: cfg.clientSecret(),
        redirect_uri: cfg.redirectUri(),
      }),
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      console.error(`Token exchange failed for ${provider}:`, errText);
      return res.redirect(302, `${appBaseUrl}/Profile?telematics_error=token_exchange_failed`);
    }

    const tokenData = await tokenResp.json();
    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
      scope: tokenData.scope || null,
      token_type: tokenData.token_type || 'Bearer',
    };

    // 3. Save tokens via TokenVault
    const tokenRef = await saveTokens(session.user_id, provider, tokens);

    // 4. Fetch vehicles
    let vehicles = [];
    try {
      vehicles = await cfg.fetchVehicles(tokens.access_token);
    } catch (vehErr) {
      console.warn(`Failed to fetch vehicles for ${provider}:`, vehErr.message);
    }

    // 5. Upsert telematics_connections
    const autoMappedVehicle = vehicles.length === 1 ? vehicles[0] : null;
    const connectionData = {
      user_id: session.user_id,
      provider,
      token_ref: tokenRef,
      access_expires_at: tokens.expires_at,
      scopes_granted: tokens.scope ? tokens.scope.split(/[\s,]+/) : [],
      status: 'active',
      provider_vehicle_id: autoMappedVehicle?.id || null,
      provider_org_id: tokenData.org_id || tokenData.organization_id || null,
      provider_company_id: tokenData.company_id || null,
    };

    // Check if connection already exists for this user+provider
    const { data: existing } = await sb
      .from('telematics_connections')
      .select('id')
      .eq('user_id', session.user_id)
      .eq('provider', provider)
      .maybeSingle();

    if (existing) {
      await sb.from('telematics_connections').update(connectionData).eq('id', existing.id);
    } else {
      await sb.from('telematics_connections').insert(connectionData);
    }

    // 6. Cleanup OAuth session
    await sb.from('oauth_sessions').delete().eq('id', session.id);

    // Redirect back to app
    const successParams = new URLSearchParams({
      telematics_connected: provider,
      vehicles_found: vehicles.length.toString(),
    });
    return res.redirect(302, `${appBaseUrl}/Profile?${successParams.toString()}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.redirect(302, `${appBaseUrl}/Profile?telematics_error=internal`);
  }
}
