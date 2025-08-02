#!/usr/bin/env node

// Simple test to check if the ES module loads
import('./dist/index.js').then(() => {
  console.log('✅ Module loaded successfully');
  setTimeout(() => process.exit(0), 1000);
}).catch((error) => {
  console.error('❌ Module failed to load:', error);
  process.exit(1);
});