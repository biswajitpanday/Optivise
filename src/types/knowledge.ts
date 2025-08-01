/**
 * Knowledge Base and Learning System Types
 * Types for user interactions, learning, and knowledge evolution
 */

import type { OptimizelyProduct, ProjectContext } from './optimizely.js';
import type { PromptIntent, CuratedResponse } from './context.js';

export interface UserInteraction {
  id: string;
  timestamp: Date;
  prompt: string;
  detectedProducts: OptimizelyProduct[];
  providedContext: CuratedResponse;
  userFeedback?: 'helpful' | 'not-helpful';
  successIndicators?: string[];
  sessionId: string;
}

export interface SuccessPattern {
  id: string;
  pattern: string;
  products: OptimizelyProduct[];
  intent: PromptIntent;
  successRate: number;
  usageCount: number;
  lastUsed: Date;
  contextTemplate: Partial<CuratedResponse>;
}

export interface KnowledgeItem {
  id: string;
  type: 'documentation' | 'pattern' | 'rule' | 'example';
  content: string;
  products: OptimizelyProduct[];
  relevanceScore: number;
  source: string;
  lastUpdated: Date;
  metadata: Record<string, unknown>;
}

export interface LearningData {
  interactions: UserInteraction[];
  patterns: SuccessPattern[];
  knowledgeItems: KnowledgeItem[];
  userPreferences: UserPreferences;
}

export interface UserPreferences {
  preferredProducts: OptimizelyProduct[];
  responseStyle: 'concise' | 'detailed' | 'examples-focused';
  learningEnabled: boolean;
  privacyLevel: 'strict' | 'moderate' | 'open';
  feedbackFrequency: 'always' | 'sometimes' | 'never';
}

export interface DocumentationContent {
  source: 'optimizely-docs' | 'learning-center' | 'api-docs' | 'community';
  content: string;
  title: string;
  url: string;
  lastUpdated: Date;
  relevanceScore: number;
  products: OptimizelyProduct[];
  cacheKey: string;
  ttl: number;
}

export interface SearchResult {
  title: string;
  content: string;
  url: string;
  relevance: number;
  product: OptimizelyProduct;
  type: 'documentation' | 'tutorial' | 'example' | 'reference';
  lastModified?: Date;
}

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  timestamp: Date;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
}

export interface KnowledgeBaseStats {
  totalInteractions: number;
  successfulInteractions: number;
  averageRelevanceScore: number;
  topProducts: Array<{ product: OptimizelyProduct; count: number }>;
  cacheHitRate: number;
  lastOptimization: Date;
}