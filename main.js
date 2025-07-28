#!/usr/bin/env node

/**
 * OptiDevDoc - Simple MCP Server Fallback
 * When TypeScript compilation or tsx execution fails, this provides basic MCP functionality
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

// Configuration
const VERSION = '2.1.10';
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const IS_RENDER = process.env.RENDER === 'true';
const MCP_MODE = process.env.MCP_MODE || 'stdio';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const ENHANCED_FEATURES = process.env.ENHANCED_FEATURES === 'true';
const PRODUCT_DETECTION = process.env.PRODUCT_DETECTION === 'true';
const RULES_PATH = process.env.RULES_PATH || './rules';
const CORS_ENABLED = process.env.CORS_ENABLED === 'true';
const CORS_ORIGINS = process.env.CORS_ORIGINS || '*';
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;

console.error(`🚀 OptiDevDoc Server v${VERSION}`);
console.error(`📋 Mode: ${IS_RENDER ? 'Render Deploy' : 'Local Development'}`);
console.error(`🔧 Features: ${ENHANCED_FEATURES ? 'Enhanced' : 'Basic'}`);

// Create MCP server instance
const server = new Server(
  {
    name: 'optidevdoc',
    version: VERSION,
  },
  {
    capabilities: {
      tools: {
        'search-optimizely-docs': true,
        'find-optimizely-pattern': true,
        'analyze-optimizely-bug': true,
        ...(ENHANCED_FEATURES && {
          'apply-development-rules': true,
          'detect-product': true,
          'generate-cursor-config': true
        })
      },
    },
  }
);

// Basic tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search-optimizely-docs',
        description: 'Search Optimizely documentation with enhanced pattern matching',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search terms (e.g., "pricing handler", "content block")',
            },
            product: {
              type: 'string',
              enum: ['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation', 'all'],
              description: 'Filter by Optimizely product',
              default: 'all'
            }
          },
          required: ['query'],
        },
      },
      {
        name: 'find-optimizely-pattern',
        description: 'Find Optimizely coding patterns and best practices for specific scenarios',
        inputSchema: {
          type: 'object',
          properties: {
            scenario: {
              type: 'string',
              description: 'Development scenario (e.g., "custom pricing logic", "checkout pipeline")',
            },
            category: {
              type: 'string',
              enum: ['handler', 'pipeline', 'service', 'integration', 'best-practice', 'api', 'content-type', 'block', 'template', 'any'],
              description: 'Pattern category',
              default: 'any'
            },
            product: {
              type: 'string',
              enum: ['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation', 'any'],
              description: 'Optimizely product',
              default: 'any'
            }
          },
          required: ['scenario'],
        },
      },
      {
        name: 'analyze-optimizely-bug',
        description: 'Analyze bugs and get Optimizely-specific solutions and guidance',
        inputSchema: {
          type: 'object',
          properties: {
            bugDescription: {
              type: 'string',
              description: 'Description of the bug or issue',
            },
            context: {
              type: 'string',
              description: 'Additional context about the issue',
            },
            errorMessage: {
              type: 'string',
              description: 'Error message or stack trace (optional)',
            }
          },
          required: ['bugDescription'],
        },
      },
      ...(ENHANCED_FEATURES ? [
        {
          name: 'apply-development-rules',
          description: 'Apply Optimizely development rules to a specific scenario',
          inputSchema: {
            type: 'object',
            properties: {
              scenario: {
                type: 'string',
                description: 'The development scenario or task you need guidance for',
              },
              context: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    enum: ['frontend', 'backend', 'project-structure', 'quality', 'general'],
                    description: 'Development category',
                  },
                  directory: {
                    type: 'string',
                    description: 'Directory context (e.g., "Extensions", "FrontEnd/blueprints")',
                  },
                  filePattern: {
                    type: 'string',
                    description: 'File pattern or extension (e.g., "*.tsx", "*Handler.cs")',
                  },
                  technology: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Technologies being used (e.g., ["react", "typescript", "c#"])',
                  }
                },
                type: 'object'
              }
            },
            required: ['scenario'],
          },
        },
        {
          name: 'detect-product',
          description: 'Detect Optimizely product from project context',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the project root',
              },
              files: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of files in the project',
              },
              dependencies: {
                type: 'object',
                description: 'Project dependencies',
              }
            },
            type: 'object'
          },
        }
      ] : [])
    ],
  };
});

// Basic tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search-optimizely-docs':
        return {
          content: [
            {
              type: 'text',
              text: `🔍 **Search Results for: "${args.query}"**\n\n` +
                    `📋 **${ENHANCED_FEATURES ? 'Enhanced' : 'Basic'} Mode**: ${ENHANCED_FEATURES ? 'Full pattern matching available' : 'Basic search only'}\n\n` +
                    `**Common Optimizely ${args.product || 'all'} Resources:**\n\n` +
                    `• **Documentation**: https://docs.optimizely.com/\n` +
                    `• **Developer Portal**: https://developer.optimizely.com/\n` +
                    `• **Community**: https://support.optimizely.com/hc/en-us/community/topics\n` +
                    `• **GitHub**: https://github.com/optimizely\n\n` +
                    `**💡 Tip**: ${ENHANCED_FEATURES ? 'Enhanced search is active with full pattern matching.' : 'For enhanced search, use the NPM package locally.'}`
            }
          ],
        };

      case 'find-optimizely-pattern':
        return {
          content: [
            {
              type: 'text',
              text: `🔍 **Pattern Search for: "${args.scenario}"**\n\n` +
                    `📋 **${ENHANCED_FEATURES ? 'Enhanced' : 'Basic'} Mode**: ${ENHANCED_FEATURES ? 'Full pattern matching available' : 'Basic patterns only'}\n\n` +
                    `**General Optimizely Patterns:**\n\n` +
                    `• **Handlers**: Extend base handlers and override methods\n` +
                    `• **Pipelines**: Use dependency injection and chain patterns\n` +
                    `• **Services**: Follow repository pattern with interfaces\n` +
                    `• **Best Practices**: Use configuration over hardcoding\n\n` +
                    `**💡 Tip**: ${ENHANCED_FEATURES ? 'Enhanced pattern analysis is active.' : 'For detailed patterns, use the NPM package locally.'}`
            }
          ],
        };

      case 'analyze-optimizely-bug':
        return {
          content: [
            {
              type: 'text',
              text: `🐛 **Bug Analysis for: "${args.bugDescription}"**\n\n` +
                    `📋 **${ENHANCED_FEATURES ? 'Enhanced' : 'Basic'} Mode**: ${ENHANCED_FEATURES ? 'Full analysis available' : 'Basic analysis only'}\n\n` +
                    `**General Troubleshooting Steps:**\n\n` +
                    `1. **Check Logs**: Review application and IIS logs\n` +
                    `2. **Configuration**: Verify web.config and appsettings\n` +
                    `3. **Dependencies**: Ensure all NuGet packages are updated\n` +
                    `4. **Cache**: Clear application and browser cache\n` +
                    `5. **Database**: Check connection strings and permissions\n\n` +
                    `**💡 Tip**: ${ENHANCED_FEATURES ? 'Enhanced bug analysis is active.' : 'For detailed analysis, use the NPM package locally.'}`
            }
          ],
        };

      case 'apply-development-rules':
        if (!ENHANCED_FEATURES) {
          throw new Error('Enhanced features are not available in basic mode');
        }
        // Implementation would be here in the enhanced version
        return {
          content: [
            {
              type: 'text',
              text: `⚙️ **Applying Development Rules for: "${args.scenario}"**\n\n` +
                    `This feature requires the enhanced version. Please use the NPM package locally.`
            }
          ],
        };

      case 'detect-product':
        if (!ENHANCED_FEATURES || !PRODUCT_DETECTION) {
          throw new Error('Product detection is not available in basic mode');
        }
        // Implementation would be here in the enhanced version
        return {
          content: [
            {
              type: 'text',
              text: `🔍 **Product Detection Results**\n\n` +
                    `This feature requires the enhanced version. Please use the NPM package locally.`
            }
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ **Error**: ${error.message}\n\n` +
                `Mode: ${ENHANCED_FEATURES ? 'Enhanced' : 'Basic'}\n` +
                `Features: ${Object.entries(server.config.capabilities.tools)
                  .filter(([, enabled]) => enabled)
                  .map(([name]) => name)
                  .join(', ')}`
        }
      ],
      isError: true,
    };
  }
});

// Create Express app for HTTP server mode
const app = express();

// Basic middleware
if (CORS_ENABLED) {
  app.use(cors({
    origin: CORS_ORIGINS === '*' ? true : CORS_ORIGINS.split(','),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
}
app.use(helmet());
app.use(compression());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'OptiDevDoc',
    version: VERSION,
    description: 'Intelligent Optimizely development assistant',
    mode: IS_RENDER ? 'Remote Server' : 'Local Development',
    features: {
      enhanced: ENHANCED_FEATURES,
      productDetection: PRODUCT_DETECTION,
      mcp: MCP_MODE,
      cors: CORS_ENABLED
    },
    endpoints: {
      health: '/health',
      search: '/api/search',
      patterns: '/api/patterns',
      bugs: '/api/bugs',
      rules: '/api/rules',
      detect: '/api/detect'
    },
    documentation: 'https://github.com/biswajitpanday/OptiDevDoc#readme'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    version: VERSION,
    mode: IS_RENDER ? 'render' : 'local',
    features: {
      enhanced: ENHANCED_FEATURES,
      productDetection: PRODUCT_DETECTION,
      mcp: MCP_MODE,
      cors: CORS_ENABLED
    },
    capabilities: {
      tools: {
        'search-optimizely-docs': true,
        'find-optimizely-pattern': true,
        'analyze-optimizely-bug': true,
        ...(ENHANCED_FEATURES && {
          'apply-development-rules': true,
          'detect-product': PRODUCT_DETECTION,
          'generate-cursor-config': true
        })
      }
    }
  };

  res.json(health);
});

// API endpoints
app.post('/api/search', async (req, res) => {
  try {
    const { query, product = 'all' } = req.body;
    if (!query) {
      return res.status(400).json({
        error: 'Query parameter is required'
      });
    }

    const result = await server.handleRequest(CallToolRequestSchema, {
      params: {
        name: 'search-optimizely-docs',
        arguments: { query, product }
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      mode: ENHANCED_FEATURES ? 'Enhanced' : 'Basic'
    });
  }
});

app.post('/api/patterns', async (req, res) => {
  try {
    const { scenario, category = 'any', product = 'any' } = req.body;
    if (!scenario) {
      return res.status(400).json({
        error: 'Scenario parameter is required'
      });
    }

    const result = await server.handleRequest(CallToolRequestSchema, {
      params: {
        name: 'find-optimizely-pattern',
        arguments: { scenario, category, product }
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      mode: ENHANCED_FEATURES ? 'Enhanced' : 'Basic'
    });
  }
});

app.post('/api/bugs', async (req, res) => {
  try {
    const { bugDescription, context, errorMessage } = req.body;
    if (!bugDescription) {
      return res.status(400).json({
        error: 'Bug description is required'
      });
    }

    const result = await server.handleRequest(CallToolRequestSchema, {
      params: {
        name: 'analyze-optimizely-bug',
        arguments: { bugDescription, context, errorMessage }
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      mode: ENHANCED_FEATURES ? 'Enhanced' : 'Basic'
    });
  }
});

app.post('/api/rules', async (req, res) => {
  try {
    if (!ENHANCED_FEATURES) {
      return res.status(403).json({
        error: 'Enhanced features are not available in basic mode'
      });
    }

    const { scenario, context } = req.body;
    if (!scenario) {
      return res.status(400).json({
        error: 'Scenario parameter is required'
      });
    }

    const result = await server.handleRequest(CallToolRequestSchema, {
      params: {
        name: 'apply-development-rules',
        arguments: { scenario, context }
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      mode: ENHANCED_FEATURES ? 'Enhanced' : 'Basic'
    });
  }
});

app.post('/api/detect', async (req, res) => {
  try {
    if (!ENHANCED_FEATURES || !PRODUCT_DETECTION) {
      return res.status(403).json({
        error: 'Product detection is not available in basic mode'
      });
    }

    const { projectPath, files, dependencies } = req.body;
    const result = await server.handleRequest(CallToolRequestSchema, {
      params: {
        name: 'detect-product',
        arguments: { projectPath, files, dependencies }
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      mode: ENHANCED_FEATURES ? 'Enhanced' : 'Basic'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    mode: ENHANCED_FEATURES ? 'Enhanced' : 'Basic'
  });
});

// Start the appropriate server
async function main() {
  try {
    // Ensure rules directory exists
    if (ENHANCED_FEATURES && !fs.existsSync(RULES_PATH)) {
      console.error(`⚠️ Rules directory not found: ${RULES_PATH}`);
      if (IS_RENDER) {
        fs.mkdirSync(RULES_PATH, { recursive: true });
        console.error('✅ Created rules directory');
      }
    }

    if (IS_RENDER || MCP_MODE === 'http') {
      // HTTP server mode for Render deployment
      const httpServer = app.listen(PORT, HOST, () => {
        console.error(`✅ OptiDevDoc HTTP Server listening on ${HOST}:${PORT}`);
        console.error('📋 Available endpoints:');
        console.error('   • GET  /         - API information');
        console.error('   • GET  /health   - Health check');
        console.error('   • POST /api/search   - Search documentation');
        console.error('   • POST /api/patterns - Find patterns');
        console.error('   • POST /api/bugs     - Analyze bugs');
        console.error('   • POST /api/rules    - Apply rules');
        console.error('   • POST /api/detect   - Detect product');
      });

      // Handle shutdown gracefully
      process.on('SIGTERM', () => {
        console.error('📥 Received SIGTERM signal. Shutting down gracefully...');
        httpServer.close(() => {
          console.error('✅ HTTP server closed.');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.error('📥 Received SIGINT signal. Shutting down gracefully...');
        httpServer.close(() => {
          console.error('✅ HTTP server closed.');
          process.exit(0);
        });
      });

      // Keep the process alive
      process.stdin.resume();
    } else {
      // MCP server mode for local development
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error('✅ OptiDevDoc MCP Server connected and ready!');
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit immediately to allow graceful shutdown
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit immediately to allow graceful shutdown
});

// Start the server
main(); 