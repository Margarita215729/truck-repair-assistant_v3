import { getErrorMessage } from "../utils/error-handling";
import { YouTubeSearchService, YouTubeVideo } from './YouTubeSearchService';
/**
 * GitHub Models Service for Fine-tuning and Inference
 * Handles training data preparation, model fine-tuning, and inference
 */

export interface FineTuningConfig {
  model: string;
  training_file: string;
  validation_file?: string;
  n_epochs: number;
  batch_size: number;
  learning_rate_multiplier: number;
  prompt_loss_weight: number;
}

export interface TrainingJob {
  id: string;
  model: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  created_at: number;
  finished_at?: number;
  fine_tuned_model?: string;
  training_file: string;
  validation_file?: string;
  result_files: string[];
  trained_tokens?: number;
}

export interface DiagnosticPrompt {
  truck_model: string;
  symptoms: string;
  error_codes?: string[];
  audio_analysis?: {
    component: string;
    failure_type: string;
    confidence: number;
    severity: string;
    frequency_patterns: any;
  };
  environmental_context?: {
    weather: string;
    road_conditions: string;
    load_weight: number;
    driving_conditions: string;
  };
}

export interface DiagnosticResponse {
  diagnosis: string;
  component: string;
  failure_type: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  can_continue: boolean; // Simplified for quick access
  quick_fixes?: string[]; // New: Roadside solutions
  live_hacks?: string[]; // New: Professional tricks
  immediate_actions: string[];
  repair_recommendations?: string[];
  prevention_tips?: string[];
  cost_estimate?: {
    min: number;
    max: number;
  };
  difficulty?: 'easy' | 'moderate' | 'hard' | 'expert';
  video_search_terms?: string[];
  confidence_score: number;
  youtube_videos?: YouTubeVideo[];
}

export class GitHubModelsService {
  private readonly BASE_URL = 'https://models.inference.ai.azure.com'
  private youtubeService: YouTubeSearchService;
  private dynamicPricingService?: any; // Lazy load to avoid circular imports;
  private readonly API_VERSION = '2024-02-01';
  private apiKey: string;
  private fineTunedModel: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || this.getApiKey();
    this.youtubeService = new YouTubeSearchService();
    // Check if we have a fine-tuned model available
    this.loadFineTunedModel();
    
