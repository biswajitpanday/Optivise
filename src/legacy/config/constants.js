/**
 * OptiDevDoc Constants
 * 
 * This file provides constants for the OptiDevDoc MCP client.
 */

const { version } = require('../../package.json');

// App configuration
const APP_CONFIG = {
  NAME: 'OptiDevDoc',
  VERSION: version || '3.1.4',
  DEBUG_MODE: process.env.DEBUG_MCP === 'true',
  PROTOCOL_VERSION: '2025-07-27',
  REMOTE_SERVER: process.env.REMOTE_SERVER || 'https://optidevdoc.onrender.com',
  
  // Tool names
  TOOLS: {
    SEARCH: 'search_optimizely_docs',
    PATTERN: 'find_optimizely_pattern',
    BUG_ANALYSIS: 'analyze_optimizely_bug',
    RULES: 'apply_development_rules',
    CONFIG: 'generate_cursor_config'
  },
  
  // Supported products
  SUPPORTED_PRODUCTS: [
    'configured-commerce',
    'cms-paas',
    'cms-saas',
    'cmp',
    'odp',
    'experimentation',
    'commerce-connect',
    'search-navigation'
  ]
};

module.exports = {
  APP_CONFIG
};