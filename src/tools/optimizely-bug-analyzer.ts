import { z } from 'zod';
import type { Logger } from '@/utils/logger.js';
import type { ServerConfig } from '@/types/index.js';
import type { OptimizelyPattern } from '../engine/optimizely-pattern-crawler.js';

const AnalyzeOptimizelyBugArgsSchema = z.object({
  bugDescription: z.string().min(10).max(1000),
  errorMessage: z.string().max(500).optional(),
  product: z.enum(['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation', 'auto-detect']).default('auto-detect'),
  context: z.string().max(300).optional(),
  includeCode: z.boolean().default(true),
});

type AnalyzeOptimizelyBugArgs = z.infer<typeof AnalyzeOptimizelyBugArgsSchema>;

interface BugAnalysisResult {
  probableProduct: string;
  category: string;
  commonCauses: string[];
  solutions: string[];
  relevantPatterns: OptimizelyPattern[];
  preventionTips: string[];
  additionalResources: string[];
}

export class OptimizelyBugAnalyzer {
  private logger: Logger;

  constructor(_config: ServerConfig, logger: Logger) {
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing OptimizelyBugAnalyzer...');
    this.logger.info('OptimizelyBugAnalyzer initialized successfully');
  }

  async execute(args: unknown): Promise<{ content: { text: string } }> {
    try {
      // Validate input
      const validatedArgs = AnalyzeOptimizelyBugArgsSchema.parse(args);
      this.logger.info('Analyzing Optimizely bug', { 
        description: validatedArgs.bugDescription.substring(0, 100),
        product: validatedArgs.product 
      });

      // Analyze the bug
      const analysis = await this.analyzeBug(validatedArgs);
      
      return {
        content: {
          text: this.formatBugAnalysis(analysis, validatedArgs),
        },
      };
    } catch (error) {
      this.logger.error('Error in OptimizelyBugAnalyzer', { error, args });
      throw error;
    }
  }

  /**
   * Analyze the bug description and provide solutions
   */
  private async analyzeBug(args: AnalyzeOptimizelyBugArgs): Promise<BugAnalysisResult> {
    const description = args.bugDescription.toLowerCase();
    const errorMessage = args.errorMessage?.toLowerCase() || '';
    const context = args.context?.toLowerCase() || '';

    // Detect product if auto-detect is selected
    const probableProduct = args.product === 'auto-detect' 
      ? this.detectProduct(description, errorMessage, context)
      : args.product;

    // Categorize the bug
    const category = this.categorizeBug(description, errorMessage);

    // Get common causes and solutions
    const commonCauses = this.getCommonCauses(category, probableProduct, description);
    const solutions = this.getSolutions(category, probableProduct, description, errorMessage);

    // Find relevant patterns
    const relevantPatterns = await this.findRelevantPatterns(description, probableProduct, category);

    // Get prevention tips
    const preventionTips = this.getPreventionTips(category, probableProduct);

    // Get additional resources
    const additionalResources = this.getAdditionalResources(category, probableProduct);

    return {
      probableProduct,
      category,
      commonCauses,
      solutions,
      relevantPatterns,
      preventionTips,
      additionalResources
    };
  }

  /**
   * Detect the Optimizely product from bug description
   */
  private detectProduct(description: string, errorMessage: string, context: string): string {
    const fullText = `${description} ${errorMessage} ${context}`;

    // Commerce indicators
    if (this.containsAny(fullText, ['commerce', 'pricing', 'cart', 'checkout', 'order', 'catalog', 'pipeline', 'handler'])) {
      return 'configured-commerce';
    }

    // Commerce Connect indicators
    if (this.containsAny(fullText, ['commerce connect', 'episerver commerce', 'service api', 'catalog api'])) {
      return 'commerce-connect';
    }

    // CMS indicators
    if (this.containsAny(fullText, ['cms', 'episerver', 'content', 'page', 'block', 'editor', 'publish'])) {
      return 'cms-paas';
    }

    // CMP indicators
    if (this.containsAny(fullText, ['cmp', 'marketing platform', 'campaign', 'email', 'automation'])) {
      return 'cmp';
    }

    // ODP indicators
    if (this.containsAny(fullText, ['odp', 'audience', 'segment', 'event', 'tracking', 'profile'])) {
      return 'odp';
    }

    // Experimentation indicators
    if (this.containsAny(fullText, ['experiment', 'feature flag', 'variation', 'rollout', 'ab test'])) {
      return 'experimentation';
    }

    // Search & Navigation indicators
    if (this.containsAny(fullText, ['search', 'navigation', 'find', 'index', 'facet'])) {
      return 'search-navigation';
    }

    return 'configured-commerce'; // Default to most common
  }

