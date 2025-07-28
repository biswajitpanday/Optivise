import express from 'express';
import cors from 'cors';
import { APP_CONFIG } from './config/constants.js';

// Mock data for deployment testing
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
    codeExamples: [
      {
        language: 'csharp',
        code: `public class CustomPriceCalculator : IPriceCalculator
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
}`,
        description: 'Custom price calculator implementation'
      }
    ],
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
\`\`\`

#### Search Content

\`\`\`javascript
const searchResults = await fetch('/api/episerver/v3.0/search', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
        query: 'product information',
        contentTypes: ['StandardPage', 'ProductPage']
    })
});
\`\`\``,
    url: 'https://docs.developers.optimizely.com/content-management-system/content-delivery-api',
    product: 'cms-paas',
    category: 'api-reference',
    version: '12.x',
    lastUpdated: '2024-01-10T14:20:00Z',
    relevanceScore: 1.0,
    codeExamples: [
      {
        language: 'javascript',
        code: `fetch('/api/episerver/v3.0/content/123', {
    headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Accept': 'application/json'
    }
})
.then(response => response.json())
.then(content => {
    console.log('Page title:', content.name);
    console.log('Page content:', content.mainBody);
});`,
        description: 'Fetching content by ID'
      }
    ],
    tags: ['api', 'content', 'rest', 'javascript'],
    breadcrumb: ['Home', 'CMS', 'API Reference', 'Content Delivery']
  },
  {
    id: 'configured-commerce-api-authentication',
    title: 'API Authentication - Configured Commerce',
    content: `# API Authentication

Secure your Configured Commerce API calls with proper authentication.

## OAuth 2.0 Authentication

Configured Commerce uses OAuth 2.0 for API authentication.

### Getting an Access Token

\`\`\`csharp
public async Task<string> GetAccessTokenAsync()
{
    var client = new HttpClient();
    var request = new HttpRequestMessage(HttpMethod.Post, "/identity/connect/token");
    
    var formData = new List<KeyValuePair<string, string>>
    {
        new("grant_type", "client_credentials"),
        new("client_id", "your-client-id"),
        new("client_secret", "your-client-secret"),
        new("scope", "ish:coreapi")
    };
    
    request.Content = new FormUrlEncodedContent(formData);
    
    var response = await client.SendAsync(request);
    var content = await response.Content.ReadAsStringAsync();
    var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(content);
    
    return tokenResponse.AccessToken;
}
\`\`\`

### Using the Token

\`\`\`csharp
client.DefaultRequestHeaders.Authorization = 
    new AuthenticationHeaderValue("Bearer", accessToken);
\`\`\``,
    url: 'https://docs.developers.optimizely.com/configured-commerce/api/authentication',
    product: 'configured-commerce',
    category: 'api-reference',
    version: '12.x',
    lastUpdated: '2024-01-12T09:15:00Z',
    relevanceScore: 1.0,
    codeExamples: [
      {
        language: 'csharp',
        code: `public async Task<string> GetAccessTokenAsync()
{
    var client = new HttpClient();
    var request = new HttpRequestMessage(HttpMethod.Post, "/identity/connect/token");
    
    var formData = new List<KeyValuePair<string, string>>
    {
        new("grant_type", "client_credentials"),
        new("client_id", "your-client-id"),
        new("client_secret", "your-client-secret"),
        new("scope", "ish:coreapi")
    };
    
    request.Content = new FormUrlEncodedContent(formData);
    
    var response = await client.SendAsync(request);
    var content = await response.Content.ReadAsStringAsync();
    var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(content);
    
    return tokenResponse.AccessToken;
}`,
        description: 'OAuth 2.0 token acquisition'
      }
    ],
    tags: ['authentication', 'oauth', 'api', 'security'],
    breadcrumb: ['Home', 'Configured Commerce', 'API Reference', 'Authentication']
  }
];

async function startSimpleDeployServer() {
  console.log('Starting OptiDevDoc Simple Deploy Server...');
  
  try {
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

    // Health endpoint
    app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: APP_CONFIG.VERSION,
        uptime: process.uptime(),
        server: APP_CONFIG.NAME,
        documentation_count: mockDocumentation.length,
      });
    });

    // API docs
    app.get('/api/docs', (_req, res) => {
      res.json({
        name: APP_CONFIG.NAME,
        version: APP_CONFIG.VERSION,
        description: APP_CONFIG.DESCRIPTION,
        endpoints: {
          health: { method: 'GET', path: '/health', description: 'Server health check' },
          search: { method: 'POST', path: '/api/search', description: 'Search documentation' },
          docs: { method: 'GET', path: '/api/docs', description: 'API documentation' },
        },
        features: [
          'In-memory documentation search',
          'Configured Commerce examples',
          'CMS API documentation',
          'Code examples with syntax highlighting',
          'Production-ready endpoints'
        ],
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
            searchTerms.forEach((term: string) => {
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
            type: 'simple_deploy_server',
            search_method: 'in_memory_text_search',
            documentation_source: 'mock_data'
          }
        });

      } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
          error: 'Search failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Root endpoint
    app.get('/', (_req, res) => {
      res.json({
        message: 'OptiDevDoc Simple Deploy Server',
        status: 'running',
        version: APP_CONFIG.VERSION,
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
      console.log(`🚀 OptiDevDoc Simple Deploy Server started successfully`);
      console.log(`📍 Server: http://${host}:${port}`);
      console.log(`❤️  Health: http://${host}:${port}/health`);
      console.log(`📚 API Docs: http://${host}:${port}/api/docs`);
      console.log(`🔍 Search: POST http://${host}:${port}/api/search`);
      console.log(`📊 Documentation entries: ${mockDocumentation.length}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n⚠️  Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        console.log('✅ Server shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start simple deploy server:', error);
    process.exit(1);
  }
}

// Start the server
startSimpleDeployServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}); 