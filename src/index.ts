#!/usr/bin/env node

/**
 * OptiDevAssistant v3.0.0 Entry Point
 * Main entry point for the OptiDevAssistant MCP server
 */

import { OptiDevAssistantMCPServer } from './core/mcp-server.js';
import { createLogger } from './utils/logger.js';

async function main() {
  const logger = createLogger(process.env.LOG_LEVEL as any || 'info');
  
  try {
    logger.info('Starting OptiDevAssistant v3.0.0');
    
    // Create and initialize the MCP server
    const server = new OptiDevAssistantMCPServer({
      logging: {
        level: process.env.LOG_LEVEL as any || 'info'
      },
      features: {
        productDetection: process.env.ENABLE_PRODUCT_DETECTION !== 'false',
        ruleIntelligence: false, // Phase 2 feature
        documentationFetch: false, // Phase 2 feature
        knowledgeLearning: false // Phase 4 feature
      }
    });
    
    // Initialize and start the server
    await server.initialize();
    await server.start();
    
    logger.info('OptiDevAssistant MCP server started successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start OptiDevAssistant', error as Error);
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