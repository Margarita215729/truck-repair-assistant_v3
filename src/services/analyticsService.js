import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

const SESSION_KEY = 'tra_marketing_session_id';
const ANON_KEY = 'tra_marketing_anon_id';

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

export async function trackEvent(eventName, options = {}) {
  if (!eventName || !hasSupabaseConfig || !supabase) return false;

  try {
    const { data: { session } } = await supabase.auth.getSession();
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
