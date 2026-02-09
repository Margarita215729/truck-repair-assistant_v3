/**
 * Supabase Client — provides auth, database, storage
 */
import { createClient } from '@supabase/supabase-js';
import { env, isDevelopment } from '@/config/env';

const supabaseUrl = env.SUPABASE_URL;
const supabaseAnonKey = env.SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

let supabase = null;

try {
  if (hasSupabaseConfig) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (error) {
  console.warn('Supabase client initialization failed:', error);
}

export { supabase };
export default supabase;
