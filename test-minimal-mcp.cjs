#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🧪 Testing Minimal MCP Server Protocol...');

const server = spawn('node', ['minimal-mcp-test.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, OPTIDEV_DEBUG: 'true' }
});

let responses = [];
let errors = [];

server.stdout.on('data', (data) => {
  const text = data.toString();
  console.log('📥 STDOUT:', text.trim());
  responses.push(text);
});

server.stderr.on('data', (data) => {
  const text = data.toString();
  console.log('📥 STDERR:', text.trim());
  errors.push(text);
});

setTimeout(() => {
  console.log('📤 Sending MCP initialization...');
  const initMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "test", version: "1.0.0" }
    }
  };
  
  server.stdin.write(JSON.stringify(initMessage) + '\n');
}, 1000);

setTimeout(() => {
  console.log('\n📊 Minimal MCP Test Results:');
  console.log('Responses received:', responses.length);
  console.log('Has actual MCP response:', responses.some(r => r.includes('"result"')));
  
  if (responses.length > 0) {
    console.log('✅ Minimal MCP server is working!');
    console.log('First response:', responses[0]);
  } else {
    console.log('❌ No responses from minimal server');
  }
  
  server.kill();
  process.exit(0);
}, 3000);