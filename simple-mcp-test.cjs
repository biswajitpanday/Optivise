#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

async function main() {
  console.error('Starting simple MCP test server...');
  
  const server = new Server(
    {
      name: 'test-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  console.error('Server created, connecting...');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Server connected and ready');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});