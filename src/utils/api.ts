import { getErrorMessage } from "../utils/error-handling";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey, hasSupabaseConfig } from './supabase/info';
import { validateJsonInput, sanitizeTextInput } from '../lib/api-security';

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

// Request timeout configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Maximum request body size (10MB)
const MAX_REQUEST_SIZE = 10 * 1024 * 1024;

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

// Generic API request function with security enhancements
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  
  try {
    if (!API_BASE) {
      throw new Error('Supabase API base URL is not configured');
    }

    // Validate and sanitize endpoint
    const sanitizedEndpoint = sanitizeTextInput(endpoint);
    if (!sanitizedEndpoint.startsWith('/')) {
      throw new Error('Invalid endpoint format');
    }

    // Validate request body if present
    if (options.body) {
      const bodySize = new Blob([options.body as string]).size;
      if (bodySize > MAX_REQUEST_SIZE) {
        throw new Error(`Request body too large. Maximum size: ${Math.round(MAX_REQUEST_SIZE / 1024 / 1024)}MB`);
      }

      // Validate JSON if content type is JSON
      const contentType = (options.headers as any)?.['Content-Type'] || '';
      if (contentType.includes('application/json')) {
        try {
          const jsonData = JSON.parse(options.body as string);
          const validation = validateJsonInput(jsonData);
          if (!validation.valid) {
            throw new Error(`Invalid request data: ${validation.error}`);
          }
        } catch (parseError) {
          throw new Error('Invalid JSON in request body');
        }
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(`${API_BASE}${sanitizedEndpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Client-Version': '2.0.0',
        'X-Request-ID': generateRequestId(),
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'Network error' };
      }

      // Sanitize error message to prevent information leakage
      const sanitizedError = sanitizeTextInput(errorData.error || `HTTP ${response.status}`);
      throw new Error(sanitizedError);
    }

    const responseData = await response.json();
    
    // Validate response data
    const validation = validateJsonInput(responseData);
    if (!validation.valid) {
      console.warn('API response validation failed:', validation.error);
      // Continue anyway but log the issue
    }

    return responseData;
  } catch (error) {
    // Handle timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }

    // In development mode, return mock data instead of failing
    if (isDevelopmentMode) {
      console.warn('API request failed, returning mock data:', error);
      return { success: true, data: {} };
    }
    throw error;
  }
}

// Generate unique request ID for tracking
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    // Validate recording data before sending
    if (!recordingData) {
      throw new Error('Recording data is required');
    }

    // Sanitize metadata
    const sanitizedData = {
      ...recordingData,
      metadata: recordingData.metadata ? {
        ...recordingData.metadata,
        filename: sanitizeTextInput(recordingData.metadata.filename || ''),
        description: sanitizeTextInput(recordingData.metadata.description || ''),
      } : {}
    };

    return apiRequest('/voice/recording', {
      method: 'POST',
      body: JSON.stringify(sanitizedData),
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
    // Validate report configuration
    if (!reportConfig || typeof reportConfig !== 'object') {
      throw new Error('Report configuration is required');
    }

    // Sanitize report config
    const sanitizedConfig = {
      ...reportConfig,
      title: sanitizeTextInput(reportConfig.title || ''),
      description: sanitizeTextInput(reportConfig.description || ''),
      filters: reportConfig.filters ? Object.fromEntries(
        Object.entries(reportConfig.filters).map(([key, value]) => [
          sanitizeTextInput(key),
          typeof value === 'string' ? sanitizeTextInput(value as string) : value
        ])
      ) : {}
    };

    return apiRequest('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(sanitizedConfig),
    });
  }
};

// AI API for GitHub Models integration
const aiAPI = {
  analyze: async (analysisData: any) => {
    // Validate analysis data
    if (!analysisData || typeof analysisData !== 'object') {
      throw new Error('Analysis data is required');
    }

    // Sanitize analysis data
    const sanitizedData = {
      ...analysisData,
      query: sanitizeTextInput(analysisData.query || ''),
      description: sanitizeTextInput(analysisData.description || ''),
      // Preserve other data but ensure it's within size limits
      data: analysisData.data
    };

    return apiRequest('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(sanitizedData),
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
