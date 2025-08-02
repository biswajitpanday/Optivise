#!/usr/bin/env node

/**
 * MCP Wrapper for Optivise v5.0.6
 * Simplified wrapper that directly executes the server
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the package directory
const PACKAGE_ROOT = path.join(__dirname);
const SERVER_PATH = path.join(PACKAGE_ROOT, 'optivise-server-fixed.cjs');

function startMCPServer() {
  // Check if the compiled server exists
  if (!fs.existsSync(SERVER_PATH)) {
    process.stderr.write('Error: Compiled server not found. Please run "npm run build" first\n');
    process.exit(1);
  }

  // Set up environment
  const env = {
    ...process.env,
    OPTIDEV_DEBUG: process.env.OPTIDEV_DEBUG || 'false',
    LOG_LEVEL: process.env.LOG_LEVEL || 'error', // Minimize logging for MCP
    NODE_OPTIONS: '--no-warnings'
  };

  // Start the server with proper stdio handling
  const server = spawn('node', [SERVER_PATH], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: env,
    cwd: PACKAGE_ROOT
  });

  // Handle server events
  server.on('error', (error) => {
    process.stderr.write(`Failed to start MCP server: ${error.message}\n`);
    process.exit(1);
  });

  server.on('exit', (code) => {
    process.exit(code || 0);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    server.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
  });
}

// Start the server
startMCPServer();