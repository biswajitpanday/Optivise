import { ConfigManager } from './config/config-manager.js';
import { Logger } from './utils/logger.js';
import { OptimizelyMCPServer } from './server/mcp-server.js';
import express from 'express';
import cors from 'cors';

async function startHTTPServer() {
  const configManager = ConfigManager.getInstance();
  
  // Load configuration from environment
  configManager.loadFromEnvironment();
  const config = configManager.getConfig();
  
  // Initialize logger
  const logger = new Logger(config.logging);
  configManager.setLogger(logger);

  logger.info('Starting OptiDevDoc HTTP Server...', {
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
  });

  try {
    // Validate configuration
    const validation = configManager.validateConfig();
    if (!validation.isValid) {
      logger.error('Configuration validation failed', { errors: validation.errors });
      process.exit(1);
    }

    const app = express();
    const port = Number(config.port || process.env.PORT || 3000);
    const host = config.host || '0.0.0.0';

    // Basic middleware
    app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    
    app.use(express.json());

    // Initialize MCP server for tool functionality
    const mcpServer = new OptimizelyMCPServer(config, logger);
    await mcpServer.initialize();

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      });
    });

    // API documentation
    app.get('/api/docs', (req, res) => {
      res.json({
        name: 'OptiDevDoc MCP Server',
        version: process.env.npm_package_version || '1.0.0',
        description: 'HTTP API for Optimizely documentation search',
        endpoints: {
          health: { method: 'GET', path: '/health' },
          search: { method: 'POST', path: '/api/search' },
          resolve: { method: 'POST', path: '/api/resolve' },
        },
      });
    });

    // Search endpoint
    app.post('/api/search', async (req, res) => {
      try {
        const { query, product, maxResults = 10 } = req.body;

        if (!query) {
          return res.status(400).json({
            error: 'Query is required',
          });
        }

        logger.info('Search request', { query, product, ip: req.ip });

        // Use get-optimizely-docs tool directly
        const getDocsTool = (mcpServer as any).getOptimizelyDocsTool;
        if (!getDocsTool) {
          throw new Error('Documentation tool not available');
        }

        const result = await getDocsTool.execute({
          query,
          product,
          maxResults,
        });

        res.json({
          success: true,
          query,
          results: result.content,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        logger.error('Search error', { error, ip: req.ip });
        res.status(500).json({
          error: 'Search failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Resolve endpoint
    app.post('/api/resolve', async (req, res) => {
      try {
        const { query } = req.body;

        if (!query) {
          return res.status(400).json({
            error: 'Query is required',
          });
        }

        logger.info('Resolve request', { query, ip: req.ip });

        // Use resolve-optimizely-id tool directly
        const resolveTool = (mcpServer as any).resolveOptimizelyIdTool;
        if (!resolveTool) {
          throw new Error('Resolve tool not available');
        }

        const result = await resolveTool.execute({ query });

        res.json({
          success: true,
          query,
          result: result.content,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        logger.error('Resolve error', { error, ip: req.ip });
        res.status(500).json({
          error: 'Resolve failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Start server
    const server = app.listen(port, host, () => {
      logger.info('OptiDevDoc HTTP Server started successfully', {
        port,
        host,
        endpoints: {
          health: `http://${host}:${port}/health`,
          docs: `http://${host}:${port}/api/docs`,
          search: `http://${host}:${port}/api/search`,
          resolve: `http://${host}:${port}/api/resolve`,
        },
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info('Received shutdown signal', { signal });
      
      server.close(async () => {
        try {
          await mcpServer.shutdown();
          logger.info('HTTP Server shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('Failed to start HTTP server', { error });
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startHTTPServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { startHTTPServer }; 