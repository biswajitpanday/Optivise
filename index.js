#!/usr/bin/env node

/**
 * OptiDevDoc MCP Server - Production Entry Point
 * This file loads the appropriate server based on environment and mode
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 OptiDevDoc MCP Server v2.1.1');
console.log('Node.js:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'production');

// Check environment variables to determine mode
const isEnhanced = process.env.OPTIDEVDOC_MODE === 'enhanced' || process.env.OPTIDEVDOC_MULTI_PRODUCT === 'true';
const isServerMode = process.env.OPTIDEVDOC_SERVER_MODE === 'http';

console.log('Mode:', isEnhanced ? 'Enhanced Product-Aware' : 'Simple');
console.log('Server Mode:', isServerMode ? 'HTTP Server' : 'MCP Server');

// Try to load the compiled TypeScript deploy server first
const enhancedServerPath = path.join(__dirname, 'dist', 'deploy-server-enhanced.js');
const simpleServerPath = path.join(__dirname, 'dist', 'deploy-server-simple.js');

// Check if we have compiled versions
if (isEnhanced && fs.existsSync(enhancedServerPath)) {
  console.log('🎯 Loading compiled enhanced server...');
  try {
    require(enhancedServerPath);
    return;
  } catch (error) {
    console.error('❌ Failed to load compiled enhanced server:', error);
  }
} else if (fs.existsSync(simpleServerPath)) {
  console.log('📦 Loading compiled simple server...');
  try {
    require(simpleServerPath);
    return;
  } catch (error) {
    console.error('❌ Failed to load compiled simple server:', error);
  }
}

// Fall back to TypeScript execution using tsx if available
const tsxPath = path.join(__dirname, 'node_modules', '.bin', 'tsx');
const tsxExists = fs.existsSync(tsxPath) || fs.existsSync(tsxPath + '.cmd') || fs.existsSync(tsxPath + '.ps1');

if (tsxExists) {
  const { spawn } = require('child_process');
  const srcPath = isEnhanced 
    ? path.join(__dirname, 'src', 'deploy-server-enhanced.ts')
    : path.join(__dirname, 'src', 'deploy-server-simple.ts');
  
  if (fs.existsSync(srcPath)) {
    console.log(`🔧 Using tsx to execute TypeScript server: ${path.basename(srcPath)}`);
    
    const child = spawn('node', [tsxPath, srcPath], {
      stdio: 'inherit',
      env: process.env
    });
    
    child.on('error', (error) => {
      console.error('❌ Failed to start tsx server:', error);
      console.log('🔄 Falling back to standalone server...');
      startStandaloneServer();
    });
    
    child.on('exit', (code) => {
      process.exit(code || 0);
    });
    
    return;
  }
}

// Final fallback to standalone server
console.log('⚠️  No compiled or TypeScript servers available, using standalone server...');
startStandaloneServer();

// Standalone server implementation
function startStandaloneServer() {
  startServer();
}

function startServer() {
  // First try to load express, install if not available
  let express, cors;
  try {
    express = require('express');
    cors = require('cors');
  } catch (error) {
    console.log('📦 Installing required dependencies...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install express cors', { stdio: 'inherit' });
      express = require('express');
      cors = require('cors');
      console.log('✅ Dependencies installed successfully');
    } catch (installError) {
      console.error('❌ Failed to install dependencies:', installError.message);
      // Fallback to basic HTTP server
      startBasicServer();
      return;
    }
  }

  console.log('🚀 Starting OptiDevDoc Express Server...');

  const app = express();
  const port = Number(process.env.PORT || 3000);
  const host = '0.0.0.0';

  // Middleware
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  // Request logging
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Mock documentation for testing
  const mockDocumentation = [
    {
      id: 'configured-commerce-pricing-overview',
      title: 'Pricing Engine Overview - Optimizely Configured Commerce',
      content: `# Pricing Engine Overview

The Optimizely Configured Commerce pricing engine provides flexible pricing calculations for B2B commerce scenarios.

## Key Features

- **Dynamic Pricing**: Real-time price calculations based on customer context
- **Rule-Based Pricing**: Configure complex pricing rules through the admin interface
- **Volume Discounts**: Support for quantity-based pricing tiers
- **Customer-Specific Pricing**: Personalized pricing for different customer segments

## Implementation

### Basic Price Calculation

The pricing engine calculates prices using the following hierarchy:

1. Customer-specific pricing
2. Volume discount rules
3. Promotional pricing
4. Base product pricing

### Code Example

\`\`\`csharp
public class CustomPriceCalculator : IPriceCalculator
{
    public PriceCalculationResult CalculatePrice(PriceCalculationRequest request)
    {
        var basePrice = GetBasePrice(request.Product);
        var customerPrice = ApplyCustomerPricing(basePrice, request.Customer);
        var volumePrice = ApplyVolumeDiscounts(customerPrice, request.Quantity);
        var finalPrice = ApplyPromotions(volumePrice, request.Promotions);
        
        return new PriceCalculationResult
        {
            UnitPrice = finalPrice,
            ExtendedPrice = finalPrice * request.Quantity,
            Discounts = GetAppliedDiscounts()
        };
    }
}
\`\`\`

## Configuration

Configure pricing rules in the admin interface under **Commerce > Pricing > Rules**.`,
      url: 'https://docs.developers.optimizely.com/configured-commerce/pricing/overview',
      product: 'configured-commerce',
      category: 'developer-guide',
      version: '12.x',
      lastUpdated: '2024-01-15T10:30:00Z',
      relevanceScore: 1.0,
      tags: ['pricing', 'commerce', 'calculation', 'discounts'],
      breadcrumb: ['Home', 'Configured Commerce', 'Developer Guide', 'Pricing']
    },
    {
      id: 'cms-content-delivery-api',
      title: 'Content Delivery API - Optimizely CMS',
      content: `# Content Delivery API

Access your content programmatically using the Optimizely Content Delivery API.

## Overview

The Content Delivery API provides RESTful endpoints to retrieve content from your Optimizely CMS instance.

### Authentication

All API requests require authentication using an API key:

\`\`\`http
GET /api/episerver/v3.0/content/123
Authorization: Bearer your-api-key-here
\`\`\`

### Retrieving Content

#### Get Page by ID

\`\`\`javascript
fetch('/api/episerver/v3.0/content/123', {
    headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Accept': 'application/json'
    }
})
.then(response => response.json())
.then(content => {
    console.log('Page title:', content.name);
    console.log('Page content:', content.mainBody);
});
\`\`\``,
      url: 'https://docs.developers.optimizely.com/content-management-system/content-delivery-api',
      product: 'cms-paas',
      category: 'api-reference',
      version: '12.x',
      lastUpdated: '2024-01-10T14:20:00Z',
      relevanceScore: 1.0,
      tags: ['api', 'content', 'rest', 'javascript'],
      breadcrumb: ['Home', 'CMS', 'API Reference', 'Content Delivery']
    }
  ];

  // Health endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      server: 'OptiDevDoc Standalone Server',
      documentation_count: mockDocumentation.length,
    });
  });

  // API docs
  app.get('/api/docs', (_req, res) => {
    res.json({
      name: 'OptiDevDoc Standalone Server',
      version: '1.0.0',
      description: 'HTTP API for Optimizely documentation search',
      endpoints: {
        health: { method: 'GET', path: '/health', description: 'Server health check' },
        search: { method: 'POST', path: '/api/search', description: 'Search documentation' },
        docs: { method: 'GET', path: '/api/docs', description: 'API documentation' },
      },
      sample_query: {
        url: '/api/search',
        method: 'POST',
        body: {
          query: 'custom price calculator',
          product: 'configured-commerce',
          maxResults: 5
        }
      }
    });
  });

  // Search endpoint
  app.post('/api/search', async (req, res) => {
    try {
      const { query, product, maxResults = 10 } = req.body;

      if (!query) {
        res.status(400).json({ error: 'Query is required' });
        return;
      }

      console.log(`Search request: "${query}" product: ${product || 'all'}`);

      // Simple text search through mock documentation
      const searchTerms = query.toLowerCase().split(/\s+/);
      
      let results = mockDocumentation
        .map(doc => {
          let score = 0;
          const searchableText = `${doc.title} ${doc.content} ${doc.tags.join(' ')}`.toLowerCase();
          
          // Calculate relevance score
          searchTerms.forEach((term) => {
            if (doc.title.toLowerCase().includes(term)) score += 10;
            if (searchableText.includes(term)) score += 1;
          });
          
          return { ...doc, relevanceScore: score };
        })
        .filter(doc => {
          // Filter by product if specified
          if (product && doc.product !== product) return false;
          // Only include results with some relevance
          return doc.relevanceScore > 0;
        })
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxResults);

      console.log(`Found ${results.length} results`);
      
      res.json({
        success: true,
        query,
        product: product || 'all',
        results,
        total_count: results.length,
        timestamp: new Date().toISOString(),
        server_info: {
          type: 'standalone_server',
          search_method: 'text_search',
          documentation_source: 'mock_data'
        }
      });

    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        error: 'Search failed',
        message: error.message,
      });
    }
  });

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      message: 'OptiDevDoc Standalone Server',
      status: 'running',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api_docs: '/api/docs',
        search: '/api/search (POST)'
      },
      quick_test: 'POST to /api/search with {"query": "pricing"}'
    });
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not Found',
      available_endpoints: ['GET /health', 'GET /api/docs', 'POST /api/search'],
    });
  });

  // Start server
  const server = app.listen(port, host, () => {
    console.log(`🚀 OptiDevDoc Standalone Server started successfully`);
    console.log(`📍 Server: http://${host}:${port}`);
    console.log(`❤️  Health: http://${host}:${port}/health`);
    console.log(`📚 API Docs: http://${host}:${port}/api/docs`);
    console.log(`🔍 Search: POST http://${host}:${port}/api/search`);
    console.log(`📊 Documentation entries: ${mockDocumentation.length}`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n⚠️  Received ${signal}, shutting down gracefully...`);
    
    server.close(() => {
      console.log('✅ Server shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

function startBasicServer() {
  console.log('🔧 Starting basic HTTP server (fallback)...');
  const http = require('http');
  const port = Number(process.env.PORT || 3000);
  
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'OptiDevDoc Basic Server',
      status: 'running',
      note: 'Express not available, using basic HTTP server'
    }));
  });
  
  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Basic server running on port ${port}`);
  });
}

module.exports = { startServer }; 