  /**
   * Categorize the type of bug
   */
  private categorizeBug(description: string, errorMessage: string): string {
    const fullText = `${description} ${errorMessage}`;

    if (this.containsAny(fullText, ['null reference', 'nullreferenceexception', 'object reference not set'])) {
      return 'null-reference';
    }

    if (this.containsAny(fullText, ['performance', 'slow', 'timeout', 'hanging', 'memory'])) {
      return 'performance';
    }

    if (this.containsAny(fullText, ['database', 'sql', 'connection', 'query'])) {
      return 'database';
    }

    if (this.containsAny(fullText, ['api', 'endpoint', 'request', 'response', 'http'])) {
      return 'api';
    }

    if (this.containsAny(fullText, ['configuration', 'config', 'settings', 'environment'])) {
      return 'configuration';
    }

    if (this.containsAny(fullText, ['ui', 'interface', 'display', 'rendering', 'frontend'])) {
      return 'ui';
    }

    if (this.containsAny(fullText, ['integration', 'external', 'third party', 'webhook'])) {
      return 'integration';
    }

    return 'general';
  }

  /**
   * Get common causes for the bug category
   */
  private getCommonCauses(category: string, _product: string, _description: string): string[] {
    const causes: Record<string, string[]> = {
      'null-reference': [
        'Uninitialized objects or dependencies',
        'Missing null checks in handler or pipeline code',
        'Incorrect dependency injection configuration',
        'Missing data in the request context'
      ],
      'performance': [
        'Inefficient database queries or N+1 query problems',
        'Missing caching for frequently accessed data',
        'Blocking operations on the main thread',
        'Large result sets without pagination'
      ],
      'database': [
        'Incorrect connection string configuration',
        'Database schema mismatches',
        'Missing indexes on frequently queried columns',
        'Transaction isolation level issues'
      ],
      'api': [
        'Incorrect API endpoint configuration',
        'Missing authentication or authorization',
        'Malformed request data or headers',
        'API versioning conflicts'
      ],
      'configuration': [
        'Missing or incorrect configuration values',
        'Environment-specific configuration issues',
        'Incorrect service registration in DI container',
        'Missing required configuration sections'
      ],
      'ui': [
        'Missing CSS or JavaScript dependencies',
        'Incorrect template or view model binding',
        'Browser compatibility issues',
        'Missing localization resources'
      ],
      'integration': [
        'Network connectivity issues',
        'Authentication failures with external services',
        'Data format mismatches',
        'Timeout or rate limiting issues'
      ]
    };

    return causes[category] || [
      'Unclear error context or insufficient logging',
      'Missing error handling in custom code',
      'Incorrect implementation of Optimizely patterns',
      'Version compatibility issues'
    ];
  }

  /**
   * Get solutions for the bug
   */
  private getSolutions(category: string, _product: string, _description: string, _errorMessage: string): string[] {
    const solutions: Record<string, string[]> = {
      'null-reference': [
        'Add null checks before accessing objects: `if (obj != null) { ... }`',
        'Use null-conditional operators: `obj?.Property`',
        'Verify dependency injection registrations in Startup.cs',
        'Check that required data is available in the request context'
      ],
      'performance': [
        'Implement caching for frequently accessed data',
        'Use `Include()` methods to prevent N+1 queries',
        'Add database indexes for commonly queried fields',
        'Implement pagination for large result sets'
      ],
      'database': [
        'Verify connection string in appsettings.json',
        'Check database schema matches the model',
        'Review database migration scripts',
        'Ensure proper transaction handling'
      ],
      'api': [
        'Verify API endpoint URLs and HTTP methods',
        'Check authentication tokens and headers',
        'Validate request data format and structure',
        'Review API version compatibility'
      ],
      'configuration': [
        'Check appsettings.json for missing or incorrect values',
        'Verify environment-specific configuration',
        'Review service registrations in Program.cs or Startup.cs',
        'Ensure required configuration sections exist'
      ],
      'ui': [
        'Check for missing CSS/JS references in layout files',
        'Verify view model properties match template bindings',
        'Test in different browsers for compatibility',
        'Check localization resource files'
      ],
      'integration': [
        'Test network connectivity to external services',
        'Verify API keys and authentication credentials',
        'Check data format expectations',
        'Implement retry logic with exponential backoff'
      ]
    };

    return solutions[category] || [
      'Enable detailed logging to get more context',
      'Review the Optimizely documentation for similar issues',
      'Check for recent changes that might have caused the issue',
      'Verify that all dependencies are properly installed and configured'
    ];
  }

  /**
   * Find relevant patterns that might help with the bug
   */
  private async findRelevantPatterns(_description: string, _product: string, _category: string): Promise<OptimizelyPattern[]> {
    try {
      // This would use the pattern crawler to find relevant patterns
      // For now, return empty array as pattern matching would require actual patterns
      return [];
    } catch (error) {
      this.logger.error('Error finding relevant patterns', { error });
      return [];
    }
  }

