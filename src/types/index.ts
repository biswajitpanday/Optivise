import { z } from 'zod';

// Utility type for deep partial objects
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

// Core Types for OptiDevDoc
export interface ServerConfig {
  port?: number;
  host?: string;
  timeout?: number;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    console: {
      enabled: boolean;
      colorize?: boolean;
    };
    file?: {
      enabled: boolean;
      path: string;
      maxSize: string;
      maxFiles: string;
    };
  };
  crawler?: {
    enabled: boolean;
    interval_hours: number;
    max_concurrency: number;
    sources: CrawlerSource[];
  };
  database?: {
    type: 'sqlite' | 'postgresql' | 'memory';
    path?: string;
    cache_size?: number;
    maxConnections?: number;
    host?: string;
    database?: string;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    type: 'memory' | 'redis';
    redis?: {
      host: string;
      port: number;
    };
  };
  search?: {
    keyword: {
      enabled: boolean;
    };
  };
  ai?: {
    enabled: boolean;
    model?: string;
    local_only?: boolean;
  };
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  cors?: {
    origin: string[];
    credentials: boolean;
    enabled?: boolean;
  };
  mcp?: {
    mode: string;
    multiProduct: boolean;
    rulesPath: string;
  };
  features?: {
    productDetection: boolean;
    enhancedRules: boolean;
    cors: boolean;
  };
  version?: {
    current: string;
    protocol: string;
  };
  debug?: {
    mcp: boolean;
    level: string;
  };
  customRulesPath?: string;
}

export interface CrawlerSource {
  id: string;
  name: string;
  url: string;
  product: OptimizelyProduct;
  selectors: {
    container: string;
    title: string;
    content: string;
    navigation: string;
    breadcrumb: string;
    lastUpdated: string;
  };
  enabled: boolean;
  priority: number;
}

// Optimizely Products
export enum OptimizelyProduct {
  CONFIGURED_COMMERCE = 'configured-commerce',
  CMS_PAAS = 'cms-paas',
  CMS_SAAS = 'cms-saas',
  CMP = 'cmp',
  ODP = 'odp',
  EXPERIMENTATION = 'experimentation',
  COMMERCE_CONNECT = 'commerce-connect',
  SEARCH_NAVIGATION = 'search-navigation'
}

export type OptimizelyProductType = keyof typeof OptimizelyProduct;

// Enum for backward compatibility
export enum OptimizelyProductEnum {
  CONFIGURED_COMMERCE = 'configured-commerce',
  CMS_PAAS = 'cms-paas',
  CMS_SAAS = 'cms-saas',
  CMP = 'cmp',
  ODP = 'odp',
  EXPERIMENTATION = 'experimentation',
  COMMERCE_CONNECT = 'commerce-connect',
  SEARCH_NAVIGATION = 'search-navigation'
}

export interface DocumentationResult {
  id: string;
  title: string;
  content: string;
  url: string;
  product: OptimizelyProduct;
  lastUpdated: string;
  relevanceScore: number;
  codeExamples: CodeExample[];
  tags: string[];
  breadcrumb: string[];
}

export interface OptimizelyPattern {
  id: string;
  title: string;
  description: string;
  product: OptimizelyProduct;
  category: 'handler' | 'pipeline' | 'service' | 'integration' | 'best-practice' | 'api' | 'content-type' | 'block' | 'template';
  scenario: string;
  implementation: string;
  codeExamples: CodeExample[];
  relatedPatterns: string[];
  lastUpdated: string;
  tags: string[];
}

export interface BugAnalysis {
  id: string;
  description: string;
  product: OptimizelyProduct;
  category: 'configuration' | 'implementation' | 'performance' | 'compatibility' | 'deployment';
  severity: 'low' | 'medium' | 'high' | 'critical';
  solutions: Solution[];
  relatedIssues: string[];
  lastUpdated: string;
}

export interface Solution {
  title: string;
  description: string;
  steps: string[];
  codeExamples: CodeExample[];
  references: string[];
}

export interface CodeExample {
  type: 'good' | 'bad' | 'neutral';
  language: string;
  code: string;
  description: string;
  filename?: string;
  product?: OptimizelyProduct;
}

