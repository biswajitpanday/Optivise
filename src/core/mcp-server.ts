/**
 * Optivise MCP Server
 * Enhanced MCP server with AI-powered features and multiple specialized tools
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
import { openAIClient } from '../integrations/openai-client.js';
import { chromaDBService } from '../integrations/chromadb-client.js';
import { documentationSyncService } from '../services/documentation-sync-service.js';
import { APIKeyDetector } from '../integrations/api-key-detector.js';
import { ImplementationGuideTool } from '../tools/implementation-guide-tool.js';
import { DebugHelperTool } from '../tools/debug-helper-tool.js';
import { CodeAnalyzerTool } from '../tools/code-analyzer-tool.js';
import { ProjectHelperTool } from '../tools/project-helper-tool.js';
import { auditTrail } from '../services/audit-trail.js';
import { monitoringService as createMonitoring } from '../services/monitoring-service.js';
import { generateCorrelationId, runWithCorrelationId } from '../utils/correlation.js';

export class OptiviseMCPServer {
  private readonly server: Server;
  private readonly logger: Logger;
  private readonly contextAnalyzer: ContextAnalysisEngine;
  private readonly keyDetector: APIKeyDetector;
  private readonly implementationGuideTool: ImplementationGuideTool;
  private readonly debugHelperTool: DebugHelperTool;
  private readonly codeAnalyzerTool: CodeAnalyzerTool;
  private readonly projectHelperTool: ProjectHelperTool;
  private isInitialized = false;
  private aiEnabled = false;
  private readonly monitoring = createMonitoring(createLogger('error'));

  constructor(options: MCPServerOptions = {}) {
    this.logger = createLogger(options.logging?.level || 'info');
    
    // Initialize services
    this.contextAnalyzer = new ContextAnalysisEngine(this.logger);
    this.keyDetector = new APIKeyDetector();
    this.implementationGuideTool = new ImplementationGuideTool(this.logger);
    this.debugHelperTool = new DebugHelperTool(this.logger);
    this.codeAnalyzerTool = new CodeAnalyzerTool(this.logger);
    this.projectHelperTool = new ProjectHelperTool(this.logger);

    // Create MCP server configuration with enhanced tools
    const config: MCPServerConfig = {
      name: 'optivise-ultimate-assistant',
      version: '5.1.2',
      description: 'Ultimate Optimizely Development Assistant with AI-powered features',
      capabilities: {
        tools: true,
        logging: true,
        monitoring: true,
        aiIntegration: true
      },
      tools: [
        {
          name: 'optidev_context_analyzer',
          description: 'Enhanced context analysis with AI-powered relevance scoring and vector search',
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
              },
              enableAI: {
                type: 'boolean',
                description: 'Enable AI-powered features (requires API keys)',
                default: true
              }
            },
            required: ['prompt']
          }
        },
        {
          name: 'optidev_implementation_guide',
          description: 'Analyzes Jira tickets and provides complete implementation guidance',
          parameters: {
            type: 'object',
            properties: {
              ticketContent: {
                type: 'string',
                description: 'Jira ticket content or requirements text'
              },
              projectContext: {
                type: 'string',
                description: 'Optional project context or existing codebase information'
              }
            },
            required: ['ticketContent']
          }
        },
        {
          name: 'optidev_debug_helper',
          description: 'Provides intelligent debugging assistance for Optimizely-related issues',
          parameters: {
            type: 'object',
            properties: {
              bugDescription: {
                type: 'string',
                description: 'Description of the bug or issue encountered'
              },
              errorMessages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional error messages or stack traces'
              },
              codeContext: {
                type: 'string',
                description: 'Optional relevant code snippets'
              }
            },
            required: ['bugDescription']
          }
        },
        {
          name: 'optidev_code_analyzer',
          description: 'Real-time code analysis for performance, security, and best practices',
          parameters: {
            type: 'object',
            properties: {
              codeSnippet: {
                type: 'string',
                description: 'Code snippet to analyze'
              },
              language: {
                type: 'string',
                description: 'Programming language (typescript, csharp, html, etc.)',
                default: 'typescript'
              },
              analysisType: {
                type: 'string',
                enum: ['performance', 'security', 'best-practices', 'all'],
                description: 'Type of analysis to perform',
                default: 'all'
              }
            },
            required: ['codeSnippet']
          }
        },
        {
          name: 'optidev_project_helper',
          description: 'Project setup, migration assistance, and development guidance',
          parameters: {
            type: 'object',
            properties: {
              requestType: {
                type: 'string',
                enum: ['setup', 'migration', 'configuration', 'best-practices'],
                description: 'Type of project assistance needed'
              },
              projectDetails: {
                type: 'string',
                description: 'Project requirements or current setup details'
              },
              targetVersion: {
                type: 'string',
                description: 'Target Optimizely version (if applicable)'
              }
            },
            required: ['requestType', 'projectDetails']
          }
        }
      ]
    };

    // Initialize MCP Server
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {}, // Always enable tools
        },
      }
    );

    this.setupHandlers();
    if (process.env.OPTIDEV_DEBUG === 'true') {
      this.logger.info('Optivise MCP Server initialized', { version: config.version });
    }
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'optidev_context_analyzer',
            description: 'Enhanced context analysis with AI-powered relevance scoring and vector search',
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
                },
                enableAI: {
                  type: 'boolean',
                  description: 'Enable AI-powered features (requires API keys)'
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'optidev_implementation_guide',
            description: 'Analyzes Jira tickets and provides complete implementation guidance',
            inputSchema: {
              type: 'object',
              properties: {
                ticketContent: {
                  type: 'string',
                  description: 'Jira ticket content or requirements text'
                },
                projectContext: {
                  type: 'string',
                  description: 'Optional project context or existing codebase information'
                }
              },
              required: ['ticketContent']
            }
          },
          {
            name: 'optidev_debug_helper',
            description: 'Provides intelligent debugging assistance for Optimizely-related issues',
            inputSchema: {
              type: 'object',
              properties: {
                bugDescription: {
                  type: 'string',
                  description: 'Description of the bug or issue encountered'
                },
                errorMessages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional error messages or stack traces'
                },
                codeContext: {
                  type: 'string',
                  description: 'Optional relevant code snippets'
                }
              },
              required: ['bugDescription']
            }
          },
          {
            name: 'optidev_code_analyzer',
            description: 'Real-time code analysis for performance, security, and best practices',
            inputSchema: {
              type: 'object',
              properties: {
                codeSnippet: {
                  type: 'string',
                  description: 'Code snippet to analyze'
                },
                language: {
                  type: 'string',
                  description: 'Programming language (typescript, csharp, html, etc.)'
                },
                analysisType: {
                  type: 'string',
                  enum: ['performance', 'security', 'best-practices', 'all'],
                  description: 'Type of analysis to perform'
                }
              },
              required: ['codeSnippet']
            }
          },
          {
            name: 'optidev_project_helper',
            description: 'Project setup, migration assistance, and development guidance',
            inputSchema: {
              type: 'object',
              properties: {
                requestType: {
                  type: 'string',
                  enum: ['setup', 'migration', 'configuration', 'best-practices'],
                  description: 'Type of project assistance needed'
                },
                projectDetails: {
                  type: 'string',
                  description: 'Project requirements or current setup details'
                },
                targetVersion: {
                  type: 'string',
                  description: 'Target Optimizely version (if applicable)'
                }
              },
              required: ['requestType', 'projectDetails']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const corrId = generateCorrelationId('mcp');
        const resultWrapped = await runWithCorrelationId(corrId, async () => {
        let result: any;

        switch (name) {
          case 'optidev_context_analyzer':
            result = await this.handleContextAnalysis(args as unknown as ContextAnalysisRequest);
            break;

          case 'optidev_implementation_guide':
            result = await this.handleImplementationGuide(args as any);
            break;

          case 'optidev_debug_helper':
            result = await this.handleDebugHelper(args as any);
            break;

          case 'optidev_code_analyzer':
            result = await this.handleCodeAnalyzer(args as any);
            break;

          case 'optidev_project_helper':
            result = await this.handleProjectHelper(args as any);
            break;

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
        });
        return resultWrapped;

      } catch (error) {
        this.logger.error(`Tool execution failed for ${name}`, error as Error);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error: {
                  code: 'TOOL_EXECUTION_FAILED',
                  message: error instanceof Error ? error.message : 'Unknown error occurred',
                  details: { tool: name, timestamp: new Date() }
                }
              }, null, 2)
            }
          ]
        };
      }
    });
  }

  private async handleContextAnalysis(request: ContextAnalysisRequest): Promise<MCPToolResponse> {
    try {
      const stop = this.monitoring.startTimer('tool:optidev_context_analyzer');
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
      stop();

      return {
        status: 'success',
        data: response
      };

    } catch (error) {
      try { this.monitoring.recordPerformance({ operation: 'tool:optidev_context_analyzer', duration: 0, success: false }); } catch {}
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

  private async handleImplementationGuide(request: any): Promise<any> {
    try {
      const stop = this.monitoring.startTimer('tool:optidev_implementation_guide');
      this.logger.debug('Processing implementation guide request');
      const response = await this.implementationGuideTool.analyzeTicket(request);
      try { auditTrail.record({ tool: 'optidev_implementation_guide', timestamp: new Date().toISOString(), promptLength: request?.userPrompt?.length, success: true }); } catch {}
      stop();
      
      return {
        status: 'success',
        data: response
      };
    } catch (error) {
      try { this.monitoring.recordPerformance({ operation: 'tool:optidev_implementation_guide', duration: 0, success: false }); } catch {}
      this.logger.error('Implementation guide analysis failed', error as Error);
      try { auditTrail.record({ tool: 'optidev_implementation_guide', timestamp: new Date().toISOString(), success: false }); } catch {}
      throw error;
    }
  }

  private async handleDebugHelper(request: any): Promise<any> {
    try {
      const stop = this.monitoring.startTimer('tool:optidev_debug_helper');
      this.logger.debug('Processing debug helper request');
      const response = await this.debugHelperTool.analyzeBug(request);
      try { auditTrail.record({ tool: 'optidev_debug_helper', timestamp: new Date().toISOString(), promptLength: request?.userPrompt?.length, success: true }); } catch {}
      stop();
      
      return {
        status: 'success',
        data: response
      };
    } catch (error) {
      try { this.monitoring.recordPerformance({ operation: 'tool:optidev_debug_helper', duration: 0, success: false }); } catch {}
      this.logger.error('Debug helper analysis failed', error as Error);
      try { auditTrail.record({ tool: 'optidev_debug_helper', timestamp: new Date().toISOString(), success: false }); } catch {}
      throw error;
    }
  }

  private async handleCodeAnalyzer(request: any): Promise<any> {
    try {
      const stop = this.monitoring.startTimer('tool:optidev_code_analyzer');
      this.logger.debug('Processing code analyzer request');
      const response = await this.codeAnalyzerTool.analyzeCode(request);
      try { auditTrail.record({ tool: 'optidev_code_analyzer', timestamp: new Date().toISOString(), promptLength: request?.userPrompt?.length, products: response.detectedProducts, success: true }); } catch {}
      stop();
      
      return {
        status: 'success',
        data: response
      };
    } catch (error) {
      try { this.monitoring.recordPerformance({ operation: 'tool:optidev_code_analyzer', duration: 0, success: false }); } catch {}
      this.logger.error('Code analyzer analysis failed', error as Error);
      try { auditTrail.record({ tool: 'optidev_code_analyzer', timestamp: new Date().toISOString(), success: false }); } catch {}
      throw error;
    }
  }

  private async handleProjectHelper(request: any): Promise<any> {
    try {
      const stop = this.monitoring.startTimer('tool:optidev_project_helper');
      this.logger.debug('Processing project helper request');
      const response = await this.projectHelperTool.provideAssistance(request);
      try { auditTrail.record({ tool: 'optidev_project_helper', timestamp: new Date().toISOString(), promptLength: request?.userPrompt?.length, success: true }); } catch {}
      stop();
      
      return {
        status: 'success',
        data: response
      };
    } catch (error) {
      try { this.monitoring.recordPerformance({ operation: 'tool:optidev_project_helper', duration: 0, success: false }); } catch {}
      this.logger.error('Project helper analysis failed', error as Error);
      try { auditTrail.record({ tool: 'optidev_project_helper', timestamp: new Date().toISOString(), success: false }); } catch {}
      throw error;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing Optivise MCP Server...');

      // 1. Initialize the context analyzer (now handles AI async)
      // await this.contextAnalyzer.initialize();

      // 2. Initialize all specialized tools
      // await this.initializeTools();

      // 3. Start documentation sync service
      // documentationSyncService.startAutoSync();
      
      this.isInitialized = true;
      if (process.env.OPTIDEV_DEBUG === 'true') {
        this.logger.info('Optivise MCP Server initialization completed', {
          aiEnabled: this.aiEnabled,
          features: {
            contextAnalysis: true,
            vectorSearch: this.aiEnabled,
            documentationSync: true,
            multipleTools: true
          }
        });
      }

      // 4. Initialize AI services asynchronously (non-blocking)
      this.initializeAIServicesAsync();

    } catch (error) {
      this.logger.error('Failed to initialize MCP Server', error as Error);
      throw error;
    }
  }

  /**
   * Initialize AI services asynchronously without blocking MCP startup
   */
  private initializeAIServicesAsync(): void {
    this.initializeAIServices().catch((error) => {
      this.logger.debug('AI services initialization completed with fallback to basic mode');
    });
  }

  private async initializeTools(): Promise<void> {
    try {
      await Promise.all([
        this.implementationGuideTool.initialize(),
        this.debugHelperTool.initialize(),
        this.codeAnalyzerTool.initialize(),
        this.projectHelperTool.initialize()
      ]);
      
      this.logger.info('All specialized tools initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize specialized tools', error as Error);
      throw error;
    }
  }

  private async initializeAIServices(): Promise<void> {
    try {
      // Try to initialize OpenAI client with auto-detected keys
      const openAIInitialized = await openAIClient.initialize();
      
      if (openAIInitialized) {
        if (process.env.OPTIDEV_DEBUG === 'true') {
          this.logger.info('OpenAI client initialized successfully');
        }
        
        // Initialize ChromaDB if OpenAI is available
        const chromaInitialized = await chromaDBService.initialize();
        
        if (chromaInitialized) {
          if (process.env.OPTIDEV_DEBUG === 'true') {
            this.logger.info('ChromaDB service initialized successfully');
          }
          this.aiEnabled = true;
        } else {
          if (process.env.OPTIDEV_DEBUG === 'true') {
            this.logger.warn('ChromaDB initialization failed - vector search disabled');
          }
        }
      } else {
        if (process.env.OPTIDEV_DEBUG === 'true') {
          this.logger.warn('OpenAI client initialization failed - AI features disabled');
          this.logger.info('Basic features will work without AI. To enable AI features:');
          this.logger.info('1. Set OPENAI_API_KEY environment variable, or');
          this.logger.info('2. Configure API key in your IDE (Cursor, VSCode)');
        }
      }

      // Log API key detection results only in debug mode
      if (process.env.OPTIDEV_DEBUG === 'true') {
        const detection = await this.keyDetector.detectAPIKeys();
        this.logger.info('API Key Detection Results', {
          hasOpenAI: detection.hasOpenAI,
          hasAnthropic: detection.hasAnthropic,
          foundSources: detection.found.map(s => ({ source: s.source, type: s.type, valid: s.isValid }))
        });
      }

    } catch (error) {
      this.logger.error('AI services initialization failed', error as Error);
      // Continue without AI features
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      this.logger.debug('Starting server initialization...');
      await this.initialize();
      this.logger.debug('Server initialization completed');
    }

    this.logger.debug('Creating stdio transport...');
    const transport = new StdioServerTransport();
    this.logger.debug('Connecting to transport...');
    await this.server.connect(transport);
    
    if (process.env.OPTIDEV_DEBUG === 'true') {
      this.logger.info('Optivise MCP Server started and connected');
    }
    
    // The MCP SDK handles stdin, no need to resume it manually
  }

  async stop(): Promise<void> {
    try {
      // Stop MCP server transport
      await this.server.close();
      // Stop background services and analyzers
      await this.contextAnalyzer.shutdown?.();
      // Stop documentation sync if running
      documentationSyncService.stopAutoSync?.();
      // Cleanup AI clients
      openAIClient.cleanup?.();
      await chromaDBService.cleanup?.();
      this.logger.info('Optivise MCP Server stopped');
    } catch (error) {
      this.logger.error('Error stopping MCP Server', error as Error);
      throw error;
    }
  }

  getHealthStatus() {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      version: '5.1.2',
      uptime: process.uptime(),
      features: {
        contextAnalysis: true,
        productDetection: true,
        aiIntegration: this.aiEnabled,
        aiEnhancedAnalysis: this.contextAnalyzer.isAIEnabled(),
        vectorSearch: this.aiEnabled && chromaDBService.isAvailable(),
        documentationSync: documentationSyncService.getSyncStatus().autoSyncEnabled,
        multipleTools: true,
        apiKeyDetection: true,
        realTimeAnalysis: true
      },
      services: {
        openAI: openAIClient.isAvailable(),
        chromaDB: chromaDBService.isAvailable(),
        documentationSync: !documentationSyncService.getSyncStatus().inProgress
      },
      stats: this.aiEnabled ? {
        openAI: openAIClient.getUsageStats(),
        chromaDB: chromaDBService.isAvailable() ? 'connected' : 'disconnected',
        lastDocSync: documentationSyncService.getSyncStatus().lastSyncTime
      } : undefined,
      timestamp: new Date()
    } as const;
  }
}