    // Validate API key format and setup
    this.validateApiKey();
  }

  private getApiKey(): string {
    // Try multiple sources for API key with enhanced validation
    if (typeof process !== 'undefined' && process.env?.MODELS_GITHUB_TOKEN) {
      return process.env.MODELS_GITHUB_TOKEN;
    }
    
    if (typeof window !== 'undefined') {
      // Check window environment variables
      if ((window as any).__ENV__?.MODELS_GITHUB_TOKEN) {
        return (window as any).__ENV__.MODELS_GITHUB_TOKEN;
      }
      
      // Check localStorage for development/testing
      const storedKey = localStorage.getItem('github_models_api_key');
      if (storedKey && storedKey !== 'your_token_here') {
        return storedKey;
      }
    }
    
    // Check import.meta.env for Vite
    try {
      if (import.meta?.env?.VITE_MODELS_GITHUB_TOKEN) {
        return import.meta.env.VITE_MODELS_GITHUB_TOKEN;
      }
    } catch (error) {
      // Silent fail for environments without import.meta
    }
    
    throw new Error('GitHub API key not found. Please set MODELS_GITHUB_TOKEN environment variable or configure in settings.');
  }

  private validateApiKey(): void {
    if (!this.apiKey || this.apiKey.length < 10) {
      console.warn('GitHub Models API key appears to be invalid or missing');
      return;
    }
    
    // Basic format validation for GitHub tokens
    if (!this.apiKey.startsWith('ghp_') && !this.apiKey.startsWith('github_pat_')) {
      console.warn('GitHub API key format may be invalid. Expected format: ghp_... or github_pat_...');
    }
  }

  private async loadFineTunedModel(): Promise<void> {
    try {
      // Check if we have a saved fine-tuned model ID
      const savedModel = localStorage.getItem('truck_diagnostic_model');
      if (savedModel) {
        this.fineTunedModel = savedModel;
        console.log('Loaded fine-tuned model:', savedModel);
      }
    } catch (error) {
      console.warn('Could not load fine-tuned model:', error);
    }
  }

  /**
   * Prepare training data for GitHub Models fine-tuning
   */
  async prepareTrainingData(trainingPoints: any[]): Promise<string> {
    const formattedData = trainingPoints.map(point => ({
      messages: [
        {
          role: "system",
          content: `You are an expert truck diagnostic AI with 20+ years of experience in heavy-duty vehicle repair. You specialize in:
- Engine diagnostics (Cummins, Caterpillar, Detroit Diesel)
- Transmission systems (Eaton Fuller, Allison)
- Brake systems (Bendix, Wabco air brakes)
- Electrical systems and sensors
- Audio-based component failure detection
- Emergency roadside assessment

CRITICAL PRIORITY ORDER FOR RESPONSES:
1. 🚨 IMMEDIATE SAFETY - Can driver continue safely?
2. ⚡ QUICK FIXES - Roadside solutions to get truck moving
3. 🔧 LIVE HACKS - Professional tricks and workarounds
4. 📺 VIDEO TUTORIALS - Step-by-step repair videos
5. 🛠️ SERVICE LOCATIONS - Only if quick fixes don't work
6. 📋 GENERAL INFO - Last resort, only if nothing else helps

IMPORTANT FORMATTING RULES:
- Use ONLY emojis and bullet points for structure
- NO asterisks (*), underscores (_), or markdown formatting
- NO technical symbols like **, __, or ##
- Keep responses clean and professional for truck drivers
- ALWAYS include relevant YouTube video search terms
- Focus on GETTING THE TRUCK MOVING, not general information

RESPONSE STRUCTURE:
🚨 SAFETY FIRST: Can continue driving? (YES/NO with specific conditions)
⚡ QUICK FIX: Immediate roadside solution
🔧 LIVE HACK: Professional trick or workaround
📺 VIDEO HELP: Specific YouTube search terms for repair videos
🛠️ SERVICE NEEDED: Only if quick fixes don't work
💰 COST ESTIMATE: Rough repair costs

Remember: Driver is ON THE ROAD and needs to keep moving. Prioritize quick solutions over general information.`
        },
        {
          role: "user", 
          content: this.formatDiagnosticPrompt(point.input)
        },
        {
          role: "assistant",
          content: this.formatDiagnosticResponse(point.output)
        }
      ]
    }));

    return JSON.stringify(formattedData, null, 2);
  }

  private formatDiagnosticPrompt(input: any): string {
    let prompt = `TRUCK DIAGNOSTIC REQUEST:

Truck Model: ${input.truck_model}
Symptoms: ${input.symptoms}`;

    if (input.error_codes?.length) {
      prompt += `\nError Codes: ${input.error_codes.join(', ')}`;
    }

    if (input.audio_analysis) {
      prompt += `\nAudio Analysis Results:
- Detected Component: ${input.audio_analysis.component}
- Failure Type: ${input.audio_analysis.failure_type}
- Confidence: ${Math.round(input.audio_analysis.confidence * 100)}%
- Severity: ${input.audio_analysis.severity}`;
    }

    prompt += '\n\nPlease provide comprehensive diagnostic analysis with immediate safety assessment.';
    
    return prompt;
  }

  private formatDiagnosticResponse(output: any): string {
    return `ROADSIDE TRUCK DIAGNOSTIC - GET YOU MOVING:

🚨 SAFETY FIRST:
• Can Continue Driving: ${output.can_continue ? 'YES (with specific conditions)' : 'NO - STOP IMMEDIATELY'}
• Safety Risk: ${output.urgency === 'critical' ? 'EXTREME - DO NOT DRIVE' : output.urgency === 'high' ? 'HIGH - Drive with extreme caution' : 'MODERATE - Monitor closely'}

⚡ QUICK FIX (Roadside Solution):
${output.quick_fixes?.map((fix: string) => `• ${fix}`).join('\n') || output.immediate_actions.map((action: string) => `• ${action}`).join('\n')}

🔧 LIVE HACK (Professional Trick):
${output.live_hacks?.map((hack: string) => `• ${hack}`).join('\n') || '• Check connections and try restarting engine'}

📺 VIDEO HELP (YouTube Search):
• Search: "${output.video_search_terms?.join('" OR "') || `${output.component} roadside fix tutorial`}"
• Quick fix videos: "Emergency truck repair", "Roadside truck hack"
• Professional channels: Heavy Duty Mechanics, Truck Repair Pro

🛠️ SERVICE NEEDED (Only if quick fixes fail):
• Component: ${output.component}
• Failure: ${output.failure_type}
• Urgency: ${output.urgency.toUpperCase()}

💰 ROUGH COST ESTIMATE:
• Quick fix: $0-50 (if you can do it)
• Professional repair: $${output.cost_estimate?.min || '500'}-$${output.cost_estimate?.max || '2000'}

🎯 PRIORITY: Get truck moving first, worry about permanent fix later!

💰 REPAIR INFORMATION:
• Estimated Cost: ${output.repair_cost_range}
• Difficulty Level: ${output.repair_difficulty}
• Required Parts: ${output.parts_needed.join(', ')}

🛡️ PREVENTIVE MEASURES:
• Regular inspection intervals
• Component-specific maintenance schedules
• Early warning signs to monitor

This analysis is based on extensive truck diagnostic expertise and real-world repair data from thousands of similar cases.`;
  }

  /**
   * Create fine-tuning job with prepared training data
   */
  async createFineTuningJob(config: FineTuningConfig): Promise<TrainingJob> {
    try {
      const response = await fetch(`${this.BASE_URL}/fine_tuning/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          training_file: config.training_file,
          validation_file: config.validation_file,
          hyperparameters: {
            n_epochs: config.n_epochs,
            batch_size: config.batch_size,
            learning_rate_multiplier: config.learning_rate_multiplier,
            prompt_loss_weight: config.prompt_loss_weight
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Fine-tuning job creation failed: ${response.status}`);
      }

      const job = await response.json();
      console.log('Fine-tuning job created:', job.id);
      
      return job;
    } catch (error) {
      console.error('Error creating fine-tuning job:', error);
      throw error;
    }
  }

  /**
   * Check status of fine-tuning job
   */
  async getFineTuningJobStatus(jobId: string): Promise<TrainingJob> {
    try {
      const response = await fetch(`${this.BASE_URL}/fine_tuning/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get job status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting job status:', error);
      throw error;
    }
  }

  /**
   * Get dynamic pricing analysis for repair costs
   */
  async getDynamicPricingAnalysis(
    component: string,
    repairType: string,
    location: { lat: number; lng: number; city?: string; state?: string }
  ): Promise<any> {
    if (!this.dynamicPricingService) {
      const { DynamicPricingService } = await import('./DynamicPricingService');
      this.dynamicPricingService = new DynamicPricingService();
    }
    
    return await this.dynamicPricingService.getRepairCostAnalysis(component, repairType, location);
  }

  /**
   * Get relevant YouTube videos for the diagnostic response
   */
  private async getRelevantYouTubeVideos(response: DiagnosticResponse): Promise<YouTubeVideo[]> {
    try {
      // Prioritize quick fix and roadside repair videos
      const quickFixTerms = [
        `${response.component} quick fix`,
        `${response.component} roadside repair`,
        `emergency truck repair ${response.component}`,
        `truck hack ${response.component}`,
        `roadside truck fix`,
        `emergency truck solution`
      ];
      
      const generalTerms = [
        response.component,
        response.diagnosis.split(' ')[0],
        'truck repair tutorial',
        'heavy duty repair'
      ];
      
      // Combine quick fix terms with general terms
      const searchTerms = [...quickFixTerms, ...generalTerms].filter(term => term && term.length > 2);

      const youtubeResult = await this.youtubeService.searchTruckRepairVideos(searchTerms, 3);
      return youtubeResult.videos;
    } catch (error) {
      console.warn('Failed to fetch YouTube videos:', error);
      return [];
    }
  }

  /**
   * Clean AI response from technical symbols and formatting
   */
  private cleanAIResponse(response: string): string {
    return response
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/##\s*(.*?)$/gm, '$1')
      .replace(/#\s*(.*?)$/gm, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`(.*?)`/g, '$1')
      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/gm, '')
      // Remove technical symbols
      .replace(/[`~^]/g, '')
      // Clean up bullet points
      .replace(/^\s*[-*+]\s+/gm, '• ')
      .trim();
  }

  /**
   * Enhanced diagnostic analysis using fine-tuned model with retry logic and error handling
   */
  async analyzeTruckDiagnostic(prompt: DiagnosticPrompt, retryCount: number = 3): Promise<DiagnosticResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const modelToUse = this.getBestAvailableModel();
        
        const systemPrompt = `You are a specialized truck diagnostic AI expert with access to:
- 50,000+ diagnostic cases from American truck forums
- Technical manuals from Cummins, Caterpillar, Detroit Diesel
- Real-world repair data from service centers nationwide
- Audio-based component failure detection capabilities
- REAL-TIME pricing data from Reddit posts (last 10 months)
- Location-based cost analysis from multiple sources

Provide comprehensive diagnostic analysis with focus on:
1. Immediate safety assessment
2. REAL-TIME cost estimation based on current market data
3. Practical roadside solutions
4. Component-specific failure patterns
5. Location-specific pricing trends

IMPORTANT: Always respond with structured information including diagnosis, component, urgency level, and safety assessment. Use current market pricing data when available.`;

        const userPrompt = await this.buildEnhancedPrompt(prompt);

        const requestBody = {
          model: modelToUse,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          top_p: 0.95
        };

        console.log(`🔄 Attempt ${attempt}/${retryCount}: Calling GitHub Models API with model: ${modelToUse}`);

        const response = await this.makeAPIRequest('/chat/completions', requestBody, attempt);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        if (!result.choices || !result.choices[0] || !result.choices[0].message) {
          throw new Error('Invalid response format from API');
        }

        const rawAnalysisText = result.choices[0].message.content;
        
        // Clean the AI response from technical symbols
        const analysisText = this.cleanAIResponse(rawAnalysisText);

        // Parse the structured response
        const parsedResponse = this.parseAnalysisResponse(analysisText);
        
        // Add YouTube videos to the response
        const youtubeVideos = await this.getRelevantYouTubeVideos(parsedResponse);
        parsedResponse.youtube_videos = youtubeVideos;
        
        // Validate the parsed response
        this.validateDiagnosticResponse(parsedResponse);
        
        console.log('✅ GitHub Models API call successful');
        return parsedResponse;

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt}/${retryCount} failed:`, getErrorMessage(error));
        
        // Don't retry on authentication errors
        if (getErrorMessage(error).includes('401') || getErrorMessage(error).includes('403')) {
          throw new Error(`Authentication failed: ${getErrorMessage(error)}. Please check your GitHub API key.`);
        }
        
        // Don't retry on rate limit errors beyond retryCount
        if (getErrorMessage(error).includes('429') && attempt === retryCount) {
          throw new Error(`Rate limit exceeded after ${retryCount} attempts. Please try again later.`);
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < retryCount) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If all retries failed, provide fallback response
    console.warn('All API attempts failed, providing fallback diagnostic response');
    return this.generateFallbackResponse(prompt, lastError);
  }

  /**
   * Make API request with proper headers and error handling
   */
  private async makeAPIRequest(endpoint: string, body: any, attempt: number): Promise<Response> {
    const url = `${this.BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'TruckDiagnosticAI/1.0',
      'X-GitHub-Api-Version': this.API_VERSION
    };

    // Add retry information to headers
    if (attempt > 1) {
      headers['X-Retry-Attempt'] = attempt.toString();
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - GitHub Models API did not respond within 30 seconds');
      }
      throw error;
    }
  }

  /**
   * Validate diagnostic response has required fields
   */
  private validateDiagnosticResponse(response: DiagnosticResponse): void {
    const requiredFields = ['diagnosis', 'component', 'failure_type', 'urgency'];
    const missingFields = requiredFields.filter(field => !response[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Invalid diagnostic response: missing fields ${missingFields.join(', ')}`);
    }

    // Validate urgency level
    const validUrgencies = ['low', 'medium', 'high', 'critical'];
    if (!validUrgencies.includes(response.urgency)) {
      console.warn(`Invalid urgency level: ${response.urgency}, defaulting to medium`);
      response.urgency = 'medium';
    }

    // Ensure safety assessment exists
    if (!response.safety_assessment) {
      response.safety_assessment = {
        can_continue: response.urgency !== 'critical',
        max_distance: response.urgency === 'critical' ? 0 : 50,
        speed_limit: response.urgency === 'critical' ? 0 : 45,
        warnings: ['Professional diagnosis recommended']
      };
    }
  }

  /**
   * Generate fallback response when API fails
   */
  private generateFallbackResponse(prompt: DiagnosticPrompt, error: Error | null): DiagnosticResponse {
    const component = this.inferComponentFromPrompt(prompt);
    const urgency = this.assessUrgencyFromSymptoms(prompt.symptoms);
    
    return {
      diagnosis: `Based on symptoms "${prompt.symptoms}", preliminary assessment suggests ${component} system requires attention. Professional diagnosis recommended due to API unavailability.`,
      component,
      failure_type: 'requires_professional_diagnosis',
      urgency,
      safety_assessment: {
        can_continue: urgency !== 'critical',
        max_distance: urgency === 'critical' ? 0 : 25,
        speed_limit: urgency === 'critical' ? 0 : 35,
        warnings: [
          'Professional diagnosis required',
          'API service temporarily unavailable',
          'Exercise caution while driving'
        ]
      },
      repair_information: {
        estimated_cost: 'Professional assessment needed',
        repair_time: 'To be determined',
        difficulty_level: 'professional',
        required_tools: ['Professional diagnostic equipment'],
        parts_needed: ['Professional assessment required']
      },
      immediate_actions: [
        'Schedule professional diagnosis',
        'Monitor symptoms closely',
        'Avoid aggressive driving',
        'Check fluid levels and visible components'
      ],
      preventive_measures: [
        'Regular maintenance schedule',
        'Professional inspections',
        'Quality parts and fluids'
      ],
      confidence_score: 0.4 // Lower confidence due to fallback
    };
  }

  /**
   * Helper methods for fallback response generation
   */
  private inferComponentFromPrompt(prompt: DiagnosticPrompt): string {
    const symptoms = prompt.symptoms.toLowerCase();
    
    if (symptoms.includes('engine') || symptoms.includes('motor') || symptoms.includes('knock')) {
      return 'engine';
    } else if (symptoms.includes('brake') || symptoms.includes('stop')) {
      return 'brakes';
    } else if (symptoms.includes('transmission') || symptoms.includes('gear') || symptoms.includes('shift')) {
      return 'transmission';
    } else if (symptoms.includes('air') || symptoms.includes('pressure') || symptoms.includes('hiss')) {
      return 'air_system';
    } else if (symptoms.includes('steering') || symptoms.includes('suspension') || symptoms.includes('vibrat')) {
      return 'suspension';
    } else if (symptoms.includes('electrical') || symptoms.includes('battery') || symptoms.includes('light')) {
      return 'electrical';
    }
    
    return 'engine'; // Default
  }

  private assessUrgencyFromSymptoms(symptoms: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalKeywords = ['stop', 'immediately', 'dangerous', 'smoke', 'fire', 'leak', 'grinding metal'];
    const highKeywords = ['loud', 'grinding', 'knocking', 'failing', 'emergency'];
    const mediumKeywords = ['noise', 'vibration', 'rough', 'concern'];
    
    const lowerSymptoms = symptoms.toLowerCase();
    
    if (criticalKeywords.some(keyword => lowerSymptoms.includes(keyword))) {
      return 'critical';
    } else if (highKeywords.some(keyword => lowerSymptoms.includes(keyword))) {
      return 'high';
    } else if (mediumKeywords.some(keyword => lowerSymptoms.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  private async buildEnhancedPrompt(prompt: DiagnosticPrompt, location?: { lat: number; lng: number; city?: string; state?: string }): Promise<string> {
    let enhancedPrompt = `ADVANCED TRUCK DIAGNOSTIC REQUEST:

🚛 VEHICLE INFORMATION:
Truck Model: ${prompt.truck_model}
Symptoms Reported: ${prompt.symptoms}`;

    if (prompt.error_codes?.length) {
      enhancedPrompt += `\nDTC Error Codes: ${prompt.error_codes.join(', ')}`;
    }

    if (prompt.audio_analysis) {
      enhancedPrompt += `\n🎵 AUDIO ANALYSIS RESULTS:
• Component Identified: ${prompt.audio_analysis.component}
• Failure Pattern: ${prompt.audio_analysis.failure_type}
• Detection Confidence: ${Math.round(prompt.audio_analysis.confidence * 100)}%
• Severity Level: ${prompt.audio_analysis.severity.toUpperCase()}
• Frequency Analysis: Low: ${prompt.audio_analysis.frequency_patterns?.low_freq}, Mid: ${prompt.audio_analysis.frequency_patterns?.mid_freq}, High: ${prompt.audio_analysis.frequency_patterns?.high_freq}`;
    }

    if (prompt.environmental_context) {
      enhancedPrompt += `\n🌍 OPERATIONAL CONTEXT:
• Weather Conditions: ${prompt.environmental_context.weather}
• Road Conditions: ${prompt.environmental_context.road_conditions}
• Current Load Weight: ${prompt.environmental_context.load_weight} lbs
• Driving Conditions: ${prompt.environmental_context.driving_conditions}`;
    }

    // Add dynamic pricing information if location is available
    if (location && prompt.audio_analysis) {
      try {
        const pricingAnalysis = await this.getDynamicPricingAnalysis(
          prompt.audio_analysis.component,
          prompt.audio_analysis.failure_type,
          location
        );
        
        enhancedPrompt += `\n💰 REAL-TIME PRICING DATA (${pricingAnalysis.location.city}, ${pricingAnalysis.location.state}):
• Total Cost Range: $${pricingAnalysis.pricing.total.min} - $${pricingAnalysis.pricing.total.max}
• Average Cost: $${pricingAnalysis.pricing.total.average}
• Labor Cost: $${pricingAnalysis.pricing.labor.average} (${pricingAnalysis.timeEstimate.average})
• Parts Cost: $${pricingAnalysis.pricing.parts.average}
• Price Trend: ${pricingAnalysis.trends.priceChange} (${pricingAnalysis.trends.changePercent}% over ${pricingAnalysis.trends.period})
• Data Sources: ${pricingAnalysis.sources.length} recent reports
• Confidence: ${Math.round(pricingAnalysis.confidence * 100)}%`;
      } catch (error) {
        console.warn('Failed to get dynamic pricing:', error);
        enhancedPrompt += `\n💰 PRICING: Using estimated costs (real-time data unavailable)`;
      }
    }

    enhancedPrompt += `\n\n📋 REQUIRED ANALYSIS:
Please provide comprehensive diagnostic analysis including:
1. Primary failure mode identification
2. Root cause analysis
3. Critical safety assessment (can driver continue?)
4. Immediate emergency actions
5. Detailed repair cost breakdown (use real-time pricing if available)
6. Parts availability and alternatives
7. Preventive maintenance recommendations
8. Similar case patterns and outcomes

Format response with clear sections and actionable information for emergency roadside situation.`;

    return enhancedPrompt;
  }

  private parseAnalysisResponse(analysisText: string): DiagnosticResponse {
    // Advanced parsing logic to extract structured data from AI response
    const lines = analysisText.split('\n').map(line => line.trim());
    
    let diagnosis = '';
    let component = '';
    let failureType = '';
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let canContinue = true;
    let quickFixes: string[] = [];
    let liveHacks: string[] = [];
    let immediateActions: string[] = [];
    let repairRecommendations: string[] = [];
    let preventionTips: string[] = [];
    let costEstimate = { min: 300, max: 800 };
    let difficulty: 'easy' | 'moderate' | 'hard' | 'expert' = 'moderate';
    let videoSearchTerms: string[] = [];
    let confidenceScore = 0.85;
    
    // Enhanced pattern matching with regex for roadside-focused responses
    const patterns = {
      diagnosis: /(?:diagnosis|primary.*?diagnosis|most likely cause):\s*(.+)/i,
      component: /(?:component|system):\s*(.+)/i,
      urgency: /(?:urgency|priority).*?:\s*(critical|high|medium|low)/i,
      canContinue: /(?:can continue|safe to continue|yes.*?continue|no.*?stop|stop immediately|do not.*?drive)/i,
      quickFix: /(?:quick fix|roadside solution|immediate fix|emergency fix):\s*(.+)/i,
      liveHack: /(?:live hack|professional trick|workaround|hack):\s*(.+)/i,
      cost: /(?:cost|price).*?:\s*\$?(\d+(?:,\d{3})*(?:-\$?\d+(?:,\d{3})*)?)/i,
      difficulty: /(?:difficulty|complexity).*?:\s*(easy|moderate|difficult|complex|expert)/i,
      confidence: /confidence.*?:\s*(\d+)%?/i,
      videoSearch: /(?:video|youtube|search).*?:\s*(.+)/i
    };
    
    // Extract structured information
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      
      // Extract diagnosis
      const diagnosisMatch = line.match(patterns.diagnosis);
      if (diagnosisMatch) {
        diagnosis = diagnosisMatch[1].trim();
      }
      
      // Extract component
      const componentMatch = line.match(patterns.component);
      if (componentMatch) {
        component = componentMatch[1].trim().toLowerCase();
      }
      
      // Extract urgency
      const urgencyMatch = line.match(patterns.urgency);
      if (urgencyMatch) {
        urgency = urgencyMatch[1].toLowerCase() as 'low' | 'medium' | 'high' | 'critical';
      }
      
      // Extract safety assessment
      const safetyMatch = line.match(patterns.canContinue);
      if (safetyMatch) {
        const safetyText = safetyMatch[1].toLowerCase();
        canContinue = safetyText.includes('safe') || safetyText.includes('can continue') || safetyText.includes('yes');
      }
      
      // Extract quick fixes
      const quickFixMatch = line.match(patterns.quickFix);
      if (quickFixMatch) {
        quickFixes.push(quickFixMatch[1].trim());
      }
      
      // Extract live hacks
      const liveHackMatch = line.match(patterns.liveHack);
      if (liveHackMatch) {
        liveHacks.push(liveHackMatch[1].trim());
      }
      
      // Extract cost information
      const costMatch = line.match(patterns.cost);
      if (costMatch) {
        const costText = costMatch[1];
        const costRange = costText.split('-');
        if (costRange.length === 2) {
          costEstimate.min = parseInt(costRange[0].replace(/[,$]/g, ''));
          costEstimate.max = parseInt(costRange[1].replace(/[,$]/g, ''));
        } else {
          costEstimate.min = parseInt(costText.replace(/[,$]/g, ''));
          costEstimate.max = costEstimate.min;
        }
      }
      
      // Extract difficulty
      const difficultyMatch = line.match(patterns.difficulty);
      if (difficultyMatch) {
        difficulty = difficultyMatch[1].toLowerCase() as 'easy' | 'moderate' | 'hard' | 'expert';
      }
      
      // Extract video search terms
      const videoMatch = line.match(patterns.videoSearch);
      if (videoMatch) {
        videoSearchTerms.push(videoMatch[1].trim());
      }
      
      // Extract confidence score
      const confidenceMatch = line.match(patterns.confidence);
      if (confidenceMatch) {
        confidenceScore = parseInt(confidenceMatch[1]) / 100;
      }
      
      // Extract immediate actions (look for bullet points or numbered lists)
      if (lowerLine.includes('immediate') || lowerLine.includes('action')) {
        const actionMatch = line.match(/[•\-\*]\s*(.+)|^\d+\.\s*(.+)/);
        if (actionMatch) {
          immediateActions.push((actionMatch[1] || actionMatch[2]).trim());
        }
      }
      
      // Extract parts needed
      if (lowerLine.includes('part') || lowerLine.includes('replace')) {
        const partsMatch = line.match(/(?:parts?|replace).*?:\s*(.+)/i);
        if (partsMatch) {
          partsNeeded.push(...partsMatch[1].split(',').map(p => p.trim()));
        }
      }
      
      // Extract required tools
      if (lowerLine.includes('tool') || lowerLine.includes('equipment')) {
        const toolsMatch = line.match(/(?:tools?|equipment).*?:\s*(.+)/i);
        if (toolsMatch) {
          requiredTools.push(...toolsMatch[1].split(',').map(t => t.trim()));
        }
      }
    });
    
    // Determine failure type from diagnosis and component
    failureType = this.determineFailureType(diagnosis, component);
    
    // Set default values if not extracted
    if (!diagnosis) diagnosis = 'Diagnostic analysis completed based on provided symptoms';
    if (!component) component = this.inferComponentFromDiagnosis(diagnosis);
    if (immediateActions.length === 0) {
      immediateActions = this.generateDefaultActions(urgency, component);
    }
    if (partsNeeded.length === 0) {
      partsNeeded = this.generateDefaultParts(component, failureType);
    }
    if (requiredTools.length === 0) {
      requiredTools = this.generateDefaultTools(component, difficultyLevel);
    }

    return {
      diagnosis,
      component,
      failure_type: failureType,
      urgency,
      can_continue: canContinue,
      quick_fixes: quickFixes.length > 0 ? quickFixes : undefined,
      live_hacks: liveHacks.length > 0 ? liveHacks : undefined,
      immediate_actions: immediateActions.length > 0 ? immediateActions : ['Check connections and restart engine'],
      repair_recommendations: repairRecommendations.length > 0 ? repairRecommendations : undefined,
      prevention_tips: preventionTips.length > 0 ? preventionTips : undefined,
      cost_estimate: costEstimate,
      difficulty,
      video_search_terms: videoSearchTerms.length > 0 ? videoSearchTerms : undefined,
      confidence_score: confidenceScore
    };
  }

  /**
   * Helper methods for intelligent parsing
   */
  private determineFailureType(diagnosis: string, component: string): string {
    const lowerDiagnosis = diagnosis.toLowerCase();
    
    const failurePatterns = {
      bearing_failure: ['bearing', 'rod bearing', 'main bearing'],
      valve_issues: ['valve', 'valve train', 'valve adjustment'],
      fuel_system: ['fuel', 'injector', 'fuel pump'],
      brake_wear: ['brake pad', 'brake shoe', 'rotor'],
      air_leak: ['air leak', 'hissing', 'pressure drop'],
      transmission_wear: ['gear', 'clutch', 'transmission'],
      turbo_issues: ['turbo', 'turbocharger', 'boost'],
      cooling_issues: ['cooling', 'radiator', 'thermostat'],
      electrical_issues: ['electrical', 'alternator', 'battery']
    };
    
    for (const [type, keywords] of Object.entries(failurePatterns)) {
      if (keywords.some(keyword => lowerDiagnosis.includes(keyword))) {
        return type;
      }
    }
    
    return 'general_malfunction';
  }

  private inferComponentFromDiagnosis(diagnosis: string): string {
    const lowerDiagnosis = diagnosis.toLowerCase();
    
    if (lowerDiagnosis.includes('engine') || lowerDiagnosis.includes('motor')) return 'engine';
    if (lowerDiagnosis.includes('brake')) return 'brakes';
    if (lowerDiagnosis.includes('transmission') || lowerDiagnosis.includes('gear')) return 'transmission';
    if (lowerDiagnosis.includes('air') || lowerDiagnosis.includes('pressure')) return 'air_system';
    if (lowerDiagnosis.includes('suspension') || lowerDiagnosis.includes('spring')) return 'suspension';
    if (lowerDiagnosis.includes('electrical') || lowerDiagnosis.includes('battery')) return 'electrical';
    
    return 'engine'; // Default to engine
  }

  private calculateMaxDistance(urgency: string, canContinue: boolean): number {
    if (!canContinue) return 0;
    
    switch (urgency) {
      case 'critical': return 5;
      case 'high': return 25;
      case 'medium': return 100;
      case 'low': return 500;
      default: return 50;
    }
  }

  private calculateSpeedLimit(urgency: string, canContinue: boolean): number {
    if (!canContinue) return 0;
    
    switch (urgency) {
      case 'critical': return 25;
      case 'high': return 45;
      case 'medium': return 55;
      case 'low': return 65;
      default: return 45;
    }
  }

  private generateSafetyWarnings(urgency: string, canContinue: boolean, component: string): string[] {
    const warnings = [];
    
    if (!canContinue) {
      warnings.push('STOP IMMEDIATELY - Do not continue driving');
      warnings.push('Call for emergency roadside assistance');
      warnings.push('Turn on hazard lights and pull off road safely');
    } else {
      warnings.push('Drive with extreme caution');
      warnings.push('Monitor symptoms continuously');
      
      if (urgency === 'critical' || urgency === 'high') {
        warnings.push('Seek immediate professional diagnosis');
      }
      
      if (component === 'brakes') {
        warnings.push('Test brakes at low speed before proceeding');
        warnings.push('Increase following distance significantly');
      } else if (component === 'engine') {
        warnings.push('Monitor engine temperature and oil pressure');
        warnings.push('Avoid high RPM and heavy acceleration');
      }
    }
    
    return warnings;
  }

  private generateDefaultActions(urgency: string, component: string): string[] {
    const actions = ['Document all symptoms and conditions'];
    
    if (urgency === 'critical') {
      actions.unshift('Stop vehicle immediately in safe location');
      actions.push('Call for emergency towing service');
    } else {
      actions.push('Check fluid levels and visible components');
      actions.push('Monitor warning lights and gauges');
    }
    
    if (component === 'brakes') {
      actions.push('Test brake operation at low speed');
    } else if (component === 'engine') {
      actions.push('Check oil level and color');
      actions.push('Monitor engine temperature');
    }
    
    return actions;
  }

  private generateDefaultParts(component: string, failureType: string): string[] {
    const partsByComponent = {
      engine: ['Engine oil', 'Oil filter', 'Air filter', 'Fuel filter'],
      brakes: ['Brake pads', 'Brake fluid', 'Air brake components'],
      transmission: ['Transmission fluid', 'Filter', 'Gaskets'],
      air_system: ['Air brake chamber', 'Air lines', 'Compressor belt'],
      suspension: ['Shock absorbers', 'Springs', 'Bushings'],
      electrical: ['Fuses', 'Relays', 'Wiring harness']
    };
    
    const baseParts = partsByComponent[component] || ['General maintenance items'];
    
    // Add specific parts based on failure type
    if (failureType.includes('bearing')) {
      baseParts.push('Bearing set', 'Gasket kit');
    } else if (failureType.includes('leak')) {
      baseParts.push('Seals', 'O-rings', 'Gaskets');
    }
    
    return baseParts;
  }

  private generateDefaultTools(component: string, difficulty: string): string[] {
    const basicTools = ['Basic hand tools', 'Socket set', 'Wrench set'];
    
    if (difficulty === 'expert' || difficulty === 'complex') {
      basicTools.push('Specialized tools', 'Diagnostic scanner', 'Torque wrench');
    }
    
    if (component === 'engine') {
      basicTools.push('Engine hoist', 'Compression tester');
    } else if (component === 'brakes') {
      basicTools.push('Brake tools', 'Air pressure gauge');
    } else if (component === 'transmission') {
      basicTools.push('Transmission jack', 'Fluid pump');
    }
    
    return basicTools;
  }

  private generatePreventiveMeasures(component: string, failureType: string): string[] {
    const measures = ['Follow regular maintenance schedule'];
    
    if (component === 'engine') {
      measures.push('Regular oil changes every 10,000 miles');
      measures.push('Monitor oil pressure and temperature');
      measures.push('Use quality fuel and filters');
    } else if (component === 'brakes') {
      measures.push('Inspect brake system every 30 days');
      measures.push('Check air pressure daily');
      measures.push('Listen for unusual brake sounds');
    } else if (component === 'transmission') {
      measures.push('Check transmission fluid monthly');
      measures.push('Avoid excessive clutch slipping');
      measures.push('Warm up transmission in cold weather');
    }
    
    if (failureType.includes('bearing')) {
      measures.push('Use quality lubricants');
      measures.push('Monitor for early warning signs');
    }
    
    return measures;
  }

  /**
   * Upload training file for fine-tuning
   */
  async uploadTrainingFile(data: string, filename: string): Promise<string> {
    try {
      // Create a blob from the training data
      const blob = new Blob([data], { type: 'application/jsonl' });
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('purpose', 'fine-tune');

      const response = await fetch(`${this.BASE_URL}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`File upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Training file uploaded:', result.id);
      
      return result.id;
    } catch (error) {
      console.error('Error uploading training file:', error);
      throw error;
    }
  }

  /**
   * Start the complete fine-tuning process
   */
  async startFineTuningProcess(trainingData: any[]): Promise<string> {
    try {
      console.log('Starting fine-tuning process...');
      
      // Check if we already have a trained model
      const existingModel = this.getExistingTrainedModel();
      if (existingModel) {
        console.log('Using existing trained model:', existingModel);
        return existingModel;
      }
      
      // Check if training is needed based on data changes
      const shouldTrain = await this.shouldTrainModel(trainingData);
      if (!shouldTrain) {
        console.log('Training not needed, using base model');
        return 'gpt-4o-mini'; // Return base model
      }
      
      // 1. Prepare training data
      const formattedData = await this.prepareTrainingData(trainingData);
      
      // 2. Upload training file
      const fileId = await this.uploadTrainingFile(formattedData, 'truck_diagnostic_training.jsonl');
      
      // 3. Create fine-tuning job
      const job = await this.createFineTuningJob({
        model: 'gpt-4o-mini',
        training_file: fileId,
        n_epochs: 3,
        batch_size: 8,
        learning_rate_multiplier: 0.1,
        prompt_loss_weight: 0.01
      });
      
      console.log('Fine-tuning job started:', job.id);
      return job.id;
      
    } catch (error) {
      console.error('Fine-tuning process failed:', error);
      throw error;
    }
  }

  /**
   * Get existing trained model from cache
   */
  private getExistingTrainedModel(): string | null {
    try {
      const cachedModel = localStorage.getItem('truck_diagnostic_model');
      const modelTimestamp = localStorage.getItem('truck_diagnostic_model_timestamp');
      
      if (cachedModel && modelTimestamp) {
        const timestamp = new Date(modelTimestamp).getTime();
        const now = Date.now();
        const ageInHours = (now - timestamp) / (1000 * 60 * 60);
        
        // Use cached model if it's less than 7 days old
        if (ageInHours < 168) {
          console.log('Using cached model, age:', Math.round(ageInHours), 'hours');
          return cachedModel;
        } else {
          console.log('Cached model is too old, age:', Math.round(ageInHours), 'hours');
          localStorage.removeItem('truck_diagnostic_model');
          localStorage.removeItem('truck_diagnostic_model_timestamp');
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting existing model:', error);
      return null;
    }
  }

  /**
   * Check if model training is needed
   */
  private async shouldTrainModel(trainingData: any[]): Promise<boolean> {
    try {
      // Check if we have enough new data to warrant training
      const lastTrainingData = localStorage.getItem('last_training_data_hash');
      const currentDataHash = this.generateDataHash(trainingData);
      
      if (lastTrainingData === currentDataHash) {
        console.log('Training data unchanged, skipping training');
        return false;
      }
      
      // Check if we have enough data samples
      if (trainingData.length < 50) {
        console.log('Not enough training data:', trainingData.length, 'samples');
        return false;
      }
      
      // Check if enough time has passed since last training
      const lastTraining = localStorage.getItem('last_training_timestamp');
      if (lastTraining) {
        const lastTrainingTime = new Date(lastTraining).getTime();
        const now = Date.now();
        const timeSinceLastTraining = now - lastTrainingTime;
        
        // Only train if more than 24 hours have passed
        if (timeSinceLastTraining < (24 * 60 * 60 * 1000)) {
          console.log('Not enough time since last training');
          return false;
        }
      }
      
      console.log('Training is needed');
      return true;
      
    } catch (error) {
      console.error('Error checking if training is needed:', error);
      return false; // Default to not training if check fails
    }
  }

  /**
   * Generate hash for training data to detect changes
   */
  private generateDataHash(trainingData: any[]): string {
    try {
      const dataString = JSON.stringify(trainingData.map(d => ({
        input: d.input,
        output: d.output
      })));
      
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      return hash.toString();
    } catch (error) {
      console.error('Error generating data hash:', error);
      return Date.now().toString(); // Fallback to timestamp
    }
  }

  /**
   * Monitor fine-tuning progress
   */
  async monitorTraining(jobId: string, onProgress?: (status: TrainingJob) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const status = await this.getFineTuningJobStatus(jobId);
          
          if (onProgress) {
            onProgress(status);
          }
          
          if (status.status === 'succeeded') {
            if (status.fine_tuned_model) {
              this.fineTunedModel = status.fine_tuned_model;
              localStorage.setItem('truck_diagnostic_model', status.fine_tuned_model);
              localStorage.setItem('truck_diagnostic_model_timestamp', new Date().toISOString());
              localStorage.setItem('last_training_timestamp', new Date().toISOString());
              console.log('Fine-tuning completed successfully:', status.fine_tuned_model);
              resolve(status.fine_tuned_model);
            } else {
              reject(new Error('Fine-tuning succeeded but no model ID returned'));
            }
          } else if (status.status === 'failed') {
            reject(new Error('Fine-tuning job failed'));
          } else if (status.status === 'cancelled') {
            reject(new Error('Fine-tuning job was cancelled'));
          } else {
            // Still running, check again in 30 seconds
            setTimeout(checkStatus, 30000);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      checkStatus();
    });
  }

  /**
   * Get the best available model (cached fine-tuned or base model)
   */
  private getBestAvailableModel(): string {
    const cachedModel = this.getExistingTrainedModel();
    if (cachedModel) {
      console.log('Using cached fine-tuned model:', cachedModel);
      return cachedModel;
    }
    
    console.log('Using base model: gpt-4o-mini');
    return 'gpt-4o-mini';
  }
}
