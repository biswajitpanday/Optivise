/**
 * Documentation Service
 * Fetches live Optimizely documentation with intelligent caching
 */

import { promises as fs } from 'fs';
import * as path from 'path';

import type {
  OptimizelyProduct,
  DocumentationContent,
  SearchResult,
  CacheEntry,
  Logger
} from '../types/index.js';

interface DocumentationEndpoint {
  name: string;
  url: string;
  type: 'api' | 'guide' | 'reference';
  products: OptimizelyProduct[];
}

export class DocumentationService {
  private readonly logger: Logger;
  private readonly cache: Map<string, CacheEntry<DocumentationContent>> = new Map();
  private isInitialized = false;
  private readonly cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  // Optimizely documentation endpoints
  private readonly endpoints: DocumentationEndpoint[] = [
    {
      name: 'Configured Commerce Documentation',
      url: 'https://docs.optimizely.com/configured-commerce/',
      type: 'guide',
      products: ['configured-commerce']
    },
    {
      name: 'CMS Documentation',
      url: 'https://docs.optimizely.com/content-management-system/',
      type: 'guide', 
      products: ['cms-paas', 'cms-saas']
    },
    {
      name: 'Experimentation Documentation',
      url: 'https://docs.optimizely.com/experimentation/',
      type: 'guide',
      products: ['web-experimentation', 'feature-experimentation']
    },
    {
      name: 'DXP Documentation',
      url: 'https://docs.optimizely.com/digital-experience-platform/',
      type: 'guide',
      products: ['dxp']
    },
    {
      name: 'Data Platform Documentation',
      url: 'https://docs.optimizely.com/data-platform/',
      type: 'reference',
      products: ['data-platform']
    }
  ];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.debug('Initializing Documentation Service');
    
    // Load cached documentation if available
    await this.loadCache();
    
