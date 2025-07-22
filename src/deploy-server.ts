import express from 'express';
import cors from 'cors';
import { ConfigManager } from './config/config-manager.js';
import { Logger } from './utils/logger.js';
import { DatabaseManager } from './database/database-manager.js';
import { DocumentationCrawler } from './engine/documentation-crawler.js';

async function startDeployServer() {
  const configManager = ConfigManager.getInstance();
  
  // Load configuration from environment
  configManager.loadFromEnvironment();
  const config = configManager.getConfig();
  
  // Initialize logger
  const logger = new Logger(config.logging);
  configManager.setLogger(logger);

  logger.info('Starting OptiDevDoc Deploy Server...', {
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
  });

  try {
    const app = express();
    const port = Number(process.env.PORT || 3000);
    const host = '0.0.0.0';

    // Middleware
    app.use(cors({ origin: '*' }));
    app.use(express.json());

    // Initialize database and crawler
    const database = new DatabaseManager(config.database!, logger);
    await database.initialize();
    
    const crawler = new DocumentationCrawler(config.crawler!, database, logger);
    
    // Start background crawling
    if (config.crawler?.enabled) {
      crawler.crawlAllSources().catch(error => {
        logger.error('Initial crawl failed', { error });
      });
    }

    // Health endpoint
    app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      });
    });

    // API docs
    app.get('/api/docs', (_req, res) => {
      res.json({
        name: 'OptiDevDoc Deploy Server',
        version: process.env.npm_package_version || '1.0.0',
        description: 'Simplified HTTP API for Optimizely documentation search',
        endpoints: {
          health: { method: 'GET', path: '/health' },
          search: { method: 'POST', path: '/api/search' },
        },
      });
    });

    // Search endpoint
    app.post('/api/search', async (req, res) => {
      try {
        const { query, product, maxResults = 10 } = req.body;

        if (!query) {
          res.status(400).json({ error: 'Query is required' });
          return;
        }

        logger.info('Search request', { query, product });

        // Perform database search
        const searchQuery = {
          text: query,
          ...(product && { product }),
          options: { maxResults },
        };

        const searchResults = await database.searchDocuments(searchQuery);
        
        res.json({
          success: true,
          query,
          results: searchResults.map(result => result.document),
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        logger.error('Search error', { error });
        res.status(500).json({
          error: 'Search failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Start server
    const server = app.listen(port, host, () => {
      logger.info('OptiDevDoc Deploy Server started successfully', {
        port,
        host,
        endpoints: {
          health: `http://${host}:${port}/health`,
          docs: `http://${host}:${port}/api/docs`,
          search: `http://${host}:${port}/api/search`,
        },
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info('Received shutdown signal', { signal });
      
      server.close(async () => {
        try {
          await database.close();
          logger.info('Deploy Server shutdown complete');
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
    logger.error('Failed to start deploy server', { error });
    process.exit(1);
  }
}

// Start the server
startDeployServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 