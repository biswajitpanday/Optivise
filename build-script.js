#!/usr/bin/env node

/**
 * Simple build script for Render deployment
 * Creates dist/index.js with a working Express server
 */

const fs = require('fs');
const path = require('path');

console.log('🔨 Building OptiDevDoc for production...');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
  console.log('✅ Created dist directory');
}

// Create the server content
const serverContent = `// OptiDevDoc MCP Server - Production Build
const express = require('express');
const cors = require('cors');

console.log('🚀 Starting OptiDevDoc Deploy Server...');

const app = express();
const port = Number(process.env.PORT || 3000);
const host = '0.0.0.0';

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(\`\${new Date().toISOString()} - \${req.method} \${req.url}\`);
  next();
});

// Mock documentation for testing
const mockDocumentation = [
  {
    id: 'configured-commerce-pricing-overview',
    title: 'Pricing Engine Overview - Optimizely Configured Commerce',
    content: \`# Pricing Engine Overview

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

\\\`\\\`\\\`csharp
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
\\\`\\\`\\\`

## Configuration

Configure pricing rules in the admin interface under **Commerce > Pricing > Rules**.\`,
    url: 'https://docs.developers.optimizely.com/configured-commerce/pricing/overview',
    product: 'configured-commerce',
    category: 'developer-guide',
    version: '12.x',
    lastUpdated: '2024-01-15T10:30:00Z',
    relevanceScore: 1.0,
    tags: ['pricing', 'commerce', 'calculation', 'discounts'],
    breadcrumb: ['Home', 'Configured Commerce', 'Developer Guide', 'Pricing']
  }
];

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    server: 'OptiDevDoc Production Server',
    documentation_count: mockDocumentation.length,
  });
});

// API docs
app.get('/api/docs', (_req, res) => {
  res.json({
    name: 'OptiDevDoc Production Server',
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

    console.log(\`Search request: "\${query}" product: \${product || 'all'}\`);

    // Simple text search through mock documentation
    const searchTerms = query.toLowerCase().split(/\\s+/);
    
    let results = mockDocumentation
      .map(doc => {
        let score = 0;
        const searchableText = \`\${doc.title} \${doc.content} \${doc.tags.join(' ')}\`.toLowerCase();
        
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

    console.log(\`Found \${results.length} results\`);
    
    res.json({
      success: true,
      query,
      product: product || 'all',
      results,
      total_count: results.length,
      timestamp: new Date().toISOString(),
      server_info: {
        type: 'production_server',
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
    message: 'OptiDevDoc Production Server',
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
  console.log(\`🚀 OptiDevDoc Production Server started successfully\`);
  console.log(\`📍 Server: http://\${host}:\${port}\`);
  console.log(\`❤️  Health: http://\${host}:\${port}/health\`);
  console.log(\`📚 API Docs: http://\${host}:\${port}/api/docs\`);
  console.log(\`🔍 Search: POST http://\${host}:\${port}/api/search\`);
  console.log(\`📊 Documentation entries: \${mockDocumentation.length}\`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(\`\\n⚠️  Received \${signal}, shutting down gracefully...\`);
  
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
`;

// Write the server file
fs.writeFileSync('dist/index.js', serverContent);
console.log('✅ Created dist/index.js');

// Verify the file was created
const stats = fs.statSync('dist/index.js');
console.log(`✅ File size: ${stats.size} bytes`);

console.log('🎉 Build complete! Server ready for deployment.'); 