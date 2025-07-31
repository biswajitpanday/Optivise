import { z } from 'zod';
import { OptimizelyProduct, DocumentationCategory } from '../types/index.js';
import type { Logger } from '../utils/logger.js';
import type { ServerConfig, OptimizelyDocumentationResult, SearchQuery } from '../types/index.js';
import { DatabaseManager } from '../database/database-manager.js';

const GetOptimizelyDocsArgsSchema = z.object({
  documentId: z.string().optional(),
  query: z.string().optional(),
  product: z.nativeEnum(OptimizelyProduct).optional(),
  maxResults: z.number().min(1).max(50).default(10),
  includeCodeExamples: z.boolean().default(true),
});

type GetOptimizelyDocsArgs = z.infer<typeof GetOptimizelyDocsArgsSchema>;

export class GetOptimizelyDocsTool {
  private logger: Logger;
  private config: ServerConfig;
  private database: DatabaseManager;

  constructor(config: ServerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.database = new DatabaseManager(this.config.database!, logger);
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing GetOptimizelyDocsTool...', { 
      searchEnabled: this.config.search?.keyword.enabled 
    });
    
    // Initialize database
    await this.database.initialize();
    
    this.logger.info('GetOptimizelyDocsTool initialized successfully');
  }

  async execute(args: unknown): Promise<{ content: { text: string } }> {
    try {
      // Validate input
      const validatedArgs = GetOptimizelyDocsArgsSchema.parse(args);
      this.logger.debug('GetOptimizelyDocsTool executed', { args: validatedArgs });

      const results = await this.searchDocumentation(validatedArgs);
      
      return {
        content: {
          text: this.formatSearchResults(results, validatedArgs),
        },
      };
    } catch (error) {
      this.logger.error('Error in GetOptimizelyDocsTool', { error, args });
      throw error;
    }
  }

  private async searchDocumentation(
    args: GetOptimizelyDocsArgs
  ): Promise<OptimizelyDocumentationResult[]> {
    // Use real database search if query is provided
    if (args.query && args.query.trim()) {
      const searchQuery: SearchQuery = {
        text: args.query,
        ...(args.product && { product: args.product }),
        options: {
          maxResults: args.maxResults,
          includeContent: true,
          highlightMatches: true,
        },
      };

      const searchResults = await this.database.searchDocuments(searchQuery);
      return searchResults.map(result => result.document);
    }

    // If specific document ID is provided, get by ID
    if (args.documentId) {
      const doc = await this.database.getDocumentById(args.documentId);
      return doc ? [doc] : [];
    }

    // Fallback to mock data for demonstration
    const mockResults: OptimizelyDocumentationResult[] = [];

    if (args.query) {
      const query = args.query.toLowerCase();
      
      // Mock Configured Commerce results
      if (query.includes('commerce') || query.includes('pricing') || query.includes('cart')) {
        mockResults.push({
          id: 'configured-commerce-pricing-overview',
          title: 'Pricing Engine Overview',
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
          product: OptimizelyProduct.CONFIGURED_COMMERCE,
                     category: DocumentationCategory.DEVELOPER_GUIDE,
          version: '12.x',
          lastUpdated: '2025-07-27T10:30:00Z',
          relevanceScore: 0.95,
          codeExamples: [
            {
              type: 'good',
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
              description: 'Custom price calculator implementation',
              filename: 'CustomPriceCalculator.cs',
            },
          ],
          tags: ['pricing', 'commerce', 'calculation', 'discounts'],
          breadcrumb: ['Home', 'Configured Commerce', 'Developer Guide', 'Pricing'],
        });
      }

      // Mock CMS results
      if (query.includes('cms') || query.includes('content') || query.includes('page')) {
        mockResults.push({
          id: 'cms-content-api-overview',
          title: 'Content Delivery API',
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
          product: OptimizelyProduct.CMS_PAAS,
                     category: DocumentationCategory.API_REFERENCE,
          version: '12.x',
          lastUpdated: '2024-01-10T14:20:00Z',
          relevanceScore: 0.88,
          codeExamples: [
            {
              type: 'good',
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
              description: 'Retrieve content by ID',
              filename: 'getContent.js',
            },
          ],
          tags: ['api', 'content', 'rest', 'javascript'],
          breadcrumb: ['Home', 'CMS', 'API Reference', 'Content Delivery'],
        });
      }
    }

    // Filter by product if specified
    if (args.product) {
      return mockResults.filter(result => result.product === args.product);
    }

    return mockResults.slice(0, args.maxResults);
  }

  private formatSearchResults(
    results: OptimizelyDocumentationResult[],
    args: GetOptimizelyDocsArgs
  ): string {
    if (results.length === 0) {
      return `No documentation found for your query. Please try different search terms or check the product name.

**Available Products:**
- configured-commerce: B2B Commerce platform
- cms-paas: Content Management System (PaaS)
- cms-saas: Content Management System (SaaS)
- odp: Optimizely Data Platform
- experimentation: A/B Testing and Feature Flags

**Tips:**
- Be more specific about what you're looking for
- Include the product name in your query
- Try searching for specific features or APIs`;
    }

    let output = `# Optimizely Documentation Results\n\n`;
    output += `Found ${results.length} result(s)${args.product ? ` for ${args.product}` : ''}:\n\n`;

    for (const result of results) {
      output += `## ${result.title}\n\n`;
      output += `**Product:** ${result.product}\n`;
      output += `**Category:** ${result.category}\n`;
      output += `**URL:** ${result.url}\n`;
      output += `**Last Updated:** ${new Date(result.lastUpdated).toLocaleDateString()}\n`;
      output += `**Relevance:** ${Math.round(result.relevanceScore * 100)}%\n\n`;

      // Add breadcrumb
      if (result.breadcrumb.length > 0) {
        output += `**Navigation:** ${result.breadcrumb.join(' > ')}\n\n`;
      }

      // Add content (truncated for readability)
      const content = result.content.length > 2000 
        ? result.content.substring(0, 2000) + '...\n\n[Content truncated - view full content at URL above]'
        : result.content;
      
      output += `${content}\n\n`;

      // Add code examples if requested
      if (args.includeCodeExamples && result.codeExamples && result.codeExamples.length > 0) {
        output += `### Code Examples\n\n`;
        for (const example of result.codeExamples) {
          output += `**${example.description}** (${example.language}):\n\n`;
          output += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
        }
      }

      // Add tags
      if (result.tags.length > 0) {
        output += `**Tags:** ${result.tags.join(', ')}\n\n`;
      }

      output += `---\n\n`;
    }

    return output;
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up GetOptimizelyDocsTool...');
    await this.database.close();
  }
} 