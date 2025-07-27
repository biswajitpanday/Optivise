#!/usr/bin/env node

/**
 * OptiDevDoc Enhanced HTTP Server v2.1.0
 * Production-ready server with product-aware features and graceful fallbacks
 */

import express from 'express';
import cors from 'cors';
import { OptimizelyPatternTool } from './tools/optimizely-pattern-tool.js';
import { OptimizelyBugAnalyzer } from './tools/optimizely-bug-analyzer.js';
import { GetOptimizelyDocsTool } from './tools/get-optimizely-docs.js';
import { Logger } from './utils/logger.js';
import { ConfigManager } from './config/config-manager.js';
import type { ServerConfig } from './types/index.js';

const app = express();
const port = Number(process.env.PORT) || 3000;

// Initialize configuration
const config: ServerConfig = {
  server: {
    port: Number(port),
    host: '0.0.0.0',
    timeout: 30000
  },
  logging: {
    level: 'info',
    console: { enabled: true }
  },
  cors: {
    origin: ['*'],
    credentials: false
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  }
};

const logger = new Logger(config.logging);

// Initialize tools
const patternTool = new OptimizelyPatternTool(config, logger);
const bugAnalyzer = new OptimizelyBugAnalyzer(config, logger);
const docsTool = new GetOptimizelyDocsTool(config, logger);

// Middleware
app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '2.1.0',
    mode: 'enhanced',
    features: ['product-detection', 'pattern-analysis', 'bug-resolution', 'documentation-search'],
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'OptiDevDoc Enhanced HTTP Server',
    version: '2.1.0',
    description: 'Product-aware Optimizely development assistant with enhanced features',
    features: {
      product_aware_rules: true,
      automatic_detection: true,
      pattern_analysis: true,
      bug_resolution: true,
      documentation_search: true,
      multi_deployment: true
    },
    endpoints: {
      health: '/health',
      docs: '/api/docs',
      search: '/api/search',
      patterns: '/api/patterns',
      bugs: '/api/bugs',
      detect: '/api/detect'
    },
    deployment_mode: 'enhanced-server',
    last_updated: '2024-12-27'
  });
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'OptiDevDoc Enhanced API',
    version: '2.1.0',
    description: 'Enhanced Optimizely documentation and pattern analysis API with product-aware features',
    endpoints: [
      {
        path: '/api/search',
        method: 'POST',
        description: 'Search Optimizely documentation with product filtering',
        parameters: {
          query: 'string (required)',
          product: 'string (optional)',
          maxResults: 'number (optional)'
        }
      },
      {
        path: '/api/patterns',
        method: 'POST', 
        description: 'Find development patterns by scenario with product awareness',
        parameters: {
          scenario: 'string (required)',
          product: 'string (optional)',
          category: 'string (optional)',
          includeCode: 'boolean (optional)'
        }
      },
      {
        path: '/api/bugs',
        method: 'POST',
        description: 'Analyze bugs with product-specific solutions',
        parameters: {
          bugDescription: 'string (required)',
          errorMessage: 'string (optional)',
          context: 'string (optional)',
          product: 'string (optional)'
        }
      },
      {
        path: '/api/detect',
        method: 'POST',
        description: 'Detect Optimizely product from project context (Enhanced in NPM mode)',
        parameters: {
          projectPath: 'string (optional)',
          files: 'array (optional)',
          dependencies: 'object (optional)'
        }
      }
    ]
  });
});

