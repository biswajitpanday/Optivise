#!/usr/bin/env node

async function testImports() {
  const imports = [
    './dist/core/mcp-server.js',
    './dist/server/http-server.js', 
    './dist/utils/logger.js',
    './dist/config/version.js'
  ];

  for (const importPath of imports) {
    try {
      console.log(`Testing import: ${importPath}`);
      await import(importPath);
      console.log(`✅ ${importPath} imported successfully`);
    } catch (error) {
      console.error(`❌ ${importPath} failed:`, error.message);
      console.error('Stack:', error.stack);
    }
  }
}

testImports();