import { createHmac } from 'node:crypto';

export const GUEST_ID_HEADER = 'x-tra-guest-id';
export const GUEST_DAILY_LIMIT = 10;

const GUEST_ID_PATTERN = /^guest_[A-Za-z0-9_-]{20,128}$/;

export function isValidGuestId(value) {
  return typeof value === 'string' && GUEST_ID_PATTERN.test(value);
}

export function getClientIp(req) {
  const forwarded = req.headers['x-vercel-forwarded-for']
    || req.headers['x-forwarded-for']
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';

  const first = Array.isArray(forwarded) ? forwarded[0] : String(forwarded).split(',')[0];
  return first.trim().slice(0, 128) || 'unknown';
}

function hmac(value, secret) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

/**
 * Produce irreversible quota keys. The database never receives the raw guest
 * identifier or IP address.
 */
export function createGuestQuotaKeys(req, guestId, secret) {
  if (!isValidGuestId(guestId)) {
    throw new Error('Invalid guest identifier');
  }
  if (!secret) {
    throw new Error('Guest quota secret is not configured');
  }

  return {
    guestKey: hmac(`guest:${guestId}`, secret),
    networkKey: hmac(`network:${getClientIp(req)}`, secret),
  };
}

export async function reserveGuestRequest(supabase, keys) {
  const { data, error } = await supabase.rpc('reserve_guest_ai_request', {
    p_guest_key: keys.guestKey,
    p_network_key: keys.networkKey,
  });

  if (error || !data || typeof data.allowed !== 'boolean') {
    throw new Error(`Guest quota unavailable${error?.message ? `: ${error.message}` : ''}`);
  }
  return data;
}

export async function releaseGuestRequest(supabase, keys) {
  const { error } = await supabase.rpc('release_guest_ai_request', {
    p_guest_key: keys.guestKey,
    p_network_key: keys.networkKey,
  });
  if (error) throw new Error(error.message || 'Failed to release guest quota');
}

export async function reserveUserRequest(supabase, userId) {
  const { data, error } = await supabase.rpc('reserve_user_ai_request', {
    p_user_id: userId,
  });

  if (error || !data || typeof data.allowed !== 'boolean') {
    throw new Error(`User quota unavailable${error?.message ? `: ${error.message}` : ''}`);
  }
  return data;
}

export async function releaseUserRequest(supabase, userId) {
  const { error } = await supabase.rpc('release_user_ai_request', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message || 'Failed to release user quota');
}
