#!/usr/bin/env node

/**
 * Optivise v5.1.2 Entry Point
 * Main entry point for the Optivise MCP server with HTTP server support
 */

import { OptiviseMCPServer } from './core/mcp-server.js';
import { OptiviseHTTPServer } from './server/http-server.js';
import { createLogger } from './utils/logger.js';
import { getVersionInfo } from './config/version.js';

async function main() {
  // Check if we should start HTTP server (for Render deployment)
  const isHTTPMode = process.env.OPTIVISE_MODE === 'server' || process.env.NODE_ENV === 'production';
  
  // Only create logger after determining mode to avoid MCP protocol interference
  const logger = createLogger(isHTTPMode ? (process.env.LOG_LEVEL as any || 'info') : 'error');
  
  try {
    if (isHTTPMode) {
      const versionInfo = getVersionInfo();
      logger.info(`Starting ${versionInfo.fullName}`);
    } else {
      // In MCP mode, add basic startup verification
      if (process.env.OPTIDEV_DEBUG === 'true') {
        console.error('🚀 Starting Optivise MCP server...');
      }
    }
    
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
          level: process.env.LOG_LEVEL as any || 'error' // Minimal logging for MCP mode
        },
        features: {
          productDetection: process.env.ENABLE_PRODUCT_DETECTION !== 'false',
          ruleIntelligence: false, // Phase 2 feature
          documentationFetch: false, // Phase 2 feature
          knowledgeLearning: false // Phase 4 feature
        }
      });
      
      // Initialize and start the server
      if (process.env.OPTIDEV_DEBUG === 'true') {
        console.error('🔧 Initializing MCP server...');
      }
      await server.initialize();
      
      if (process.env.OPTIDEV_DEBUG === 'true') {
        console.error('🚀 Starting MCP server...');
      }
      
      try {
        await server.start();
        // Only log startup success in debug mode to avoid MCP interference
        if (process.env.OPTIDEV_DEBUG === 'true') {
          console.error('✅ Optivise MCP server started successfully');
        }
      } catch (error) {
        if (process.env.OPTIDEV_DEBUG === 'true') {
          console.error('❌ Failed to start MCP server:', error);
        }
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

// Start the main entry path exactly once, honoring OPTIVISE_MODE
main().catch((error) => {
  // Use stderr to avoid interfering with MCP protocol stdout
  console.error('❌ Optivise failed to start:', error);
  process.exit(1);
});