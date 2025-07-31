/**
 * OptiDevAssistant MCP Server
 * Core MCP server implementation with single context analyzer tool
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import type {
  MCPServerConfig,
  MCPServerOptions,
  MCPToolRequest,
  MCPToolResponse,
  ContextAnalysisRequest,
  ContextAnalysisResponse,
  Logger
} from '../types/index.js';

import { ContextAnalysisEngine } from '../analyzers/context-analysis-engine.js';
import { createLogger } from '../utils/logger.js';

export class OptiDevAssistantMCPServer {
  private server: Server;
  private logger: Logger;
  private contextAnalyzer: ContextAnalysisEngine;
  private isInitialized = false;

  constructor(options: MCPServerOptions = {}) {
    this.logger = createLogger(options.logging?.level || 'info');
    
    // Initialize the context analysis engine
    this.contextAnalyzer = new ContextAnalysisEngine(this.logger);

    // Create MCP server configuration
    const config: MCPServerConfig = {
      name: 'optidev-assistant',
      version: '3.0.0-alpha.1',
      description: 'Intelligent MCP tool for Optimizely context analysis',
      capabilities: {
        tools: true,
        logging: true,
        monitoring: options.features?.productDetection || false
      },
      tools: [{
        name: 'optidev_context_analyzer',
        description: 'Analyzes prompts for Optimizely context and provides curated information',
        parameters: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'User prompt to analyze for Optimizely context'
            },
            projectPath: {
              type: 'string',
              description: 'Optional project path for IDE context'
            },
            ideRules: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional IDE rules for context enhancement'
            }
          },
          required: ['prompt']
        }
      }]
    };

    // Initialize MCP Server
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: config.capabilities.tools ? {} : undefined,
        },
      }
    );

    this.setupHandlers();
    this.logger.info('OptiDevAssistant MCP Server initialized', { version: config.version });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'optidev_context_analyzer',
            description: 'Analyzes prompts for Optimizely context and provides curated information',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'User prompt to analyze for Optimizely context'
                },
                projectPath: {
                  type: 'string',
                  description: 'Optional project path for IDE context'
                },
                ideRules: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional IDE rules for context enhancement'
                }
              },
              required: ['prompt']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'optidev_context_analyzer') {
        const result = await this.handleContextAnalysis(args as unknown as ContextAnalysisRequest);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
    });
  }

  private async handleContextAnalysis(request: ContextAnalysisRequest): Promise<MCPToolResponse> {
    try {
      this.logger.debug('Processing context analysis request', { 
        promptLength: request.prompt.length,
        hasProjectPath: !!request.projectPath,
        hasIDERules: !!request.ideRules?.length
      });

      const startTime = Date.now();
      const response = await this.contextAnalyzer.analyze(request);
      const processingTime = Date.now() - startTime;

      this.logger.info('Context analysis completed', {
        relevance: response.relevance,
        detectedProducts: response.detectedProducts,
        processingTime
      });

      return {
        status: 'success',
        data: response
      };

    } catch (error) {
      this.logger.error('Context analysis failed', error as Error, {
        promptLength: request.prompt.length
      });

      return {
        status: 'error',
        error: {
          code: 'ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: { timestamp: new Date() }
        }
      };
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize the context analyzer
      await this.contextAnalyzer.initialize();
      
      this.isInitialized = true;
      this.logger.info('OptiDevAssistant MCP Server initialization completed');
    } catch (error) {
      this.logger.error('Failed to initialize MCP Server', error as Error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    this.logger.info('OptiDevAssistant MCP Server started and connected');
  }

  async stop(): Promise<void> {
    try {
      await this.server.close();
      this.logger.info('OptiDevAssistant MCP Server stopped');
    } catch (error) {
      this.logger.error('Error stopping MCP Server', error as Error);
      throw error;
    }
  }

  getHealthStatus() {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      version: '3.0.0-alpha.1',
      uptime: process.uptime(),
      features: {
        contextAnalysis: true,
        productDetection: this.contextAnalyzer.isProductDetectionEnabled(),
        documentationAccess: false, // Will be implemented in Phase 3
        knowledgeBase: false // Will be implemented in Phase 4
      },
      timestamp: new Date()
    } as const;
  }
}