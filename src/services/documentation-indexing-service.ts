/**
 * Documentation Indexing Service
 * Automatically indexes Optimizely documentation into ChromaDB for AI-powered search
 */

import { chromaDBService, DocumentChunk } from '../integrations/chromadb-client.js';
import { openAIClient } from '../integrations/openai-client.js';
import type { Logger, OptimizelyProduct } from '../types/index.js';

export interface DocumentSource {
  url: string;
  product: OptimizelyProduct;
  contentType: 'documentation' | 'tutorial' | 'api' | 'example';
  title?: string;
  tags?: string[];
}

export interface IndexingProgress {
  totalDocuments: number;
  processedDocuments: number;
  failedDocuments: number;
  currentDocument?: string;
  status: 'idle' | 'indexing' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
}

export class DocumentationIndexingService {
  private readonly logger: Logger;
  private indexingProgress: IndexingProgress = {
    totalDocuments: 0,
    processedDocuments: 0,
    failedDocuments: 0,
    status: 'idle'
  };

  // Sample documentation sources for different Optimizely products
  private readonly documentationSources: DocumentSource[] = [
    // Configured Commerce
    {
      url: 'https://docs.optimizely.com/configured-commerce/docs/handler-chain-pattern',
      product: 'configured-commerce',
      contentType: 'documentation',
      title: 'Handler Chain Pattern',
      tags: ['architecture', 'patterns', 'handlers']
    },
    {
      url: 'https://docs.optimizely.com/configured-commerce/docs/extension-development',
      product: 'configured-commerce',
      contentType: 'documentation',
      title: 'Extension Development Guide',
      tags: ['development', 'extensions', 'customization']
    },
    {
      url: 'https://docs.optimizely.com/configured-commerce/docs/blueprint-development',
      product: 'configured-commerce',
      contentType: 'documentation',
      title: 'Blueprint Development',
      tags: ['frontend', 'blueprints', 'development']
    },

    // CMS PaaS
    {
      url: 'https://docs.optimizely.com/content-management-system/docs/content-types',
      product: 'cms-paas',
      contentType: 'documentation',
      title: 'Content Types Overview',
      tags: ['content-types', 'modeling', 'cms']
    },
    {
      url: 'https://docs.optimizely.com/content-management-system/docs/mvc-templates',
      product: 'cms-paas',
      contentType: 'documentation',
      title: 'MVC Templates and Controllers',
      tags: ['mvc', 'templates', 'development']
    },

    // Web Experimentation
    {
      url: 'https://docs.optimizely.com/web-experimentation/docs/javascript-sdk',
      product: 'web-experimentation',
      contentType: 'documentation',
      title: 'JavaScript SDK Reference',
      tags: ['sdk', 'javascript', 'implementation']
    },
    {
      url: 'https://docs.optimizely.com/web-experimentation/docs/experiment-setup',
      product: 'web-experimentation',
      contentType: 'tutorial',
      title: 'Setting up Experiments',
      tags: ['experiments', 'setup', 'getting-started']
    },

    // Feature Experimentation
    {
      url: 'https://docs.optimizely.com/feature-experimentation/docs/node-sdk',
      product: 'feature-experimentation',
      contentType: 'documentation',
      title: 'Node.js SDK Documentation',
      tags: ['sdk', 'nodejs', 'feature-flags']
    },

    // DXP
    {
      url: 'https://docs.optimizely.com/digital-experience-platform/docs/personalization',
      product: 'dxp',
      contentType: 'documentation',
      title: 'Personalization and Visitor Groups',
      tags: ['personalization', 'targeting', 'visitor-groups']
    }
  ];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Start indexing all documentation sources
   */
  async indexAllDocumentation(): Promise<boolean> {
    if (!chromaDBService.isAvailable() || !openAIClient.isAvailable()) {
      this.logger.warn('ChromaDB or OpenAI not available - cannot index documentation');
      return false;
    }

    try {
      this.indexingProgress = {
        totalDocuments: this.documentationSources.length,
        processedDocuments: 0,
        failedDocuments: 0,
        status: 'indexing',
        startTime: new Date()
      };

      this.logger.info('Starting documentation indexing', {
        totalSources: this.documentationSources.length
      });

      const chunks: DocumentChunk[] = [];
      
      for (const source of this.documentationSources) {
        try {
          this.indexingProgress.currentDocument = source.title || source.url;
          this.logger.debug(`Processing: ${source.title || source.url}`);

          const documentChunks = await this.processDocumentSource(source);
          chunks.push(...documentChunks);
          
          this.indexingProgress.processedDocuments++;
        } catch (error) {
          this.logger.error(`Failed to process document: ${source.url}`, error as Error);
          this.indexingProgress.failedDocuments++;
        }
      }

      // Add all chunks to ChromaDB
      if (chunks.length > 0) {
        const success = await chromaDBService.addDocuments(chunks);
        if (!success) {
          throw new Error('Failed to add documents to ChromaDB');
        }
      }

      this.indexingProgress.status = 'completed';
      this.indexingProgress.endTime = new Date();

      this.logger.info('Documentation indexing completed', {
        totalProcessed: this.indexingProgress.processedDocuments,
        totalFailed: this.indexingProgress.failedDocuments,
        chunksCreated: chunks.length,
        duration: this.indexingProgress.endTime.getTime() - this.indexingProgress.startTime!.getTime()
      });

      return true;

    } catch (error) {
      this.indexingProgress.status = 'failed';
      this.indexingProgress.endTime = new Date();
      this.logger.error('Documentation indexing failed', error as Error);
      return false;
    }
  }