// Development Rules Types
export interface DevelopmentRule {
  id: string;
  title: string;
  description: string;
  category: 'frontend' | 'backend' | 'project-structure' | 'quality' | 'general';
  product: OptimizelyProduct;
  productVersion?: string; // e.g., "v14.0", "latest"
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  contexts: RuleContext[];
  content: string;
  examples?: CodeExample[];
  violations?: string[];
  references?: string[];
  lastUpdated: string;
  source: 'manual' | 'auto-generated' | 'documentation-derived';
  applicableProducts?: OptimizelyProduct[]; // For shared rules
}

export interface RuleContext {
  type: 'file-pattern' | 'directory' | 'dependency' | 'framework' | 'product-detection';
  pattern: string;
  description: string;
  product?: OptimizelyProduct; // For product-specific contexts
}

export interface RuleApplication {
  rule: DevelopmentRule;
  relevanceScore: number;
  context: string;
  suggestions: string[];
  productMatch: boolean; // Whether the rule matches current product context
}

// Rules Engine Configuration
export interface RulesEngineConfig {
  rulesSources: RuleSource[];
  productDetection: ProductDetectionConfig;
  enableAutoApplication: boolean;
  contextSensitivity: 'low' | 'medium' | 'high';
  ruleCategories: string[];
  customRulesPath?: string;
}

export interface RuleSource {
  type: 'local-directory' | 'remote-repository' | 'documentation-api';
  path: string;
  product?: OptimizelyProduct; // For product-specific sources
  enabled: boolean;
  refreshInterval?: number; // in minutes
}

// Product Detection Types
export interface ProductDetectionConfig {
  enabled: boolean;
  methods: ProductDetectionMethod[];
  confidenceThreshold: number; // 0-1, minimum confidence to auto-apply rules
  fallbackProduct?: OptimizelyProduct;
}

export interface ProductDetectionMethod {
  type: 'file-pattern' | 'directory-structure' | 'package-dependencies' | 'config-files';
  patterns: ProductDetectionPattern[];
  weight: number; // Contribution to overall confidence
}

export interface ProductDetectionPattern {
  product: OptimizelyProduct;
  pattern: string;
  indicators: string[]; // File patterns, directory names, dependency names, etc.
  confidence: number; // 0-1, confidence when this pattern matches
}

export interface ProductContext {
  detectedProduct: OptimizelyProduct;
  confidence: number;
  detectionMethods: string[];
  projectPath: string;
  version?: string; // Detected version if available
}

// Rule Generation Configuration (for future auto-generation)
export interface RuleGenerationConfig {
  enabled: boolean;
  sources: string[]; // Documentation URLs to crawl
  outputPath: string;
  reviewRequired: boolean;
}

// Legacy compatibility exports
export type Product = OptimizelyProduct;
export const Product = OptimizelyProductEnum; 

// Error Types
export enum ErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SERVER_ERROR = 'SERVER_ERROR'
}

export interface OptimizelyError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

// Search Types
export interface SearchQuery {
  query: string;
  product?: OptimizelyProduct;
  maxResults?: number;
  documentId?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  relevance: number;
}

// Documentation Types
export type DocumentationCategory = 
  | 'developer-guide'
  | 'api-reference'
  | 'best-practices'
  | 'tutorials'
  | 'examples';

export interface OptimizelyDocumentationResult {
  id: string;
  title: string;
  content: string;
  url: string;
  product: OptimizelyProduct;
  category: DocumentationCategory;
  version: string;
  lastUpdated: string;
  relevanceScore: number;
  codeExamples: CodeExample[];
  tags: string[];
  breadcrumb: string[];
}

// Tool Context Types
export interface OptimizelyToolContext {
  product: OptimizelyProduct;
  version?: string;
  projectPath?: string;
  files?: string[];
  dependencies?: Record<string, string>;
}

export const OptimizelyToolContextSchema = z.object({
  product: z.nativeEnum(OptimizelyProduct),
  version: z.string().optional(),
  projectPath: z.string().optional(),
  files: z.array(z.string()).optional(),
  dependencies: z.record(z.string()).optional()
}); 