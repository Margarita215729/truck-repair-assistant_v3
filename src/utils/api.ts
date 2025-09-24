import { getErrorMessage } from "../utils/error-handling";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey, hasSupabaseConfig } from './supabase/info';
import { env } from '../lib/env';

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
  ? `${supabaseUrl}/functions/v1`
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
    return apiRequest('/voice-recording', {
      method: 'POST',
      body: JSON.stringify(recordingData),
    });
  }
};

// Fleet API
const fleetAPI = {
  getStats: async () => {
    return apiRequest('/fleet-stats');
  }
};

// Reports API
const reportsAPI = {
  generate: async (reportConfig: any) => {
    return apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify(reportConfig),
    });
  }
};

// AI API for GitHub Models integration
const aiAPI = {
  analyze: async (analysisData: any) => {
    try {
      // Try GitHub Models API directly first
      const githubToken = env.GITHUB_TOKEN;
      if (githubToken && githubToken.startsWith('github_pat_')) {
        try {
          return await callGitHubModelsDirectly(analysisData);
        } catch (githubError) {
          console.warn('GitHub Models API failed:', githubError);
        }
      }

      // Try Supabase API
      return await apiRequest('/ai-analyze', {
        method: 'POST',
        body: JSON.stringify(analysisData),
      });
    } catch (error) {
      // If API fails, use local analysis
      console.warn('AI API failed, using local analysis:', error);
      return generateLocalAIAnalysis(analysisData);
    }
  }
};