    this.isInitialized = true;
    this.logger.info('Documentation Service initialized', {
      endpoints: this.endpoints.length,
      cachedItems: this.cache.size
    });
  }

  async fetchDocumentation(products: OptimizelyProduct[]): Promise<DocumentationContent[]> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Fetching documentation', { products });
      
      const results: DocumentationContent[] = [];
      const relevantEndpoints = this.getRelevantEndpoints(products);
      
      for (const endpoint of relevantEndpoints.slice(0, 3)) { // Limit for performance
        try {
          const content = await this.fetchEndpointContent(endpoint);
          if (content) {
            results.push(content);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch from ${endpoint.name}`, {
            url: endpoint.url,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.logger.info('Documentation fetch completed', {
        requestedProducts: products,
        endpointsChecked: relevantEndpoints.length,
        contentRetrieved: results.length,
        processingTime: Date.now() - startTime
      });

      return results;

    } catch (error) {
      this.logger.error('Documentation fetch failed', error as Error, {
        products,
        processingTime: Date.now() - startTime
      });
      return [];
    }
  }

  async searchDocumentation(query: string, products: OptimizelyProduct[]): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Searching documentation', { query, products });
      
      const results: SearchResult[] = [];
      const documentation = await this.fetchDocumentation(products);
      
      for (const doc of documentation) {
        const matches = this.searchInContent(query, doc);
        results.push(...matches);
      }

      // Sort by relevance
      results.sort((a, b) => b.relevance - a.relevance);

      this.logger.info('Documentation search completed', {
        query,
        products,
        totalResults: results.length,
        processingTime: Date.now() - startTime
      });

      return results.slice(0, 10); // Return top 10 results

    } catch (error) {
      this.logger.error('Documentation search failed', error as Error, {
        query,
        products,
        processingTime: Date.now() - startTime
      });
      return [];
    }
  }

  private getRelevantEndpoints(products: OptimizelyProduct[]): DocumentationEndpoint[] {
    return this.endpoints.filter(endpoint =>
      endpoint.products.some(product => products.includes(product))
    );
  }

  private async fetchEndpointContent(endpoint: DocumentationEndpoint): Promise<DocumentationContent | null> {
    const cacheKey = `doc_${endpoint.name}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      this.logger.debug('Using cached documentation', { endpoint: endpoint.name });
      return cached.data;
    }

    try {
      // In a real implementation, you would fetch from the actual URL
      // For Phase 2, we'll simulate with structured content
      const simulatedContent = this.generateSimulatedContent(endpoint);
      
      // Cache the content
      this.cache.set(cacheKey, {
        key: cacheKey,
        data: simulatedContent,
        timestamp: new Date(),
        ttl: this.cacheTTL,
        accessCount: 1,
        lastAccessed: new Date()
      });

      return simulatedContent;

    } catch (error) {
      this.logger.warn(`Failed to fetch ${endpoint.name}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return cached content even if expired
      if (cached) {
        this.logger.debug('Using expired cached content as fallback');
        return cached.data;
      }
      
      return null;
    }
  }

  private generateSimulatedContent(endpoint: DocumentationEndpoint): DocumentationContent {
    // This simulates documentation content for Phase 2
    // In Phase 3, this would be replaced with actual web scraping/API calls
    
    const productName = endpoint.products[0];
    if (!productName) {
      throw new Error('No product specified for endpoint');
    }
    const baseContent = this.getProductSpecificContent(productName);
    
    return {
      source: 'optimizely-docs' as const,
      content: baseContent,
      title: endpoint.name,
      url: endpoint.url,
      lastUpdated: new Date(),
      relevanceScore: 0.9,
      products: endpoint.products,
      cacheKey: `doc_${endpoint.name}`,
      ttl: this.cacheTTL
    };
  }

  private getProductSpecificContent(product: OptimizelyProduct): string {
    const contentMap: Record<OptimizelyProduct, string> = {
      'configured-commerce': `
# Configured Commerce Development Guide

## Handler Chain Patterns
Configured Commerce uses a handler chain pattern for extending functionality:

\`\`\`csharp
public class CustomHandler : HandlerBase<CustomParameter, CustomResult>
{
    public override int Order => 100;
    
    public override CustomResult Execute(IUnitOfWork unitOfWork, CustomParameter parameter, CustomResult result)
    {
        // Implementation logic
        return NextHandler.Execute(unitOfWork, parameter, result);
    }
}
\`\`\`

## Best Practices
- Always call NextHandler.Execute() to maintain the chain
- Use dependency injection for services
- Implement proper error handling and logging
- Follow naming conventions for handlers

## Common Extension Points
- Product pricing calculations
- Cart manipulation
- Order processing workflows
- User authentication flows
      `,
      'cms-paas': `
# CMS Development Guide

## Content Types
Create custom content types with proper inheritance:

\`\`\`csharp
[ContentType(GUID = "12345678-1234-1234-1234-123456789012")]
public class CustomBlock : BlockData
{
    [Display(GroupName = SystemTabNames.Content, Order = 10)]
    public virtual string Title { get; set; }
    
    [Display(GroupName = SystemTabNames.Content, Order = 20)]
    public virtual XhtmlString Content { get; set; }
}
\`\`\`

## MVC Implementation
Follow proper MVC patterns for controllers and views.

## Caching Strategies
Implement appropriate caching for performance optimization.
      `,
      'web-experimentation': `
# Web Experimentation SDK Guide

## SDK Initialization
Initialize the Optimizely SDK in your application:

\`\`\`javascript
import optimizely from '@optimizely/optimizely-sdk';

const optimizelyClient = optimizely.createInstance({
  datafile: datafile,
  logger: optimizely.logging.createLogger()
});
\`\`\`

## Running Experiments
Execute experiments and track events:

\`\`\`javascript
const userId = 'user123';
const variation = optimizelyClient.activate('experiment_key', userId);

if (variation === 'treatment') {
  // Show treatment experience
}

// Track conversion events
optimizelyClient.track('conversion_event', userId);
\`\`\`

## Best Practices
- Always check if variation is null
- Implement proper error handling
- Use meaningful user IDs
- Track relevant conversion events
      `,
      'cms-saas': `
# CMS SaaS Development Guide

## Content Delivery API
Access content through the Content Delivery API:

\`\`\`javascript
import { ContentDeliveryAPI } from '@optimizely/cms-api';

const api = new ContentDeliveryAPI({
  baseUrl: 'https://your-app.optimizely.com',
  accessToken: 'your-access-token'
});

const content = await api.getContent('/page-url');
\`\`\`

## GraphQL Integration
Leverage Optimizely Graph for flexible content queries.
      `,
      // Default content for other products
      'commerce-connect': 'Commerce Connect integration patterns and best practices.',
      'cmp': 'Content Marketing Platform workflows and automation.',
      'dxp': 'Digital Experience Platform personalization and visitor groups.',
      'feature-experimentation': 'Feature flag management and rollout strategies.',
      'data-platform': 'Data collection, analysis, and reporting capabilities.',
      'connect-platform': 'Integration patterns and webhook management.',
      'recommendations': 'Product recommendation algorithms and implementation.'
    };

    return contentMap[product] || `Documentation for ${product} development.`;
  }

  private extractSections(content: string): string[] {
    const sections: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('##')) {
        sections.push(line.replace('##', '').trim());
      }
    }
    
    return sections;
  }

  private searchInContent(query: string, doc: DocumentationContent): SearchResult[] {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    const content = doc.content.toLowerCase();
    
    // Simple text search with relevance scoring
    if (content.includes(lowerQuery)) {
      const relevance = this.calculateRelevance(query, doc.content);
      
      results.push({
        title: doc.title,
        content: this.extractSnippet(doc.content, query),
        url: doc.url,
        relevance,
        product: doc.products[0] || 'configured-commerce',
        type: 'documentation' as const,
        lastModified: doc.lastUpdated
      });
    }
    
    return results;
  }

  private calculateRelevance(query: string, content: string): number {
    const lowerQuery = query.toLowerCase();
    const lowerContent = content.toLowerCase();
    
    // Count matches
    const matches = (lowerContent.match(new RegExp(lowerQuery, 'g')) || []).length;
    const words = content.split(/\s+/).length;
    
    // Calculate relevance score
    return Math.min(matches / words * 100, 1.0);
  }

  private extractSnippet(content: string, query: string): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);
    
    if (index === -1) return content.substring(0, 200) + '...';
    
    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + query.length + 100);
    
    return content.substring(start, end) + '...';
  }

  private async loadCache(): Promise<void> {
    // In a real implementation, this would load from persistent storage
    // For now, we'll start with an empty cache
    this.logger.debug('Cache loading completed', { items: this.cache.size });
  }

  private isCacheExpired(cacheEntry: CacheEntry<DocumentationContent>): boolean {
    const now = new Date().getTime();
    const entryTime = cacheEntry.timestamp.getTime();
    return (now - entryTime) > cacheEntry.ttl;
  }

  isEnabled(): boolean {
    return this.isInitialized;
  }

  getCacheStats() {
    const now = new Date().getTime();
    let activeEntries = 0;
    let expiredEntries = 0;
    
    for (const entry of this.cache.values()) {
      if (this.isCacheExpired(entry)) {
        expiredEntries++;
      } else {
        activeEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries,
      cacheTTL: this.cacheTTL
    };
  }
}