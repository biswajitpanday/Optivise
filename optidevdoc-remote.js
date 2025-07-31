#!/usr/bin/env node

/**
 * OptiDevDoc Enhanced Remote MCP Client
 * 
 * This enhanced version includes:
 * - Original documentation search
 * - Pattern analysis for Optimizely development scenarios
 * - Bug analysis with Optimizely-specific solutions
 * - Rule and guideline extraction
 */

const https = require('https');
const readline = require('readline');
// Load package.json for version information
const path = require('path');
const fs = require('fs');
const packageJson = require('./package.json');

// Load environment variables
require('dotenv').config();

// App configuration
const APP_CONFIG = {
  NAME: 'OptiDevDoc',
  VERSION: packageJson.version || '3.1.5',
  DEBUG_MODE: process.env.DEBUG_MCP === 'true',
  PROTOCOL_VERSION: '2025-07-27',
  REMOTE_SERVER: process.env.REMOTE_SERVER || 'https://optidevdoc.onrender.com',
  
  // Tool names
  TOOLS: {
    SEARCH: 'search-optimizely-docs',
    PATTERN: 'find-optimizely-pattern',
    BUG_ANALYSIS: 'analyze-optimizely-bug',
    RULES: 'apply-development-rules',
    CONFIG: 'generate-cursor-config'
  },
  
  // Supported products
  SUPPORTED_PRODUCTS: [
    'configured-commerce',
    'cms-paas',
    'cms-saas',
    'cmp',
    'odp',
    'experimentation',
    'commerce-connect',
    'search-navigation'
  ]
};

// Setup readline interface for JSON-RPC communication
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// In debug mode, show all messages
// In production mode, show important startup messages and errors
if (!APP_CONFIG.DEBUG_MODE) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Show critical errors and important status messages
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('❌') || args[0].includes('🚀') || 
         args[0].includes('📡') || args[0].includes('✅') ||
         args[0].includes('Error') || args[0].includes('error'))) {
      originalConsoleError(...args);
    }
  };
}

console.error(`🚀 ${APP_CONFIG.NAME} Enhanced Remote Client`);
console.error(`📡 Connecting to: ${APP_CONFIG.REMOTE_SERVER}`);
console.error(`✨ Features: Documentation Search, Pattern Analysis, Bug Analysis`);

// State management
let isInitialized = false;

/**
 * Send JSON-RPC response
 */
function sendResponse(response) {
  console.log(JSON.stringify(response));
  if (APP_CONFIG.DEBUG_MODE) {
    console.error('📤 Response sent:', JSON.stringify(response, null, 2));
  }
}

/**
 * Send JSON-RPC error
 */
function sendError(id, code, message, data = undefined) {
  const error = {
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data && { data }) }
  };
  console.log(JSON.stringify(error));
  if (APP_CONFIG.DEBUG_MODE) {
    console.error('❌ Error sent:', JSON.stringify(error, null, 2));
  }
}

/**
 * Make HTTP request to remote server
 */
