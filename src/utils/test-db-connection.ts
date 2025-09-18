import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey, hasSupabaseConfig } from './supabase/info';

const supabase = hasSupabaseConfig
  ? createClient(
      supabaseUrl,
      publicAnonKey
    )
  : null;

export async function testDatabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase configuration is missing'
      };
    }
    // Test basic connection
    const { data, error } = await supabase.from('_test').select('*').limit(1);
    
    if (error && error.code !== 'PGRST204') {
      // PGRST204 means table doesn't exist, which is fine for connection test
      if (error.code === '42P01') {
        // Table doesn't exist - this is normal, connection is working
        return {
          success: true,
          message: 'Database connection successful'
        };
      }
      
      return {
        success: false,
        message: `Database error: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function testAuthService(): Promise<{ success: boolean; message: string }> {
  try {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase configuration is missing'
      };
    }
    // Test auth service
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return {
        success: false,
        message: `Auth service error: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: user ? 'User authenticated' : 'Auth service working (no user logged in)'
    };
  } catch (error) {
    return {
      success: false,
      message: `Auth test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
