import { defaultConfig } from './default.js';
import type { ServerConfig, DeepPartial } from '@/types/index.js';
import * as fs from 'fs';

import { Logger } from '@/utils/logger.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ServerConfig;
  private logger?: Logger;

  private constructor() {
    this.config = { ...defaultConfig };
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getConfig(overrides?: DeepPartial<ServerConfig>): ServerConfig {
    if (overrides) {
      return this.mergeConfig(this.config, overrides);
    }
    return { ...this.config };
  }

  loadFromFile(configPath: string): void {
    try {
      if (!fs.existsSync(configPath)) {
        if (this.logger) {
          this.logger.warn(`Config file not found: ${configPath}`);
        }
        return;
      }

      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const fileConfig = JSON.parse(fileContent) as DeepPartial<ServerConfig>;
      
      this.config = this.mergeConfig(this.config, fileConfig);
      
      if (this.logger) {
        this.logger.info(`Configuration loaded from: ${configPath}`);
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to load config from ${configPath}`, { error });
      }
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  loadFromEnvironment(): void {
    const envConfig: DeepPartial<ServerConfig> = {};

    // Port
    if (process.env.PORT) {
      envConfig.port = parseInt(process.env.PORT, 10);
    }

    // Host
    if (process.env.HOST) {
      envConfig.host = process.env.HOST;
    }

    // Database
    if (process.env.DATABASE_TYPE || process.env.DATABASE_PATH) {
      envConfig.database = {
        type: (process.env.DATABASE_TYPE as 'sqlite' | 'postgresql') || 'sqlite',
      };
      if (process.env.DATABASE_PATH) {
        envConfig.database.path = process.env.DATABASE_PATH;
      }
      if (process.env.DATABASE_HOST) {
        envConfig.database.host = process.env.DATABASE_HOST;
      }
      if (process.env.DATABASE_PORT) {
        envConfig.database.port = parseInt(process.env.DATABASE_PORT, 10);
      }
      if (process.env.DATABASE_NAME) {
        envConfig.database.database = process.env.DATABASE_NAME;
      }
      if (process.env.DATABASE_USERNAME) {
        envConfig.database.username = process.env.DATABASE_USERNAME;
      }
      if (process.env.DATABASE_PASSWORD) {
        envConfig.database.password = process.env.DATABASE_PASSWORD;
      }
    }

    // Logging
    if (process.env.LOG_LEVEL) {
      envConfig.logging = {
        level: process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug',
        console: { enabled: true, colorize: true },
      };
    }

    // Cache
    if (process.env.CACHE_ENABLED !== undefined) {
      envConfig.cache = {
        enabled: process.env.CACHE_ENABLED.toLowerCase() === 'true',
        ttl: 3600,
        maxSize: 1000,
        type: 'memory',
      };
    }

    if (Object.keys(envConfig).length > 0) {
      this.config = this.mergeConfig(this.config, envConfig);
      if (this.logger) {
        this.logger.info('Configuration loaded from environment variables');
      }
    }
  }

  updateConfig(updates: DeepPartial<ServerConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    if (this.logger) {
      this.logger.info('Configuration updated');
    }
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  private mergeConfig(
    target: ServerConfig,
    source: DeepPartial<ServerConfig>
  ): ServerConfig {
    const result = { ...target };

    for (const key in source) {
      const sourceValue = source[key as keyof ServerConfig];
      const targetValue = target[key as keyof ServerConfig];

      if (sourceValue !== undefined) {
        if (
          typeof sourceValue === 'object' &&
          sourceValue !== null &&
          !Array.isArray(sourceValue) &&
          typeof targetValue === 'object' &&
          targetValue !== null &&
          !Array.isArray(targetValue)
        ) {
          // Recursively merge objects
          (result as any)[key] = this.mergeConfig(
            targetValue as any,
            sourceValue as any
          );
        } else {
          // Direct assignment for primitives and arrays
          (result as any)[key] = sourceValue;
        }
      }
    }

    return result;
  }

  // Validate configuration
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Port validation
    if (this.config.port && (this.config.port < 1 || this.config.port > 65535)) {
      errors.push('Port must be between 1 and 65535');
    }

    // Database validation
    if (this.config.database?.type === 'sqlite' && !this.config.database.path) {
      errors.push('SQLite database path is required');
    }

    if (this.config.database?.type === 'postgresql') {
      if (!this.config.database.host) {
        errors.push('PostgreSQL host is required');
      }
      if (!this.config.database.database) {
        errors.push('PostgreSQL database name is required');
      }
    }

    // Cache validation
    if (this.config.cache?.enabled && this.config.cache.type === 'redis') {
      if (!this.config.cache.redis?.host) {
        errors.push('Redis host is required when cache type is redis');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Get specific config sections
  getDatabaseConfig() {
    return this.config.database;
  }

  getCacheConfig() {
    return this.config.cache;
  }

  getLoggingConfig() {
    return this.config.logging;
  }

  getCrawlerConfig() {
    return this.config.crawler;
  }

  getSearchConfig() {
    return this.config.search;
  }
} 