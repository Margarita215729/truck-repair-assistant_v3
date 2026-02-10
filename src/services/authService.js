/**
 * Auth Service — Production
 * Uses Supabase Auth + profiles table (no localStorage for profile data)
 */
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

export const authService = {
  /**
   * Get current user with profile from DB
   */
  async me() {
    if (!hasSupabaseConfig || !supabase) return null;

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    // Fetch profile from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      full_name: profile?.full_name || user.user_metadata?.display_name || '',
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      phone: profile?.phone || '',
      company_name: profile?.company_name || '',
      role: profile?.role || user.user_metadata?.role || 'technician',
      preferred_language: profile?.preferred_language || 'en',
      notification_preferences: profile?.notification_preferences || {
        email_reports: true,
        maintenance_reminders: true,
      },
    };
  },

  /**
   * Sign in with email/password
   */
  async signIn(email, password) {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Authentication service is not configured.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  /**
   * Sign up new user
   */
  async signUp(email, password, name) {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Authentication service is not configured.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name, role: 'technician' },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    if (error) throw error;
    return data;
  },

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Authentication service is not configured.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    if (error) throw error;
  },

  /**
   * Update password (for logged-in user)
   */
  async updatePassword(newPassword) {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Authentication service is not configured.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  /**
   * Logout
   */
  async logout() {
    if (hasSupabaseConfig && supabase) {
      await supabase.auth.signOut();
    }
  },

  /**
   * Update user profile in profiles table
   */
  async updateMe(updates) {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Authentication service is not configured.');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Update Supabase Auth metadata for core fields
    if (updates.full_name || updates.avatar_url) {
      await supabase.auth.updateUser({
        data: {
          ...(updates.full_name && { display_name: updates.full_name }),
          ...(updates.avatar_url && { avatar_url: updates.avatar_url }),
        },
      });
    }

    // Update profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        phone: updates.phone,
        company_name: updates.company_name,
        avatar_url: updates.avatar_url,
        preferred_language: updates.preferred_language,
        notification_preferences: updates.notification_preferences,
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update failed:', error);
      throw new Error('Failed to update profile');
    }

    return profile;
  },

  /**
   * Get session
   */
  async getSession() {
    if (hasSupabaseConfig && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }
    return null;
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback) {
    if (hasSupabaseConfig && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });
      return () => subscription?.unsubscribe();
    }
    return () => {};
  },
};

export default authService;
