#!/usr/bin/env node

import 'dotenv/config';
import { EnhancedOptimizelyMCPServer } from './server/enhanced-mcp-server.js';
import { OptimizelyMCPServer } from './server/mcp-server.js';
import { Config } from './config/index.js';
import { Logger } from './utils/logger.js';

async function main() {
  try {
    // Initialize configuration
    const config = Config.getServerConfigObject();
    
    // Initialize logger
    const logger = new Logger(Config.getLoggingConfig());
    
    // Determine server type based on environment variables
    const serverMode = process.env.OPTIDEVDOC_MODE || 'simple';
    
    logger.info(`Starting OptiDevDoc in ${serverMode} mode`);
    
    let server;
    
    if (serverMode === 'enhanced') {
      // Start enhanced server with product-aware features
      server = new EnhancedOptimizelyMCPServer();
    } else {
      // Start simple server with basic features
      server = new OptimizelyMCPServer();
    }
    
    await server.initialize();
    await server.start();
    
    logger.info('OptiDevDoc server started successfully');
  } catch (error) {
    console.error('Failed to start OptiDevDoc:', error);
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