/**
 * Credential Connect — Connects credential-based telematics providers
 *
 * POST /api/telematics/credential-connect
 *
 * For providers that use credential auth
 * (Geotab, Verizon Connect, Omnitracs) instead of OAuth.
 *
 * 1. Validates user auth (JWT)
 * 2. Validates credentials by calling the provider's authenticate()
 * 3. Encrypts & stores credentials in TokenVault
 * 4. Fetches vehicles and auto-maps if single vehicle
 * 5. Upserts telematics_connections
 */
import { createClient } from '@supabase/supabase-js';
import { saveTokens } from './lib/tokenVault.js';

const CREDENTIAL_PROVIDERS = {
  geotab: {
    requiredFields: ['database', 'userName', 'password'],
    optionalFields: ['server'],
    authenticate: async (creds) => {
      const { authenticate } = await import('./lib/providers/geotab.js');
      const result = await authenticate(creds.database, creds.userName, creds.password, creds.server);
      return {
        tokensToStore: {
          database: creds.database,
          userName: creds.userName,
          password: creds.password,
          server: result.server,
          sessionId: result.credentials.sessionId,
        },
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      };
    },
    fetchVehicles: async (tokenData) => {
      const { fetchVehicles } = await import('./lib/providers/geotab.js');
      return fetchVehicles({ tokenData });
    },
  },
  verizonconnect: {
    requiredFields: ['apiKey', 'apiSecret'],
    authenticate: async (creds) => {
      const { authenticate } = await import('./lib/providers/verizonconnect.js');
      const result = await authenticate(creds.apiKey, creds.apiSecret);
      return {
        tokensToStore: {
          apiKey: creds.apiKey,
          apiSecret: creds.apiSecret,
          access_token: result.access_token,
          expires_at: result.expires_at,
        },
        expiresAt: result.expires_at,
      };
    },
    fetchVehicles: async (tokenData) => {
      const { fetchVehicles } = await import('./lib/providers/verizonconnect.js');
      return fetchVehicles({ accessToken: tokenData.access_token });
    },
  },
  omnitracs: {
    requiredFields: ['username', 'password'],
    optionalFields: ['baseUrl'],
    authenticate: async (creds) => {
      const { authenticate } = await import('./lib/providers/omnitracs.js');
      const result = await authenticate(creds.username, creds.password, creds.baseUrl);
      return {
        tokensToStore: {
          username: creds.username,
          password: creds.password,
          base_url: result.base_url,
          customer_identifier: result.customer_identifier,
          access_token: result.access_token,
          expires_at: result.expires_at,
        },
        expiresAt: result.expires_at,
      };
    },
    fetchVehicles: async (tokenData) => {
      const { fetchVehicles } = await import('./lib/providers/omnitracs.js');
      return fetchVehicles({ tokenData });
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Auth
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const sb = getSupabase();
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    // 2. Parse & validate request
    const { provider, credentials } = req.body || {};
    const cfg = CREDENTIAL_PROVIDERS[provider];
    if (!cfg) {
      return res.status(400).json({
        error: `Unsupported credential provider: ${provider}`,
        supported: Object.keys(CREDENTIAL_PROVIDERS),
      });
    }

    if (!credentials || typeof credentials !== 'object') {
      return res.status(400).json({ error: 'Missing credentials object' });
    }

    const missing = (cfg.requiredFields || []).filter(f => !credentials[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}`,
        requiredFields: cfg.requiredFields,
      });
    }

    // 3. Validate credentials by authenticating with the provider
    let authResult;
    try {
      authResult = await cfg.authenticate(credentials);
    } catch (authError) {
      return res.status(400).json({
        error: 'Authentication with provider failed',
        detail: authError.message,
      });
    }

    // 4. Save credentials to TokenVault
    const tokenRef = await saveTokens(user.id, provider, authResult.tokensToStore);

    // 5. Fetch vehicles
    let vehicles = [];
    try {
      vehicles = await cfg.fetchVehicles(authResult.tokensToStore);
    } catch (vehErr) {
      console.warn(`Failed to fetch vehicles for ${provider}:`, vehErr.message);
    }

    // 6. Upsert telematics_connections
    const autoMappedVehicle = vehicles.length === 1 ? vehicles[0] : null;
    const connectionData = {
      user_id: user.id,
      provider,
      token_ref: tokenRef,
      access_expires_at: authResult.expiresAt || null,
      scopes_granted: ['full'], // credential-based = full access
      status: 'active',
      provider_vehicle_id: autoMappedVehicle?.id || null,
      auth_type: 'credentials',
    };

    const { data: existing } = await sb
      .from('telematics_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle();

    if (existing) {
      await sb.from('telematics_connections').update(connectionData).eq('id', existing.id);
    } else {
      await sb.from('telematics_connections').insert(connectionData);
    }

    return res.status(200).json({
      ok: true,
      provider,
      vehicles_found: vehicles.length,
      auto_mapped: !!autoMappedVehicle,
      vehicles: vehicles.map(v => ({ id: v.id, name: v.name, vin: v.vin })),
    });
  } catch (err) {
    console.error('Credential connect error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
