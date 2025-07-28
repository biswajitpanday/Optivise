#!/usr/bin/env node

/**
 * OptiDevDoc Enhanced Remote MCP Client v2.0
 * 
 * This enhanced version includes:
 * - Original documentation search
 * - Pattern analysis for Optimizely development scenarios
 * - Bug analysis with Optimizely-specific solutions
 * - Rule and guideline extraction
 */

const https = require('https');
const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuration from environment variables
const REMOTE_SERVER = process.env.REMOTE_SERVER || 'https://optidevdoc.onrender.com';
const CLIENT_VERSION = process.env.OPTIDEVDOC_VERSION || '2.1.13';
const PROTOCOL_VERSION = process.env.PROTOCOL_VERSION || '2025-07-27';

// Debug mode control
const DEBUG_MODE = process.env.OPTIDEVDOC_DEBUG === 'true';

// Feature flags
const ENABLE_PRODUCT_DETECTION = process.env.ENABLE_PRODUCT_DETECTION === 'true';
const ENABLE_ENHANCED_RULES = process.env.ENABLE_ENHANCED_RULES === 'true';
const ENABLE_CORS = process.env.ENABLE_CORS === 'true';

// State management
let isInitialized = false;

// Suppress startup messages in production mode
if (!DEBUG_MODE) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Only show critical errors, suppress routine messages
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('🚀') || args[0].includes('📡') || args[0].includes('✅'))) {
      originalConsoleError(...args);
    }
  };
}

console.error(`🚀 OptiDevDoc Enhanced Remote Client v${CLIENT_VERSION}`);
console.error(`📡 Connecting to: ${REMOTE_SERVER}`);
console.error(`✨ Features: Documentation Search, Pattern Analysis, Bug Analysis`);

// Setup readline interface for JSON-RPC communication
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

/**
 * Send JSON-RPC response
 */
function sendResponse(response) {
  console.log(JSON.stringify(response));
  if (DEBUG_MODE) {
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
  if (DEBUG_MODE) {
    console.error('❌ Error sent:', JSON.stringify(error, null, 2));
  }
}

/**
 * Make HTTP request to remote server
 */
function makeRequest(path, method = 'POST', data = null, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, REMOTE_SERVER);
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `OptiDevDoc-Enhanced-MCP-Client/${CLIENT_VERSION}`,
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
      },
      timeout
    };

    if (DEBUG_MODE) {
      console.error(`📡 Making ${method} request to: ${url.href}`);
      if (postData) {
        console.error('📤 Request data:', postData);
      }
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (DEBUG_MODE) {
            console.error('📥 Response received:', JSON.stringify(result, null, 2).substring(0, 500) + '...');
          }
          resolve(result);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
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
    const request = JSON.parse(line.trim());
    
    if (DEBUG_MODE) {
      console.error('📥 Request received:', JSON.stringify(request, null, 2));
    }

    switch (request.method) {
      case 'initialize':
        // Get server capabilities first
        try {
          const health = await makeRequest('/health', 'GET');
          const capabilities = {
            tools: {
              'search-optimizely-docs': true,
              'find-optimizely-pattern': true,
              'analyze-optimizely-bug': true,
              'apply-development-rules': health.features?.enhanced || false,
              'detect-product': health.features?.productDetection || false,
              'generate-cursor-config': health.features?.enhanced || false
            },
            logging: {},
            prompts: {},
            resources: {}
          };

          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities,
              serverInfo: {
                name: 'optidevdoc-remote',
                version: health.version || CLIENT_VERSION
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
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {
                tools: {
                  'search-optimizely-docs': true,
                  'find-optimizely-pattern': true,
                  'analyze-optimizely-bug': true
                },
                logging: {},
                prompts: {},
                resources: {}
              },
              serverInfo: {
                name: 'optidevdoc-remote',
                version: CLIENT_VERSION
              }
            }
          });
        }
        break;

      case 'initialized':
        isInitialized = true;
        if (DEBUG_MODE) {
          console.error('✅ Enhanced MCP Client initialized successfully');
        }
        break;

      case 'ping':
        sendResponse({ 
          jsonrpc: '2.0', 
          id: request.id, 
          result: { 
            status: 'healthy',
            version: CLIENT_VERSION,
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
                name: 'apply_development_rules',
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
                name: 'generate_cursor_config',
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
                name: 'search_optimizely_docs',
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
                      enum: ['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation', 'all']
                    }
                  },
                  required: ['query']
                }
              },
              {
                name: 'find_optimizely_pattern',
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
                      enum: ['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation', 'any'],
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
                name: 'analyze_optimizely_bug',
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
                      enum: ['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation', 'auto-detect'],
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
            case 'apply_development_rules':
              result = await makeRequest('/api/apply-rules', 'POST', toolArgs);
              contentType = 'rules';
              break;

            case 'generate_cursor_config':
              result = await makeRequest('/api/generate-config', 'POST', toolArgs);
              contentType = 'config';
              break;

            case 'search_optimizely_docs':
              result = await makeRequest('/api/search', 'POST', toolArgs);
              contentType = 'search';
              break;

            case 'find_optimizely_pattern':
              result = await makeRequest('/api/patterns', 'POST', toolArgs);
              contentType = 'pattern';
              break;

            case 'analyze_optimizely_bug':
              result = await makeRequest('/api/analyze-bug', 'POST', toolArgs);
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
  if (DEBUG_MODE) {
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

if (DEBUG_MODE) {
  console.error('🎯 Enhanced MCP Client ready for requests');
  console.error('📋 Available tools: search_optimizely_docs, find_optimizely_pattern, analyze_optimizely_bug');
} 