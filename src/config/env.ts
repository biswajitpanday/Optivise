import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { version } from '../../package.json';
import { defaultConfig } from './default.js';
import type { ServerConfig } from '../types/index.js';

// Load environment variables from root .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Environment variable configuration with defaults
export const config: ServerConfig = {
  // Server Configuration
  port: parseInt(process.env.PORT || String(defaultConfig.port), 10),
  host: process.env.HOST || defaultConfig.host,
  cors: defaultConfig.cors,
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(defaultConfig.rateLimit.windowMs), 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || String(defaultConfig.rateLimit.max), 10)
  },

  // Version Information (not in ServerConfig but needed for MCP)
  version: {
    current: version, // From package.json
    protocol: process.env.PROTOCOL_VERSION || '2025-07-27'
  },

  // Feature Flags
  features: {
    productDetection: process.env.ENABLE_PRODUCT_DETECTION === 'true',
    enhancedRules: process.env.ENABLE_ENHANCED_RULES === 'true',
    cors: process.env.ENABLE_CORS === 'true'
  },

  // Debug Configuration
  debug: {
    mcp: process.env.DEBUG_MCP === 'true',
    level: process.env.LOG_LEVEL || defaultConfig.logging.level
  },

  // Database Configuration
  database: {
    type: (process.env.DATABASE_TYPE as 'sqlite' | 'postgresql') || defaultConfig.database?.type || 'sqlite',
    path: process.env.DATABASE_PATH || defaultConfig.database?.path || './data/optidevdoc.db',
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10)
  },

  // Cache Configuration
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
    type: (process.env.CACHE_TYPE as 'memory' | 'redis') || 'memory'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || defaultConfig.logging.level,
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || defaultConfig.logging.file.path,
      maxSize: process.env.LOG_FILE_MAX_SIZE || defaultConfig.logging.file.maxSize,
      maxFiles: process.env.LOG_FILE_MAX_FILES || defaultConfig.logging.file.maxFiles
    },
    console: {
      enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
      colorize: process.env.LOG_CONSOLE_COLORIZE !== 'false'
    }
  },

  // MCP Configuration (extended from ServerConfig)
  mcp: {
    mode: process.env.MCP_MODE || 'http',
    multiProduct: process.env.OPTIDEVDOC_MULTI_PRODUCT === 'true',
    rulesPath: process.env.OPTIDEVDOC_RULES_PATH || './rules'
  },

  // Crawler Configuration
  crawler: {
    enabled: process.env.CRAWLER_ENABLED === 'true',
    interval: parseInt(process.env.CRAWLER_INTERVAL_HOURS || '24', 10),
    maxConcurrency: parseInt(process.env.CRAWLER_MAX_CONCURRENCY || '3', 10),
    sources: defaultConfig.crawler.sources,
    retryAttempts: 3,
    retryDelay: 2000,
    userAgent: 'OptiDevDoc-MCP/1.0.0',
    respectRobotsTxt: true
  }
};

// Validate required configuration
function validateConfig() {
  const requiredVars = [
    'port',
    'host',
    'database.type',
    'database.path',
    'logging.level'
  ];

  const missingVars = requiredVars.filter(varPath => {
    const parts = varPath.split('.');
    let current: any = config;
    for (const part of parts) {
      if (current[part] === undefined) return true;
      current = current[part];
    }
    return false;
  });

  if (missingVars.length > 0) {
    throw new Error(`Missing required configuration: ${missingVars.join(', ')}`);
  }
}

// Create .env.example if it doesn't exist
function createEnvExample() {
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    const envExample = `# Server Configuration
PORT=${config.port}
HOST=${config.host}
NODE_ENV=development

# Feature Flags
ENABLE_PRODUCT_DETECTION=true
ENABLE_ENHANCED_RULES=true
ENABLE_CORS=true
DEBUG_MCP=false

# Database Configuration
DATABASE_TYPE=${config.database.type}
DATABASE_PATH=${config.database.path}
DATABASE_MAX_CONNECTIONS=${config.database.maxConnections}

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL=3600
CACHE_MAX_SIZE=1000
CACHE_TYPE=memory

# Logging Configuration
LOG_LEVEL=${config.logging.level}
LOG_FILE_ENABLED=true
LOG_FILE_PATH=${config.logging.file.path}
LOG_FILE_MAX_SIZE=${config.logging.file.maxSize}
LOG_FILE_MAX_FILES=${config.logging.file.maxFiles}
LOG_CONSOLE_ENABLED=true
LOG_CONSOLE_COLORIZE=true

# API Rate Limiting
RATE_LIMIT_MAX_REQUESTS=${config.rateLimit.max}
RATE_LIMIT_WINDOW_MS=${config.rateLimit.windowMs}

# MCP Configuration
MCP_MODE=${config.mcp.mode}
PROTOCOL_VERSION=${config.version.protocol}

# Crawler Configuration
CRAWLER_ENABLED=true
CRAWLER_INTERVAL_HOURS=${config.crawler.interval}
CRAWLER_MAX_CONCURRENCY=${config.crawler.maxConcurrency}

# Product Configuration
OPTIDEVDOC_MULTI_PRODUCT=true
OPTIDEVDOC_RULES_PATH=./rules
OPTIDEVDOC_MODE=remote`;

    fs.writeFileSync(envExamplePath, envExample);
  }
}

// Export validated configuration
validateConfig();
createEnvExample();
export default config; 