  /**
   * Process a single documentation source and create chunks
   */
  private async processDocumentSource(source: DocumentSource): Promise<DocumentChunk[]> {
    try {
      // For demo purposes, create sample content chunks
      // In a real implementation, this would fetch and parse the actual documentation
      const sampleContent = this.generateSampleContent(source);
      
      const chunks: DocumentChunk[] = [];
      
      // Split content into chunks (simulate chunking strategy)
      const contentChunks = this.chunkContent(sampleContent, 500); // 500 chars per chunk
      
      for (let i = 0; i < contentChunks.length; i++) {
        const chunkContent = contentChunks[i];
        if (!chunkContent) continue;
        
        const chunkId = `${source.product}_${Date.now()}_${i}`;
        const chunk: DocumentChunk = {
          id: chunkId,
          content: chunkContent,
          metadata: {
            product: source.product,
            url: source.url,
            title: source.title || `${source.product} Documentation`,
            section: `Section ${i + 1}`,
            lastUpdated: new Date().toISOString(),
            contentType: source.contentType,
            tags: source.tags || []
          }
        };
        
        chunks.push(chunk);
      }

      return chunks;

    } catch (error) {
      this.logger.error(`Failed to process document source: ${source.url}`, error as Error);
      return [];
    }
  }

  /**
   * Generate sample content for demonstration
   * In production, this would fetch real documentation content
   */
  private generateSampleContent(source: DocumentSource): string {
    const productName = source.product.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    switch (source.product) {
      case 'configured-commerce':
        return `
# ${source.title || 'Configured Commerce Documentation'}

${productName} provides a robust e-commerce platform with extensible architecture. 

## Handler Chain Pattern
The handler chain pattern is fundamental to extending commerce functionality. Each handler in the chain processes requests and can modify or extend behavior.

### Key Components:
- HandlerChainManager: Orchestrates handler execution
- IHandlerFactory: Creates handler instances
- Custom handlers: Implement business logic

### Best Practices:
- Always call base.Execute() when overriding handlers
- Use dependency injection for handler dependencies
- Implement proper error handling in custom handlers
- Follow the single responsibility principle

### Code Example:
\`\`\`csharp
public class CustomOrderHandler : HandlerBase<ProcessOrderParameter, ProcessOrderResult>
{
    public override ProcessOrderResult Execute(ProcessOrderParameter parameter)
    {
        // Custom logic here
        var result = base.Execute(parameter);
        // Additional processing
        return result;
    }
}
\`\`\`

This pattern ensures maintainability and extensibility in commerce applications.`;

      case 'cms-paas':
        return `
# ${source.title || 'CMS Documentation'}

${productName} enables content management with strongly-typed models and MVC architecture.

## Content Types
Content types define the structure and properties of your content. Use the ContentType attribute to register types.

### Creating Content Types:
- Inherit from PageData or BlockData
- Use Display attributes for editor labels
- Implement validation with DataAnnotations
- Group properties using GroupName

### Best Practices:
- Use strongly-typed models
- Implement IContentRepository for data access
- Cache content appropriately
- Follow naming conventions

### Example:
\`\`\`csharp
[ContentType(DisplayName = "Article Page", GUID = "GUID-HERE")]
public class ArticlePage : PageData
{
    [Display(Name = "Heading", GroupName = SystemTabNames.Content)]
    public virtual string Heading { get; set; }
    
    [Display(Name = "Body", GroupName = SystemTabNames.Content)]
    public virtual XhtmlString Body { get; set; }
}
\`\`\``;

      case 'web-experimentation':
        return `
# ${source.title || 'Web Experimentation Documentation'}

${productName} enables A/B testing and experimentation on web applications.

## JavaScript SDK
The JavaScript SDK provides methods to activate experiments and track events.

### Key Methods:
- activate(): Get variation for user
- track(): Send conversion events
- isFeatureEnabled(): Check feature flags
- getVariation(): Get specific variation

### Implementation:
\`\`\`javascript
import optimizely from '@optimizely/optimizely-sdk';

const optimizelyClient = optimizely.createInstance({
  datafile: 'your-datafile-url'
});

// Activate experiment
const variation = optimizelyClient.activate('experiment_key', 'user_id');

// Track conversion
optimizelyClient.track('conversion_event', 'user_id');
\`\`\`

### Best Practices:
- Initialize client once and reuse
- Handle errors gracefully
- Use consistent user IDs
- Track meaningful events`;

      default:
        return `
# ${source.title || 'Optimizely Documentation'}

${productName} documentation and implementation guide.

## Overview
This documentation covers the key concepts and implementation patterns for ${productName}.

### Getting Started:
1. Install required packages
2. Configure your environment  
3. Implement basic functionality
4. Test and deploy

### Best Practices:
- Follow the official guidelines
- Use recommended patterns
- Implement proper error handling
- Write comprehensive tests

This serves as a foundation for building with ${productName}.`;
    }
  }