  /**
   * Get prevention tips for similar bugs
   */
  private getPreventionTips(category: string, _product: string): string[] {
    const tips: Record<string, string[]> = {
      'null-reference': [
        'Always validate input parameters in handlers and pipelines',
        'Use dependency injection instead of manual object creation',
        'Implement comprehensive unit tests for edge cases'
      ],
      'performance': [
        'Monitor database query performance regularly',
        'Implement proper caching strategies',
        'Use profiling tools to identify bottlenecks'
      ],
      'database': [
        'Use Entity Framework migrations for schema changes',
        'Implement proper error handling for database operations',
        'Regular database maintenance and optimization'
      ],
      'configuration': [
        'Use strongly-typed configuration classes',
        'Implement configuration validation on startup',
        'Document all required configuration settings'
      ]
    };

    return tips[category] || [
      'Follow Optimizely development best practices',
      'Implement comprehensive error handling',
      'Regular code reviews and testing'
    ];
  }

  /**
   * Get additional resources for learning more
   */
  private getAdditionalResources(category: string, product: string): string[] {
    const baseUrl = 'https://docs.developers.optimizely.com';
    const resources = [
      `${baseUrl}/${product}/troubleshooting`,
      `${baseUrl}/${product}/best-practices`,
      `${baseUrl}/${product}/developer-guide`
    ];

    if (category === 'performance') {
      resources.push(`${baseUrl}/${product}/performance-optimization`);
    }

    if (category === 'database') {
      resources.push(`${baseUrl}/${product}/data-access`);
    }

    return resources;
  }

  /**
   * Format the bug analysis results
   */
  private formatBugAnalysis(analysis: BugAnalysisResult, args: AnalyzeOptimizelyBugArgs): string {
    let output = `# 🐛 Optimizely Bug Analysis\n\n`;
    
    output += `## Bug Overview\n`;
    output += `**Product:** ${this.formatProductName(analysis.probableProduct)}\n`;
    output += `**Category:** ${this.formatCategoryName(analysis.category)}\n\n`;

    if (args.errorMessage) {
      output += `**Error Message:** \`${args.errorMessage}\`\n\n`;
    }

    output += `## 🔍 Common Causes\n`;
    analysis.commonCauses.forEach((cause, index) => {
      output += `${index + 1}. ${cause}\n`;
    });
    output += '\n';

    output += `## ✅ Recommended Solutions\n`;
    analysis.solutions.forEach((solution, index) => {
      output += `${index + 1}. ${solution}\n`;
    });
    output += '\n';

    if (analysis.relevantPatterns.length > 0) {
      output += `## 📋 Relevant Patterns\n`;
      analysis.relevantPatterns.forEach(pattern => {
        output += `- **${pattern.title}**: ${pattern.description}\n`;
        output += `  - [View Documentation](${pattern.sourceUrl})\n`;
      });
      output += '\n';
    }

    output += `## 🛡️ Prevention Tips\n`;
    analysis.preventionTips.forEach((tip, index) => {
      output += `${index + 1}. ${tip}\n`;
    });
    output += '\n';

    output += `## 📚 Additional Resources\n`;
    analysis.additionalResources.forEach(resource => {
      output += `- [${resource}](${resource})\n`;
    });
    output += '\n';

    output += `## 💡 Next Steps\n`;
    output += `1. **Immediate**: Apply the recommended solutions above\n`;
    output += `2. **Short-term**: Implement prevention measures\n`;
    output += `3. **Long-term**: Review related patterns and best practices\n\n`;

    output += `*Need more help? Visit the [Optimizely Developer Community](https://world.optimizely.com/forum/developer-forum/) for additional support.*`;

    return output;
  }

  /**
   * Helper method to check if text contains any of the given keywords
   */
  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Format product name for display
   */
  private formatProductName(product: string): string {
    const productNames: Record<string, string> = {
      'configured-commerce': 'Configured Commerce',
      'cms-paas': 'CMS (PaaS)',
      'cms-saas': 'CMS (SaaS)',
      'cmp': 'Content Marketing Platform',
      'odp': 'Optimizely Data Platform',
      'experimentation': 'Experimentation',
      'commerce-connect': 'Commerce Connect',
      'search-navigation': 'Search & Navigation'
    };
    return productNames[product] || product;
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    const categoryNames: Record<string, string> = {
      'null-reference': 'Null Reference Error',
      'performance': 'Performance Issue',
      'database': 'Database Issue',
      'api': 'API Issue',
      'configuration': 'Configuration Issue',
      'ui': 'User Interface Issue',
      'integration': 'Integration Issue',
      'general': 'General Issue'
    };
    return categoryNames[category] || category;
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up OptimizelyBugAnalyzer...');
    // No cleanup needed for this tool
  }
} 