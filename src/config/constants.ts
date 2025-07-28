import { version, name, description } from '../../package.json';

export const APP_CONFIG = {
  // Version Management
  VERSION: version, // Automatically syncs with package.json
  NAME: name,
  DESCRIPTION: description,
  PROTOCOL_VERSION: '2025-07-27',
  
  // Server Configuration
  REMOTE_SERVER: process.env.REMOTE_SERVER || 'https://optidevdoc.onrender.com',
  PORT: process.env.PORT || 10000,
  HOST: process.env.HOST || '0.0.0.0',
  
  // Feature Flags
  ENABLE_PRODUCT_DETECTION: process.env.ENABLE_PRODUCT_DETECTION === 'true',
  ENABLE_ENHANCED_RULES: process.env.ENABLE_ENHANCED_RULES === 'true',
  ENABLE_CORS: process.env.ENABLE_CORS === 'true',
  
  // Debug Mode
  DEBUG_MODE: process.env.OPTIDEVDOC_DEBUG === 'true',
  
  // Database Configuration
  DATABASE_TYPE: process.env.DATABASE_TYPE || 'sqlite',
  DATABASE_PATH: process.env.DATABASE_PATH || './data/optidevdoc.db',
  
  // Cache Configuration
  CACHE_ENABLED: process.env.CACHE_ENABLED === 'true',
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '3600', 10),
  
  // Crawler Configuration
  CRAWLER_ENABLED: process.env.CRAWLER_ENABLED === 'true',
  CRAWLER_INTERVAL_HOURS: parseInt(process.env.CRAWLER_INTERVAL_HOURS || '24', 10),
  CRAWLER_MAX_CONCURRENCY: parseInt(process.env.CRAWLER_MAX_CONCURRENCY || '3', 10),
  
  // Rate Limiting
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  
  // MCP Configuration
  MCP_MODE: process.env.MCP_MODE || 'http',
  
  // Product Configuration
  SUPPORTED_PRODUCTS: [
    'configured-commerce',
    'cms-paas',
    'cms-saas',
    'cmp',
    'odp',
    'experimentation',
    'commerce-connect',
    'search-navigation'
  ] as const,
  
  // Tool Configuration
  TOOLS: {
    SEARCH: 'search_optimizely_docs',
    PATTERN: 'find_optimizely_pattern',
    BUG_ANALYSIS: 'analyze_optimizely_bug',
    RULES: 'apply_development_rules',
    CONFIG: 'generate_cursor_config'
  } as const
}; 