  /**
   * Split content into manageable chunks
   */
  private chunkContent(content: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const paragraphs = content.split('\n\n');
    
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
  }

  /**
   * Index specific products only
   */
  async indexProductDocumentation(products: OptimizelyProduct[]): Promise<boolean> {
    const filteredSources = this.documentationSources.filter(source => 
      products.includes(source.product)
    );

    if (filteredSources.length === 0) {
      this.logger.warn('No documentation sources found for specified products', { products });
      return false;
    }

    // Temporarily replace sources for targeted indexing
    const originalSources = [...this.documentationSources];
    (this as any).documentationSources = filteredSources;
    
    const result = await this.indexAllDocumentation();
    
    // Restore original sources
    (this as any).documentationSources = originalSources;
    
    return result;
  }

  /**
   * Get indexing progress
   */
  getIndexingProgress(): IndexingProgress {
    return { ...this.indexingProgress };
  }

  /**
   * Check if indexing is in progress
   */
  isIndexing(): boolean {
    return this.indexingProgress.status === 'indexing';
  }

  /**
   * Clear all indexed documentation
   */
  async clearIndex(): Promise<boolean> {
    if (!chromaDBService.isAvailable()) {
      return false;
    }

    try {
      const collections = ['commerce', 'cms-paas', 'cms-saas', 'experimentation', 'dxp', 'platform'];
      
      for (const product of collections) {
        await chromaDBService.clearCollection(product);
      }

      this.logger.info('Documentation index cleared');
      return true;
    } catch (error) {
      this.logger.error('Failed to clear documentation index', error as Error);
      return false;
    }
  }

  /**
   * Get indexing statistics
   */
  async getIndexingStats() {
    if (!chromaDBService.isAvailable()) {
      return null;
    }

    try {
      const stats = await chromaDBService.getCollectionStats();
      return {
        collections: stats,
        totalDocuments: Object.values(stats).reduce((sum: number, stat: any) => sum + (stat.documentCount || 0), 0),
        lastIndexed: this.indexingProgress.endTime,
        indexingStatus: this.indexingProgress.status
      };
    } catch (error) {
      this.logger.error('Failed to get indexing stats', error as Error);
      return null;
    }
  }
}

// Singleton instance for global use
export const documentationIndexingService = new DocumentationIndexingService(
  console as any // Will be replaced with proper logger when used
);