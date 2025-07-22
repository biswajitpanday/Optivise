 import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ResolveOptimizelyIdTool } from '../tools/resolve-optimizely-id.js';
import { GetOptimizelyDocsTool } from '../tools/get-optimizely-docs.js';
import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { ConfigManager } from '../config/config-manager.js';
import { DatabaseManager } from '../database/database-manager.js';
import { DocumentationCrawler } from '../engine/documentation-crawler.js';
import type { ServerConfig } from '../types/index.js';

export class OptimizelyMCPServer {
  private server: Server;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private config: ServerConfig;
  private resolveOptimizelyIdTool: ResolveOptimizelyIdTool;
  private getOptimizelyDocsTool: GetOptimizelyDocsTool;
  private database: DatabaseManager;
  private crawler: DocumentationCrawler;
  private isInitialized = false;

  constructor(config?: Partial<ServerConfig>) {
    this.config = ConfigManager.getInstance().getConfig(config);
    this.logger = new Logger(this.config.logging);
    this.errorHandler = new ErrorHandler(this.logger);

    // Initialize MCP Server
    this.server = new Server(
      {
        name: 'optidevdoc-mcp',
        version: '1.0.0',
      }
    );

    // Initialize database and crawler
    this.database = new DatabaseManager(this.config.database!, this.logger);
    this.crawler = new DocumentationCrawler(this.config.crawler!, this.database, this.logger);

    // Initialize tools
    this.resolveOptimizelyIdTool = new ResolveOptimizelyIdTool(this.config, this.logger);
    this.getOptimizelyDocsTool = new GetOptimizelyDocsTool(this.config, this.logger);

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'resolve-optimizely-id',
            description:
              'Resolves an Optimizely product or documentation topic name to a specific documentation ID for retrieval',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The Optimizely product name or documentation topic to resolve',
                },
                product: {
                  type: 'string',
                  description: 'Optional specific Optimizely product to focus on',
                  enum: [
                    'configured-commerce',
                    'cms-paas',
                    'cms-saas',
                    'odp',
                    'experimentation',
                    'commerce-connect',
                    'content-recommendations',
                    'personalization',
                    'web-experimentation',
                    'feature-experimentation',
                  ],
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get-optimizely-docs',
            description:
              'Retrieves detailed Optimizely documentation content for a specific topic or product area',
            inputSchema: {
              type: 'object',
              properties: {
                documentId: {
                  type: 'string',
                  description: 'The resolved documentation ID from resolve-optimizely-id',
                },
                query: {
                  type: 'string',
                  description: 'Search query for finding relevant documentation',
                },
                product: {
                  type: 'string',
                  description: 'Specific Optimizely product to search within',
                  enum: [
                    'configured-commerce',
                    'cms-paas',
                    'cms-saas',
                    'odp',
                    'experimentation',
                    'commerce-connect',
                    'content-recommendations',
                    'personalization',
                    'web-experimentation',
                    'feature-experimentation',
                  ],
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 10)',
                  minimum: 1,
                  maximum: 50,
                },
                includeCodeExamples: {
                  type: 'boolean',
                  description: 'Whether to include code examples in results (default: true)',
                },
              },
              required: [],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'resolve-optimizely-id':
            return await this.resolveOptimizelyIdTool.execute(args);

          case 'get-optimizely-docs':
            return await this.getOptimizelyDocsTool.execute(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        this.logger.error('Tool execution failed', { tool: name, error, args });
        return await this.errorHandler.handleToolError(error, name, args || {});
      }
    });
  }

  private setupErrorHandling(): void {
    // Handle server errors
    this.server.onerror = (error) => {
      this.logger.error('MCP Server error', { error });
    };

    // Handle process errors
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', { error });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', { reason, promise });
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, shutting down gracefully');
      this.shutdown().catch((error) => {
        this.logger.error('Error during shutdown', { error });
        process.exit(1);
      });
    });

    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, shutting down gracefully');
      this.shutdown().catch((error) => {
        this.logger.error('Error during shutdown', { error });
        process.exit(1);
      });
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Server already initialized');
      return;
    }

    try {
      this.logger.info('Initializing OptiDevDoc MCP Server...');

      // Initialize database first
      await this.database.initialize();

      // Initialize tools
      await this.resolveOptimizelyIdTool.initialize();
      await this.getOptimizelyDocsTool.initialize();

      // Start initial documentation crawl if enabled
      if (this.config.crawler?.enabled) {
        this.logger.info('Starting initial documentation crawl...');
        // Run crawler in background, don't wait for completion
        this.crawler.crawlAllSources().catch(error => {
          this.logger.error('Initial crawl failed', { error });
        });
      }

      this.isInitialized = true;
      this.logger.info('OptiDevDoc MCP Server initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize server', { error });
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      this.logger.info('Starting OptiDevDoc MCP Server...');

      // Create stdio transport
      const transport = new StdioServerTransport();

      // Connect server to transport
      await this.server.connect(transport);

      this.logger.info('OptiDevDoc MCP Server started successfully on stdio transport');
      this.logger.info('Server is ready to receive MCP requests');
    } catch (error) {
      this.logger.error('Failed to start server', { error });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down OptiDevDoc MCP Server...');

      // Cleanup tools
      await this.resolveOptimizelyIdTool?.cleanup?.();
      await this.getOptimizelyDocsTool?.cleanup?.();

      // Close database
      await this.database?.close();

      // Close server
      await this.server.close();

      this.isInitialized = false;
      this.logger.info('OptiDevDoc MCP Server shutdown complete');
    } catch (error) {
      this.logger.error('Error during server shutdown', { error });
      throw error;
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
  }> {
    try {
      const uptime = process.uptime();
      const timestamp = new Date().toISOString();

      // Basic health checks
      const isHealthy = this.isInitialized && uptime > 0;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp,
        uptime,
        version: '1.0.0',
      };
    } catch (error) {
      this.logger.error('Health check failed', { error });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        version: '1.0.0',
      };
    }
  }

  // Getters for testing
  get isReady(): boolean {
    return this.isInitialized;
  }

  get serverInstance(): Server {
    return this.server;
  }
} 