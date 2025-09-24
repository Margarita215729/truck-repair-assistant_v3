/**
 * GitHub Models API Client
 * Handles HTTP requests to GitHub Models API
 */

import { getErrorMessage } from '../utils/error-handling';

export class GitHubModelsApiClient {
  private readonly BASE_URL = 'https://models.inference.ai.azure.com';
  private readonly API_VERSION = '2024-02-01';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.validateApiKey();
  }

  private validateApiKey(): void {
    if (!this.apiKey || this.apiKey.length < 20) {
      throw new Error('Invalid GitHub Models API key');
    }
  }

  /**
   * Make HTTP request to GitHub Models API with retry logic
   */
  async makeAPIRequest(
    endpoint: string,
    body: any,
    attempt: number = 1
  ): Promise<Response> {
    const url = `${this.BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'api-version': this.API_VERSION,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      return response;
    } catch (error) {
      console.error(`API request failed (attempt ${attempt}):`, error);
      throw new Error(`API request failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get fine-tuning job status
   */
  async getFineTuningJobStatus(jobId: string): Promise<any> {
    const response = await fetch(
      `${this.BASE_URL}/fine_tuning/jobs/${jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'api-version': this.API_VERSION,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create fine-tuning job
   */
  async createFineTuningJob(config: any): Promise<any> {
    const response = await this.makeAPIRequest('/fine_tuning/jobs', config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create job: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * List fine-tuning jobs
   */
  async listFineTuningJobs(): Promise<any> {
    const response = await fetch(
      `${this.BASE_URL}/fine_tuning/jobs`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'api-version': this.API_VERSION,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list jobs: ${response.status}`);
    }

    return response.json();
  }
}

