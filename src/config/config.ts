import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { version, name, description } from '../../package.json';
import { defaultConfig } from './default.js';
import { OptimizelyProduct } from '../types/index.js';
import type { ServerConfig, DeepPartial, RulesEngineConfig } from '../types/index.js';

/**
 * Configuration System
 * 
 * This file centralizes all configuration for OptiDevDoc, including:
 * - Environment variables from .env files
 * - Default configuration from default.ts
 */

// Configuration singleton
class ConfigManager {
  private static instance: ConfigManager;
  private config: any;
  private isInitialized = false;

  private constructor() {
    this.config = {
      // App metadata from package.json
      app: {
        name,
        version,
        description,
        protocolVersion: '2025-07-27'
      },
      
      // Server configuration (defaults)
      server: {
        port: 10000,
        host: 'localhost',
        cors: {
          enabled: true,
          origin: ['http://localhost:3000', 'https://cursor.sh', 'vscode-webview://*'],
          credentials: false
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100 // requests per window
        }
      },
      
      // Feature flags (defaults)
      features: {
        productDetection: true,
        enhancedRules: true,
        debug: false,
        multiProduct: true,
        enhanced: true
      },
      
      // MCP configuration (defaults)
      mcp: {
        mode: 'stdio',
        serverMode: 'http',
        tools: {
          search: 'search_optimizely_docs',
          pattern: 'find_optimizely_pattern',
          bugAnalysis: 'analyze_optimizely_bug',
          rules: 'apply_development_rules',
          config: 'generate_cursor_config'
        }
      },
      
      // Database configuration (defaults)
      database: {
        type: 'sqlite',
        path: './data/optidevdoc.db',
        maxConnections: 10
      },
      
      // Cache configuration (defaults)
      cache: {
        enabled: true,
        ttl: 3600,
        maxSize: 1000,
        type: 'memory'
      },
      
      // Logging configuration (defaults)
      logging: {
        level: 'info',
        file: {
          enabled: true,
          path: './logs',
          maxSize: '10m',
          maxFiles: 5
        },
        console: {
          enabled: true,
          colorize: true
        }
      },
      
      // Remote server configuration (defaults)
      remote: {
        server: 'https://optidevdoc.onrender.com'
      },
      
      // Crawler configuration (defaults)
      crawler: {
        enabled: true,
        interval_hours: 24,
        max_concurrency: 3
      },
      
      // Rules configuration (defaults)
      rules: {
        path: './rules'
      },
      
      // Product configuration (defaults)
      products: {
        supported: [
          'configured-commerce',
          'cms-paas',
          'cms-saas',
          'cmp',
          'odp',
          'experimentation',
          'commerce-connect',
          'search-navigation'
        ]
      }
    };
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  /**
   * Initialize configuration
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }
    
    // Load environment variables
    this.loadEnvironmentConfig();
    
    // Apply environment variables to config
    this.applyEnvironmentConfig();
    
    // Merge with default server config
    this.mergeWithDefaultConfig();
    
    this.isInitialized = true;
    console.log(`Configuration initialized (${this.config.app.name} v${this.config.app.version})`);
    console.log(`Environment: ${this.config.server.nodeEnv}`);
  }
  
  /**
   * Load environment variables from .env files
   */
  private loadEnvironmentConfig(): void {
    // First try to load from .env file in root directory (legacy support)
    const rootEnvPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(rootEnvPath)) {
      console.log(`Loading environment from: ${rootEnvPath}`);
      dotenv.config({ path: rootEnvPath });
    }

    // Then try to load from config directory based on NODE_ENV
    const nodeEnv = process.env.NODE_ENV || 'development';
    const configEnvPath = path.resolve(process.cwd(), 'config', `${nodeEnv}.env`);
    
    if (fs.existsSync(configEnvPath)) {
      console.log(`Loading environment from: ${configEnvPath}`);
      dotenv.config({ path: configEnvPath });
    } else {
      // Try default config as fallback
      const defaultConfigPath = path.resolve(process.cwd(), 'config', 'default.env');
      if (fs.existsSync(defaultConfigPath)) {
        console.log(`Loading environment from: ${defaultConfigPath}`);
        dotenv.config({ path: defaultConfigPath });
      }
    }

    // Always ensure VERSION is set from package.json
    process.env.VERSION = version;
  }
  
