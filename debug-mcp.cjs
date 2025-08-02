#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🔍 Testing MCP server response...');

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { 
    ...process.env, 
    OPTIDEV_DEBUG: 'true'  // Enable debug to see what's happening
  }
});

let responses = [];
let errors = [];

server.stdout.on('data', (data) => {
  const text = data.toString();
  console.log('📥 STDOUT:', text);
  responses.push(text);
});

server.stderr.on('data', (data) => {
  const text = data.toString();
  console.log('📥 STDERR:', text);
  errors.push(text);
});

// Send a simple ping to test if server is listening
setTimeout(() => {
  console.log('📤 Sending test message...');
  const msg = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "test", version: "1.0.0" }
    }
  }) + '\n';
  
  server.stdin.write(msg);
}, 1000);

setTimeout(() => {
  console.log('\n📊 Summary:');
  console.log('Responses received:', responses.length);
  console.log('Errors received:', errors.length);
  
  if (responses.length > 0) {
    console.log('✅ Server is responding!');
  } else {
    console.log('❌ Server not responding to messages');
  }
  
  server.kill();
  process.exit(0);
}, 3000);