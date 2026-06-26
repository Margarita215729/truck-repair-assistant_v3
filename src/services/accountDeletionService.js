import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';
import { apiUrl } from '@/config/apiBase';
import { CapacitorHttp } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

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
  const isNative = Capacitor.isNativePlatform();
  console.log('[accountDeletionService] API endpoint:', apiEndpoint, 'isNative:', isNative);

  let resp;
  let body = {};

  try {
    if (isNative) {
      // Использовать CapacitorHttp для обхода CORS на мобильных устройствах
      console.log('[accountDeletionService] Using CapacitorHttp for native platform');
      const response = await CapacitorHttp.request({
        url: apiEndpoint,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      console.log('[accountDeletionService] Response status:', response.status);
      
      // CapacitorHttp автоматически парсит JSON
      body = response.data || {};
      console.log('[accountDeletionService] Response body:', body);
      
      if (response.status < 200 || response.status >= 300 || !body.success) {
        const errorMsg = body.error || `Account deletion failed (${response.status})`;
        console.error('[accountDeletionService] Request failed:', errorMsg, body);
        throw new Error(errorMsg);
      }
    } else {
      // Использовать fetch для веба
      console.log('[accountDeletionService] Using fetch for web platform');
      resp = await fetch(apiEndpoint, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('[accountDeletionService] Response status:', resp.status, resp.statusText);

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
    }
  } catch (error) {
    console.error('[accountDeletionService] Request error:', error);
    throw error;
  }

  console.log('[accountDeletionService] Deletion successful');
  return body;
}
