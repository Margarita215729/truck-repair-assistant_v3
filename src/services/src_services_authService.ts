import { User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';

// Initialize Supabase client
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

export class AuthService {
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Sign in failed - no user returned');
      }

      return data.user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string, userData: Partial<{ displayName: string; role: string }>): Promise<User> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: userData.displayName || '',
            role: userData.role || 'technician'
          }
        }
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Sign up failed - no user created');
      }

      return data.user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }
}

export default new AuthService();