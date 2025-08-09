/**
 * Debug Helper Tool (optidev_debug_helper)
 * Provides intelligent debugging assistance for Optimizely-related issues
 */

import { chromaDBService } from '../integrations/chromadb-client.js';
import { ProductDetectionService } from '../services/product-detection-service.js';
import { RuleIntelligenceService } from '../services/rule-intelligence-service.js';
import type { Logger, LLMRequest, PromptContext, ContextBlock } from '../types/index.js';
import { RequestFormatter } from '../formatters/request-formatter.js';
import { FormatterTemplates } from '../formatters/templates.js';
import { z } from 'zod';

export const DebugHelperRequestSchema = z.object({
  bugDescription: z.string().min(1, 'bugDescription is required'),
  errorMessages: z.array(z.string()).optional(),
  codeContext: z.string().optional(),
  userPrompt: z.string().optional(),
  promptContext: z.any().optional(),
  projectPath: z.string().optional()
});

export interface DebugHelperRequest {
  bugDescription: string;
  errorMessages?: string[];
  codeContext?: string;
  userPrompt?: string;
  promptContext?: PromptContext;
  projectPath?: string;
}

export interface BugAnalysis {
  category: string;
  likelyCauses: string[];
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedComponents: string[];
}

export interface DebuggingStep {
  step: number;
  action: string;
  command?: string;
  expectedResult: string;
  troubleshooting?: string[];
}

export interface Solution {
  title: string;
  description: string;
  codeExample?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
}

export interface DebugHelperResponse {
  detectedProducts: string[];
  bugAnalysis: BugAnalysis;
  debuggingSteps: DebuggingStep[];
  solutions: Solution[];
  preventionTips: string[];
  relatedDocumentation: Array<{
    title: string;
    url: string;
    relevance: number;
  }>;
  monitoringRecommendations: string[];
  llm_request?: LLMRequest;
}

export class DebugHelperTool {
  private productDetection: ProductDetectionService;
  private logger: Logger;
  private ruleService: RuleIntelligenceService;

  // Common error patterns and their categories
  private static readonly ERROR_PATTERNS = {
    'commerce': {
      'payment': /payment|gateway|checkout|transaction|billing/i,
      'cart': /cart|basket|shopping|order|product/i,
      'inventory': /inventory|stock|quantity|availability/i,
      'pricing': /price|discount|promotion|tax|currency/i,
      'shipping': /shipping|delivery|fulfillment/i
    },
    'cms': {
      'content': /content|page|block|template|property/i,
      'publishing': /publish|unpublish|workflow|approval/i,
      'media': /media|image|file|asset|blob/i,
      'search': /search|index|elastic|solr|lucene/i,
      'cache': /cache|caching|expired|invalidat/i
    },
    'experimentation': {
      'tracking': /track|event|goal|conversion|metric/i,
      'variation': /variation|experiment|test|feature|flag/i,
      'audience': /audience|targeting|segment|condition/i,
      'statistics': /statistic|significant|confidence|sample/i
    },
    'platform': {
      'authentication': /auth|login|token|credential|permission/i,
      'api': /api|endpoint|request|response|http/i,
      'database': /database|sql|query|connection|timeout/i,
      'performance': /performance|slow|timeout|memory|cpu/i,
      'deployment': /deploy|environment|configuration|setting/i
    }
  };

  constructor(logger: Logger) {
    this.logger = logger;
    this.productDetection = new ProductDetectionService(logger);
    this.ruleService = new RuleIntelligenceService(logger);
  }

  async initialize(): Promise<void> {
    await this.productDetection.initialize();
    await this.ruleService.initialize();
    this.logger.info('Debug Helper Tool initialized');
  }

