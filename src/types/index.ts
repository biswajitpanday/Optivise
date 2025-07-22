import { z } from 'zod';

// Core MCP Tool Types
export interface OptimizelyToolContext {
  query: string;
  product?: OptimizelyProduct;
  category?: DocumentationCategory;
  version?: string;
  maxResults?: number;
}

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
  codeExamples?: CodeExample[];
  tags: string[];
  breadcrumb: string[];
}

export interface CodeExample {
  language: string;
  code: string;
  description: string;
  filename?: string;
}

// Optimizely Product Types
export enum OptimizelyProduct {
  CONFIGURED_COMMERCE = 'configured-commerce',
  CMS_PAAS = 'cms-paas',
  CMS_SAAS = 'cms-saas',
  ODP = 'odp',
  EXPERIMENTATION = 'experimentation',
  COMMERCE_CONNECT = 'commerce-connect',
  CONTENT_RECOMMENDATIONS = 'content-recommendations',
  PERSONALIZATION = 'personalization',
  WEB_EXPERIMENTATION = 'web-experimentation',
  FEATURE_EXPERIMENTATION = 'feature-experimentation'
}

export enum DocumentationCategory {
  API_REFERENCE = 'api-reference',
  DEVELOPER_GUIDE = 'developer-guide',
  INTEGRATION_GUIDE = 'integration-guide',
  USER_GUIDE = 'user-guide',
  TUTORIALS = 'tutorials',
  TROUBLESHOOTING = 'troubleshooting',
  RELEASE_NOTES = 'release-notes',
  CODE_SAMPLES = 'code-samples',
  BEST_PRACTICES = 'best-practices',
  ARCHITECTURE = 'architecture'
}

// Search Engine Types
export interface SearchQuery {
  text: string;
  product?: OptimizelyProduct;
  category?: DocumentationCategory;
  filters?: SearchFilters;
  options?: SearchOptions;
}

export interface SearchFilters {
  products?: OptimizelyProduct[];
  categories?: DocumentationCategory[];
  dateRange?: {
    from: string;
    to: string;
  };
  version?: string;
  hasCodeExamples?: boolean;
  language?: string;
}

export interface SearchOptions {
  maxResults?: number;
  minScore?: number;
  includeContent?: boolean;
  highlightMatches?: boolean;
  semanticSearch?: boolean;
  keywordSearch?: boolean;
}

export interface SearchResult {
  document: OptimizelyDocumentationResult;
  score: number;
  highlights?: string[];
  matchedTerms?: string[];
}

export interface SearchEngineResponse {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  query: SearchQuery;
  suggestions?: string[];
}

// Database Types
export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  url: string;
  product: string;
  category: string;
  version: string;
  lastUpdated: string;
  contentHash: string;
  metadata: string; // JSON stringified metadata
  embeddings?: Float32Array;
  created_at: string;
  updated_at: string;
}

export interface IndexRecord {
  term: string;
  documentId: string;
  frequency: number;
  position: number;
  field: string; // title, content, tags, etc.
}

// Configuration Types
export interface ServerConfig {
  port?: number;
  host?: string;
  cors?: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  database?: DatabaseConfig;
  cache?: CacheConfig;
  logging?: LoggingConfig;
  crawler?: CrawlerConfig;
  search?: SearchConfig;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql';
  path?: string; // for SQLite
  host?: string; // for PostgreSQL
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number; // max entries
  type: 'memory' | 'redis';
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  file?: {
    enabled: boolean;
    path: string;
    maxSize: string;
    maxFiles: string;
  };
  console: {
    enabled: boolean;
    colorize: boolean;
  };
}

export interface CrawlerConfig {
  enabled: boolean;
  interval: number; // hours
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number; // ms
  sources: DocumentationSource[];
  userAgent: string;
  respectRobotsTxt: boolean;
}

export interface SearchConfig {
  semantic: {
    enabled: boolean;
    model: string;
    dimension: number;
    threshold: number;
  };
  keyword: {
    enabled: boolean;
    minTermLength: number;
    stopWords: string[];
  };
  hybrid: {
    semanticWeight: number; // 0-1
    keywordWeight: number; // 0-1
  };
}

// Documentation Source Types
export interface DocumentationSource {
  id: string;
  name: string;
  url: string;
  product: OptimizelyProduct;
  selectors: {
    container: string;
    title: string;
    content: string;
    navigation?: string;
    breadcrumb?: string;
    lastUpdated?: string;
  };
  enabled: boolean;
  priority: number;
}

// Error Types
export interface OptimizelyError extends Error {
  code: string;
  statusCode?: number;
  context?: Record<string, unknown>;
  timestamp: string;
}

export enum ErrorCode {
  INVALID_QUERY = 'INVALID_QUERY',
  SEARCH_FAILED = 'SEARCH_FAILED',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  CRAWLER_ERROR = 'CRAWLER_ERROR',
  PARSING_ERROR = 'PARSING_ERROR'
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  components: {
    database: ComponentHealth;
    documentationSources: ComponentHealth;
    searchIndex: ComponentHealth;
    cache: ComponentHealth;
    vectorStore: ComponentHealth;
    externalAPIs: ComponentHealth;
  };
  metrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    cacheHitRate: number;
  };
  performance: {
    searchLatency: number;
    indexingRate: number;
    querySuccessRate: number;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}

// Validation Schemas
export const SearchQuerySchema = z.object({
  text: z.string().min(1).max(500),
  product: z.nativeEnum(OptimizelyProduct).optional(),
  category: z.nativeEnum(DocumentationCategory).optional(),
  filters: z.object({
    products: z.array(z.nativeEnum(OptimizelyProduct)).optional(),
    categories: z.array(z.nativeEnum(DocumentationCategory)).optional(),
    dateRange: z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }).optional(),
    version: z.string().optional(),
    hasCodeExamples: z.boolean().optional(),
    language: z.string().optional(),
  }).optional(),
  options: z.object({
    maxResults: z.number().min(1).max(100).default(10),
    minScore: z.number().min(0).max(1).default(0.1),
    includeContent: z.boolean().default(true),
    highlightMatches: z.boolean().default(true),
    semanticSearch: z.boolean().default(true),
    keywordSearch: z.boolean().default(true),
  }).optional(),
});

export const OptimizelyToolContextSchema = z.object({
  query: z.string().min(1).max(500),
  product: z.nativeEnum(OptimizelyProduct).optional(),
  category: z.nativeEnum(DocumentationCategory).optional(),
  version: z.string().optional(),
  maxResults: z.number().min(1).max(50).default(10),
});

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>; 