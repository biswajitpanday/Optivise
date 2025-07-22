#!/usr/bin/env node

/**
 * OptiDevDoc MCP Server - Main Entry Point for Render
 * This file exists because Render is trying to run 'main.js' instead of 'index.js'
 */

console.log('🔗 main.js - Redirecting to index.js...');

// Simply require and run the actual index.js file
require('./index.js'); 