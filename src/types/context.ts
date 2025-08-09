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
  entities?: {
    files: string[];
    urls: string[];
    classes: string[];
    versions: string[];
  };
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
  promptContext?: PromptContext;
  diagnostics?: {
    timings?: Record<string, number>;
    cacheHit?: boolean;
    relevanceBreakdown?: { prompt: number; evidence: number; rules: number; final: number };
  };
}

export interface QueryContext {
  query: string;
  products: OptimizelyProduct[];
  intent: PromptIntent;
  projectContext?: ProjectContext;
  userHistory?: UserInteraction[];
}

/**
 * Extended prompt context detected from the user's prompt and session
 */
export interface PromptContext {
  userIntent: PromptIntent | 'feature' | 'migration' | 'performance' | 'security' | 'content';
  taskType?: string;
  targetProducts?: OptimizelyProduct[];
  artifacts?: Array<{ kind: 'file' | 'class' | 'symbol' | 'url'; value: string }>;
  constraints?: string[];
  acceptanceCriteria?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  versions?: Array<{ product: OptimizelyProduct | 'platform'; version: string }>;
  sessionHints?: Record<string, unknown>;
}

/**
 * Structured context block to be provided to an IDE agent/LLM
 */
export interface ContextBlock {
  type: 'rules' | 'detection-evidence' | 'code' | 'documentation' | 'analysis' | 'summary';
  title?: string;
  content: string;
  source?: string; // file path, URL, or generator name
  tokensEstimate?: number;
  relevance?: number; // 0-1 relevance for ordering/budgeting
}

/**
 * Structured request object suitable for IDE agent LLM handoff
 */
export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  contextBlocks: ContextBlock[];
  citations?: Array<{ title: string; url: string }>;
  tags?: string[];
  safetyDirectives?: string[];
  constraints?: string[];
  modelHints?: { maxTokens?: number; temperature?: number };
  tokenEstimate?: number;
  telemetry?: {
    sizeInBytes: number;
    tokenEstimate: number;
    truncationApplied: boolean;
    droppedBlocks: number;
    redactions?: Array<{ type: string; count: number }>;
    correlationId?: string;
  };
  previewMarkdown?: string;
  contentTypes?: Array<'text/markdown' | 'application/json'>;
  correlationId?: string;
}