  /**
   * Apply environment variables to config
   */
  private applyEnvironmentConfig(): void {
    // Server configuration
    this.config.server.nodeEnv = process.env.NODE_ENV || 'development';
    this.config.server.port = parseInt(process.env.PORT || '10000', 10);
    this.config.server.host = process.env.HOST || 'localhost';
    
    // Feature flags
    this.config.features.productDetection = process.env.ENABLE_PRODUCT_DETECTION === 'true';
    this.config.features.enhancedRules = process.env.ENABLE_ENHANCED_RULES === 'true';
    this.config.features.debug = process.env.OPTIDEVDOC_DEBUG === 'true';
    this.config.features.multiProduct = process.env.OPTIDEVDOC_MULTI_PRODUCT === 'true';
    this.config.features.enhanced = process.env.OPTIDEVDOC_ENHANCED === 'true';
    this.config.features.cors = process.env.ENABLE_CORS === 'true';
    
    // MCP configuration
    this.config.mcp.mode = process.env.MCP_MODE || 'stdio';
    this.config.mcp.serverMode = process.env.OPTIDEVDOC_SERVER_MODE || 'http';
    this.config.mcp.mode = process.env.OPTIDEVDOC_MODE || 'enhanced';
    
    // Database configuration
    this.config.database.type = process.env.DATABASE_TYPE || 'sqlite';
    this.config.database.path = process.env.DATABASE_PATH || './data/optidevdoc.db';
    
    // Cache configuration
    this.config.cache.enabled = process.env.CACHE_ENABLED === 'true';
    this.config.cache.type = process.env.CACHE_TYPE || 'memory';
    this.config.cache.ttl = parseInt(process.env.CACHE_TTL || '3600', 10);
    this.config.cache.maxSize = parseInt(process.env.CACHE_MAX_SIZE || '1000', 10);
    
    // Logging configuration
    this.config.logging.level = process.env.LOG_LEVEL || 'info';
    this.config.logging.file.enabled = process.env.LOG_FILE_ENABLED === 'true';
    this.config.logging.file.path = process.env.LOG_FILE_PATH || './logs';
    this.config.logging.file.maxSize = process.env.LOG_FILE_MAX_SIZE || '10m';
    this.config.logging.file.maxFiles = parseInt(process.env.LOG_FILE_MAX_FILES || '5', 10);
    this.config.logging.console.enabled = process.env.LOG_CONSOLE_ENABLED === 'true';
    this.config.logging.console.colorize = process.env.LOG_CONSOLE_COLORIZE === 'true';
    
    // Remote server configuration
    this.config.remote.server = process.env.REMOTE_SERVER || 'https://optidevdoc.onrender.com';
    
    // Crawler configuration
    this.config.crawler.enabled = process.env.CRAWLER_ENABLED === 'true';
    this.config.crawler.interval_hours = parseInt(process.env.CRAWLER_INTERVAL_HOURS || '24', 10);
    this.config.crawler.max_concurrency = parseInt(process.env.CRAWLER_MAX_CONCURRENCY || '3', 10);
    
    // Rules configuration
    this.config.rules.path = process.env.OPTIDEVDOC_RULES_PATH || './rules';
    
    // Rate limiting
    this.config.server.rateLimit.max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
    this.config.server.rateLimit.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  }
  
  /**
   * Merge with default server config
   */
  private mergeWithDefaultConfig(): void {
    // Merge with default server config
    if (defaultConfig) {
      this.config.server.cors = {
        ...this.config.server.cors,
        origin: defaultConfig.cors?.origin || this.config.server.cors.origin,
        credentials: defaultConfig.cors?.credentials || this.config.server.cors.credentials
      };
      
      // Merge crawler sources
      if (defaultConfig.crawler?.sources) {
        this.config.crawler.sources = defaultConfig.crawler.sources;
      }
      
      // Merge search configuration
      if (defaultConfig.search) {
        this.config.search = defaultConfig.search;
      }
    }
  }
  
