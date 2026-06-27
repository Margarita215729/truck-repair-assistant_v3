import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';
import { apiUrl } from '@/config/apiBase';
import { httpDelete } from '@/utils/httpClient';

/**
 * Permanently delete the current user's account via server endpoint.
 * Caller should sign out and clear client state after success.
 */
export async function deleteAccount() {
  console.log('[accountDeletionService] Starting deleteAccount...');
  
  if (!hasSupabaseConfig || !supabase) {
    console.error('[accountDeletionService] No Supabase configuration');
    throw new Error('Authentication service is not configured.');
  }

  const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
  console.log('[accountDeletionService] Session check:', { 
    hasSession: !!session, 
    hasToken: !!session?.access_token,
    sessionErr: sessionErr?.message 
  });
  
  if (sessionErr || !session?.access_token) {
    console.error('[accountDeletionService] Session error:', sessionErr);
    throw new Error('Not authenticated');
  }

  const apiEndpoint = apiUrl('/api/delete-account');
  console.log('[accountDeletionService] API endpoint:', apiEndpoint);

  const resp = await httpDelete(apiEndpoint, {
    Authorization: `Bearer ${session.access_token}`,
  });

  console.log('[accountDeletionService] Response status:', resp.status);

  let body = {};
  try {
    body = await resp.json();
    console.log('[accountDeletionService] Response body:', body);
  } catch (parseErr) {
    console.error('[accountDeletionService] Failed to parse response:', parseErr);
    body = {};
  }

  if (!resp.ok || !body.success) {
    const errorMsg = body.error || `Account deletion failed (${resp.status})`;
    console.error('[accountDeletionService] Request failed:', errorMsg, body);
    throw new Error(errorMsg);
  }

  console.log('[accountDeletionService] Deletion successful');
  return body;
}