function makeRequest(path, method = 'POST', data = null, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, APP_CONFIG.REMOTE_SERVER);
    const postData = data ? JSON.stringify(data) : null;
    
    // Log the full URL for debugging
    if (APP_CONFIG.DEBUG_MODE || path === '/health') {
      console.error(`📡 Full URL: ${url.toString()}`);
    }
    
    const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `OptiDevDoc-Enhanced-MCP-Client/${APP_CONFIG.VERSION}`,
      'Origin': 'https://cursor.sh',
      'Accept': 'application/json',
      ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
    },
    timeout
  };

    if (APP_CONFIG.DEBUG_MODE) {
      console.error(`📡 Making ${method} request to: ${url.href}`);
      console.error(`📡 Headers: ${JSON.stringify(options.headers)}`);
      if (postData) {
        console.error('📤 Request data:', postData);
      }
    } else {
      // Always log health check requests for troubleshooting
      if (path === '/health') {
        console.error(`📡 Making ${method} request to: ${url.href}`);
      }
    }

    // Choose the appropriate request module based on protocol
    const requestModule = url.protocol === 'https:' ? https : require('http');
    
    const req = requestModule.request(options, (res) => {
      let responseData = '';
      
      // Log status code for health checks even without debug mode
      if (path === '/health') {
        console.error(`📡 Health check response status: ${res.statusCode}`);
        console.error(`📡 Health check response headers: ${JSON.stringify(res.headers)}`);
      }
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          // Check if response is empty
          if (!responseData || responseData.trim() === '') {
            console.error('Empty response received');
            resolve({});
            return;
          }
          
          const result = JSON.parse(responseData);
          if (APP_CONFIG.DEBUG_MODE) {
            console.error('📥 Response received:', JSON.stringify(result, null, 2).substring(0, 500) + '...');
          } else if (path === '/health') {
            // Always log health response for troubleshooting
            console.error('📥 Health check response:', JSON.stringify(result, null, 2));
          }
          resolve(result);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.error('Raw response:', responseData);
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request Error:', error);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('Request Timeout');
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

/**
 * Format content for better readability
 */
function formatContent(content, type = 'search') {
  switch (type) {
    case 'pattern':
      return content; // Pattern tool already provides good formatting
    case 'bug':
      return content; // Bug analyzer already provides good formatting
    default:
      // Enhanced formatting for search results
      if (content.includes('🔍 Found')) {
        return content; // Already well formatted
      }
      return `📚 **Optimizely Documentation Results**\n\n${content}`;
  }
}

// Handle incoming JSON-RPC requests
rl.on('line', async (line) => {
  try {
    // Skip empty lines
    if (!line || !line.trim()) {
      return;
    }
    
    // Log raw input in debug mode
    if (APP_CONFIG.DEBUG_MODE) {
      console.error('📥 Raw input:', line);
    }
    
    const request = JSON.parse(line.trim());
    
    if (APP_CONFIG.DEBUG_MODE) {
      console.error('📥 Request received:', JSON.stringify(request, null, 2));
    }

    switch (request.method) {
      case 'initialize':
            // Get server capabilities first
    try {
      console.error('🔍 Checking server health and capabilities...');
      const health = await makeRequest('/health', 'GET');
      console.error('✅ Server health check completed');
      
      // Always enable tools in debug mode for testing
      const capabilities = {
        tools: {
          [APP_CONFIG.TOOLS.SEARCH]: true,
          [APP_CONFIG.TOOLS.PATTERN]: true,
          [APP_CONFIG.TOOLS.BUG_ANALYSIS]: true,
          [APP_CONFIG.TOOLS.RULES]: APP_CONFIG.DEBUG_MODE || health.features?.enhanced || false,
          'detect-product': APP_CONFIG.DEBUG_MODE || health.features?.productDetection || false,
          [APP_CONFIG.TOOLS.CONFIG]: APP_CONFIG.DEBUG_MODE || health.features?.enhanced || false
        },
        logging: {},
        prompts: {},
        resources: {}
      };

          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: APP_CONFIG.PROTOCOL_VERSION,
              capabilities,
              serverInfo: {
                name: APP_CONFIG.NAME,
                version: APP_CONFIG.VERSION
              }
            }
          });
        } catch (error) {
          console.error('Failed to get server capabilities:', error);
          // Fallback to basic capabilities
          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: APP_CONFIG.PROTOCOL_VERSION,
              capabilities: {
                tools: {
                  [APP_CONFIG.TOOLS.SEARCH]: true,
                  [APP_CONFIG.TOOLS.PATTERN]: true,
                  [APP_CONFIG.TOOLS.BUG_ANALYSIS]: true
                },
                logging: {},
                prompts: {},
                resources: {}
              },
              serverInfo: {
                name: APP_CONFIG.NAME,
                version: APP_CONFIG.VERSION
              }
            }
          });
        }
        break;

      case 'initialized':
        isInitialized = true;
        if (APP_CONFIG.DEBUG_MODE) {
          console.error('✅ Enhanced MCP Client initialized successfully');
        }
        break;

      case 'ping':
        sendResponse({ 
          jsonrpc: '2.0', 
          id: request.id, 
          result: { 
            status: 'healthy',
            version: APP_CONFIG.VERSION,
            features: ['search', 'patterns', 'bug_analysis']
          } 
        });
        break;

      case 'tools/list':
        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              {
                name: APP_CONFIG.TOOLS.RULES,
                description: 'Apply Optimizely Configured Commerce development rules to a specific scenario for context-aware guidance',
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
                        filePattern: {
                          type: 'string',
                          description: 'File pattern or extension (e.g., "*.tsx", "*Handler.cs")'
                        },
                        directory: {
                          type: 'string',
                          description: 'Directory context (e.g., "Extensions", "FrontEnd/blueprints")'
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
                name: APP_CONFIG.TOOLS.CONFIG,
                description: 'Generate Cursor IDE configuration with integrated Optimizely development rules',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectPath: {
                      type: 'string',
                      description: 'Optional project path for configuration'
                    },
                    includeAllRules: {
                      type: 'boolean',
                      description: 'Whether to include all available rules (default: true)'
                    },
                    categories: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: ['frontend', 'backend', 'project-structure', 'quality', 'general']
                      },
                      description: 'Specific rule categories to include'
                    }
                  },
                  required: []
                }
              },
              {
                name: APP_CONFIG.TOOLS.SEARCH,
                description: 'Search Optimizely documentation with enhanced pattern matching',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { 
                      type: 'string', 
                      description: 'Search terms (e.g., "pricing handler", "content block")' 
                    },
                    product: {
                      type: 'string',
                      description: 'Filter by Optimizely product',
                      enum: [...APP_CONFIG.SUPPORTED_PRODUCTS, 'all']
                    }
                  },
                  required: ['query']
                }
              },
              {
                name: APP_CONFIG.TOOLS.PATTERN,
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
                      description: 'Optimizely product',
                      enum: [...APP_CONFIG.SUPPORTED_PRODUCTS, 'any'],
                      default: 'any'
                    },
                    category: {
                      type: 'string',
                      description: 'Pattern category',
                      enum: ['handler', 'pipeline', 'service', 'integration', 'best-practice', 'api', 'content-type', 'block', 'template', 'any'],
                      default: 'any'
                    },
                    includeCode: {
                      type: 'boolean',
                      description: 'Include code examples',
                      default: true
                    }
                  },
                  required: ['scenario']
                }
              },
              {
                name: APP_CONFIG.TOOLS.BUG_ANALYSIS,
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
                    product: {
                      type: 'string',
                      description: 'Optimizely product (auto-detect if not specified)',
                      enum: [...APP_CONFIG.SUPPORTED_PRODUCTS, 'auto-detect'],
                      default: 'auto-detect'
                    },
                    context: {
                      type: 'string',
                      description: 'Additional context about the issue'
                    }
                  },
                  required: ['bugDescription']
                }
              }
            ]
          }
        });
        break;

      case 'tools/call':
        const toolName = request.params.name;
        const toolArgs = request.params.arguments;

        try {
          let result;
          let contentType = 'search';

          switch (toolName) {
            case APP_CONFIG.TOOLS.RULES:
              result = await makeRequest('/api/rules', 'POST', toolArgs);
              contentType = 'rules';
              break;

            case APP_CONFIG.TOOLS.CONFIG:
              result = await makeRequest('/api/generate-config', 'POST', toolArgs);
              contentType = 'config';
              break;

            case APP_CONFIG.TOOLS.SEARCH:
              result = await makeRequest('/api/search', 'POST', toolArgs);
              contentType = 'search';
              break;

            case APP_CONFIG.TOOLS.PATTERN:
              result = await makeRequest('/api/patterns', 'POST', toolArgs);
              contentType = 'pattern';
              break;

            case APP_CONFIG.TOOLS.BUG_ANALYSIS:
              result = await makeRequest('/api/bugs', 'POST', toolArgs);
              contentType = 'bug';
              break;

            default:
              throw new Error(`Unknown tool: ${toolName}`);
          }

          // Format response based on tool type
          let content;
          if (contentType === 'search') {
            // Handle search results
            if (result.results && result.results.length > 0) {
              content = `🔍 Found ${result.total_count} Optimizely documentation result(s):\n\n`;
              content += result.results.map(doc => 
                `📄 **${doc.title}**\n` +
                `🏷️ Product: ${doc.product}\n` +
                `📂 Category: ${doc.category || 'Documentation'}\n` +
                `🔗 URL: ${doc.url}\n\n` +
                `${doc.content.substring(0, 600)}${doc.content.length > 600 ? '...' : ''}\n\n` +
                (doc.rules && doc.rules.length > 0 ? 
                  `**Key Rules:**\n${doc.rules.slice(0, 3).map(rule => `• ${rule}`).join('\n')}\n\n` : '') +
                `${'='.repeat(60)}\n`
              ).join('\n');
            } else {
              content = `❌ No results found for "${toolArgs.query}". Try terms like:\n`;
              content += '• "pricing handler"\n• "content block"\n• "pipeline pattern"\n• "checkout workflow"';
            }
          } else if (contentType === 'pattern' || contentType === 'bug' || contentType === 'rules' || contentType === 'config') {
            // Use the formatted content from the enhanced tools
            content = result.content?.text || result.content || 'No content available';
          }

          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [{
                type: 'text',
                text: formatContent(content, contentType)
              }]
            }
          });

        } catch (error) {
          console.error(`Tool execution error for ${toolName}:`, error);
          sendError(
            request.id, 
            -32603, 
            `Tool execution failed: ${error.message}`,
            { tool: toolName, args: toolArgs }
          );
        }
        break;

      case 'notifications/initialized':
        isInitialized = true;
        break;

      default:
        sendError(request.id, -32601, `Method not found: ${request.method}`);
        break;
    }
  } catch (error) {
    console.error('JSON parse error:', error.message);
    if (line.trim()) {
      sendError(null, -32700, 'Parse error');
    }
  }
});

// Handle process termination
function handleExit(signal) {
  if (APP_CONFIG.DEBUG_MODE) {
    console.error(`\n🔄 Received ${signal}, cleaning up...`);
  }
  process.exit(0);
}

process.on('SIGINT', () => handleExit('SIGINT'));
process.on('SIGTERM', () => handleExit('SIGTERM'));
process.on('SIGPIPE', () => {
  // Handle broken pipe gracefully
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (APP_CONFIG.DEBUG_MODE) {
  console.error('🎯 Enhanced MCP Client ready for requests');
  console.error(`📋 Available tools: ${Object.values(APP_CONFIG.TOOLS).join(', ')}`);
} 