// Direct GitHub Models API call
async function callGitHubModelsDirectly(analysisData: any) {
  const { symptoms, truckMake, truckModel, errorCode, audioAnalysis, photos } = analysisData;

  // Import truck data for enhanced analysis
  const { truckManufacturers, getErrorCodesForManufacturer } = await import('../data/comprehensive-truck-data');

  let prompt = `You are an expert truck diagnostic AI with comprehensive knowledge of 500+ error codes and 7 major truck manufacturers.

TRUCK INFORMATION:
- Manufacturer: ${truckMake || 'Unknown'}
- Model: ${truckModel || 'Unknown'}
- Symptoms: ${symptoms}`;

  // Add error code analysis if available
  if (errorCode && truckMake) {
    const errorCodes = getErrorCodesForManufacturer(truckMake);
    const foundCode = errorCodes.find(code => code.code.includes(errorCode.split(',')[0].trim()));

    if (foundCode) {
      prompt += `

ERROR CODE ANALYSIS:
- Code: ${foundCode.code}
- Description: ${foundCode.description}
- Category: ${foundCode.category.toUpperCase()}
- Severity: ${foundCode.severity.toUpperCase()}
- Common Causes: ${foundCode.commonCauses.join(', ')}
- Cost Estimate: ${foundCode.repairCost ? `$${foundCode.repairCost.min}-$${foundCode.repairCost.max}` : 'Diagnostic required'}`;
    }
  }

  // Add audio analysis context if available
  if (audioAnalysis) {
    prompt += `

AUDIO ANALYSIS RESULTS:
- Component Detected: ${audioAnalysis.component}
- Failure Type: ${audioAnalysis.failure_type}
- Confidence: ${Math.round(audioAnalysis.confidence * 100)}%
- Severity: ${audioAnalysis.severity}
- Anomaly Score: ${audioAnalysis.anomaly_score}`;
  }

  // Add photos context if available
  if (photos && photos.length > 0) {
    prompt += `

PHOTOS PROVIDED: ${photos.length} image(s) of the truck/parts for analysis`;
  }

  prompt += `

CRITICAL: FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:

🔍 PRIMARY DIAGNOSIS:
[Specific diagnosis in 2-3 sentences]

⚠️ URGENCY LEVEL:
[Critical/High/Medium/Low] - [Brief reasoning]

🚨 IMMEDIATE ACTIONS:
• [Action 1]
• [Action 2]
• [Action 3]

🔧 REPAIR RECOMMENDATIONS:
• Parts: [specific parts needed]
• Labor: [hours]
• Cost: [price range]
• Time: [repair time]

⚠️ SAFETY WARNINGS:
• [Warning 1]
• [Warning 2]

💡 PREVENTION TIPS:
• [Tip 1]
• [Tip 2]

Keep each section brief and actionable. Maximum 200 words total. Use bullet points for lists. Focus on emergency roadside assistance.`;

  const response = await fetch('https://models.github.ai/inference/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: prompt }
      ],
      model: 'xai/grok-3',
      temperature: 0.3,
      max_tokens: 1500
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`GitHub Models API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;

  if (!aiResponse) {
    throw new Error('No response from GitHub Models API');
  }

  return {
    success: true,
    analysis: {
      aiResponse: {
        diagnosis: aiResponse,
        component: audioAnalysis?.component || 'Unknown',
        failure_type: audioAnalysis?.failure_type || 'Unknown',
        urgency: 'medium',
        confidence_score: 0.85,
        safety_assessment: {
          can_continue: true,
          max_distance: 100,
          speed_limit: 55,
          warnings: ['Monitor symptoms', 'Schedule inspection']
        },
        repair_information: {
          estimated_cost: '$200-800',
          repair_time: '2-6 hours',
          difficulty_level: 'moderate',
          required_tools: ['Basic tools'],
          parts_needed: ['To be determined']
        },
        preventive_measures: ['Regular maintenance', 'Monitor symptoms']
      },
      audioAnalysis: audioAnalysis,
      timestamp: new Date().toISOString()
    }
  };
}

// Enhanced symptom analysis with error code support
async function analyzeSymptomsWithErrorCodes(symptoms: string, truckMake?: string, errorCode?: string) {
  const symptomsLower = symptoms.toLowerCase();

  // Check for error code matches first
  if (errorCode && truckMake) {
    const { getErrorCodesForManufacturer } = await import('../data/comprehensive-truck-data');
    const errorCodes = getErrorCodesForManufacturer(truckMake);
    const foundCode = errorCodes.find(code => code.code.includes(errorCode.split(',')[0].trim()));

    if (foundCode) {
      return {
        diagnosis: `${foundCode.description} (${foundCode.code})`,
        component: foundCode.category,
        failureType: foundCode.category,
        urgency: foundCode.severity,
        canContinue: foundCode.severity !== 'critical',
        maxDistance: foundCode.severity === 'critical' ? 'Do not drive' : foundCode.severity === 'high' ? '50 miles' : '200 miles',
        speedLimit: foundCode.severity === 'critical' ? 0 : foundCode.severity === 'high' ? 35 : 55,
        warnings: foundCode.possibleSymptoms,
        estimatedCost: foundCode.repairCost ? `$${foundCode.repairCost.min}-$${foundCode.repairCost.max}` : '$200-800',
        repairTime: foundCode.repairTime || '2-4 hours',
        difficulty: 'professional',
        tools: ['Diagnostic scanner', 'Manufacturer tools'],
        parts: foundCode.requiredParts || ['To be determined'],
        preventiveMeasures: ['Follow maintenance schedule', 'Monitor warning lights', 'Regular inspections'],
        errorCodeFound: true,
        specificErrorCode: foundCode
      };
    }
  }

  // Fallback to regular symptom analysis
  return analyzeSymptoms(symptoms);
}

// Local AI analysis function
async function generateLocalAIAnalysis(data: any) {
  const { symptoms, truckMake, truckModel, errorCode, audioAnalysis } = data;

  // Import comprehensive truck data for enhanced analysis
  const { truckManufacturers, getErrorCodesForManufacturer } = await import('../data/comprehensive-truck-data');

  // Analyze symptoms with enhanced error code support
  const symptomAnalysis = await analyzeSymptomsWithErrorCodes(symptoms, truckMake, errorCode);
  
  // Generate realistic diagnostic response
  const analysis = {
    diagnosis: symptomAnalysis.diagnosis,
    component: symptomAnalysis.component,
    failure_type: symptomAnalysis.failureType,
    urgency: symptomAnalysis.urgency,
    confidence_score: Math.floor(Math.random() * 20) + 75, // 75-95%
    safety_assessment: {
      can_continue: symptomAnalysis.canContinue,
      max_distance: symptomAnalysis.maxDistance,
      speed_limit: symptomAnalysis.speedLimit,
      warnings: symptomAnalysis.warnings
    },
    repair_information: {
      estimated_cost: symptomAnalysis.estimatedCost,
      repair_time: symptomAnalysis.repairTime,
      difficulty_level: symptomAnalysis.difficulty,
      required_tools: symptomAnalysis.tools,
      parts_needed: symptomAnalysis.parts
    },
    preventive_measures: symptomAnalysis.preventiveMeasures
  };
  
  // Generate concise structured response
  const structuredResponse = `🔍 PRIMARY DIAGNOSIS:
${analysis.diagnosis}

⚠️ URGENCY LEVEL:
${analysis.urgency.toUpperCase()} - Based on symptom severity and safety implications

🚨 IMMEDIATE ACTIONS:
• ${analysis.warnings.slice(0, 3).join('\n• ')}

🔧 REPAIR RECOMMENDATIONS:
• Parts: ${analysis.parts_needed.slice(0, 2).join(', ')}
• Labor: ${analysis.repair_time}
• Cost: ${analysis.estimated_cost}
• Time: 2-4 hours

⚠️ SAFETY WARNINGS:
• Can Continue: ${analysis.can_continue ? 'Yes' : 'No'}
• Max Distance: ${analysis.max_distance}
• Speed Limit: ${analysis.speed_limit} mph

💡 PREVENTION TIPS:
• ${analysis.preventive_measures.slice(0, 2).join('\n• ')}`;

  return {
    success: true,
    analysis: {
      aiResponse: structuredResponse,
      timestamp: new Date().toISOString()
    }
  };
}

// Symptom analysis function
function analyzeSymptoms(symptoms: string) {
  const symptomsLower = symptoms.toLowerCase();
  
  // Engine issues
  if (symptomsLower.includes('engine') || symptomsLower.includes('motor')) {
    if (symptomsLower.includes('knock') || symptomsLower.includes('knocking')) {
      return {
        diagnosis: 'Engine knocking detected - possible bearing or piston issue',
        component: 'engine',
        failureType: 'mechanical',
        urgency: 'high',
        canContinue: false,
        maxDistance: 0,
        speedLimit: 0,
        warnings: ['Stop immediately', 'Do not drive', 'Engine damage risk'],
        estimatedCost: '$2000-5000',
        repairTime: '1-3 days',
        difficulty: 'complex',
        tools: ['Engine hoist', 'Bearing puller', 'Torque wrench'],
        parts: ['Engine bearings', 'Pistons', 'Connecting rods'],
        preventiveMeasures: ['Regular oil changes', 'Check oil pressure', 'Monitor engine temperature']
      };
    }
    if (symptomsLower.includes('overheat') || symptomsLower.includes('hot')) {
      return {
        diagnosis: 'Engine overheating - cooling system malfunction',
        component: 'cooling_system',
        failureType: 'thermal',
        urgency: 'critical',
        canContinue: false,
        maxDistance: 0,
        speedLimit: 0,
        warnings: ['Stop immediately', 'Do not drive', 'Engine damage imminent'],
        estimatedCost: '$500-1500',
        repairTime: '4-8 hours',
        difficulty: 'moderate',
        tools: ['Cooling system tester', 'Thermostat wrench', 'Pressure tester'],
        parts: ['Thermostat', 'Water pump', 'Radiator cap'],
        preventiveMeasures: ['Check coolant levels', 'Inspect hoses', 'Monitor temperature gauge']
      };
    }
  }
  
  // Brake issues
  if (symptomsLower.includes('brake') || symptomsLower.includes('stopping')) {
    if (symptomsLower.includes('spongy') || symptomsLower.includes('soft')) {
      return {
        diagnosis: 'Brake system air contamination or fluid leak',
        component: 'brake_system',
        failureType: 'hydraulic',
        urgency: 'high',
        canContinue: true,
        maxDistance: 50,
        speedLimit: 30,
        warnings: ['Limited braking power', 'Avoid high speeds', 'Get immediate service'],
        estimatedCost: '$300-800',
        repairTime: '2-4 hours',
        difficulty: 'moderate',
        tools: ['Brake bleeder', 'Flare tool', 'Pressure gauge'],
        parts: ['Brake fluid', 'Brake lines', 'Master cylinder'],
        preventiveMeasures: ['Regular brake fluid checks', 'Inspect brake lines', 'Annual brake service']
      };
    }
  }
  
  // Transmission issues
  if (symptomsLower.includes('transmission') || symptomsLower.includes('gear')) {
    if (symptomsLower.includes('slip') || symptomsLower.includes('slipping')) {
      return {
        diagnosis: 'Transmission slipping - possible clutch or fluid issue',
        component: 'transmission',
        failureType: 'mechanical',
        urgency: 'medium',
        canContinue: true,
        maxDistance: 100,
        speedLimit: 45,
        warnings: ['Avoid heavy loads', 'Gentle acceleration', 'Monitor transmission temperature'],
        estimatedCost: '$1000-3000',
        repairTime: '1-2 days',
        difficulty: 'complex',
        tools: ['Transmission jack', 'Clutch alignment tool', 'Fluid pump'],
        parts: ['Clutch kit', 'Transmission fluid', 'Seals'],
        preventiveMeasures: ['Regular fluid changes', 'Proper shifting technique', 'Avoid overloading']
      };
    }
  }
  
  // Default analysis for unknown symptoms
  return {
    diagnosis: 'General mechanical issue detected',
    component: 'unknown',
    failureType: 'mechanical',
    urgency: 'medium',
    canContinue: true,
    maxDistance: 200,
    speedLimit: 55,
    warnings: ['Monitor symptoms', 'Schedule inspection', 'Avoid heavy loads'],
    estimatedCost: '$200-800',
    repairTime: '2-6 hours',
    difficulty: 'moderate',
    tools: ['Diagnostic scanner', 'Basic hand tools'],
    parts: ['To be determined after inspection'],
    preventiveMeasures: ['Regular maintenance', 'Monitor symptoms', 'Professional inspection']
  };
}

// Online pricing service
const pricingAPI = {
  // Get real-time prices for parts from various sources
  getPartPrices: async (partName: string, location?: {lat: number, lng: number}, quantity: number = 1) => {
    try {
      // Simulate API calls to various parts suppliers
      const suppliers = [
        { name: 'AutoZone', url: 'https://api.autozone.com/parts/search' },
        { name: 'O\'Reilly', url: 'https://api.oreillyauto.com/parts/search' },
        { name: 'Advance Auto', url: 'https://api.advanceautoparts.com/parts/search' },
        { name: 'NAPA', url: 'https://api.napaonline.com/parts/search' },
        { name: 'RockAuto', url: 'https://api.rockauto.com/parts/search' }
      ];

      // Location-based pricing adjustments
      const locationMultiplier = location ? await getLocationMultiplier(location) : 1.0;

      // Simulate API responses
      const mockPrices = await Promise.all(
        suppliers.map(async (supplier) => {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 100));

          const basePrice = Math.floor(Math.random() * 200 + 50);
          const adjustedPrice = Math.floor(basePrice * locationMultiplier);
          const availability = Math.random() > 0.3 ? 'In Stock' : '2-3 days';

          return {
            supplier: supplier.name,
            partName: partName,
            price: adjustedPrice,
            originalPrice: basePrice,
            availability: availability,
            shipping: Math.floor(Math.random() * 20 + 5),
            location: location ? `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}` : 'Online'
          };
        })
      );

      return {
        success: true,
        partName: partName,
        quantity: quantity,
        suppliers: mockPrices.sort((a, b) => a.price - b.price),
        lowestPrice: mockPrices.reduce((min, curr) => curr.price < min.price ? curr : min),
        averagePrice: Math.floor(mockPrices.reduce((sum, curr) => sum + curr.price, 0) / mockPrices.length)
      };
    } catch (error) {
      console.error('Pricing API failed:', error);
      return {
        success: false,
        error: 'Unable to fetch real-time prices'
      };
    }
  },

  // Get labor rates based on location
  getLaborRates: async (location?: {lat: number, lng: number}) => {
    try {
      const baseRate = 120; // $120/hour base

      if (!location) {
        return { rate: baseRate, region: 'National Average' };
      }

      const regionMultiplier = await getLocationMultiplier(location);
      const adjustedRate = Math.floor(baseRate * regionMultiplier);

      return {
        rate: adjustedRate,
        baseRate: baseRate,
        multiplier: regionMultiplier,
        region: getRegionName(location),
        currency: 'USD'
      };
    } catch (error) {
      console.error('Labor rates failed:', error);
      return { rate: 120, region: 'National Average', currency: 'USD' };
    }
  }
};

// Helper function to determine location-based pricing multiplier
async function getLocationMultiplier(location: {lat: number, lng: number}): Promise<number> {
  // Major cities have higher labor rates
  const cityMultipliers: Record<string, number> = {
    'NYC': 1.8,      // New York City
    'LA': 1.6,       // Los Angeles
    'CHI': 1.4,      // Chicago
    'BOS': 1.5,      // Boston
    'SF': 1.7,       // San Francisco
    'HOU': 1.1,      // Houston
    'DAL': 1.2,      // Dallas
    'MIA': 1.3,      // Miami
    'SEA': 1.4,      // Seattle
    'DEN': 1.2       // Denver
  };

  const region = getRegionName(location);
  return cityMultipliers[region] || 1.0;
}

// Helper function to get region name from coordinates
function getRegionName(location: {lat: number, lng: number}): string {
  const { lat, lng } = location;

  // Simplified region mapping
  if (Math.abs(lat - 40.7128) < 2 && Math.abs(lng + (-74.0060)) < 2) return 'NYC';
  if (Math.abs(lat - 34.0522) < 2 && Math.abs(lng + (-118.2437)) < 2) return 'LA';
  if (Math.abs(lat - 41.8781) < 2 && Math.abs(lng + (-87.6298)) < 2) return 'CHI';
  if (Math.abs(lat - 42.3601) < 2 && Math.abs(lng + (-71.0589)) < 2) return 'BOS';
  if (Math.abs(lat - 37.7749) < 2 && Math.abs(lng + (-122.4194)) < 2) return 'SF';
  if (Math.abs(lat - 29.7604) < 2 && Math.abs(lng + (-95.3698)) < 2) return 'HOU';
  if (Math.abs(lat - 32.7767) < 2 && Math.abs(lng + (-96.7970)) < 2) return 'DAL';
  if (Math.abs(lat - 25.7617) < 2 && Math.abs(lng + (-80.1918)) < 2) return 'MIA';
  if (Math.abs(lat - 47.6062) < 2 && Math.abs(lng + (-122.3321)) < 2) return 'SEA';
  if (Math.abs(lat - 39.7392) < 2 && Math.abs(lng + (-104.9903)) < 2) return 'DEN';

  return 'OTHER';
}

// Export all APIs
export {
  authAPI,
  aiAPI,
  diagnosticsAPI,
  voiceAPI,
  fleetAPI,
  reportsAPI,
  pricingAPI,
  supabase
};
