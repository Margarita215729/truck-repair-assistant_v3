/**
 * Auth Service
 * Uses Supabase Auth with localStorage fallback for dev
 */
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';
import { isDevelopment } from '@/config/env';

const STORAGE_KEY = 'truck_repair_user_profile';

// Mock user for development without Supabase
const mockUser = {
  id: 'dev-user-001',
  email: 'demo@truckrepair.com',
  full_name: 'Demo Driver',
  avatar_url: null,
  phone: '',
  company_name: '',
  role: 'technician',
  trucks: [],
  preferred_shops: [],
  notification_preferences: {
    email_reports: true,
    maintenance_reminders: true,
  },
};

function getStoredProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveStoredProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // silent
  }
}

export const authService = {
  /**
   * Get current user
   */
  async me() {
    if (hasSupabaseConfig && supabase) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      // Merge Supabase user with stored profile data
      const storedProfile = getStoredProfile();
      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.display_name || storedProfile?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || storedProfile?.avatar_url || null,
        phone: storedProfile?.phone || '',
        company_name: storedProfile?.company_name || '',
        role: user.user_metadata?.role || 'technician',
        trucks: storedProfile?.trucks || [],
        preferred_shops: storedProfile?.preferred_shops || [],
        notification_preferences: storedProfile?.notification_preferences || {
          email_reports: true,
          maintenance_reminders: true,
        },
      };
    }

    // No Supabase config — no user (require real auth)
    return null;
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
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  },

  /**
   * Logout
   */
  async logout() {
    if (hasSupabaseConfig && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Update user profile
   */
  async updateMe(updates) {
    if (hasSupabaseConfig && supabase) {
      // Update Supabase user metadata for core fields
      if (updates.full_name || updates.avatar_url) {
        await supabase.auth.updateUser({
          data: {
            ...(updates.full_name && { display_name: updates.full_name }),
            ...(updates.avatar_url && { avatar_url: updates.avatar_url }),
          },
        });
      }
    }

    // Store extended profile in localStorage (or Supabase table in production)
    const current = getStoredProfile() || { ...mockUser };
    const updated = { ...current, ...updates };
    saveStoredProfile(updated);
    return updated;
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