  /**
   * Get the entire configuration
   */
  public getConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config;
  }
  
  /**
   * Get app configuration
   */
  public getAppConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.app;
  }
  
  /**
   * Get server configuration
   */
  public getServerConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.server;
  }
  
  /**
   * Get feature flags
   */
  public getFeatures(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.features;
  }
  
  /**
   * Get MCP configuration
   */
  public getMcpConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.mcp;
  }
  
  /**
   * Get database configuration
   */
  public getDatabaseConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.database;
  }
  
  /**
   * Get cache configuration
   */
  public getCacheConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.cache;
  }
  
  /**
   * Get logging configuration
   */
  public getLoggingConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.logging;
  }
  
  /**
   * Get remote server configuration
   */
  public getRemoteConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.remote;
  }
  
  /**
   * Get crawler configuration
   */
  public getCrawlerConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.crawler;
  }
  
  /**
   * Get rules configuration
   */
  public getRulesConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.rules;
  }
  
  /**
   * Get product configuration
   */
  public getProductsConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.products;
  }
  
  /**
   * Get search configuration
   */
  public getSearchConfig(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.search;
  }
  
  /**
   * Get ServerConfig compatible object
   */
  public getServerConfigObject(): ServerConfig {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    return {
      port: this.config.server.port,
      host: this.config.server.host,
      cors: {
        origin: this.config.server.cors.origin,
        credentials: this.config.server.cors.credentials
      },
      rateLimit: {
        windowMs: this.config.server.rateLimit.windowMs,
        max: this.config.server.rateLimit.max
      },
      database: {
        type: this.config.database.type as 'sqlite' | 'postgresql',
        path: this.config.database.path,
        maxConnections: this.config.database.maxConnections
      },
      cache: {
        enabled: this.config.cache.enabled,
        ttl: this.config.cache.ttl,
        maxSize: this.config.cache.maxSize,
        type: this.config.cache.type as 'memory' | 'redis'
      },
      logging: {
        level: this.config.logging.level as 'error' | 'warn' | 'info' | 'debug',
        file: {
          enabled: this.config.logging.file.enabled,
          path: this.config.logging.file.path,
          maxSize: this.config.logging.file.maxSize,
          maxFiles: this.config.logging.file.maxFiles
        },
        console: {
          enabled: this.config.logging.console.enabled,
          colorize: this.config.logging.console.colorize
        }
      },
      crawler: {
        enabled: this.config.crawler.enabled,
        interval_hours: this.config.crawler.interval_hours,
        max_concurrency: this.config.crawler.max_concurrency,
        sources: this.config.crawler.sources || []
      },
      search: this.config.search || {
        semantic: {
          enabled: false,
          model: 'text-embedding-ada-002',
          dimension: 1536,
          threshold: 0.7
        },
        keyword: {
          enabled: true,
          minTermLength: 2,
          stopWords: []
        },
        hybrid: {
          semanticWeight: 0.4,
          keywordWeight: 0.6
        }
      }
    };
  }

  /**
   * Get configuration for external rules directory
   */
  public static getExternalRulesConfig(rulesPath: string): RulesEngineConfig {
    return {
      rulesSources: [
        {
          type: 'local-directory',
          path: rulesPath,
          enabled: true,
          refreshInterval: 5 // 5 minutes
        }
      ],
      productDetection: {
        enabled: true,
        methods: [
          {
            type: 'file-pattern',
            patterns: [],
            weight: 1
          }
        ],
        confidenceThreshold: 0.7
      },
      enableAutoApplication: true,
      contextSensitivity: 'high',
      ruleCategories: ['frontend', 'backend', 'project-structure', 'quality', 'general']
    };
  }

  /**
   * Create configuration from environment
   */
  public static createConfigFromEnvironment(): RulesEngineConfig {
    const config = this.getExternalRulesConfig(process.env.OPTIDEVDOC_RULES_PATH || './rules');
    
    // Add environment-specific configuration
    config.productDetection.enabled = process.env.ENABLE_PRODUCT_DETECTION === 'true';
    
    return config;
  }
}

// Export singleton instance
export const Config = ConfigManager.getInstance();

// Initialize configuration
Config.initialize();

export default Config; 