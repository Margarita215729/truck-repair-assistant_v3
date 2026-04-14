import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

const SESSION_KEY = 'tra_session_id';
const ANON_KEY = 'tra_anon_id';

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function getOrCreateStorageId(key, prefix) {
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = randomId(prefix);
    localStorage.setItem(key, created);
    return created;
  } catch {
    return randomId(prefix);
  }
}

export function getAnalyticsSessionId() {
  return getOrCreateStorageId(SESSION_KEY, 'sess');
}

export function getAnalyticsAnonId() {
  return getOrCreateStorageId(ANON_KEY, 'anon');
}

/**
 * Track an analytics event into Supabase for funnel/retention dashboards.
 * Returns true when insert succeeds, false otherwise.
 */
export async function trackEvent(eventName, options = {}) {
  if (!hasSupabaseConfig || !supabase || !eventName) return false;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;
    const payload = {
      user_id: userId,
      session_id: getAnalyticsSessionId(),
      anon_id: getAnalyticsAnonId(),
      event_name: eventName,
      event_category: options.category || 'product',
      source: options.source || 'webapp',
      page_path: options.path || window.location.pathname,
      event_props: options.props || {},
      happened_at: options.happenedAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('marketing_events').insert(payload);
    if (error) {
      console.warn('trackEvent failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('trackEvent exception:', err?.message || err);
    return false;
  }
}

export async function trackPageView(pathname, extraProps = {}) {
  return trackEvent('page_view', {
    category: 'engagement',
    path: pathname,
    props: extraProps,
  });
}
