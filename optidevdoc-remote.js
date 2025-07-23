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

console.error('🚀 OptiDevDoc Remote Client v1.0');
console.error('📡 Connecting to: https://optidevdoc.onrender.com');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    
    if (request.method === 'initialize') {
      // MCP initialization
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'optidevdoc-remote',
            version: '1.0.0'
          }
        }
      };
      console.log(JSON.stringify(response));
      
    } else if (request.method === 'initialized') {
      // MCP initialized notification - no response needed
      
    } else if (request.method === 'tools/list') {
      // List available tools
      const response = {
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
      };
      console.log(JSON.stringify(response));
      
    } else if (request.method === 'tools/call' && request.params.name === 'search_optimizely_docs') {
      // Call remote API
      const postData = JSON.stringify(request.params.arguments);
      
      const options = {
        hostname: 'optidevdoc.onrender.com',
        port: 443,
        path: '/api/search',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const apiResponse = JSON.parse(data);
            
            let content = `🔍 Found ${apiResponse.total_count || 0} Optimizely documentation results:\n\n`;
            
            if (apiResponse.results && apiResponse.results.length > 0) {
              content += apiResponse.results.map(doc => 
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
            
            const response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{ type: 'text', text: content }]
              }
            };
            
            console.log(JSON.stringify(response));
            
          } catch (error) {
            const errorResponse = {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32603,
                message: `Failed to parse response: ${error.message}`
              }
            };
            console.log(JSON.stringify(errorResponse));
          }
        });
      });

      req.on('error', (error) => {
        const errorResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: `Remote API error: ${error.message}`
          }
        };
        console.log(JSON.stringify(errorResponse));
      });

      req.write(postData);
      req.end();
      
    } else {
      // Unknown method
      const errorResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`
        }
      };
      console.log(JSON.stringify(errorResponse));
    }
    
  } catch (error) {
    // Invalid JSON - ignore silently
    console.error('JSON parse error:', error.message);
  }
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0)); 