// Enhanced product detection (basic version for server)
app.post('/api/detect', async (req, res) => {
  try {
    const { projectPath, files = [], dependencies = {} } = req.body;
    
    logger.info('Product detection requested', { projectPath, fileCount: files.length });
    
    // Basic detection logic for server mode
    let detectedProduct = 'unknown';
    let confidence = 0;
    const detectedFeatures: string[] = [];
    
    // Check for Commerce indicators
    if (files.some((f: string) => f.includes('Extensions/')) || 
        files.some((f: string) => f.includes('InsiteCommerce'))) {
      detectedFeatures.push('🛒 Commerce - Extensions directory structure');
      detectedProduct = 'configured-commerce';
      confidence = Math.max(confidence, 0.8);
    }
    
    if (files.some((f: string) => f.includes('FrontEnd/modules/blueprints'))) {
      detectedFeatures.push('🛒 Commerce - Blueprint architecture');
      detectedProduct = 'configured-commerce';
      confidence = Math.max(confidence, 0.9);
    }
    
    // Check for CMS indicators
    if (files.some((f: string) => f.includes('modules/')) && 
        files.some((f: string) => f.includes('App_Data/'))) {
      detectedFeatures.push('📝 CMS - Module and App_Data structure');
      detectedProduct = 'cms-paas';
      confidence = Math.max(confidence, 0.8);
    }
    
    // Check dependencies
    if (Object.keys(dependencies).some(dep => dep.includes('insite'))) {
      detectedFeatures.push('🛒 Commerce - Insite dependencies');
      detectedProduct = 'configured-commerce';
      confidence = Math.max(confidence, 0.7);
    }
    
    if (Object.keys(dependencies).some(dep => dep.includes('episerver'))) {
      detectedFeatures.push('📝 CMS - Episerver dependencies');
      detectedProduct = 'cms-paas';
      confidence = Math.max(confidence, 0.7);
    }
    
    if (Object.keys(dependencies).some(dep => dep.includes('@optimizely/optimizely-sdk'))) {
      detectedFeatures.push('🧪 Experimentation - SDK dependencies');
      detectedProduct = 'experimentation';
      confidence = Math.max(confidence, 0.9);
    }
    
    const response = {
      detectedProduct,
      confidence,
      detectedFeatures,
      mode: 'server-basic',
      recommendations: detectedProduct === 'configured-commerce' ? [
        'Use Commerce-specific development patterns',
        'Focus on Extensions/ directory for backend customizations',
        'Apply Handler Chain patterns for business logic',
        'Use Blueprint architecture for frontend development'
      ] : detectedProduct === 'cms-paas' ? [
        'Use CMS-specific content development patterns',
        'Focus on content blocks and templates',
        'Apply Razor and C# patterns for server-side development',
        'Use content type definitions for structured content'
      ] : detectedProduct === 'experimentation' ? [
        'Use Experimentation SDK patterns',
        'Implement feature flags and A/B testing',
        'Focus on analytics and conversion tracking',
        'Apply audience targeting best practices'
      ] : [
        'Unable to detect specific Optimizely product',
        'Consider manual configuration or use NPM mode for enhanced detection',
        'Check project structure for Optimizely-specific indicators'
      ],
      note: 'For enhanced product detection with higher confidence, use NPM mode: npm install -g optidevdoc'
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('Product detection failed', error);
    res.status(500).json({
      error: 'Product detection failed',
      message: 'Unable to analyze project structure',
      fallback: 'Use manual product specification or NPM mode for enhanced detection'
    });
  }
});

// Documentation search
app.post('/api/search', async (req, res) => {
  try {
    const result = await docsTool.execute(req.body as any);
    res.json(result);
  } catch (error) {
    logger.error('Documentation search failed', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'Unable to search documentation',
      suggestion: 'Try with simpler search terms or check network connectivity'
    });
  }
});

// Pattern analysis
app.post('/api/patterns', async (req, res) => {
  try {
    const result = await patternTool.execute(req.body || {});
    res.json(result);
  } catch (error) {
    logger.error('Pattern analysis failed', error);
    res.status(500).json({
      error: 'Pattern analysis failed',
      message: 'Unable to analyze patterns',
      suggestion: 'Try with more specific scenario description'
    });
  }
});

// Bug analysis
app.post('/api/bugs', async (req, res) => {
  try {
    const result = await bugAnalyzer.execute(req.body || {});
    res.json(result);
  } catch (error) {
    logger.error('Bug analysis failed', error);
    res.status(500).json({
      error: 'Bug analysis failed',
      message: 'Unable to analyze bug',
      suggestion: 'Provide more detailed error description and context'
    });
  }
});

// Error handling
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Server error', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.path} not found`,
    availableEndpoints: ['/health', '/api/docs', '/api/search', '/api/patterns', '/api/bugs', '/api/detect']
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  logger.info(`🚀 OptiDevDoc Enhanced Server v2.1.0 running on port ${port}`);
  logger.info('🎯 Product-aware features enabled with graceful fallbacks');
  logger.info('📚 Enhanced documentation search, pattern analysis, and bug resolution available');
  logger.info('🔗 Ready for MCP connections and HTTP API requests');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 