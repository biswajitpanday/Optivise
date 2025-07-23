#!/usr/bin/env node

/**
 * Debug MCP Client for OptiDevDoc
 * Simple test to verify MCP protocol works
 */

const readline = require('readline');

console.error('🐛 Debug MCP Client Starting...');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  console.error('📥 Received:', line);
  
  try {
    const request = JSON.parse(line);
    console.error('📋 Parsed request:', JSON.stringify(request, null, 2));
    
    if (request.method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'debug-mcp', version: '1.0.0' }
        }
      };
      console.error('📤 Sending initialize response');
      console.log(JSON.stringify(response));
      
    } else if (request.method === 'initialized') {
      console.error('✅ Initialized notification received');
      
    } else if (request.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [{
            name: 'debug_tool',
            description: 'Simple debug tool',
            inputSchema: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Debug message' }
              },
              required: ['message']
            }
          }]
        }
      };
      console.error('📤 Sending tools list');
      console.log(JSON.stringify(response));
      
    } else if (request.method === 'tools/call') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [{ 
            type: 'text', 
            text: `✅ Debug tool called with: ${JSON.stringify(request.params.arguments)}` 
          }]
        }
      };
      console.error('📤 Sending tool call response');
      console.log(JSON.stringify(response));
      
    } else {
      console.error('❓ Unknown method:', request.method);
    }
    
  } catch (error) {
    console.error('❌ JSON parse error:', error.message);
  }
});

process.on('SIGINT', () => {
  console.error('👋 Debug client shutting down');
  process.exit(0);
});

console.error('🎯 Debug client ready - waiting for input...'); 