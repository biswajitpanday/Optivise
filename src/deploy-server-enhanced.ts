#!/usr/bin/env node

/**
 * OptiDevDoc Enhanced Server v2.1.5
 * Production-ready server with product-aware features and graceful fallbacks
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { OptimizelyPatternTool } from './tools/optimizely-pattern-tool.js';
import { OptimizelyBugAnalyzer } from './tools/optimizely-bug-analyzer.js';
import { GetOptimizelyDocsTool } from './tools/get-optimizely-docs.js';
import { Logger } from './utils/logger.js';
import { ConfigManager } from './config/config-manager.js';
import type { ServerConfig } from './types/index.js';

// Initialize configuration
const config: ServerConfig = {
  server: {
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
    timeout: 30000
  },
  logging: {
    level: 'info',
    console: { enabled: true }
  }
};

const logger = new Logger(config.logging);

// Initialize tools
const patternTool = new OptimizelyPatternTool(config, logger);
const bugAnalyzer = new OptimizelyBugAnalyzer(config, logger);
const docsTool = new GetOptimizelyDocsTool(config, logger);

// Create MCP server
const server = new Server(
  {
    name: 'optidevdoc-enhanced',
    version: '2.1.5',
  },
  {
    capabilities: {
      tools: {
        'search-optimizely-docs': true,
        'find-optimizely-pattern': true,
        'analyze-optimizely-bug': true,
        'apply-development-rules': true,
        'generate-cursor-config': true,
        'detect-product': true
      },
    },
  }
);

// Register tools
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
      {
        name: 'apply-development-rules',
        description: 'Apply Optimizely Configured Commerce development rules to a specific scenario',
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
                },
              },
            },
          },
          required: ['scenario'],
        },
      },
      {
        name: 'generate-cursor-config',
        description: 'Generate Cursor IDE configuration with integrated Optimizely development rules',
        inputSchema: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['frontend', 'backend', 'project-structure', 'quality', 'general'],
              },
              description: 'Specific rule categories to include',
            },
            includeAllRules: {
              type: 'boolean',
              description: 'Whether to include all available rules (default: true)',
              default: true,
            },
            projectPath: {
              type: 'string',
              description: 'Optional project path for configuration',
            },
          },
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
            },
          },
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search-optimizely-docs':
        const docsResult = await docsTool.execute(args);
        return {
          content: [
            {
              type: 'text',
              text: docsResult.content || 'No documentation found.',
            },
          ],
        };

      case 'find-optimizely-pattern':
        const patternResult = await patternTool.execute(args);
        return {
          content: [
            {
              type: 'text',
              text: patternResult.content || 'No patterns found.',
            },
          ],
        };

      case 'analyze-optimizely-bug':
        const bugResult = await bugAnalyzer.execute(args);
        return {
          content: [
            {
              type: 'text',
              text: bugResult.content || 'No analysis available.',
            },
          ],
        };

      case 'apply-development-rules':
      case 'generate-cursor-config':
      case 'detect-product':
        // These tools require the enhanced features
        return {
          content: [
            {
              type: 'text',
              text: `🔧 **${name}** - Enhanced Feature\n\n` +
                    `This tool requires the enhanced features enabled via environment variable:\n\n` +
                    `\`\`\`bash\n` +
                    `export OPTIDEVDOC_MULTI_PRODUCT=true\n` +
                    `optidevdoc mcp\n` +
                    `\`\`\`\n\n` +
                    `Please ensure you have the latest version installed:\n` +
                    `\`\`\`bash\n` +
                    `npm install -g optidevdoc@latest\n` +
                    `\`\`\``,
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ **Error**: ${error.message || 'Unknown error occurred'}\n\nPlease try again or check your input.`,
        },
      ],
      isError: true,
    };
  }
});

// Start MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('✅ OptiDevDoc Enhanced MCP Server connected and ready!');
}

main().catch((error) => {
  logger.error('❌ Failed to start MCP server:', error);
  process.exit(1);
}); 