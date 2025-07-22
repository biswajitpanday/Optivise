#!/usr/bin/env node

import 'dotenv/config';
import { OptimizelyMCPServer } from './server/mcp-server.js';
import { ConfigManager } from './config/config-manager.js';
import { Logger } from './utils/logger.js';

async function main(): Promise<void> {
  let logger: Logger | undefined;
  let server: OptimizelyMCPServer | undefined;

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

    logger.info('Starting OptiDevDoc MCP Server...', { version: '1.0.0' });

    // Create and initialize the MCP server
    server = new OptimizelyMCPServer(config);
    
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
    if (logger) {
      logger.error('Failed to start OptiDevDoc MCP Server', { error });
    } else {
      console.error('Failed to start OptiDevDoc MCP Server:', error);
    }
    
    // Attempt cleanup
    try {
      await server?.shutdown();
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 