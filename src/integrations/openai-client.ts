/**
 * OpenAI Client Integration Service
 * Provides embeddings and AI capabilities with automatic API key detection
 */

import OpenAI from 'openai';
import { APIKeyDetector } from './api-key-detector.js';
import { secretStore } from '../services/secret-store.js';
import { CircuitBreaker } from '../utils/circuit-breaker.js';

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  tokens: number;
  model: string;
}

export interface OpenAIConfig {
  apiKey?: string;
  organization?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

export class OpenAIClientService {
  private client: OpenAI | null = null;
  private keyDetector: APIKeyDetector;
  private config: OpenAIConfig = {};
  private breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 30000 });

  constructor(config?: OpenAIConfig) {
    this.keyDetector = new APIKeyDetector();
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Initialize OpenAI client with automatic API key detection
   */
  async initialize(): Promise<boolean> {
    try {
      // Try provided API key first
      if (this.config.apiKey) {
        return this.initializeWithKey(this.config.apiKey);
      }

      // Try SecretStore (env/other providers)
      const envKey = await secretStore.get('OPENAI_API_KEY');
      if (envKey) {
        return this.initializeWithKey(envKey);
      }

      // Auto-detect API keys from IDE configurations
      const detection = await this.keyDetector.detectAPIKeys();
      
      if (!detection.hasOpenAI) {
        // Silently return false during initialization
        return false;
      }

      // Use recommended key or first valid OpenAI key
      const openAIKey = detection.recommended?.type === 'openai' 
        ? detection.recommended 
        : detection.found.find(key => key.type === 'openai' && key.isValid);

      if (!openAIKey) {
        // Silently return false during initialization
        return false;
      }

      // Get the actual key value
      const apiKey = await this.getKeyValue(openAIKey);
      if (!apiKey) {
        // Silently return false during initialization
        return false;
      }

      return this.initializeWithKey(apiKey);

    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      return false;
    }
  }

  /**
   * Initialize client with a specific API key
   */
  private initializeWithKey(apiKey: string): boolean {
    try {
      this.client = new OpenAI({
        apiKey,
        organization: this.config.organization,
        baseURL: this.config.baseURL,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize OpenAI client with key:', error);
      return false;
    }
  }

  /**
   * Get API key value from detected source
   */
  private async getKeyValue(keySource: any): Promise<string | null> {
    try {
      if (keySource.environmentVar && process.env[keySource.environmentVar]) {
        return process.env[keySource.environmentVar]!;
      }

      if (keySource.filePath) {
        // For file-based keys, this would require reading the config file
        // For now, we'll rely on environment variables
        console.log(`API key found in ${keySource.filePath}, but file reading not implemented yet.`);
        return null;
      }

      return null;
    } catch (error) {
      console.error('Failed to get API key value:', error);
      return null;
    }
  }

  /**
   * Check if OpenAI client is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse | null> {
    if (!this.client) {
      console.warn('OpenAI client not initialized. Call initialize() first.');
      return null;
    }
    if (!this.breaker.canAttempt()) {
      console.warn('OpenAI circuit is open. Skipping request temporarily.');
      return null;
    }

    try {
      const model = request.model || 'text-embedding-ada-002';
      const controller = new AbortController();
      const timeoutMs = this.config.timeout || 30000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await this.client.embeddings.create({
        model,
        input: request.text,
        encoding_format: 'float'
      }, { signal: controller.signal as any });

      clearTimeout(timer);

      if (response.data.length === 0) {
        throw new Error('No embedding returned from OpenAI');
      }

      const result = {
        embedding: response.data[0]?.embedding || [],
        tokens: response.usage?.total_tokens || 0,
        model: response.model
      };
      this.breaker.onSuccess();
      return result;

    } catch (error) {
      console.error('Failed to generate embedding:', error);
      this.breaker.onFailure();
      // Simple retry with jitter
      if ((this.config.maxRetries || 0) > 0) {
        const delay = 200 + Math.floor(Math.random() * 300);
        await new Promise(r => setTimeout(r, delay));
        this.config.maxRetries = (this.config.maxRetries || 0) - 1;
        return this.generateEmbedding(request);
      }
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddings(texts: string[], model?: string): Promise<EmbeddingResponse[]> {
    if (!this.client) {
      console.warn('OpenAI client not initialized.');
      return [];
    }

    const results: EmbeddingResponse[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      try {
        const response = await this.client.embeddings.create({
          model: model || 'text-embedding-ada-002',
          input: batch,
          encoding_format: 'float'
        });

        response.data.forEach((item, index) => {
          results.push({
            embedding: item.embedding,
            tokens: Math.floor((response.usage?.total_tokens || 0) / response.data.length),
            model: response.model
          });
        });

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`Failed to generate embeddings for batch ${i / batchSize + 1}:`, error);
        // Continue with next batch
      }
    }

    return results;
  }

  /**
   * Test the OpenAI connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: 'test',
        encoding_format: 'float'
      });

      return response.data.length > 0;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  /**
   * Get client usage statistics
   */
  getUsageStats() {
    return {
      clientInitialized: this.client !== null,
      config: {
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
        hasOrganization: !!this.config.organization,
        hasCustomBaseURL: !!this.config.baseURL
      }
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.client = null;
  }

  getCircuitState(): 'closed' | 'open' | 'half-open' {
    return this.breaker.state();
  }
}

// Singleton instance for global use
export const openAIClient = new OpenAIClientService();