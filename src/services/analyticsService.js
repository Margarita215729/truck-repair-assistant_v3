import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

const SESSION_KEY = 'tra_marketing_session_id';
const ANON_KEY = 'tra_marketing_anon_id';
const UTM_KEY = 'tra_marketing_utm';
const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

function buildId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function getStorageId(key, prefix) {
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = buildId(prefix);
    localStorage.setItem(key, created);
    return created;
  } catch {
    return buildId(prefix);
  }
}

export function getSessionId() {
  return getStorageId(SESSION_KEY, 'sess');
}

export function getAnonId() {
  return getStorageId(ANON_KEY, 'anon');
}

// First-touch attribution: captured once per session from ?utm_* params
// (forwarded here by the static /roadside and /guides/* landing pages),
// then reused for every event in the session even after the visitor
// navigates on. Silently no-ops without utm params or storage access,
// matching the getStorageId try/catch convention above.
function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!UTM_PARAMS.some((key) => params.has(key))) {
      const existing = sessionStorage.getItem(UTM_KEY);
      return existing ? JSON.parse(existing) : null;
    }
    const captured = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
      landing_path: window.location.pathname,
      referrer: document.referrer || null,
    };
    sessionStorage.setItem(UTM_KEY, JSON.stringify(captured));
    return captured;
  } catch {
    return null;
  }
}

export async function trackEvent(eventName, options = {}) {
  if (!eventName || !hasSupabaseConfig || !supabase) return false;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const attribution = captureAttribution() || {};
    const payload = {
      user_id: session?.user?.id || null,
      session_id: getSessionId(),
      anon_id: getAnonId(),
      event_name: eventName,
      event_category: options.category || 'product',
      source: options.source || 'webapp',
      page_path: options.path || window.location.pathname,
      event_props: options.props || {},
      happened_at: options.happenedAt || new Date().toISOString(),
      utm_source: attribution.utm_source ?? null,
      utm_medium: attribution.utm_medium ?? null,
      utm_campaign: attribution.utm_campaign ?? null,
      utm_term: attribution.utm_term ?? null,
      utm_content: attribution.utm_content ?? null,
      landing_path: attribution.landing_path ?? null,
      referrer: attribution.referrer ?? null,
    };

    const { error } = await supabase.from('marketing_events').insert(payload);
    if (error) {
      console.warn('trackEvent failed:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('trackEvent exception:', error?.message || error);
    return false;
  }
}

export async function trackPageView(pathname) {
  return trackEvent('page_view', {
    category: 'engagement',
    path: pathname,
  });
}
