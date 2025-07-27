#!/usr/bin/env node

/**
 * OptiDevDoc - Simple MCP Server Fallback
 * When TypeScript compilation or tsx execution fails, this provides basic MCP functionality
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

console.error('🚀 OptiDevDoc Simple MCP Server v2.1.6');
console.error('📋 Fallback mode with basic tools');

const server = new Server(
  {
    name: 'optidevdoc-simple',
    version: '2.1.6',
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ OptiDevDoc Simple MCP Server connected and ready!');
}

main().catch((error) => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
}); 