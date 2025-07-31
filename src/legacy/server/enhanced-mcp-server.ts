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
import { DevelopmentRulesTool } from '../tools/development-rules-tool.js'; // Fallback to basic rules
import { OptimizelyPatternTool } from '../tools/optimizely-pattern-tool.js';
import { OptimizelyBugAnalyzer } from '../tools/optimizely-bug-analyzer.js';
import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { Config } from '../config/index.js';
import { DatabaseManager } from '../database/database-manager.js';
import { DocumentationCrawler } from '../engine/documentation-crawler.js';
import type { ServerConfig } from '../types/index.js';

export class EnhancedOptimizelyMCPServer {
  private server: Server;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private config: ServerConfig;
  private resolveOptimizelyIdTool: ResolveOptimizelyIdTool;
  private getOptimizelyDocsTool: GetOptimizelyDocsTool;
  private developmentRulesTool: DevelopmentRulesTool; // Using basic rules as fallback
  private optimizelyPatternTool: OptimizelyPatternTool;
  private optimizelyBugAnalyzer: OptimizelyBugAnalyzer;
  private database: DatabaseManager;
  private crawler: DocumentationCrawler;
  private isInitialized = false;
  private isEnhancedMode = false; // Track if enhanced features are available

  constructor(config?: Partial<ServerConfig>) {
    this.config = Config.getServerConfigObject();
    this.logger = new Logger(this.config.logging);
    this.errorHandler = new ErrorHandler(this.logger);

    // Initialize MCP Server
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
            'detect-product': true,
            'generate-cursor-config': true
          }
        }
      }
    );

    // Initialize database and crawler
    this.database = new DatabaseManager(this.config.database!, this.logger);
    this.crawler = new DocumentationCrawler(this.config.crawler!, this.database, this.logger);

    // Initialize tools - using basic development rules as fallback
    this.resolveOptimizelyIdTool = new ResolveOptimizelyIdTool(this.config, this.logger);
    this.getOptimizelyDocsTool = new GetOptimizelyDocsTool(this.config, this.logger);
    this.developmentRulesTool = new DevelopmentRulesTool(this.config, this.logger);
    this.optimizelyPatternTool = new OptimizelyPatternTool(this.config, this.logger);
    this.optimizelyBugAnalyzer = new OptimizelyBugAnalyzer(this.config, this.logger);

    this.setupToolHandlers();
    this.setupErrorHandling();

    this.logger.info('Enhanced OptiDevDoc MCP Server initialized', { 
      version: Config.getAppConfig().version,
      enhancedMode: this.isEnhancedMode 
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'apply-development-rules',
            description: 'Apply development rules with basic product awareness (Enhanced features coming in v2.1.1)',
            inputSchema: {
              type: 'object',
              properties: {
                scenario: {
                  type: 'string',
                  description: 'The development scenario or task you need guidance for'
                },
                context: {
                  type: 'object',
                  description: 'Optional context to provide more specific rule matching',
                  properties: {
                    directory: {
                      type: 'string',
                      description: 'Directory context (e.g., "Extensions", "FrontEnd/blueprints")'
                    },
                    filePattern: {
                      type: 'string', 
                      description: 'File pattern or extension (e.g., "*.tsx", "*Handler.cs")'
                    },
                    technology: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Technologies being used (e.g., ["react", "typescript", "c#"])'
                    },
                    category: {
                      type: 'string',
                      enum: ['frontend', 'backend', 'project-structure', 'quality', 'general'],
                      description: 'Development category'
                    }
                  }
                },
                includeExamples: {
                  type: 'boolean',
                  description: 'Whether to include code examples (default: true)'
                },
                maxRules: {
                  type: 'number',
                  description: 'Maximum number of rules to return (default: 5)'
                }
              },
              required: ['scenario']
            }
          },
          {
            name: 'detect-product',
            description: 'Analyze project structure to detect Optimizely product (Basic detection - Enhanced coming in v2.1.1)',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to analyze (defaults to current directory)'
                }
              }
            }
          },
          {
            name: 'generate-cursor-config',
            description: 'Generate Cursor IDE configuration with development rules',
            inputSchema: {
              type: 'object',
              properties: {
                categories: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['frontend', 'backend', 'project-structure', 'quality', 'general']
                  },
                  description: 'Specific rule categories to include'
                },
                includeAllRules: {
                  type: 'boolean',
                  description: 'Whether to include all available rules (default: true)'
                },
                projectPath: {
                  type: 'string',
                  description: 'Optional project path for configuration'
                }
              }
            }
          },
          {
            name: 'search-optimizely-docs',
            description: 'Enhanced documentation search with product filtering',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search terms (e.g., "pricing handler", "content block")'
                },
                product: {
                  type: 'string',
                  enum: ['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation', 'all'],
                  description: 'Filter by Optimizely product'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'find-optimizely-pattern',
            description: 'Find Optimizely coding patterns and best practices for specific scenarios',
            inputSchema: {
              type: 'object',
              properties: {
                scenario: {
                  type: 'string',
                  description: 'Development scenario (e.g., "custom pricing logic", "checkout pipeline")'
                },
                product: {
                  type: 'string',
                  enum: ['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation', 'any'],
                  description: 'Optimizely product (default: any)'
                },
                category: {
                  type: 'string',
                  enum: ['handler', 'pipeline', 'service', 'integration', 'best-practice', 'api', 'content-type', 'block', 'template', 'any'],
                  description: 'Pattern category (default: any)'
                },
                includeCode: {
                  type: 'boolean',
                  description: 'Include code examples (default: true)'
                }
              },
              required: ['scenario']
            }
          },
          {
            name: 'analyze-optimizely-bug',
            description: 'Analyze bugs and get Optimizely-specific solutions and guidance',
            inputSchema: {
              type: 'object',
              properties: {
                bugDescription: {
                  type: 'string',
                  description: 'Description of the bug or issue'
                },
                errorMessage: {
                  type: 'string',
                  description: 'Error message or stack trace (optional)'
                },
                context: {
                  type: 'string',
                  description: 'Additional context about the issue'
                },
                product: {
                  type: 'string',
                  enum: ['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation', 'auto-detect'],
                  description: 'Optimizely product (auto-detect if not specified)'
                }
              },
              required: ['bugDescription']
            }
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'apply-development-rules':
            return await this.developmentRulesTool.executeApplyRules(args);
          
          case 'detect-product':
            return await this.handleDetectProduct(args);
          
          case 'generate-cursor-config':
            return await this.developmentRulesTool.executeGenerateCursorConfig(args);
          
          case 'search-optimizely-docs':
            return await this.getOptimizelyDocsTool.execute(args);
          
          case 'find-optimizely-pattern':
            return await this.optimizelyPatternTool.execute(args);
          
          case 'analyze-optimizely-bug':
            return await this.optimizelyBugAnalyzer.execute(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
              } catch (error) {
          return this.errorHandler.handleToolError(error, request.params.name, request.params.arguments || {});
        }
    });
  }

  private async handleDetectProduct(args: any): Promise<{ content: { text: string } }> {
    const projectPath = args?.projectPath || process.cwd();
    
    this.logger.info('Basic product detection requested', { projectPath });
    
    // Basic product detection logic
    const fs = await import('fs');
    const path = await import('path');
    
    const detectedFeatures: string[] = [];
    let detectedProduct = 'unknown';
    
    try {
      // Check for Commerce indicators
      if (fs.existsSync(path.join(projectPath, 'Extensions')) || 
          fs.existsSync(path.join(projectPath, 'InsiteCommerce.Web'))) {
        detectedFeatures.push('🛒 Configured Commerce - Extensions directory found');
        detectedProduct = 'configured-commerce';
      }
      
      if (fs.existsSync(path.join(projectPath, 'FrontEnd/modules/blueprints'))) {
        detectedFeatures.push('🛒 Configured Commerce - Blueprint structure found');
        detectedProduct = 'configured-commerce';
      }
      
      // Check for CMS indicators
      if (fs.existsSync(path.join(projectPath, 'modules')) && 
          fs.existsSync(path.join(projectPath, 'App_Data'))) {
        detectedFeatures.push('📝 CMS - Module structure found');
        detectedProduct = 'cms-paas';
      }
      
      // Check package.json for dependencies
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const allDeps = { ...packageData.dependencies, ...packageData.devDependencies };
        
        if (Object.keys(allDeps).some(dep => dep.includes('insite'))) {
          detectedFeatures.push('🛒 Configured Commerce - Insite dependencies found');
          detectedProduct = 'configured-commerce';
        }
        
        if (Object.keys(allDeps).some(dep => dep.includes('episerver'))) {
          detectedFeatures.push('📝 CMS - Episerver dependencies found');
          detectedProduct = 'cms-paas';
        }
        
        if (Object.keys(allDeps).some(dep => dep.includes('@optimizely/optimizely-sdk'))) {
          detectedFeatures.push('🧪 Experimentation - SDK dependencies found');
          detectedProduct = 'experimentation';
        }
      }
      
    } catch (error) {
      this.logger.error('Error during basic product detection', { error });
    }
    
    const response = `# Product Detection Results (Basic Mode)

## 🔍 Analysis of: ${projectPath}

### Detected Product: ${detectedProduct}

### Features Found:
${detectedFeatures.length > 0 ? detectedFeatures.map(f => `- ${f}`).join('\n') : '- No specific Optimizely product indicators found'}

### Confidence: ${detectedFeatures.length > 0 ? 'Medium' : 'Low'}

---

## 💡 Recommendations

${detectedProduct === 'configured-commerce' ? `
### For Configured Commerce Development:
- Use Commerce-specific development rules
- Focus on Extensions/ directory patterns
- Apply Handler Chain and Pipeline patterns
- Set environment: \`export OPTIMIZELY_PRODUCT=configured-commerce\`
` : ''}

