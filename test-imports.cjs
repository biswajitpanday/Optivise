#!/usr/bin/env node

console.log('Testing module imports...');

async function testImports() {
  try {
    console.log('1. Testing ES module import...');
    
    // Use dynamic import for ES modules from CommonJS
    const module = await import('./dist/index.js');
    console.log('✅ Main module imported successfully');
    
    // Check if the main function exists
    if (module.default) {
      console.log('✅ Default export found');
    } else {
      console.log('⚠️ No default export found');
    }
    
    console.log('Module exports:', Object.keys(module));
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error('Stack:', error.stack);
  }
}

testImports();