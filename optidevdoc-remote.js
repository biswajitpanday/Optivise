#!/usr/bin/env node

/**
 * OptiDevDoc Remote MCP Client
 * Download this single file and use with any MCP-compatible IDE
 * 
 * Usage: Just download this file and reference it in your MCP config
 */

const https = require('https');
const readline = require('readline');

const OPTIDEVDOC_API = 'https://optidevdoc.onrender.com/api/search';

// Suppress startup messages in production mode
if (!process.env.DEBUG_MCP) {
  console.error = () => {}; // Suppress stderr messages
}

console.error('🚀 OptiDevDoc Remote Client v1.1');
console.error('📡 Connecting to: https://optidevdoc.onrender.com');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Track if we're initialized
let isInitialized = false;

function sendResponse(response) {
  console.log(JSON.stringify(response));
}

function sendError(id, code, message) {
  sendResponse({
    jsonrpc: '2.0',
    id: id,
    error: {
      code: code,
      message: message
    }
  });
}

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line.trim());
    
    // Handle MCP protocol methods
    switch (request.method) {
      case 'initialize':
        // MCP initialization
        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              logging: {},
              prompts: {},
              resources: {}
            },
            serverInfo: {
              name: 'optidevdoc-remote',
              version: '1.1.0'
            }
          }
        });
        break;

      case 'initialized':
        // MCP initialized notification - just acknowledge
        isInitialized = true;
        console.error('✅ MCP Client initialized successfully');
        break;

      case 'ping':
        // Handle ping requests
        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          result: {}
        });
        break;

      case 'tools/list':
        // List available tools
        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [{
              name: 'search_optimizely_docs',
              description: 'Search Optimizely documentation remotely',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search terms (e.g., "pricing calculator", "CMS API")'
                  }
                },
                required: ['query']
              }
            }]
          }
        });
        break;

      case 'tools/call':
        if (request.params.name === 'search_optimizely_docs') {
          // Call remote API
          const postData = JSON.stringify(request.params.arguments);

          const options = {
            hostname: 'optidevdoc.onrender.com',
            port: 443,
            path: '/api/search',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'User-Agent': 'OptiDevDoc-MCP-Client/1.1'
            },
            timeout: 10000 // 10 second timeout
          };

          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                const apiResponse = JSON.parse(data);

                let content = `🔍 Found ${apiResponse.total_count || 0} Optimizely documentation results:\n\n`;

                if (apiResponse.results && Object.keys(apiResponse.results).length > 0) {
                  content += Object.values(apiResponse.results).map(doc =>
                    `📄 **${doc.title}**\n` +
                    `🏷️ Product: ${doc.product}\n` +
                    `🔗 URL: ${doc.url}\n\n` +
                    `${doc.content.substring(0, 600)}${doc.content.length > 600 ? '...' : ''}\n\n` +
                    `${'='.repeat(50)}\n`
                  ).join('\n');
                } else {
                  content += '❌ No results found. Try terms like:\n';
                  content += '• "pricing calculator"\n';
                  content += '• "CMS API"\n';
                  content += '• "commerce checkout"\n';
                  content += '• "content delivery"';
                }

                sendResponse({
                  jsonrpc: '2.0',
                  id: request.id,
                  result: {
                    content: [{ 
                      type: 'text', 
                      text: content 
                    }]
                  }
                });

              } catch (error) {
                console.error('API Response Parse Error:', error);
                sendError(request.id, -32603, `Failed to parse response: ${error.message}`);
              }
            });
          });

          req.on('error', (error) => {
            console.error('API Request Error:', error);
            sendError(request.id, -32603, `Remote API error: ${error.message}`);
          });

          req.on('timeout', () => {
            console.error('API Request Timeout');
            req.destroy();
            sendError(request.id, -32603, 'Remote API request timed out');
          });

          req.write(postData);
          req.end();

        } else {
          sendError(request.id, -32601, `Unknown tool: ${request.params.name}`);
        }
        break;

      case 'notifications/initialized':
        // Some MCP clients send this
        isInitialized = true;
        break;

      default:
        // Unknown method
        sendError(request.id, -32601, `Method not found: ${request.method}`);
        break;
    }

  } catch (error) {
    // Invalid JSON or other errors
    console.error('JSON parse error:', error.message);
    if (line.trim()) {
      sendError(null, -32700, 'Parse error');
    }
  }
});

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.error('🔄 OptiDevDoc client shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('🔄 OptiDevDoc client shutting down...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Send a ready signal
console.error('🎯 MCP Client ready for connections'); 