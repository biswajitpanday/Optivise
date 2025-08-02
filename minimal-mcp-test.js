#!/usr/bin/env node

/**
 * Minimal MCP Server Test
 * Tests basic MCP functionality without complex imports
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

console.error('🔧 Starting minimal MCP server test...');

async function createMinimalMCPServer() {
  console.error('🔧 Creating server...');
  
  const server = new Server(
    { name: 'minimal-test', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  console.error('🔧 Setting up handlers...');
  
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error('🔧 ListTools called');
    return {
      tools: [{
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Test message' }
          },
          required: ['message']
        }
      }]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error('🔧 CallTool called:', request.params.name);
    return {
      content: [{ type: 'text', text: 'Test response' }]
    };
  });

  console.error('🔧 Connecting transport...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('✅ Minimal MCP server started');
}

createMinimalMCPServer().catch(error => {
  console.error('❌ Minimal server failed:', error);
  process.exit(1);
});