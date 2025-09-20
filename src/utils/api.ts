import { getErrorMessage } from "../utils/error-handling";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey, hasSupabaseConfig } from './supabase/info';

// Check if we're in development mode without proper Supabase access
const isDevelopmentMode = (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost');

let supabase: SupabaseClient | null;
try {
  if (hasSupabaseConfig) {
    supabase = createClient(
      supabaseUrl,
      publicAnonKey
    );
  } else {
    supabase = null;
  }
} catch (error) {
  console.warn('Supabase client initialization failed, using mock authentication');
  supabase = null;
}

const API_BASE = hasSupabaseConfig
  ? `${supabaseUrl}/functions/v1/make-server-92d4f459`
  : '';

// Mock user for development
const mockUser = {
  id: 'mock-user-id',
  email: 'demo@truckdiag.com',
  user_metadata: {
    display_name: 'Demo User',
    role: 'technician'
  }
};

// Get access token for authenticated requests
async function getAccessToken() {
  if (!supabase) return publicAnonKey;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || publicAnonKey;
  } catch (error) {
    console.warn('Failed to get session, using public key');
    return publicAnonKey;
  }
}

// Generic API request function
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  
  try {
    if (!API_BASE) {
      throw new Error('Supabase API base URL is not configured');
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    // In development mode, return mock data instead of failing
    if (isDevelopmentMode) {
      console.warn('API request failed, returning mock data:', error);
      return { success: true, data: {} };
    }
    throw error;
  }
}

// Auth API
const authAPI = {
  signup: async (email: string, password: string, name: string) => {
    if (!supabase || isDevelopmentMode) {
      // Mock signup for development
      return {
        user: {
          ...mockUser,
          email,
          user_metadata: {
            ...mockUser.user_metadata,
            display_name: name
          }
        },
        session: {
          access_token: 'mock-token',
          user: mockUser
        }
      };
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name,
            role: 'technician'
          }
        }
      });
      
      if (error) throw new Error(getErrorMessage(error));
      return data;
    } catch (error) {
      console.warn('Supabase signup failed, using mock auth:', error);
      return {
        user: {
          ...mockUser,
          email,
          user_metadata: {
            ...mockUser.user_metadata,
            display_name: name
          }
        },
        session: {
          access_token: 'mock-token',
          user: mockUser
        }
      };
    }
  },

  signIn: async (email: string, password: string) => {
    if (!supabase || isDevelopmentMode) {
      // Mock sign in for development
      return {
        user: {
          ...mockUser,
          email
        },
        session: {
          access_token: 'mock-token',
          user: mockUser
        }
      };
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw new Error(getErrorMessage(error));
      return data;
    } catch (error) {
      console.warn('Supabase signIn failed, using mock auth:', error);
      return {
        user: {
          ...mockUser,
          email
        },
        session: {
          access_token: 'mock-token',
          user: mockUser
        }
      };
    }
  },

  signOut: async () => {
    if (!supabase || isDevelopmentMode) {
      // Mock sign out for development
      return { error: null };
    }
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(getErrorMessage(error));
    } catch (error) {
      console.warn('Supabase signOut failed:', error);
      // Don't throw error in development mode
    }
  },

  getCurrentUser: async () => {
    if (!supabase || isDevelopmentMode) {
      // Return null in development mode initially
      return null;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.warn('Failed to get current user:', error);
      return null;
    }
  },

  getSession: async () => {
    if (!supabase || isDevelopmentMode) {
      // Return null in development mode initially
      return null;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.warn('Failed to get session:', error);
      return null;
    }
  }
};

// Diagnostics API
const diagnosticsAPI = {
  save: async (diagnosticData: any) => {
    return apiRequest('/diagnostics', {
      method: 'POST',
      body: JSON.stringify(diagnosticData),
    });
  },

  getHistory: async () => {
    return apiRequest('/diagnostics/history');
  },

  getById: async (id: string) => {
    return apiRequest(`/diagnostics/${id}`);
  }
};

// Voice API
const voiceAPI = {
  saveRecording: async (recordingData: any) => {
    return apiRequest('/voice/recording', {
      method: 'POST',
      body: JSON.stringify(recordingData),
    });
  }
};

// Fleet API
const fleetAPI = {
  getStats: async () => {
    return apiRequest('/fleet/stats');
  }
};

// Reports API
const reportsAPI = {
  generate: async (reportConfig: any) => {
    return apiRequest('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(reportConfig),
    });
  }
};

// AI API for GitHub Models integration
const aiAPI = {
  analyze: async (analysisData: any) => {
    return apiRequest('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(analysisData),
    });
  }
};

// Export all APIs
export {
  authAPI,
  diagnosticsAPI,
  voiceAPI,
  fleetAPI,
  reportsAPI,
  aiAPI,
  supabase
};
