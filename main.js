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

const VERSION = '2.1.7';
const PORT = process.env.PORT || 3000;
const IS_RENDER = process.env.RENDER === 'true';

console.error(`🚀 OptiDevDoc Simple MCP Server v${VERSION}`);
console.error('📋 Fallback mode with basic tools');

// Create MCP server instance
const server = new Server(
  {
    name: 'optidevdoc-simple',
    version: VERSION,
  },
  {
    capabilities: {
      tools: {
        'search-optimizely-docs': true,
        'find-optimizely-pattern': true,
        'analyze-optimizely-bug': true
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
      }
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
                    `📋 **Fallback Mode**: Enhanced search is available when tsx execution works.\n\n` +
                    `**Common Optimizely ${args.product || 'all'} Resources:**\n\n` +
                    `• **Documentation**: https://docs.optimizely.com/\n` +
                    `• **Developer Portal**: https://developer.optimizely.com/\n` +
                    `• **Community**: https://support.optimizely.com/hc/en-us/community/topics\n` +
                    `• **GitHub**: https://github.com/optimizely\n\n` +
                    `**💡 Tip**: For enhanced search with full pattern matching, ensure TypeScript compilation is working.`
            }
          ],
        };

      case 'find-optimizely-pattern':
        return {
          content: [
            {
              type: 'text',
              text: `🔍 **Pattern Search for: "${args.scenario}"**\n\n` +
                    `📋 **Fallback Mode**: Enhanced pattern analysis is available when tsx execution works.\n\n` +
                    `**General Optimizely Patterns:**\n\n` +
                    `• **Handlers**: Extend base handlers and override methods\n` +
                    `• **Pipelines**: Use dependency injection and chain patterns\n` +
                    `• **Services**: Follow repository pattern with interfaces\n` +
                    `• **Best Practices**: Use configuration over hardcoding\n\n` +
                    `**💡 Tip**: For detailed pattern analysis with code examples, ensure TypeScript compilation is working.`
            }
          ],
        };

      case 'analyze-optimizely-bug':
        return {
          content: [
            {
              type: 'text',
              text: `🐛 **Bug Analysis for: "${args.bugDescription}"**\n\n` +
                    `📋 **Fallback Mode**: Enhanced bug analysis is available when tsx execution works.\n\n` +
                    `**General Troubleshooting Steps:**\n\n` +
                    `1. **Check Logs**: Review application and IIS logs\n` +
                    `2. **Configuration**: Verify web.config and appsettings\n` +
                    `3. **Dependencies**: Ensure all NuGet packages are updated\n` +
                    `4. **Cache**: Clear application and browser cache\n` +
                    `5. **Database**: Check connection strings and permissions\n\n` +
                    `**💡 Tip**: For detailed bug analysis with specific solutions, ensure TypeScript compilation is working.`
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
          text: `❌ **Error**: ${error.message}\n\nThis is the fallback MCP server. For full functionality, please fix the TypeScript compilation issues.`
        }
      ],
      isError: true,
    };
  }
});

// Create Express app for HTTP server mode
const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: VERSION });
});

// Start the appropriate server
async function main() {
  if (IS_RENDER) {
    // HTTP server mode for Render deployment
    const httpServer = app.listen(PORT, () => {
      console.error(`✅ OptiDevDoc HTTP Server listening on port ${PORT}`);
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
    console.error('✅ OptiDevDoc Simple MCP Server connected and ready!');
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

main().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}); 