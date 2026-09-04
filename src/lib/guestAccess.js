/**
 * Guest Access Configuration
 *
 * PUBLIC routes: /, /Diagnostics, /Pricing, /Policies, /auth/confirm, /PartsCatalog, /ServiceFinder, /Community
 * PROTECTED routes: /Reports, /Profile
 *
 * Guest request limit: enforced by the AI proxy (10 successful requests/day)
 * Guest video block: enforced in VisualDiagnostics (recording + upload rejected)
 * Guest telematics lock: enforced in ScanTruckButton + inline scan handler
 * Guest history: ChatHistory panel hidden; conversation persistence skipped
 */

export const GUEST_AI_REQUEST_LIMIT = 10;
// Backward-compatible export for older imports.
export const GUEST_CHAT_MESSAGE_LIMIT = GUEST_AI_REQUEST_LIMIT;
export const GUEST_AI_USAGE_EVENT = 'tra:guest-ai-usage';

const GUEST_ID_STORAGE_KEY = 'tra_guest_ai_id_v1';
const GUEST_USAGE_STORAGE_KEY = 'tra_guest_ai_usage_v1';
const GUEST_ID_PATTERN = /^guest_[A-Za-z0-9_-]{20,128}$/;

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function makeGuestId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `guest_${uuid}`;

  const random = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `guest_${Date.now().toString(36)}_${random}`;
}

/** Stable pseudonymous identifier used only for server-side guest quota. */
export function getGuestAiId() {
  try {
    const existing = localStorage.getItem(GUEST_ID_STORAGE_KEY);
    if (existing && GUEST_ID_PATTERN.test(existing)) return existing;

    const created = makeGuestId();
    localStorage.setItem(GUEST_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return makeGuestId();
  }
}

export function getGuestAiUsage() {
  const fallback = {
    allowed: true,
    plan: 'guest',
    used: 0,
    limit: GUEST_CHAT_MESSAGE_LIMIT,
    remaining: GUEST_CHAT_MESSAGE_LIMIT,
    date: todayUtc(),
  };

  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_USAGE_STORAGE_KEY) || 'null');
    if (!parsed || parsed.date !== fallback.date) return fallback;

    const limit = Number(parsed.limit);
    const used = Number(parsed.used);
    const remaining = Number(parsed.remaining);
    if (![limit, used, remaining].every(Number.isFinite) || limit <= 0) return fallback;

    return {
      allowed: parsed.allowed !== false && remaining > 0,
      plan: 'guest',
      used: Math.max(0, used),
      limit,
      remaining: Math.max(0, remaining),
      date: fallback.date,
    };
  } catch {
    return fallback;
  }
}

/** Persist the authoritative quota returned by the server and notify hooks. */
export function setGuestAiUsage(serverLimit) {
  if (!serverLimit || typeof serverLimit !== 'object') return getGuestAiUsage();

  const limit = Number(serverLimit.limit);
  const used = Number(serverLimit.used);
  const remaining = Number(serverLimit.remaining);
  if (![limit, used, remaining].every(Number.isFinite) || limit <= 0) {
    return getGuestAiUsage();
  }

  const usage = {
    allowed: serverLimit.allowed !== false && remaining > 0,
    plan: 'guest',
    used: Math.max(0, used),
    limit,
    remaining: Math.max(0, remaining),
    date: todayUtc(),
  };

  try { localStorage.setItem(GUEST_USAGE_STORAGE_KEY, JSON.stringify(usage)); } catch {}
  try {
    window.dispatchEvent(new CustomEvent(GUEST_AI_USAGE_EVENT, { detail: usage }));
  } catch {}
  return usage;
}

export const isGuestUser = (isAuthenticated) => !isAuthenticated;

export const canGuestUseVideo = false;

export const canGuestUseTelematicsScan = false;

/** Routes accessible without authentication */
export const PUBLIC_ROUTES = ['/', '/Diagnostics', '/Pricing', '/Policies', '/auth/confirm', '/PartsCatalog', '/ServiceFinder', '/Community'];

/** Check if a route path is public */
export const isPublicRoute = (path) =>
  PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + '/'));