  /**
   * Analyze bug and provide debugging assistance
   */
  async analyzeBug(request: DebugHelperRequest): Promise<DebugHelperResponse> {
    try {
      const parsed = DebugHelperRequestSchema.safeParse(request);
      if (!parsed.success) {
        throw parsed.error;
      }
      this.logger.info('Analyzing bug for debugging assistance');

      // 1. Detect relevant products
      const detectedProducts = await this.detectProducts(request);

      // 2. Analyze the bug
      const bugAnalysis = await this.analyzeBugPattern(request, detectedProducts);

      // 3. Generate debugging steps
      const debuggingSteps = this.generateDebuggingSteps(bugAnalysis, request);

      // 4. Suggest solutions
      const solutions = await this.generateSolutions(bugAnalysis, request, detectedProducts);

      // 5. Provide prevention tips
      const preventionTips = this.generatePreventionTips(bugAnalysis, detectedProducts);

      // 6. Find related documentation
      const relatedDocumentation = await this.findRelatedDocumentation(
        request.bugDescription,
        detectedProducts
      );

      // 7. Generate monitoring recommendations
      const monitoringRecommendations = this.generateMonitoringRecommendations(
        bugAnalysis,
        detectedProducts
      );

      const base: DebugHelperResponse = {
        detectedProducts,
        bugAnalysis,
        debuggingSteps,
        solutions,
        preventionTips,
        relatedDocumentation,
        monitoringRecommendations
      };

      const blocks: ContextBlock[] = [
        { type: 'analysis', title: 'Bug Analysis', content: JSON.stringify(bugAnalysis).slice(0, 4000), relevance: 0.95 },
        { type: 'analysis', title: 'Debugging Steps', content: JSON.stringify(debuggingSteps).slice(0, 4000), relevance: 0.9 }
      ];
      if (request.projectPath) {
        try {
          const rules = await this.ruleService.analyzeIDERules(request.projectPath);
          blocks.push({
            type: 'rules',
            title: 'IDE Rules Summary',
            content: JSON.stringify({ files: rules.foundFiles, lintWarnings: rules.lintWarnings, conflicts: rules.conflicts, proposed: rules.proposedCursorRules?.slice(0, 2000), diff: rules.proposedCursorRulesDiff?.slice(0, 2000) }).slice(0, 4000),
            source: request.projectPath,
            relevance: 0.6
          });
        } catch {}
      }
      if (relatedDocumentation?.length) {
        blocks.push({ type: 'documentation', title: 'Related Documentation', content: JSON.stringify(relatedDocumentation).slice(0, 4000), relevance: 0.7 });
      }

      base.llm_request = RequestFormatter.format({
        toolName: 'optidev_debug_helper',
        userPrompt: request.userPrompt || request.bugDescription,
        promptContext: request.promptContext,
        summary: 'Diagnose and resolve the bug with steps and code-level guidance.',
        products: detectedProducts,
        blocks,
        citations: relatedDocumentation?.filter(d => d.url && d.title).map(d => ({ title: d.title, url: d.url })),
        template: FormatterTemplates.optidev_debug_helper
      });

      return base;

    } catch (error) {
      this.logger.error('Failed to analyze bug for debugging assistance', error as Error);
      throw error;
    }
  }

  /**
   * Detect relevant products from bug description
   */
  private async detectProducts(request: DebugHelperRequest): Promise<string[]> {
    const context = `${request.bugDescription}\n${request.errorMessages?.join('\n') || ''}\n${request.codeContext || ''}`;
    const detection = await this.productDetection.detectFromPrompt(context);
    return detection.products;
  }

  /**
   * Analyze bug pattern and categorize
   */
  private async analyzeBugPattern(
    request: DebugHelperRequest,
    products: string[]
  ): Promise<BugAnalysis> {
    const description = request.bugDescription.toLowerCase();
    const errorMessages = request.errorMessages?.join(' ').toLowerCase() || '';
    const codeContext = request.codeContext?.toLowerCase() || '';
    const fullContext = `${description} ${errorMessages} ${codeContext}`;

    let bestMatch = { category: 'general', confidence: 0.3, product: 'platform' };

    // Analyze against error patterns
    for (const [product, categories] of Object.entries(DebugHelperTool.ERROR_PATTERNS)) {
      if (products.length === 0 || products.includes(product)) {
        for (const [category, pattern] of Object.entries(categories)) {
          const matches = fullContext.match(pattern);
          if (matches) {
            const confidence = Math.min(0.9, 0.5 + (matches.length * 0.1));
            if (confidence > bestMatch.confidence) {
              bestMatch = { category, confidence, product };
            }
          }
        }
      }
    }

    // Determine severity
    const severity = this.determineSeverity(request, fullContext);

    // Identify likely causes
    const likelyCauses = this.identifyLikelyCauses(bestMatch.category, bestMatch.product, fullContext);

    // Identify affected components
    const affectedComponents = this.identifyAffectedComponents(
      bestMatch.category,
      bestMatch.product,
      fullContext
    );

    return {
      category: bestMatch.category,
      likelyCauses,
      confidence: bestMatch.confidence,
      severity,
      affectedComponents
    };
  }

