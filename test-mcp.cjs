#!/usr/bin/env node

const { spawn } = require('child_process');

const testMessage = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "cursor",
      version: "1.0.0"
    }
  }
}) + '\n';

console.log('Testing MCP server...');
console.log('Sending:', testMessage.trim());

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let response = '';
let hasResponse = false;

server.stdout.on('data', (data) => {
  response += data.toString();
  const lines = response.split('\n');
  
  for (const line of lines) {
    if (line.trim().startsWith('{"result"') || line.trim().startsWith('{"jsonrpc"')) {
      console.log('✅ MCP Response received:');
      console.log(line.trim());
      hasResponse = true;
      server.kill();
      return;
    }
  }
});

server.stderr.on('data', (data) => {
  // Ignore stderr for this test
});

server.on('exit', () => {
  if (!hasResponse) {
    console.log('❌ No valid MCP response received');
    console.log('Raw output:', response);
  }
  process.exit(hasResponse ? 0 : 1);
});

// Send the test message
server.stdin.write(testMessage);

// Timeout after 10 seconds
setTimeout(() => {
  if (!hasResponse) {
    console.log('❌ Test timed out');
    server.kill();
    process.exit(1);
  }
}, 10000);