#!/usr/bin/env node

/**
 * Optix v3.0.0 Entry Point
 * Main entry point for the Optix MCP server with HTTP server support
 */

import { OptiviseMCPServer } from './core/mcp-server.js';
import { OptiviseHTTPServer } from './server/http-server.js';
import { createLogger } from './utils/logger.js';
import { getVersionInfo } from './config/version.js';

async function main() {
  console.log('Starting Optivise main function...');
  const logger = createLogger(process.env.LOG_LEVEL as any || 'info');
  
  try {
    const versionInfo = getVersionInfo();
    logger.info(`Starting ${versionInfo.fullName}`);

    // Check if we should start HTTP server (for Render deployment)
    const isHTTPMode = process.env.OPTIVISE_MODE === 'server' || process.env.NODE_ENV === 'production';
    
    if (isHTTPMode) {
      // Start HTTP server for Render deployment
      const httpServer = new OptiviseHTTPServer(parseInt(process.env.PORT || '3000'));
      await httpServer.start();
      
      // Graceful shutdown for HTTP server
      process.on('SIGINT', async () => {
        logger.info('Received SIGINT, shutting down HTTP server gracefully');
        await httpServer.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, shutting down HTTP server gracefully');
        await httpServer.stop();
        process.exit(0);
      });
    } else {
      // Start MCP server for local/IDE usage
      const server = new OptiviseMCPServer({
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
      logger.debug('About to start MCP server...');
      try {
        await server.start();
        logger.info('Optivise MCP server started successfully');
      } catch (error) {
        logger.error('Failed to start MCP server', error as Error);
        process.exit(1);
      }

      // Graceful shutdown for MCP server
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
    }

  } catch (error) {
    logger.error('Failed to start Optivise', error as Error);
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