  /**
   * Determine bug severity
   */
  private determineSeverity(
    request: DebugHelperRequest,
    fullContext: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalKeywords = ['production', 'down', 'crash', 'data loss', 'security', 'breach'];
    const highKeywords = ['error', 'exception', 'fail', 'timeout', 'unable'];
    const mediumKeywords = ['slow', 'incorrect', 'unexpected', 'inconsistent'];

    if (criticalKeywords.some(keyword => fullContext.includes(keyword))) {
      return 'critical';
    }
    if (highKeywords.some(keyword => fullContext.includes(keyword))) {
      return 'high';
    }
    if (mediumKeywords.some(keyword => fullContext.includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Identify likely causes based on category and context
   */
  private identifyLikelyCauses(category: string, product: string, context: string): string[] {
    const causeMap: Record<string, Record<string, string[]>> = {
      commerce: {
        payment: [
          'Payment gateway configuration issues',
          'API credentials expired or invalid',
          'Network connectivity problems',
          'Currency or tax calculation errors'
        ],
        cart: [
          'Session timeout or expiration',
          'Product data synchronization issues',
          'Inventory validation failures',
          'Cache invalidation problems'
        ],
        pricing: [
          'Promotion rule conflicts',
          'Tax calculation service unavailable',
          'Currency conversion API issues',
          'Price rule execution order problems'
        ]
      },
      cms: {
        content: [
          'Content property validation errors',
          'Template compilation issues',
          'Missing or corrupted content data',
          'Content type definition problems'
        ],
        publishing: [
          'Workflow approval process stuck',
          'Publishing service unavailable',
          'Content validation failures',
          'Cache synchronization issues'
        ],
        cache: [
          'Cache server connectivity issues',
          'Cache invalidation logic errors',
          'Memory pressure on cache servers',
          'Cache key collision problems'
        ]
      },
      experimentation: {
        tracking: [
          'Event tracking script not loaded',
          'Goal tracking configuration errors',
          'Analytics service connectivity issues',
          'Event data validation failures'
        ],
        variation: [
          'Experiment configuration conflicts',
          'Feature flag evaluation errors',
          'Audience targeting logic issues',
          'Variation assignment inconsistencies'
        ]
      }
    };

    const productCauses = causeMap[product as keyof typeof causeMap];
    if (productCauses?.[category]) {
      return productCauses[category];
    }

    // Generic causes
    return [
      'Configuration parameter issues',
      'Service dependency unavailable',
      'Data validation or format errors',
      'Authentication or authorization problems'
    ];
  }

  /**
   * Identify affected components
   */
  private identifyAffectedComponents(category: string, product: string, context: string): string[] {
    const components: string[] = [];

    // Product-specific components
    if (product === 'commerce') {
      components.push('Commerce Manager', 'Order Processing', 'Payment Services');
    } else if (product === 'cms') {
      components.push('Content Management', 'Publishing Pipeline', 'Media Storage');
    } else if (product === 'experimentation') {
      components.push('Experiment Engine', 'Analytics Tracker', 'Audience Evaluation');
    }

    // Category-specific components
    if (context.includes('database')) components.push('Database Layer');
    if (context.includes('api')) components.push('API Layer');
    if (context.includes('ui') || context.includes('frontend')) components.push('User Interface');
    if (context.includes('cache')) components.push('Caching Layer');

    return [...new Set(components)];
  }

  /**
   * Generate debugging steps
   */
  private generateDebuggingSteps(bugAnalysis: BugAnalysis, request: DebugHelperRequest): DebuggingStep[] {
    const steps: DebuggingStep[] = [];
    let stepNumber = 1;

    // Step 1: Gather information
    steps.push({
      step: stepNumber++,
      action: 'Gather detailed error information',
      expectedResult: 'Complete error logs and stack traces collected',
      troubleshooting: [
        'Check application logs for the time period when the issue occurred',
        'Look for related error messages or warnings',
        'Note the exact time and frequency of the issue'
      ]
    });

    // Step 2: Check system status
    steps.push({
      step: stepNumber++,
      action: 'Verify system and service status',
      command: 'curl -I https://your-service-endpoint/health',
      expectedResult: 'All dependent services responding normally',
      troubleshooting: [
        'Check if all required services are running',
        'Verify network connectivity to external services',
        'Confirm database connectivity'
      ]
    });

    // Category-specific debugging steps
    if (bugAnalysis.category === 'payment') {
      steps.push({
        step: stepNumber++,
        action: 'Verify payment gateway configuration',
        expectedResult: 'Payment gateway credentials and settings are correct',
        troubleshooting: [
          'Check API keys and certificates',
          'Verify endpoint URLs and versions',
          'Test with payment gateway\'s sandbox environment'
        ]
      });
    } else if (bugAnalysis.category === 'cache') {
      steps.push({
        step: stepNumber++,
        action: 'Analyze cache behavior',
        command: 'redis-cli monitor # if using Redis',
        expectedResult: 'Cache operations are working correctly',
        troubleshooting: [
          'Check cache hit/miss ratios',
          'Verify cache expiration settings',
          'Look for cache key conflicts'
        ]
      });
    } else if (bugAnalysis.category === 'database') {
      steps.push({
        step: stepNumber++,
        action: 'Examine database performance and queries',
        expectedResult: 'Database queries executing within acceptable time limits',
        troubleshooting: [
          'Check for slow query logs',
          'Verify database connection pool status',
          'Look for table locks or deadlocks'
        ]
      });
    }

    // Step: Reproduce the issue
    steps.push({
      step: stepNumber++,
      action: 'Reproduce the issue in a controlled environment',
      expectedResult: 'Issue consistently reproduced with known steps',
      troubleshooting: [
        'Document exact steps to reproduce',
        'Test with different user accounts or data',
        'Try reproducing in different environments'
      ]
    });

    // Final step: Implement and test fix
    steps.push({
      step: stepNumber++,
      action: 'Implement fix and verify resolution',
      expectedResult: 'Issue resolved and system functioning normally',
      troubleshooting: [
        'Test the fix thoroughly before deploying',
        'Monitor system after deployment',
        'Have rollback plan ready'
      ]
    });

    return steps;
  }

  /**
   * Generate solutions based on bug analysis
   */
  private async generateSolutions(
    bugAnalysis: BugAnalysis,
    request: DebugHelperRequest,
    products: string[]
  ): Promise<Solution[]> {
    const solutions: Solution[] = [];

    // Get contextual solutions from documentation if available
    if (chromaDBService.isAvailable()) {
      const relatedDocs = await chromaDBService.searchDocuments(
        `${bugAnalysis.category} ${request.bugDescription}`,
        { product: products[0] || 'platform', limit: 2 }
      );
      
      relatedDocs.forEach(doc => {
        solutions.push({
          title: `Documentation-based solution: ${doc.metadata.title}`,
          description: doc.content.substring(0, 200) + '...',
          difficulty: 'medium',
          estimatedTime: '30-60 minutes'
        });
      });
    }

    // Generate category-specific solutions
    solutions.push(...this.getCategorySpecificSolutions(bugAnalysis.category, products[0] || 'platform'));

    // Add generic solutions if no specific ones found
    if (solutions.length === 0) {
      solutions.push(...this.getGenericSolutions(bugAnalysis));
    }

    return solutions.slice(0, 5); // Limit to top 5 solutions
  }

  /**
   * Get category-specific solutions
   */
  private getCategorySpecificSolutions(category: string, product: string): Solution[] {
    const solutionMap: Record<string, Solution[]> = {
      payment: [
        {
          title: 'Update payment gateway configuration',
          description: 'Review and update payment gateway API credentials and endpoint configurations',
          codeExample: `
// Update payment configuration
paymentConfig.update({
  apiKey: 'your-new-api-key',
  endpoint: 'https://api.paymentgateway.com/v2',
  timeout: 30000
});`,
          difficulty: 'easy',
          estimatedTime: '15-30 minutes'
        }
      ],
      cache: [
        {
          title: 'Clear and rebuild cache',
          description: 'Clear existing cache and implement proper cache invalidation strategy',
          codeExample: `
// Clear cache
await cacheService.clear('user-sessions');
await cacheService.clear('product-catalog');

// Rebuild with proper TTL
await cacheService.set('key', data, { ttl: 3600 });`,
          difficulty: 'easy',
          estimatedTime: '10-20 minutes'
        }
      ],
      database: [
        {
          title: 'Optimize database queries',
          description: 'Add indexes and optimize slow-performing database queries',
          codeExample: `
-- Add index for frequently queried columns
CREATE INDEX idx_orders_customer_date 
ON orders(customer_id, order_date);

-- Optimize query with proper joins
SELECT o.*, c.name 
FROM orders o 
INNER JOIN customers c ON o.customer_id = c.id 
WHERE o.order_date >= '2023-01-01';`,
          difficulty: 'medium',
          estimatedTime: '1-2 hours'
        }
      ]
    };

    return solutionMap[category] || [];
  }

  /**
   * Get generic solutions
   */
  private getGenericSolutions(bugAnalysis: BugAnalysis): Solution[] {
    return [
      {
        title: 'Restart affected services',
        description: 'Restart the application and dependent services to clear temporary issues',
        difficulty: 'easy',
        estimatedTime: '5-10 minutes'
      },
      {
        title: 'Check configuration settings',
        description: 'Review and validate all configuration parameters and environment variables',
        difficulty: 'easy',
        estimatedTime: '15-30 minutes'
      },
      {
        title: 'Update dependencies',
        description: 'Check for and apply available updates to libraries and frameworks',
        difficulty: 'medium',
        estimatedTime: '30-60 minutes'
      }
    ];
  }

  /**
   * Generate prevention tips
   */
  private generatePreventionTips(bugAnalysis: BugAnalysis, products: string[]): string[] {
    const tips = [
      'Implement comprehensive error logging and monitoring',
      'Set up automated health checks for critical services',
      'Use configuration management tools for consistent deployments',
      'Implement proper error handling and graceful degradation'
    ];

    // Category-specific tips
    if (bugAnalysis.category === 'payment') {
      tips.push('Test payment flows in sandbox before production deployment');
      tips.push('Implement payment retry logic with exponential backoff');
    } else if (bugAnalysis.category === 'cache') {
      tips.push('Monitor cache hit ratios and set appropriate TTL values');
      tips.push('Implement cache warming strategies for critical data');
    } else if (bugAnalysis.category === 'database') {
      tips.push('Regular database performance monitoring and optimization');
      tips.push('Implement connection pooling and query timeout handling');
    }

    return tips;
  }

  /**
   * Find related documentation
   */
  private async findRelatedDocumentation(
    bugDescription: string,
    products: string[]
  ): Promise<DebugHelperResponse['relatedDocumentation']> {
    if (!chromaDBService.isAvailable()) {
      return [];
    }

    const docs = await chromaDBService.searchDocuments(bugDescription, {
      product: products[0],
      limit: 3,
      threshold: 0.6
    });

    return docs.map(doc => ({
      title: doc.metadata.title || 'Related Documentation',
      url: doc.metadata.url || '#',
      relevance: doc.similarity
    }));
  }

  /**
   * Generate monitoring recommendations
   */
  private generateMonitoringRecommendations(
    bugAnalysis: BugAnalysis,
    products: string[]
  ): string[] {
    const recommendations = [
      'Set up application performance monitoring (APM)',
      'Configure log aggregation and analysis',
      'Implement real-time alerting for critical errors',
      'Monitor system resource usage (CPU, memory, disk)'
    ];

    // Product-specific monitoring
    if (products.includes('commerce')) {
      recommendations.push('Monitor payment gateway response times and success rates');
      recommendations.push('Track order completion funnel metrics');
    }
    if (products.includes('cms')) {
      recommendations.push('Monitor content publishing pipeline performance');
      recommendations.push('Track cache hit rates and content delivery times');
    }
    if (products.includes('experimentation')) {
      recommendations.push('Monitor experiment assignment and goal tracking');
      recommendations.push('Track statistical significance and sample sizes');
    }

    return recommendations;
  }
}