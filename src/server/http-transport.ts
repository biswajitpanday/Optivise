import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Logger } from '../utils/logger.js';
import type { ServerConfig } from '../types/index.js';
import { OptimizelyMCPServer } from './mcp-server.js';

export class HTTPTransportServer {
  private app: express.Application;
  private server: any;
  private mcpServer: OptimizelyMCPServer;
  private logger: Logger;
  private config: ServerConfig;
  private rateLimiter: RateLimiterMemory;

  constructor(config: ServerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.app = express();
    this.mcpServer = new OptimizelyMCPServer(config, logger);
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiterMemory({
      points: this.config.rateLimit?.maxRequests || 100, // Number of requests
      duration: Math.floor((this.config.rateLimit?.windowMs || 60000) / 1000), // Per duration in seconds
    });
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    if (this.config.cors?.enabled) {
      this.app.use(cors({
        origin: this.config.cors.origins || ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      }));
    }

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting middleware
    this.app.use(async (req, res, next) => {
      try {
        await this.rateLimiter.consume(req.ip);
        next();
      } catch (rejRes: any) {
        const remainingTime = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(remainingTime));
        res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
        });
      }
    });

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      });
    });

    // Metrics endpoint for monitoring
    this.app.get('/metrics', (req, res) => {
      res.json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // MCP Server-Sent Events endpoint
    this.app.get('/mcp/sse', async (req, res) => {
      try {
        this.logger.info('New SSE connection established', { ip: req.ip });

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

        // Create SSE transport
        const transport = new SSEServerTransport('/mcp/sse', res);
        const server = new Server(
          {
            name: 'optidevdoc-mcp',
            version: '1.0.0',
          },
          {
            capabilities: {
              tools: {},
            },
          }
        );

        // Connect the MCP server tools to this transport
        await this.mcpServer.initialize();
        
        // Set up tool handlers
        server.setRequestHandler('tools/list', async () => {
          return await this.mcpServer.handleListTools();
        });

        server.setRequestHandler('tools/call', async (request) => {
          return await this.mcpServer.handleCallTool(request);
        });

        // Connect transport
        await server.connect(transport);

        // Handle client disconnect
        req.on('close', () => {
          this.logger.info('SSE connection closed', { ip: req.ip });
          server.close().catch(err => {
            this.logger.error('Error closing MCP server', { error: err });
          });
        });

      } catch (error) {
        this.logger.error('SSE connection error', { error, ip: req.ip });
        res.status(500).json({ error: 'Failed to establish SSE connection' });
      }
    });

    // API documentation endpoint
    this.app.get('/api/docs', (req, res) => {
      res.json({
        name: 'OptiDevDoc MCP Server',
        version: process.env.npm_package_version || '1.0.0',
        description: 'Model Context Protocol server for Optimizely documentation',
        endpoints: {
          health: {
            method: 'GET',
            path: '/health',
            description: 'Health check endpoint',
          },
          metrics: {
            method: 'GET',
            path: '/metrics',
            description: 'Server metrics and statistics',
          },
          mcp_sse: {
            method: 'GET',
            path: '/mcp/sse',
            description: 'MCP Server-Sent Events endpoint for real-time communication',
          },
          search: {
            method: 'POST',
            path: '/api/search',
            description: 'Direct API search endpoint (alternative to MCP)',
          },
        },
        tools: [
          {
            name: 'resolve-optimizely-id',
            description: 'Resolve Optimizely product and context from queries',
          },
          {
            name: 'get-optimizely-docs',
            description: 'Search and retrieve Optimizely documentation',
          },
        ],
      });
    });

    // Direct search API endpoint (alternative to MCP)
    this.app.post('/api/search', async (req, res) => {
      try {
        const { query, product, maxResults = 10 } = req.body;

        if (!query || typeof query !== 'string') {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Query parameter is required',
          });
        }

        this.logger.info('Direct API search request', { query, product, ip: req.ip });

        // Use the MCP server's search functionality
        const searchResult = await this.mcpServer.handleCallTool({
          method: 'tools/call',
          params: {
            name: 'get-optimizely-docs',
            arguments: {
              query,
              product,
              maxResults,
            },
          },
        });

        res.json({
          success: true,
          query,
          results: searchResult.content,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        this.logger.error('API search error', { error, ip: req.ip });
        res.status(500).json({
          error: 'Search failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.path} not found`,
        availableEndpoints: ['/health', '/metrics', '/mcp/sse', '/api/docs', '/api/search'],
      });
    });

    // Error handler
    this.app.use((err: any, req: any, res: any, next: any) => {
      this.logger.error('Express error handler', { error: err, url: req.url });
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message || 'Unknown error occurred',
      });
    });
  }

  async start(): Promise<void> {
    const port = this.config.port || 3000;
    const host = this.config.host || '0.0.0.0';

    try {
      // Initialize the MCP server
      await this.mcpServer.initialize();

      // Start HTTP server
      this.server = this.app.listen(port, host, () => {
        this.logger.info('HTTP Transport Server started', {
          port,
          host,
          endpoints: {
            health: `http://${host}:${port}/health`,
            metrics: `http://${host}:${port}/metrics`,
            mcp_sse: `http://${host}:${port}/mcp/sse`,
            api_docs: `http://${host}:${port}/api/docs`,
            search_api: `http://${host}:${port}/api/search`,
          },
        });
      });

      // Handle server errors
      this.server.on('error', (error: any) => {
        this.logger.error('HTTP server error', { error });
        throw error;
      });

      // Graceful shutdown handling
      process.on('SIGINT', () => this.shutdown('SIGINT'));
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));

    } catch (error) {
      this.logger.error('Failed to start HTTP Transport Server', { error });
      throw error;
    }
  }

  async shutdown(signal?: string): Promise<void> {
    this.logger.info('Shutting down HTTP Transport Server...', { signal });

    try {
      // Close MCP server
      await this.mcpServer.shutdown();

      // Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server.close((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      this.logger.info('HTTP Transport Server shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown', { error });
      throw error;
    }
  }

  getApp(): express.Application {
    return this.app;
  }
} 