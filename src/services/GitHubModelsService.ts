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
  safety_assessment: {
    can_continue: boolean;
    max_distance: number;
    speed_limit: number;
    warnings: string[];
  };
  repair_information: {
    estimated_cost: string;
    repair_time: string;
    difficulty_level: string;
    required_tools: string[];
    parts_needed: string[];
  };
  immediate_actions: string[];
  preventive_measures: string[];
  confidence_score: number;
}

export class GitHubModelsService {
  private readonly BASE_URL = 'https://models.inference.ai.azure.com';
  private readonly API_VERSION = '2024-02-01';
  private apiKey: string;
  private fineTunedModel: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || this.getApiKey();
    // Check if we have a fine-tuned model available
    this.loadFineTunedModel();
    
    // Validate API key format and setup
    this.validateApiKey();
  }

  private getApiKey(): string {
    // Try multiple sources for API key with enhanced validation
    if (typeof process !== 'undefined' && process.env?.GITHUB_TOKEN) {
      return process.env.GITHUB_TOKEN;
    }
    
    if (typeof window !== 'undefined') {
      // Check window environment variables
      if ((window as any).__ENV__?.GITHUB_TOKEN) {
        return (window as any).__ENV__.GITHUB_TOKEN;
      }
      
      // Check localStorage for development/testing
      const storedKey = localStorage.getItem('github_models_api_key');
      if (storedKey && storedKey !== 'your_token_here') {
        return storedKey;
      }
    }
    
    // Check import.meta.env for Vite
    try {
      if (import.meta?.env?.VITE_GITHUB_TOKEN) {
        return import.meta.env.VITE_GITHUB_TOKEN;
      }
    } catch (error) {
      // Silent fail for environments without import.meta
    }
    
    throw new Error('GitHub API key not found. Please set GITHUB_TOKEN environment variable or configure in settings.');
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

Provide comprehensive, practical diagnostic advice focused on driver safety and cost-effective repairs.`
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
    return `COMPREHENSIVE TRUCK DIAGNOSTIC ANALYSIS:

🔧 PRIMARY DIAGNOSIS: ${output.diagnosis}

📋 COMPONENT DETAILS:
• Component: ${output.component}
• Failure Type: ${output.failure_type}
• Urgency Level: ${output.urgency.toUpperCase()}

🚨 SAFETY ASSESSMENT:
• Can Continue Driving: ${output.can_continue ? 'YES (with caution)' : 'NO - STOP IMMEDIATELY'}
• Safety Risk Level: ${output.urgency === 'critical' ? 'EXTREME' : output.urgency === 'high' ? 'HIGH' : 'MODERATE'}

⚡ IMMEDIATE ACTIONS:
${output.immediate_actions.map((action: string) => `• ${action}`).join('\n')}

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
   * Enhanced diagnostic analysis using fine-tuned model with retry logic and error handling
   */
  async analyzeTruckDiagnostic(prompt: DiagnosticPrompt, retryCount: number = 3): Promise<DiagnosticResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const modelToUse = this.fineTunedModel || 'gpt-4o-mini';
        
        const systemPrompt = `You are a specialized truck diagnostic AI expert with access to:
- 50,000+ diagnostic cases from American truck forums
- Technical manuals from Cummins, Caterpillar, Detroit Diesel
- Real-world repair data from service centers nationwide
- Audio-based component failure detection capabilities

Provide comprehensive diagnostic analysis with focus on:
1. Immediate safety assessment
2. Accurate cost estimation
3. Practical roadside solutions
4. Component-specific failure patterns

IMPORTANT: Always respond with structured information including diagnosis, component, urgency level, and safety assessment.`;

        const userPrompt = this.buildEnhancedPrompt(prompt);

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

        const analysisText = result.choices[0].message.content;

        // Parse the structured response
        const parsedResponse = this.parseAnalysisResponse(analysisText);
        
        // Validate the parsed response
        this.validateDiagnosticResponse(parsedResponse);
        
        console.log('✅ GitHub Models API call successful');
        return parsedResponse;

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt}/${retryCount} failed:`, error.message);
        
        // Don't retry on authentication errors
        if (error.message.includes('401') || error.message.includes('403')) {
          throw new Error(`Authentication failed: ${error.message}. Please check your GitHub API key.`);
        }
        
        // Don't retry on rate limit errors beyond retryCount
        if (error.message.includes('429') && attempt === retryCount) {
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

  private buildEnhancedPrompt(prompt: DiagnosticPrompt): string {
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

    enhancedPrompt += `\n\n📋 REQUIRED ANALYSIS:
Please provide comprehensive diagnostic analysis including:
1. Primary failure mode identification
2. Root cause analysis
3. Critical safety assessment (can driver continue?)
4. Immediate emergency actions
5. Detailed repair cost breakdown
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
    let estimatedCost = '$300-800';
    let repairTime = '2-4 hours';
    let difficultyLevel = 'moderate';
    let immediateActions: string[] = [];
    let partsNeeded: string[] = [];
    let requiredTools: string[] = [];
    let confidenceScore = 0.85;
    
    // Enhanced pattern matching with regex
    const patterns = {
      diagnosis: /(?:diagnosis|primary.*?diagnosis|most likely cause):\s*(.+)/i,
      component: /(?:component|system):\s*(.+)/i,
      urgency: /(?:urgency|priority).*?:\s*(critical|high|medium|low)/i,
      canContinue: /(stop immediately|do not (?:continue|drive)|cannot continue|safe to continue|can continue)/i,
      cost: /(?:cost|price).*?:\s*\$?(\d+(?:,\d{3})*(?:-\$?\d+(?:,\d{3})*)?)/i,
      time: /(?:time|duration).*?:\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|minutes?|mins?)/i,
      difficulty: /(?:difficulty|complexity).*?:\s*(easy|moderate|difficult|complex|expert)/i,
      confidence: /confidence.*?:\s*(\d+)%?/i
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
        canContinue = safetyText.includes('safe') || safetyText.includes('can continue');
      }
      
      // Extract cost information
      const costMatch = line.match(patterns.cost);
      if (costMatch) {
        estimatedCost = '$' + costMatch[1];
      }
      
      // Extract time information
      const timeMatch = line.match(patterns.time);
      if (timeMatch) {
        const timeValue = timeMatch[1];
        const unit = line.toLowerCase().includes('minute') ? 'minutes' : 'hours';
        repairTime = `${timeValue} ${unit}`;
      }
      
      // Extract difficulty
      const difficultyMatch = line.match(patterns.difficulty);
      if (difficultyMatch) {
        difficultyLevel = difficultyMatch[1].toLowerCase();
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
      safety_assessment: {
        can_continue: canContinue,
        max_distance: this.calculateMaxDistance(urgency, canContinue),
        speed_limit: this.calculateSpeedLimit(urgency, canContinue),
        warnings: this.generateSafetyWarnings(urgency, canContinue, component)
      },
      repair_information: {
        estimated_cost: estimatedCost,
        repair_time: repairTime,
        difficulty_level: difficultyLevel,
        required_tools: requiredTools,
        parts_needed: partsNeeded
      },
      immediate_actions: immediateActions,
      preventive_measures: this.generatePreventiveMeasures(component, failureType),
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
}
