#!/usr/bin/env node

/**
 * main.js - Production Entry Point for OptiDevDoc MCP Server
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 OptiDevDoc MCP Server Starting...');
console.log('Node.js:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'production');

// Find and start the compiled server
const serverPath = './dist/index.js';

if (fs.existsSync(serverPath)) {
  console.log('✅ Starting server...');
  try {
    require(serverPath);
  } catch (error) {
    console.error('❌ Server failed:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ Server not found:', serverPath);
  process.exit(1);
} 