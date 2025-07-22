#!/usr/bin/env node

/**
 * main.js - Entry point for OptiDevDoc MCP Server
 * 
 * This follows the same pattern as the successful Python Documenter project
 * which uses main.py as its entry point.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 OptiDevDoc MCP Server - Main Entry Point');
console.log('==========================================');
console.log('Node.js version:', process.version);
console.log('Working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'development');

// Ensure we have the required files
const requiredFiles = [
  './dist/index.js',
  './dist/index-deploy.js'
];

let foundFiles = [];
let missingFiles = [];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    foundFiles.push(file);
  } else {
    missingFiles.push(file);
  }
});

console.log('\n📁 File Check:');
console.log('✅ Found:', foundFiles.join(', '));
if (missingFiles.length > 0) {
  console.log('❌ Missing:', missingFiles.join(', '));
}

// Start the server
const serverFile = './dist/index.js';

if (fs.existsSync(serverFile)) {
  console.log(`\n🚀 Starting OptiDevDoc server from: ${serverFile}`);
  
  try {
    // Start the server
    require(serverFile);
    
    console.log('✅ Server started successfully');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n⚠️ Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n⚠️ Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
} else {
  console.error('\n❌ Server file not found:', serverFile);
  console.error('Available files in current directory:');
  
  try {
    const files = fs.readdirSync('.');
    console.error(files.filter(f => f.endsWith('.js') || f.endsWith('.json')));
  } catch (error) {
    console.error('Cannot read directory:', error.message);
  }
  
  if (fs.existsSync('./dist')) {
    console.error('\nAvailable files in ./dist:');
    try {
      const distFiles = fs.readdirSync('./dist');
      console.error(distFiles);
    } catch (error) {
      console.error('Cannot read ./dist:', error.message);
    }
  }
  
  process.exit(1);
} 