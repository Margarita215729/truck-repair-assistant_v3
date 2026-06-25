import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';
import { apiUrl } from '@/config/apiBase';

/**
 * Permanently delete the current user's account via server endpoint.
 * Caller should sign out and clear client state after success.
 */
export async function deleteAccount() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Authentication service is not configured.');
  }

  const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr || !session?.access_token) {
    throw new Error('Not authenticated');
  }

  const resp = await fetch(apiUrl('/api/delete-account'), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  let body = {};
  try {
    body = await resp.json();
  } catch {
    body = {};
  }

  if (!resp.ok || !body.success) {
    throw new Error(body.error || `Account deletion failed (${resp.status})`);
  }

  return body;
}
