#!/usr/bin/env node

/**
 * Simple MCP Protocol Test
 * Tests if the Optivise MCP server responds correctly to protocol initialization
 */

const { spawn } = require('child_process');
const path = require('path');

async function testMCPProtocol() {
  console.log('🧪 Testing MCP Protocol Handshake...');
  
  const serverPath = path.join(__dirname, 'dist', 'index.js');
  
  // Start the MCP server
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      LOG_LEVEL: 'error',
      OPTIDEV_DEBUG: 'false'
    }
  });

  let hasResponse = false;
  let output = '';
  let errorOutput = '';

  // Collect outputs
  server.stdout.on('data', (data) => {
    output += data.toString();
    console.log('📤 Server stdout:', data.toString().trim());
    hasResponse = true;
  });

  server.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.log('📤 Server stderr:', data.toString().trim());
  });

  // Send MCP initialization message
  const initMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };

  console.log('📨 Sending MCP initialization...');
  server.stdin.write(JSON.stringify(initMessage) + '\n');

  // Wait for response
  setTimeout(() => {
    server.kill('SIGTERM');
    
    console.log('\n🔍 Test Results:');
    console.log('Has Response:', hasResponse);
    console.log('Output Length:', output.length);
    console.log('Error Output Length:', errorOutput.length);
    
    if (hasResponse) {
      console.log('✅ MCP Server responds to protocol messages');
      try {
        const response = JSON.parse(output.split('\n')[0]);
        if (response.result) {
          console.log('✅ Valid MCP initialization response received');
          console.log('🎯 Server capabilities:', JSON.stringify(response.result.capabilities, null, 2));
        } else {
          console.log('⚠️  Response received but invalid format');
        }
      } catch (e) {
        console.log('⚠️  Response received but not valid JSON');
      }
    } else {
      console.log('❌ No response from MCP server');
    }
    
    if (errorOutput.trim()) {
      console.log('⚠️  Error output detected (this may interfere with MCP):');
      console.log(errorOutput);
    } else {
      console.log('✅ No error output - clean MCP communication');
    }
    
    process.exit(0);
  }, 2000);

  server.on('error', (error) => {
    console.log('❌ Server error:', error);
    process.exit(1);
  });
}

testMCPProtocol().catch(console.error);