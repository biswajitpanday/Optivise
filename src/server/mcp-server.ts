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
import { Config } from '../config/index.js';
import { DatabaseManager } from '../database/database-manager.js';
import { DocumentationCrawler } from '../engine/documentation-crawler.js';
import type { ServerConfig } from '../types/index.js';

/**
 * MCP Server class
 * Manages the Model Context Protocol server for OptiDevDoc
 */
export class MCPServer {
  private server: Server;
  private transport: StdioServerTransport;
  private config: ServerConfig;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private dbManager?: DatabaseManager;
  private crawler?: DocumentationCrawler;

  // Tools
  private resolveIdTool: ResolveOptimizelyIdTool;
  private docsTool: GetOptimizelyDocsTool;
  private rulesTool: DevelopmentRulesTool;
  private patternTool: OptimizelyPatternTool;
  private bugAnalyzer: OptimizelyBugAnalyzer;

  constructor() {
    // Get configuration from unified config
    this.config = Config.getServerConfigObject();
    
    // Initialize logger
    this.logger = new Logger(Config.getLoggingConfig());
    
    // Initialize error handler
    this.errorHandler = new ErrorHandler(this.logger);

    // Initialize database if enabled
    if (this.config.database?.enabled) {
      this.dbManager = new DatabaseManager(
        this.config.database,
        this.logger
      );
    }

    // Initialize crawler if enabled
    if (this.config.crawler?.enabled) {
      this.crawler = new DocumentationCrawler(
        this.config.crawler,
        this.logger,
        this.dbManager
      );
    }

    // Initialize tools
    this.resolveIdTool = new ResolveOptimizelyIdTool(this.config, this.logger);
    this.docsTool = new GetOptimizelyDocsTool(this.config, this.logger);
    this.rulesTool = new DevelopmentRulesTool(this.config, this.logger);
    this.patternTool = new OptimizelyPatternTool(this.config, this.logger);
    this.bugAnalyzer = new OptimizelyBugAnalyzer(this.config, this.logger);

    // Create MCP server
    this.server = new Server(
      {
        name: Config.getAppConfig().name,
        version: Config.getAppConfig().version,
      },
      {
        capabilities: {
          tools: {
            'resolve-optimizely-id': true,
            'get-optimizely-docs': true,
            'apply-development-rules': true,
            'find-optimizely-pattern': true,
            'analyze-optimizely-bug': true,
          },
        },
      }
    );

    // Create transport
    this.transport = new StdioServerTransport();

    // Register tool handlers
    this.registerToolHandlers();
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    try {
      // Connect to database if enabled
      if (this.dbManager) {
        await this.dbManager.connect();
      }

      // Start crawler if enabled
      if (this.crawler) {
        await this.crawler.start();
      }

      // Connect to transport
      await this.server.connect(this.transport);

      this.logger.info('MCP server started successfully');
    } catch (error) {
      this.logger.error('Failed to start MCP server', { error });
      throw error;
    }
  }

  /**
   * Register tool handlers
   */
  private registerToolHandlers(): void {
    // Register tools list handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          this.resolveIdTool.getToolDefinition(),
          this.docsTool.getToolDefinition(),
          this.rulesTool.getToolDefinition(),
          this.patternTool.getToolDefinition(),
          this.bugAnalyzer.getToolDefinition(),
        ],
      };
    });

    // Register tool call handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'resolve-optimizely-id':
            return await this.resolveIdTool.execute(args);
          case 'get-optimizely-docs':
            return await this.docsTool.execute(args);
          case 'apply-development-rules':
            return await this.rulesTool.execute(args);
          case 'find-optimizely-pattern':
            return await this.patternTool.execute(args);
          case 'analyze-optimizely-bug':
            return await this.bugAnalyzer.execute(args);
          default:
            throw new McpError(
              ErrorCode.INVALID_PARAMS,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        return this.errorHandler.handleToolError(error, name, {});
      }
    });
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    try {
      // Stop crawler if enabled
      if (this.crawler) {
        await this.crawler.stop();
      }

      // Disconnect from database if enabled
      if (this.dbManager) {
        await this.dbManager.disconnect();
      }

      this.logger.info('MCP server stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop MCP server', { error });
      throw error;
    }
  }
} 