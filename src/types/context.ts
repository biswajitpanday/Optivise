/**
 * Context Analysis Types and Interfaces
 * Core types for prompt analysis and context curation
 */

import type { OptimizelyProduct, ProjectContext } from './optimizely.js';
import type { UserInteraction } from './knowledge.js';

export interface PromptAnalysisResult {
  relevance: number; // 0-1 score for Optimizely relevance
  keywords: string[];
  intent: PromptIntent;
  productHints: OptimizelyProduct[];
  confidence: number;
}

export type PromptIntent = 
  | 'code-help'
  | 'documentation'
  | 'troubleshooting'
  | 'best-practices'
  | 'configuration'
  | 'unknown';

export interface CodeSnippet {
  language: string;
  code: string;
  description: string;
  source: string;
  optimizelyProduct: OptimizelyProduct;
}

export interface DocumentationLink {
  title: string;
  url: string;
  description: string;
  relevance: number;
  product: OptimizelyProduct;
  section: string;
}

export interface CuratedResponse {
  relevance: number;
  productContext: OptimizelyProduct[];
  summary: string;
  actionableSteps: string[];
  codeExamples: CodeSnippet[];
  documentation: DocumentationLink[];
  bestPractices: string[];
  suggestedRules?: RuleSuggestion[];
}

export interface RuleSuggestion {
  type: 'enhancement' | 'addition' | 'conflict-resolution';
  description: string;
  ruleContent: string;
  priority: 'high' | 'medium' | 'low';
  applicableProducts: OptimizelyProduct[];
}

export interface ContextAnalysisRequest {
  prompt: string;
  projectPath?: string;
  ideRules?: string[];
  userContext?: {
    previousQueries: string[];
    preferences: Record<string, unknown>;
  };
}

export interface ContextAnalysisResponse {
  relevance: number;
  detectedProducts: OptimizelyProduct[];
  curatedContext: CuratedResponse;
  processingTime: number;
  timestamp: Date;
}

export interface QueryContext {
  query: string;
  products: OptimizelyProduct[];
  intent: PromptIntent;
  projectContext?: ProjectContext;
  userHistory?: UserInteraction[];
}