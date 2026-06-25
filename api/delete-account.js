/**
 * DELETE /api/delete-account
 *
 * Permanently deletes the authenticated user and owned data.
 * Requires Authorization: Bearer <access_token>
 * Uses SUPABASE_SERVICE_ROLE_KEY server-side only.
 */
import { createClient } from '@supabase/supabase-js';
import { applyCors } from './lib/cors.js';

let _supabase;
function getSupabaseAdmin() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL;
    const key = process.env.STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing Supabase server configuration');
    }
    _supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabase;
}

/**
 * Delete user-owned rows that do not CASCADE from auth.users.
 * Most tables use ON DELETE CASCADE; parts.user_id does not.
 */
async function deleteUserOwnedData(sb, userId) {
  const errors = [];

  const tables = [
    { table: 'parts', column: 'user_id' },
    { table: 'promo_redemptions', column: 'user_id' },
    { table: 'usage_tracking', column: 'user_id' },
    { table: 'solution_votes', column: 'user_id' },
    { table: 'repair_guide_ratings', column: 'user_id' },
    { table: 'diagnostic_toolkits', column: 'user_id' },
    { table: 'service_reviews', column: 'user_id' },
    { table: 'knowledge_base', column: 'user_id' },
    { table: 'diagnostic_reports', column: 'user_id' },
    { table: 'conversations', column: 'user_id' },
    { table: 'trucks', column: 'user_id' },
    { table: 'subscriptions', column: 'user_id' },
    { table: 'telematics_connections', column: 'user_id' },
    { table: 'oauth_sessions', column: 'user_id' },
    { table: 'encrypted_tokens', column: 'user_id' },
    { table: 'fault_events_normalized', column: 'user_id' },
    { table: 'vehicle_signal_events', column: 'user_id' },
    { table: 'vehicle_operational_events', column: 'user_id' },
    { table: 'vehicle_defect_events', column: 'user_id' },
    { table: 'vehicle_system_snapshots', column: 'user_id' },
    { table: 'fault_events_raw', column: 'user_id' },
    { table: 'profiles', column: 'id' },
  ];

  for (const { table, column } of tables) {
    const { error } = await sb.from(table).delete().eq(column, userId);
    if (error && !isBenignDeleteError(error)) {
      console.warn(`[delete-account] ${table} cleanup:`, error.message);
      errors.push(`${table}: ${error.message}`);
    }
  }

  // Anonymize marketing analytics (ON DELETE SET NULL)
  await sb.from('marketing_events').update({ user_id: null }).eq('user_id', userId);

  return errors;
}

function isBenignDeleteError(error) {
  const msg = (error?.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('relation') && msg.includes('not exist');
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const sb = getSupabaseAdmin();

    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const userId = user.id;

    const cleanupErrors = await deleteUserOwnedData(sb, userId);
    if (cleanupErrors.length > 0) {
      console.warn('[delete-account] Partial cleanup warnings:', cleanupErrors);
    }

    const { error: deleteErr } = await sb.auth.admin.deleteUser(userId);

    if (deleteErr) {
      const msg = deleteErr.message || '';
      // Idempotent: user already deleted
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('user not found')) {
        return res.status(200).json({ success: true, alreadyDeleted: true });
      }
      console.error('[delete-account] auth.admin.deleteUser failed:', deleteErr);
      return res.status(500).json({ success: false, error: 'Failed to delete account' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[delete-account] Unexpected error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
