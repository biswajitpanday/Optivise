#!/usr/bin/env node

import 'dotenv/config';
import { EnhancedOptimizelyMCPServer } from './server/enhanced-mcp-server.js';
import { OptimizelyMCPServer } from './server/mcp-server.js';
import { ConfigManager } from './config/config-manager.js';
import { Logger } from './utils/logger.js';

async function main(): Promise<void> {
  let logger: Logger | undefined;
  let server: EnhancedOptimizelyMCPServer | OptimizelyMCPServer | undefined;

  try {
    // Initialize configuration manager
    const configManager = ConfigManager.getInstance();
    
    // Load configuration from environment and files
    configManager.loadFromEnvironment();
    
    // Try to load from config file if it exists
    try {
      configManager.loadFromFile('./config.json');
    } catch (error) {
      // Config file is optional, ignore if not found
    }

    // Get final configuration
    const config = configManager.getConfig();
    
    // Initialize logger
    logger = new Logger(config.logging);
    configManager.setLogger(logger);

    // Validate configuration
    const validation = configManager.validateConfig();
    if (!validation.isValid) {
      logger.error('Configuration validation failed', { errors: validation.errors });
      process.exit(1);
    }

    logger.info('Starting OptiDevDoc MCP Server...', { version: '2.1.0' });

    // Try to use enhanced server first, fallback to basic if needed
    try {
      server = new EnhancedOptimizelyMCPServer(config);
      logger.info('Using Enhanced MCP Server with product-aware features');
    } catch (enhancedError) {
      logger.warn('Enhanced server unavailable, falling back to basic server', { error: enhancedError });
      server = new OptimizelyMCPServer(config);
      logger.info('Using Basic MCP Server');
    }
    
    // Start the server
    await server.start();

    logger.info('OptiDevDoc MCP Server is running and ready to serve requests');

    // Keep the process alive
    process.on('SIGINT', async () => {
      logger?.info('Received SIGINT, shutting down gracefully...');
      await server?.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger?.info('Received SIGTERM, shutting down gracefully...');
      await server?.shutdown();
      process.exit(0);
    });

  } catch (error) {
    logger?.error('Failed to start OptiDevDoc MCP Server', { error });
    console.error('\n❌ OptiDevDoc MCP Server failed to start');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check if all dependencies are installed: npm install');
    console.error('2. Verify Node.js version: node --version (requires >= 18)');
    console.error('3. Check configuration: ensure config.json is valid');
    console.error('4. Try with debug mode: DEBUG=* optidevdoc mcp');
    process.exit(1);
  }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
} 