import { getErrorMessage } from "../utils/error-handling";
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase/info';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-92d4f459`;

// Get access token for authenticated requests
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || publicAnonKey;
}

// Generic API request function
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  
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
}

// Auth API
const authAPI = {
  signup: async (email: string, password: string, name: string) => {
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
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw new Error(getErrorMessage(error));
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(getErrorMessage(error));
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
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