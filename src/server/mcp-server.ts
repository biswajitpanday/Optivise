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
import { DevelopmentRulesTool } from '../tools/development-rules-tool.js';
import { OptimizelyPatternTool } from '../tools/optimizely-pattern-tool.js';
import { OptimizelyBugAnalyzer } from '../tools/optimizely-bug-analyzer.js';
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
  private developmentRulesTool: DevelopmentRulesTool;
  private optimizelyPatternTool: OptimizelyPatternTool;
  private optimizelyBugAnalyzer: OptimizelyBugAnalyzer;
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
    this.developmentRulesTool = new DevelopmentRulesTool(this.config, this.logger);
    this.optimizelyPatternTool = new OptimizelyPatternTool(this.config, this.logger);
    this.optimizelyBugAnalyzer = new OptimizelyBugAnalyzer(this.config, this.logger);

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'apply-development-rules',
            description:
              'Apply Optimizely Configured Commerce development rules to a specific scenario for context-aware guidance',
            inputSchema: {
              type: 'object',
              properties: {
                scenario: {
                  type: 'string',
                  description: 'The development scenario or task you need guidance for',
                },
                context: {
                  type: 'object',
                  description: 'Optional context to provide more specific rule matching',
                  properties: {
                    filePattern: {
                      type: 'string',
                      description: 'File pattern or extension (e.g., "*.tsx", "*Handler.cs")',
                    },
                    directory: {
                      type: 'string',
                      description: 'Directory context (e.g., "Extensions", "FrontEnd/blueprints")',
                    },
                    technology: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Technologies being used (e.g., ["react", "typescript", "c#"])',
                    },
                    category: {
                      type: 'string',
                      enum: ['frontend', 'backend', 'project-structure', 'quality', 'general'],
                      description: 'Development category',
                    },
                  },
                },
                includeExamples: {
                  type: 'boolean',
                  description: 'Whether to include code examples (default: true)',
                },
                maxRules: {
                  type: 'number',
                  description: 'Maximum number of rules to return (default: 5)',
                },
              },
              required: ['scenario'],
            },
          },
          {
            name: 'generate-cursor-config',
            description:
              'Generate Cursor IDE configuration with integrated Optimizely development rules',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Optional project path for configuration',
                },
                includeAllRules: {
                  type: 'boolean',
                  description: 'Whether to include all available rules (default: true)',
                },
                categories: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['frontend', 'backend', 'project-structure', 'quality', 'general'],
                  },
                  description: 'Specific rule categories to include',
                },
              },
              required: [],
            },
          },
          {
            name: 'search-optimizely-docs',
            description:
              'Enhanced documentation search with pattern matching across Optimizely products',
            inputSchema: {
              type: 'object',
              properties: {
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
                    'cmp',
                    'odp',
                    'experimentation',
                    'commerce-connect',
                    'search-navigation',
                    'all',
                  ],
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 10)',
                },
                includeCodeExamples: {
                  type: 'boolean',
                  description: 'Whether to include code examples in results (default: true)',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'find-optimizely-pattern',
            description:
              'Find Optimizely coding patterns and best practices for specific development scenarios',
            inputSchema: {
              type: 'object',
              properties: {
                scenario: {
                  type: 'string',
                  description: 'Development scenario (e.g., "custom pricing logic", "checkout pipeline")',
                },
                product: {
                  type: 'string',
                  description: 'Optimizely product',
                  enum: [
                    'configured-commerce',
                    'cms-paas',
                    'cms-saas',
                    'cmp',
                    'odp',
                    'experimentation',
                    'commerce-connect',
                    'search-navigation',
                    'any',
                  ],
                },
                category: {
                  type: 'string',
                  description: 'Pattern category',
                  enum: [
                    'handler',
                    'pipeline',
                    'service',
                    'integration',
                    'best-practice',
                    'api',
                    'content-type',
                    'block',
                    'template',
                    'any',
                  ],
                },
                includeCode: {
                  type: 'boolean',
                  description: 'Include code examples (default: true)',
                },
              },
              required: ['scenario'],
            },
          },
          {
            name: 'analyze-optimizely-bug',
            description:
              'Analyze bugs and get Optimizely-specific solutions and guidance',
            inputSchema: {
              type: 'object',
              properties: {
                bugDescription: {
                  type: 'string',
                  description: 'Description of the bug or issue',
                },
                errorMessage: {
                  type: 'string',
                  description: 'Error message or stack trace (optional)',
                },
                context: {
                  type: 'string',
                  description: 'Additional context about the issue',
                },
                product: {
                  type: 'string',
                  description: 'Optimizely product (auto-detect if not specified)',
                  enum: [
                    'configured-commerce',
                    'cms-paas',
                    'cms-saas',
                    'cmp',
                    'odp',
                    'experimentation',
                    'commerce-connect',
                    'search-navigation',
                    'auto-detect',
                  ],
                },
              },
              required: ['bugDescription'],
            },
          },
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
          case 'apply-development-rules':
            return await this.developmentRulesTool.executeApplyRules(args);

          case 'generate-cursor-config':
            return await this.developmentRulesTool.executeGenerateCursorConfig(args);

          case 'search-optimizely-docs':
            return await this.getOptimizelyDocsTool.execute(args);

          case 'find-optimizely-pattern':
            return await this.optimizelyPatternTool.execute(args);

          case 'analyze-optimizely-bug':
            return await this.optimizelyBugAnalyzer.execute(args);

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
      await this.developmentRulesTool.initialize();
      await this.optimizelyPatternTool.initialize();
      await this.optimizelyBugAnalyzer.initialize();

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
      // Note: Development rules tool, pattern tool, and bug analyzer don't have cleanup methods

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