${detectedProduct === 'cms-paas' ? `
### For CMS Development:
- Use CMS-specific content development rules
- Focus on content blocks and templates
- Apply Razor and C# patterns
- Set environment: \`export OPTIMIZELY_PRODUCT=cms-paas\`
` : ''}

${detectedProduct === 'experimentation' ? `
### For Experimentation Development:
- Use Experimentation SDK patterns
- Focus on A/B testing implementation
- Apply feature flag best practices
- Set environment: \`export OPTIMIZELY_PRODUCT=experimentation\`
` : ''}

${detectedProduct === 'unknown' ? `
### General Recommendations:
- Manually specify your product: \`export OPTIMIZELY_PRODUCT=configured-commerce\`
- Check project structure for Optimizely indicators
- Consult Optimizely documentation for your specific product
` : ''}

---

## 🚀 Next Steps
1. Run \`optidevdoc setup\` to configure your IDE
2. Use \`apply-development-rules\` for context-aware guidance
3. Explore product-specific patterns with \`find-optimizely-pattern\`

**Note**: Enhanced product detection with full confidence scoring will be available in v2.1.1`;

    return {
      content: { text: response }
    };
  }

  private setupErrorHandling(): void {
    // Handle server errors
    this.server.onerror = (error) => {
      this.logger.error('Enhanced MCP Server error', { error });
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
      this.logger.warn('Enhanced server already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Enhanced OptiDevDoc MCP Server...');

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
      this.logger.info('Enhanced OptiDevDoc MCP Server initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize enhanced server', { error });
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      this.logger.info('Starting Enhanced OptiDevDoc MCP Server...');

      // Create stdio transport
      const transport = new StdioServerTransport();

      // Connect server to transport
      await this.server.connect(transport);

      this.logger.info('Enhanced OptiDevDoc MCP Server started successfully on stdio transport');
      this.logger.info('Product-aware rules engine is ready to assist with Optimizely development');
    } catch (error) {
      this.logger.error('Failed to start enhanced server', { error });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Enhanced OptiDevDoc MCP Server...');

      // Cleanup tools
      await this.resolveOptimizelyIdTool?.cleanup?.();
      await this.getOptimizelyDocsTool?.cleanup?.();
      // Note: Enhanced tools don't have cleanup methods

      // Close database
      await this.database?.close();

      // Close server
      await this.server.close();

      this.isInitialized = false;
      this.logger.info('Enhanced OptiDevDoc MCP Server shutdown complete');
    } catch (error) {
      this.logger.error('Error during enhanced server shutdown', { error });
      throw error;
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    features: string[];
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
        version: '2.1.0',
        features: [
          'Product-Aware Rules Engine',
          'Automatic Product Detection',
          'Multi-Product Support',
          'Enhanced Documentation Search',
          'Pattern Analysis',
          'Bug Analysis',
          'Cursor IDE Integration'
        ],
      };
    } catch (error) {
      this.logger.error('Enhanced health check failed', { error });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        version: '2.1.0',
        features: [],
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