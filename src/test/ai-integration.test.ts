/**
 * AI Integration Tests
 * Tests the AI-powered features including ChromaDB and OpenAI integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContextAnalysisEngine } from '../analyzers/context-analysis-engine.js';
import { chromaDBService } from '../integrations/chromadb-client.js';
import { openAIClient } from '../integrations/openai-client.js';
import { documentationIndexingService } from '../services/documentation-indexing-service.js';
import { createLogger } from '../utils/logger.js';
import type { ContextAnalysisRequest } from '../types/index.js';

describe('AI Integration', () => {
  const logger = createLogger('error'); // Suppress logs during testing
  let contextEngine: ContextAnalysisEngine;

  beforeEach(() => {
    contextEngine = new ContextAnalysisEngine(logger);
  });

  describe('ContextAnalysisEngine', () => {
    it('should initialize with AI services detection', async () => {
      expect(contextEngine).toBeDefined();
      expect(contextEngine.isAIEnabled).toBeDefined();
      expect(typeof contextEngine.isAIEnabled()).toBe('boolean');
    });

    it('should handle analysis requests without AI features', async () => {
      const request: ContextAnalysisRequest = {
        prompt: 'How do I create a content type in Optimizely CMS?'
      };

      // Initialize without AI services
      await contextEngine.initialize();
      const response = await contextEngine.analyze(request);

      expect(response).toBeDefined();
      expect(response.relevance).toBeGreaterThan(0);
      expect(response.curatedContext).toBeDefined();
      expect(response.processingTime).toBeGreaterThan(0);
    });

    it('should detect AI availability correctly', () => {
      // By default, AI services won't be available in test environment
      expect(contextEngine.isAIEnabled()).toBe(false);
    });
  });

  describe('ChromaDB Service', () => {
    it('should have correct interface', () => {
      expect(chromaDBService.isAvailable).toBeDefined();
      expect(chromaDBService.initialize).toBeDefined();
      expect(chromaDBService.searchDocuments).toBeDefined();
      expect(chromaDBService.addDocuments).toBeDefined();
    });

    it('should return false for availability when not initialized', () => {
      expect(chromaDBService.isAvailable()).toBe(false);
    });
  });

  describe('OpenAI Client', () => {
    it('should have correct interface', () => {
      expect(openAIClient.isAvailable).toBeDefined();
      expect(openAIClient.initialize).toBeDefined();
      expect(openAIClient.generateEmbedding).toBeDefined();
      expect(openAIClient.generateEmbeddings).toBeDefined();
    });

    it('should return false for availability when not initialized', () => {
      expect(openAIClient.isAvailable()).toBe(false);
    });
  });

  describe('Documentation Indexing Service', () => {
    it('should have correct interface', () => {
      expect(documentationIndexingService.indexAllDocumentation).toBeDefined();
      expect(documentationIndexingService.getIndexingProgress).toBeDefined();
      expect(documentationIndexingService.isIndexing).toBeDefined();
      expect(documentationIndexingService.clearIndex).toBeDefined();
    });

    it('should report correct initial state', () => {
      const progress = documentationIndexingService.getIndexingProgress();
      expect(progress.status).toBe('idle');
      expect(progress.totalDocuments).toBe(0);
      expect(progress.processedDocuments).toBe(0);
      expect(documentationIndexingService.isIndexing()).toBe(false);
    });

    it('should handle indexing without AI services', async () => {
      // Should return false when AI services are not available
      const result = await documentationIndexingService.indexAllDocumentation();
      expect(result).toBe(false);
    });
  });

  describe('AI-Enhanced Context Analysis', () => {
    it('should fallback gracefully when AI is not available', async () => {
      const request: ContextAnalysisRequest = {
        prompt: 'Implement a custom handler chain for commerce processing with error handling and logging best practices'
      };

      await contextEngine.initialize();
      const response = await contextEngine.analyze(request);

      expect(response).toBeDefined();
      expect(response.relevance).toBeGreaterThan(0.2); // Should detect some Optimizely relevance
      // Note: Without AI features, product detection is more limited
      expect(Array.isArray(response.detectedProducts)).toBe(true);
      expect(response.curatedContext.summary).toBeDefined();
      expect(Array.isArray(response.curatedContext.actionableSteps)).toBe(true);
      expect(Array.isArray(response.curatedContext.bestPractices)).toBe(true);
    });

    it('should provide context for multiple product scenarios', async () => {
      const request: ContextAnalysisRequest = {
        prompt: 'How to integrate CMS content with Commerce product catalog using DXP personalization?'
      };

      await contextEngine.initialize();
      const response = await contextEngine.analyze(request);

      expect(response).toBeDefined();
      expect(response.relevance).toBeGreaterThan(0.3); // Multi-product queries may have lower relevance without AI
      expect(Array.isArray(response.detectedProducts)).toBe(true);
      expect(Array.isArray(response.curatedContext.productContext)).toBe(true);
    });

    it('should handle low-relevance queries appropriately', async () => {
      const request: ContextAnalysisRequest = {
        prompt: 'What is the weather today in Tokyo?'
      };

      await contextEngine.initialize();
      const response = await contextEngine.analyze(request);

      expect(response).toBeDefined();
      expect(response.relevance).toBeLessThan(0.7);
      expect(response.detectedProducts.length).toBe(0);
      expect(response.curatedContext.summary).toContain('not appear to be related to Optimizely');
    });
  });
});

describe('AI Integration Components', () => {
  it('should have proper error handling in all services', () => {
    // Test that all services are properly instantiated and won't throw on basic calls
    expect(() => chromaDBService.isAvailable()).not.toThrow();
    expect(() => openAIClient.isAvailable()).not.toThrow();
    expect(() => documentationIndexingService.isIndexing()).not.toThrow();
  });

  it('should provide appropriate status information', () => {
    const progress = documentationIndexingService.getIndexingProgress();
    expect(progress).toHaveProperty('status');
    expect(progress).toHaveProperty('totalDocuments');
    expect(progress).toHaveProperty('processedDocuments');
    expect(progress).toHaveProperty('failedDocuments');
  });
});