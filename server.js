#!/usr/bin/env node

// Simple entry point for Render deployment
// Similar to the successful Python project structure

const fs = require('fs');
const path = require('path');

console.log('🚀 OptiDevDoc MCP Server - Render Entry Point');
console.log('============================================');

// Find the correct path to our compiled server
const possibleIndexPaths = [
  './dist/index.js',
  './dist/index-deploy.js',
  path.join(__dirname, 'dist', 'index.js'),
  path.join(__dirname, 'dist', 'index-deploy.js')
];

let serverPath = null;

for (const indexPath of possibleIndexPaths) {
  if (fs.existsSync(indexPath)) {
    serverPath = indexPath;
    console.log(`✅ Found server at: ${serverPath}`);
    break;
  }
}

if (!serverPath) {
  console.error('❌ Could not find compiled server files');
  console.error('Available files in current directory:');
  try {
    const files = fs.readdirSync('.');
    console.error(files.join(', '));
  } catch (error) {
    console.error('Cannot read directory:', error.message);
  }
  
  if (fs.existsSync('./dist')) {
    console.error('Available files in dist directory:');
    try {
      const distFiles = fs.readdirSync('./dist');
      console.error(distFiles.join(', '));
    } catch (error) {
      console.error('Cannot read dist directory:', error.message);
    }
  }
  
  process.exit(1);
}

// Start the server
try {
  console.log(`🚀 Starting server from: ${serverPath}`);
  require(serverPath);
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
} 