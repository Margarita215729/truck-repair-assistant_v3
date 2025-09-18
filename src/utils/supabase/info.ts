import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../lib/safe-env';

const normalizeUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
};

export const supabaseUrl = normalizeUrl(SUPABASE_URL);

export const projectId = supabaseUrl
  ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] ?? ''
  : '';

export const publicAnonKey = SUPABASE_ANON_KEY || '';

export const hasSupabaseConfig = Boolean(supabaseUrl && publicAnonKey);

export default {
  supabaseUrl,
  projectId,
  publicAnonKey,
  hasSupabaseConfig
};
