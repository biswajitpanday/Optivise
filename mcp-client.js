#!/usr/bin/env node

/**
 * OptiDevDoc MCP Client
 * Simple bridge to connect Cursor IDE to OptiDevDoc server
 */

const https = require('https');
const readline = require('readline');

console.error('🚀 OptiDevDoc MCP Client Starting...');
console.error('📡 Server: https://optidevdoc.onrender.com');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    
    if (request.method === 'tools/list') {
      // Return available tools
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'search_optimizely_docs',
              description: 'Search Optimizely documentation for code examples and guides',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search query for Optimizely documentation'
                  },
                  product: {
                    type: 'string',
                    description: 'Filter by Optimizely product',
                    enum: ['configured-commerce', 'cms-paas', 'cms-saas', 'experimentation', 'odp']
                  },
                  maxResults: {
                    type: 'number',
                    description: 'Maximum number of results (default: 10)'
                  }
                },
                required: ['query']
              }
            }
          ]
        }
      };
      console.log(JSON.stringify(response));
      
    } else if (request.method === 'tools/call' && request.params.name === 'search_optimizely_docs') {
      // Make API call to OptiDevDoc server
      const searchData = JSON.stringify(request.params.arguments);
      
      const options = {
        hostname: 'optidevdoc.onrender.com',
        port: 443,
        path: '/api/search',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OptiDevDoc-MCP-Client/1.0'
        }
      };

      const apiReq = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const apiResponse = JSON.parse(responseData);
            
            // Format results for display
            let formattedContent = `Found ${apiResponse.total_count || 0} results for "${apiResponse.query}":\n\n`;
            
            if (apiResponse.results && apiResponse.results.length > 0) {
              formattedContent += apiResponse.results.map(doc => {
                return `**${doc.title}**\n\nProduct: ${doc.product}\nURL: ${doc.url}\n\n${doc.content.substring(0, 800)}${doc.content.length > 800 ? '...' : ''}\n\n---\n`;
              }).join('\n');
            } else {
              formattedContent += 'No results found. Try broader search terms like "pricing", "api", or "commerce".';
            }
            
            const response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: formattedContent
                  }
                ]
              }
            };
            
            console.log(JSON.stringify(response));
            
          } catch (parseError) {
            console.error('Parse error:', parseError);
            const errorResponse = {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32603,
                message: 'Failed to parse API response'
              }
            };
            console.log(JSON.stringify(errorResponse));
          }
        });
      });

      apiReq.on('error', (error) => {
        console.error('Request error:', error);
        const errorResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: `API request failed: ${error.message}`
          }
        };
        console.log(JSON.stringify(errorResponse));
      });

      apiReq.write(searchData);
      apiReq.end();
      
    } else {
      // Unsupported method
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
    console.error('JSON parse error:', error);
    // Don't send response for invalid JSON
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.error('\n👋 OptiDevDoc MCP Client shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n👋 OptiDevDoc MCP Client shutting down...');
  process.exit(0);
}); 