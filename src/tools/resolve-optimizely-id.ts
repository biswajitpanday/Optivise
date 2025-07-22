
import { OptimizelyProduct, OptimizelyToolContextSchema } from '@/types/index.js';
import type { Logger } from '@/utils/logger.js';
import type { ServerConfig, OptimizelyToolContext } from '@/types/index.js';

export class ResolveOptimizelyIdTool {
  private logger: Logger;
  private config: ServerConfig;
  private productKeywords: Map<OptimizelyProduct, string[]>;

  constructor(config: ServerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.productKeywords = new Map();
    this.initializeProductKeywords();
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing ResolveOptimizelyIdTool...', {
      crawlerEnabled: this.config.crawler?.enabled
    });
    // Initialize any resources needed for the tool
    this.logger.info('ResolveOptimizelyIdTool initialized successfully');
  }

  async execute(args: unknown): Promise<{ content: { text: string } }> {
    try {
      // Validate input
      const validatedArgs = OptimizelyToolContextSchema.parse(args);
      this.logger.debug('ResolveOptimizelyIdTool executed', { args: validatedArgs });

      const context: OptimizelyToolContext = {
        query: validatedArgs.query,
        ...(validatedArgs.product && { product: validatedArgs.product }),
        ...(validatedArgs.category && { category: validatedArgs.category }),
        ...(validatedArgs.version && { version: validatedArgs.version }),
        ...(validatedArgs.maxResults && { maxResults: validatedArgs.maxResults }),
      };
      
      const result = await this.resolveProductFromQuery(context);
      
      return {
        content: {
          text: JSON.stringify(result, null, 2),
        },
      };
    } catch (error) {
      this.logger.error('Error in ResolveOptimizelyIdTool', { error, args });
      throw error;
    }
  }

  private async resolveProductFromQuery(context: OptimizelyToolContext): Promise<{
    resolvedProducts: Array<{
      product: OptimizelyProduct;
      confidence: number;
      matchedKeywords: string[];
    }>;
    suggestedQuery: string;
    documentationPaths: string[];
  }> {
    const query = context.query.toLowerCase();
    const matches: Array<{
      product: OptimizelyProduct;
      confidence: number;
      matchedKeywords: string[];
    }> = [];

    // If specific product is provided, prioritize it
    if (context.product) {
      matches.push({
        product: context.product,
        confidence: 1.0,
        matchedKeywords: [context.product],
      });
    } else {
      // Analyze query for product keywords
      for (const [product, keywords] of this.productKeywords) {
        const matchedKeywords = keywords.filter(keyword => 
          query.includes(keyword.toLowerCase())
        );
        
        if (matchedKeywords.length > 0) {
          const confidence = matchedKeywords.length / keywords.length;
          matches.push({
            product,
            confidence,
            matchedKeywords,
          });
        }
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    // Generate suggested query refinements
    const suggestedQuery = this.generateSuggestedQuery(query, matches);

    // Generate documentation paths
    const documentationPaths = this.generateDocumentationPaths(matches, query);

    return {
      resolvedProducts: matches.slice(0, 3), // Top 3 matches
      suggestedQuery,
      documentationPaths,
    };
  }

  private initializeProductKeywords(): void {
    this.productKeywords.set(OptimizelyProduct.CONFIGURED_COMMERCE, [
      'configured commerce',
      'b2b commerce',
      'commerce',
      'e-commerce',
      'catalog',
      'pricing',
      'cart',
      'checkout',
      'order',
      'product',
      'inventory',
      'customer',
      'account',
      'website',
      'storefront',
      'payment',
      'shipping',
      'tax',
      'promotion',
      'discount',
    ]);

    this.productKeywords.set(OptimizelyProduct.CMS_PAAS, [
      'cms',
      'content management',
      'episerver',
      'content',
      'pages',
      'blocks',
      'media',
      'assets',
      'editor',
      'publishing',
      'workflow',
      'versioning',
      'localization',
      'globalization',
      'search',
      'find',
      'paas',
    ]);

    this.productKeywords.set(OptimizelyProduct.CMS_SAAS, [
      'cms saas',
      'content cloud',
      'saas',
      'cloud cms',
      'headless',
      'api',
      'content delivery',
      'cdn',
      'webhook',
      'graphql',
      'rest api',
    ]);

    this.productKeywords.set(OptimizelyProduct.ODP, [
      'odp',
      'data platform',
      'customer data',
      'audience',
      'segment',
      'real-time',
      'event',
      'tracking',
      'analytics',
      'profile',
      'identity',
      'integration',
    ]);

    this.productKeywords.set(OptimizelyProduct.EXPERIMENTATION, [
      'experimentation',
      'experiment',
      'feature flag',
      'feature toggle',
      'a/b test',
      'split test',
      'variation',
      'rollout',
      'targeting',
      'metrics',
      'conversion',
      'statistical',
    ]);

    this.productKeywords.set(OptimizelyProduct.COMMERCE_CONNECT, [
      'commerce connect',
      'integration',
      'connector',
      'sync',
      'import',
      'export',
      'mapping',
      'transformation',
    ]);
  }

  private generateSuggestedQuery(originalQuery: string, matches: any[]): string {
    if (matches.length === 0) {
      return `Try being more specific about the Optimizely product: "${originalQuery} configured commerce" or "${originalQuery} cms"`;
    }

    const topMatch = matches[0];
    return `${originalQuery} ${topMatch.product.replace('-', ' ')}`;
  }

  private generateDocumentationPaths(matches: any[], query: string): string[] {
    const paths: string[] = [];
    
    for (const match of matches.slice(0, 2)) {
      const product = match.product;
      
      // Generate potential documentation paths based on query content
      if (query.includes('api')) {
        paths.push(`/${product}/api-reference`);
      }
      if (query.includes('tutorial') || query.includes('guide')) {
        paths.push(`/${product}/developer-guide`);
      }
      if (query.includes('integration')) {
        paths.push(`/${product}/integration-guide`);
      }
      if (query.includes('troubleshoot') || query.includes('error')) {
        paths.push(`/${product}/troubleshooting`);
      }
      
      // Default path
      paths.push(`/${product}/overview`);
    }

    return [...new Set(paths)]; // Remove duplicates
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up ResolveOptimizelyIdTool...');
    // Cleanup any resources
  }
} 