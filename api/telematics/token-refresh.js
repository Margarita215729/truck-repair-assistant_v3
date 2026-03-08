/**
 * Token Refresh — Refreshes expiring OAuth tokens for telematics providers
 *
 * POST /api/telematics/token-refresh
 *
 * Designed to be called as a Vercel Cron job.
 * Checks for connections with tokens expiring within a configurable buffer,
 * exchanges refresh_token for a new access_token, and updates the vault.
 *
 * Cron: vercel.json → "crons": [{ "path": "/api/telematics/token-refresh", "schedule": "0 * * * *" }]
 * Also accepts manual invocations with Authorization: Bearer <CRON_SECRET>.
 */
import { createClient } from '@supabase/supabase-js';
import { loadTokens, updateTokens } from './lib/tokenVault.js';

const REFRESH_BUFFER_MINUTES = 30; // Refresh if expiring within 30 minutes

const PROVIDERS = {
  samsara: {
    tokenUrl: 'https://api.samsara.com/oauth2/token',
    clientId: () => process.env.SAMSARA_CLIENT_ID,
    clientSecret: () => process.env.SAMSARA_CLIENT_SECRET,
    authType: 'oauth',
  },
  motive: {
    tokenUrl: 'https://api.gomotive.com/oauth/token',
    clientId: () => process.env.MOTIVE_CLIENT_ID,
    clientSecret: () => process.env.MOTIVE_CLIENT_SECRET,
    authType: 'oauth',
  },
  geotab: {
    authType: 'credentials',
    refresh: async (currentTokens) => {
      // Geotab uses session re-authentication instead of refresh tokens
      const { authenticate } = await import('./lib/providers/geotab.js');
      const result = await authenticate(
        currentTokens.database,
        currentTokens.userName,
        currentTokens.password,
        currentTokens.server
      );
      return {
        ...currentTokens,
        server: result.server,
        sessionId: result.credentials.sessionId,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };
    },
  },
  verizonconnect: {
    authType: 'credentials',
    refresh: async (currentTokens) => {
      const { authenticate } = await import('./lib/providers/verizonconnect.js');
      const result = await authenticate(currentTokens.apiKey, currentTokens.apiSecret);
      return {
        ...currentTokens,
        access_token: result.access_token,
        expires_at: result.expires_at,
      };
    },
  },
  omnitracs: {
    authType: 'credentials',
    refresh: async (currentTokens) => {
      const { authenticate } = await import('./lib/providers/omnitracs.js');
      const result = await authenticate(currentTokens.apiKey, currentTokens.apiSecret);
      return {
        ...currentTokens,
        access_token: result.access_token,
        expires_at: result.expires_at,
      };
    },
  },
};

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key);
}

function verifyCronAuth(req) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // No secret configured — allow (dev mode)
  const authHeader = req.headers?.authorization || '';
  return authHeader === `Bearer ${cronSecret}`;
}

async function refreshProviderTokens(provider, tokenUrl, clientId, clientSecret, refreshToken) {
  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${provider} token refresh failed (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken, // Some providers rotate refresh tokens
    expires_at: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
    scope: data.scope || null,
    token_type: data.token_type || 'Bearer',
  };
}

export default async function handler(req, res) {
  // Only accept POST (cron) or GET (Vercel Cron default)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyCronAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sb = getSupabase();
  const bufferCutoff = new Date(Date.now() + REFRESH_BUFFER_MINUTES * 60 * 1000).toISOString();

  try {
    // Find active connections with tokens expiring soon
    const { data: expiring, error: queryErr } = await sb
      .from('telematics_connections')
      .select('id, user_id, provider, token_ref, access_expires_at')
      .eq('status', 'active')
      .not('token_ref', 'is', null)
      .lt('access_expires_at', bufferCutoff);

    if (queryErr) throw new Error(`Query failed: ${queryErr.message}`);

    if (!expiring || expiring.length === 0) {
      return res.status(200).json({ refreshed: 0, message: 'No tokens need refreshing' });
    }

    const results = [];

    for (const conn of expiring) {
      const cfg = PROVIDERS[conn.provider];
      if (!cfg) {
        results.push({ id: conn.id, provider: conn.provider, status: 'skipped', reason: 'unknown provider' });
        continue;
      }

      try {
        // Load current tokens
        const currentTokens = await loadTokens(conn.token_ref);

        // Credential-based providers use their own refresh logic
        if (cfg.authType === 'credentials') {
          if (!cfg.refresh) {
            results.push({ id: conn.id, provider: conn.provider, status: 'skipped', reason: 'no refresh handler' });
            continue;
          }

          const newTokens = await cfg.refresh(currentTokens);
          await updateTokens(conn.token_ref, newTokens);

          await sb
            .from('telematics_connections')
            .update({
              access_expires_at: newTokens.expires_at,
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', conn.id);

          results.push({ id: conn.id, provider: conn.provider, status: 'refreshed' });
          continue;
        }

        // OAuth providers use refresh_token grant
        if (!currentTokens?.refresh_token) {
          // No refresh token — mark as needs_reauth
          await sb
            .from('telematics_connections')
            .update({ status: 'needs_reauth', updated_at: new Date().toISOString() })
            .eq('id', conn.id);
          results.push({ id: conn.id, provider: conn.provider, status: 'needs_reauth', reason: 'no refresh_token' });
          continue;
        }

        // Refresh
        const newTokens = await refreshProviderTokens(
          conn.provider,
          cfg.tokenUrl,
          cfg.clientId(),
          cfg.clientSecret(),
          currentTokens.refresh_token
        );

        // Update vault
        await updateTokens(conn.token_ref, newTokens);

        // Update connection metadata
        await sb
          .from('telematics_connections')
          .update({
            access_expires_at: newTokens.expires_at,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', conn.id);

        results.push({ id: conn.id, provider: conn.provider, status: 'refreshed' });
      } catch (refreshErr) {
        console.error(`Failed to refresh tokens for connection ${conn.id}:`, refreshErr.message);

        // Mark as needs_reauth on failure
        await sb
          .from('telematics_connections')
          .update({ status: 'needs_reauth', updated_at: new Date().toISOString() })
          .eq('id', conn.id);

        results.push({ id: conn.id, provider: conn.provider, status: 'error', reason: refreshErr.message });
      }
    }

    const refreshed = results.filter(r => r.status === 'refreshed').length;
    const errors = results.filter(r => r.status === 'error').length;

    return res.status(200).json({
      refreshed,
      errors,
      total: expiring.length,
      results,
    });
  } catch (err) {
    console.error('Token refresh cron error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
