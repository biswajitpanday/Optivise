#!/usr/bin/env node

// Debug script for Render deployment
console.log('🔍 RENDER DEBUG INFORMATION');
console.log('========================');

console.log('📍 Current Working Directory:', process.cwd());
console.log('📂 __dirname:', __dirname);
console.log('📄 __filename:', __filename);

console.log('\n📁 Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('RENDER:', process.env.RENDER);
console.log('RENDER_SERVICE_NAME:', process.env.RENDER_SERVICE_NAME);

console.log('\n📋 Process Arguments:');
console.log('argv:', process.argv);

const fs = require('fs');
const path = require('path');

console.log('\n📁 Directory Contents:');

// Check current directory
try {
  const currentFiles = fs.readdirSync('.');
  console.log('Current directory (./):', currentFiles);
} catch (error) {
  console.log('Cannot read current directory:', error.message);
}

// Check for dist directory in various locations
const possiblePaths = [
  './dist',
  '../dist',
  '/opt/render/project/dist',
  '/opt/render/project/src/dist',
  'dist',
  'src/dist'
];

console.log('\n🔍 Searching for dist directory:');
possiblePaths.forEach(distPath => {
  try {
    if (fs.existsSync(distPath)) {
      console.log(`✅ Found: ${distPath}`);
      const files = fs.readdirSync(distPath);
      console.log(`   Files: ${files.join(', ')}`);
    } else {
      console.log(`❌ Not found: ${distPath}`);
    }
  } catch (error) {
    console.log(`❌ Error checking ${distPath}:`, error.message);
  }
});

// Check for index.js specifically
console.log('\n🎯 Looking for index.js:');
const indexPaths = [
  './dist/index.js',
  './index.js',
  '/opt/render/project/dist/index.js',
  '/opt/render/project/src/dist/index.js'
];

indexPaths.forEach(indexPath => {
  try {
    if (fs.existsSync(indexPath)) {
      console.log(`✅ Found index.js at: ${indexPath}`);
      const stats = fs.statSync(indexPath);
      console.log(`   Size: ${stats.size} bytes`);
      console.log(`   Modified: ${stats.mtime}`);
    } else {
      console.log(`❌ index.js not found at: ${indexPath}`);
    }
  } catch (error) {
    console.log(`❌ Error checking ${indexPath}:`, error.message);
  }
});

console.log('\n🚀 Attempting to start server...');

// Try to require the server
try {
  if (fs.existsSync('./dist/index.js')) {
    console.log('✅ Starting from ./dist/index.js');
    require('./dist/index.js');
  } else if (fs.existsSync('/opt/render/project/dist/index.js')) {
    console.log('✅ Starting from /opt/render/project/dist/index.js');
    require('/opt/render/project/dist/index.js');
  } else {
    console.log('❌ Cannot find index.js in any expected location');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error starting server:', error.message);
  process.exit(1);
} 