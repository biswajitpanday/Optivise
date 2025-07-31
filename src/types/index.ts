/**
 * Main Type Definitions Export
 * Central export for all OptiDevAssistant v3.0.0 types
 */

// Optimizely-specific types
export type {
  OptimizelyProduct,
  ProductInfo,
  DetectionEvidence,
  ProductDetectionResult,
  ProjectContext,
  IDERule
} from './optimizely.js';

// Context analysis and curation types
export type {
  PromptAnalysisResult,
  PromptIntent,
  CodeSnippet,
  DocumentationLink,
  CuratedResponse,
  RuleSuggestion,
  ContextAnalysisRequest,
  ContextAnalysisResponse,
  QueryContext
} from './context.js';

// Knowledge base and learning types
export type {
  UserInteraction,
  SuccessPattern,
  KnowledgeItem,
  LearningData,
  UserPreferences,
  DocumentationContent,
  SearchResult,
  CacheEntry,
  KnowledgeBaseStats
} from './knowledge.js';

// MCP protocol types
export type {
  MCPToolDefinition,
  MCPToolRequest,
  MCPToolResponse,
  MCPServerConfig,
  MCPServerOptions,
  HealthStatus
} from './mcp.js';

// Utility types
export interface ServiceConfig {
  enabled: boolean;
  options?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

export interface AsyncResult<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
  timestamp: Date;
}

// Re-export everything from individual type files
export * from './optimizely.js';
export * from './context.js';
export * from './knowledge.js';
export * from './mcp.js';

// Constants
export const DEFAULT_RELEVANCE_THRESHOLD = 0.7;
export const MAX_RESPONSE_TIME_MS = 2000;
export const CACHE_TTL_HOURS = 24;
export const MAX_MEMORY_MB = 512; 