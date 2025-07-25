import { z } from 'zod';
import type { Logger } from '@/utils/logger.js';
import type { ServerConfig } from '@/types/index.js';
import { OptimizelyPatternCrawler, type OptimizelyPattern } from '../engine/optimizely-pattern-crawler.js';

const FindOptimizelyPatternArgsSchema = z.object({
  scenario: z.string().min(1).max(200),
  product: z.enum(['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation', 'any']).default('any'),
  category: z.enum(['handler', 'pipeline', 'service', 'integration', 'best-practice', 'api', 'content-type', 'block', 'template', 'any']).default('any'),
  includeCode: z.boolean().default(true),
  maxResults: z.number().min(1).max(10).default(5),
});

type FindOptimizelyPatternArgs = z.infer<typeof FindOptimizelyPatternArgsSchema>;

export class OptimizelyPatternTool {
  private logger: Logger;
  private patternCrawler: OptimizelyPatternCrawler;
  private patternsCache: OptimizelyPattern[] = [];
  private lastCrawlTime: number = 0;
  private cacheValidityMs = 30 * 60 * 1000; // 30 minutes

  constructor(_config: ServerConfig, logger: Logger) {
    this.logger = logger;
    this.patternCrawler = new OptimizelyPatternCrawler(logger);
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing OptimizelyPatternTool...');
    
    // Pre-load patterns cache
    await this.refreshPatternsCache();
    
    this.logger.info('OptimizelyPatternTool initialized successfully');
  }

  async execute(args: unknown): Promise<{ content: { text: string } }> {
    try {
      // Validate input
      const validatedArgs = FindOptimizelyPatternArgsSchema.parse(args);
      this.logger.info('Finding Optimizely patterns', { scenario: validatedArgs.scenario, product: validatedArgs.product });

      // Ensure cache is fresh
      await this.ensureFreshCache();

      // Find relevant patterns
      const relevantPatterns = await this.findRelevantPatterns(validatedArgs);
      
      return {
        content: {
          text: this.formatPatternResults(relevantPatterns, validatedArgs),
        },
      };
    } catch (error) {
      this.logger.error('Error in OptimizelyPatternTool', { error, args });
      throw error;
    }
  }

  /**
   * Find patterns relevant to the given scenario
   */
  private async findRelevantPatterns(args: FindOptimizelyPatternArgs): Promise<OptimizelyPattern[]> {
    let candidates = [...this.patternsCache];

    // Filter by product if specified
    if (args.product !== 'any') {
      candidates = candidates.filter(p => p.product === args.product);
    }

    // Filter by category if specified
    if (args.category !== 'any') {
      candidates = candidates.filter(p => p.category === args.category);
    }

    // Score patterns by relevance to scenario
    const scoredPatterns = candidates.map(pattern => ({
      pattern,
      score: this.calculateRelevanceScore(pattern, args.scenario)
    }));

    // Sort by relevance score and return top results
    return scoredPatterns
      .filter(sp => sp.score > 0.1) // Minimum relevance threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, args.maxResults)
      .map(sp => sp.pattern);
  }

  /**
   * Calculate relevance score for a pattern given a scenario
   */
  private calculateRelevanceScore(pattern: OptimizelyPattern, scenario: string): number {
    const scenarioLower = scenario.toLowerCase();
    let score = 0;

    // Title match (highest weight)
    if (pattern.title.toLowerCase().includes(scenarioLower)) {
      score += 10;
    }

    // Check for partial matches in title
    const scenarioWords = scenarioLower.split(/\s+/);
    scenarioWords.forEach(word => {
      if (word.length > 2 && pattern.title.toLowerCase().includes(word)) {
        score += 3;
      }
    });

    // Description match
    if (pattern.description.toLowerCase().includes(scenarioLower)) {
      score += 5;
    }

    // Use cases match
    pattern.useCases.forEach(useCase => {
      if (useCase.toLowerCase().includes(scenarioLower)) {
        score += 4;
      }
    });

    // Rules match
    pattern.rules.forEach(rule => {
      if (rule.toLowerCase().includes(scenarioLower)) {
        score += 2;
      }
    });

    // Category bonus for specific scenarios
    if (this.isHandlerScenario(scenario) && pattern.category === 'handler') {
      score += 5;
    }
    if (this.isPipelineScenario(scenario) && pattern.category === 'pipeline') {
      score += 5;
    }

    // Product-specific scenario bonuses
    if (this.isCommerceScenario(scenario) && (pattern.product === 'configured-commerce' || pattern.product === 'commerce-connect')) {
      score += 3;
    }
    if (this.isCMSScenario(scenario) && pattern.product.includes('cms')) {
      score += 3;
    }
    if (this.isCMPScenario(scenario) && pattern.product === 'cmp') {
      score += 3;
    }
    if (this.isODPScenario(scenario) && pattern.product === 'odp') {
      score += 3;
    }
    if (this.isExperimentationScenario(scenario) && pattern.product === 'experimentation') {
      score += 3;
    }

    return Math.min(score / 10, 1); // Normalize to 0-1 range
  }

  /**
   * Check if scenario suggests a handler pattern
   */
  private isHandlerScenario(scenario: string): boolean {
    const handlerKeywords = ['handle', 'handler', 'process', 'custom logic', 'business logic', 'validate'];
    const scenarioLower = scenario.toLowerCase();
    return handlerKeywords.some(keyword => scenarioLower.includes(keyword));
  }

  /**
   * Check if scenario suggests a pipeline pattern
   */
  private isPipelineScenario(scenario: string): boolean {
    const pipelineKeywords = ['pipeline', 'workflow', 'sequence', 'steps', 'chain', 'flow'];
    const scenarioLower = scenario.toLowerCase();
    return pipelineKeywords.some(keyword => scenarioLower.includes(keyword));
  }

  /**
   * Check if scenario is Commerce-related
   */
  private isCommerceScenario(scenario: string): boolean {
    const commerceKeywords = ['commerce', 'pricing', 'cart', 'checkout', 'product', 'catalog', 'order', 'payment', 'shipping', 'tax'];
    const scenarioLower = scenario.toLowerCase();
    return commerceKeywords.some(keyword => scenarioLower.includes(keyword));
  }

  /**
   * Check if scenario is CMS-related
   */
  private isCMSScenario(scenario: string): boolean {
    const cmsKeywords = ['cms', 'content', 'page', 'block', 'template', 'publish', 'editor', 'media'];
    const scenarioLower = scenario.toLowerCase();
    return cmsKeywords.some(keyword => scenarioLower.includes(keyword));
  }

  /**
   * Check if scenario is CMP-related
   */
  private isCMPScenario(scenario: string): boolean {
    const cmpKeywords = ['cmp', 'marketing', 'campaign', 'email', 'automation', 'lead', 'nurture'];
    const scenarioLower = scenario.toLowerCase();
    return cmpKeywords.some(keyword => scenarioLower.includes(keyword));
  }

  /**
   * Check if scenario is ODP-related
   */
  private isODPScenario(scenario: string): boolean {
    const odpKeywords = ['odp', 'data', 'platform', 'audience', 'segment', 'event', 'tracking', 'profile', 'analytics'];
    const scenarioLower = scenario.toLowerCase();
    return odpKeywords.some(keyword => scenarioLower.includes(keyword));
  }

  /**
   * Check if scenario is Experimentation-related
   */
  private isExperimentationScenario(scenario: string): boolean {
    const expKeywords = ['experiment', 'feature flag', 'variation', 'rollout', 'ab test', 'testing', 'optimization'];
    const scenarioLower = scenario.toLowerCase();
    return expKeywords.some(keyword => scenarioLower.includes(keyword));
  }

  /**
   * Format pattern results for display
   */
  private formatPatternResults(patterns: OptimizelyPattern[], args: FindOptimizelyPatternArgs): string {
    if (patterns.length === 0) {
      return this.formatNoResultsMessage(args);
    }

    let output = `# 🎯 Optimizely Patterns for "${args.scenario}"\n\n`;
    output += `Found ${patterns.length} relevant pattern(s):\n\n`;

    patterns.forEach((pattern, index) => {
      output += `## ${index + 1}. ${pattern.title}\n\n`;
      output += `**Product:** ${this.formatProductName(pattern.product)}\n`;
      output += `**Category:** ${this.formatCategoryName(pattern.category)}\n`;
      output += `**Source:** [Documentation](${pattern.sourceUrl})\n\n`;

      // Description
      output += `### Description\n${pattern.description}\n\n`;

      // Use Cases
      if (pattern.useCases.length > 0) {
        output += `### When to Use\n`;
        pattern.useCases.forEach(useCase => {
          output += `- ${useCase}\n`;
        });
        output += '\n';
      }

      // Rules
      if (pattern.rules.length > 0) {
        output += `### Key Rules\n`;
        pattern.rules.slice(0, 3).forEach(rule => {
          output += `- ⚠️ ${rule}\n`;
        });
        output += '\n';
      }

      // Guidelines
      if (pattern.guidelines.length > 0) {
        output += `### Guidelines\n`;
        pattern.guidelines.slice(0, 2).forEach(guideline => {
          output += `- 💡 ${guideline}\n`;
        });
        output += '\n';
      }

      // Code Example
      if (args.includeCode && pattern.codeExample) {
        output += `### Code Example\n`;
        output += `\`\`\`${pattern.language}\n${pattern.codeExample.substring(0, 1000)}\n\`\`\`\n\n`;
      }

      output += `---\n\n`;
    });

    output += `💡 **Tip:** For more detailed implementation guidance, visit the [Optimizely Developer Documentation](https://docs.developers.optimizely.com/)`;

    return output;
  }

  /**
   * Format no results message with suggestions
   */
  private formatNoResultsMessage(args: FindOptimizelyPatternArgs): string {
    let output = `# 🔍 No Patterns Found for "${args.scenario}"\n\n`;
    
    output += `**Search Criteria:**\n`;
    output += `- Product: ${args.product}\n`;
    output += `- Category: ${args.category}\n\n`;

    output += `## 💡 Suggestions:\n\n`;
    output += `1. **Try broader terms**: Use more general keywords like "pricing", "content", "handler"\n`;
    output += `2. **Check product**: Ensure you're searching the right Optimizely product\n`;
    output += `3. **Use "any" filters**: Set product and category to "any" for wider results\n\n`;

    output += `## 🎯 Common Scenarios:\n\n`;
    output += `### Configured Commerce\n`;
    output += `- "custom pricing handler"\n`;
    output += `- "checkout pipeline"\n`;
    output += `- "product validation"\n\n`;

    output += `### CMS\n`;
    output += `- "content block creation"\n`;
    output += `- "page template"\n`;
    output += `- "content delivery api"\n\n`;

    output += `### General\n`;
    output += `- "integration best practices"\n`;
    output += `- "performance optimization"\n`;
    output += `- "error handling"\n`;

    return output;
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
      'handler': 'Handler Pattern',
      'pipeline': 'Pipeline Pattern',
      'service': 'Service Pattern',
      'integration': 'Integration Pattern',
      'best-practice': 'Best Practice',
      'api': 'API Pattern',
      'content-type': 'Content Type',
      'block': 'Block Pattern',
      'template': 'Template Pattern'
    };
    return categoryNames[category] || category;
  }

  /**
   * Ensure patterns cache is fresh
   */
  private async ensureFreshCache(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCrawlTime > this.cacheValidityMs || this.patternsCache.length === 0) {
      await this.refreshPatternsCache();
    }
  }

  /**
   * Refresh the patterns cache by crawling documentation
   */
  private async refreshPatternsCache(): Promise<void> {
    try {
      this.logger.info('Refreshing patterns cache...');
      const patterns = await this.patternCrawler.crawlAllPatterns();
      this.patternsCache = patterns;
      this.lastCrawlTime = Date.now();
      this.logger.info(`Patterns cache refreshed with ${patterns.length} patterns`);
    } catch (error) {
      this.logger.error('Failed to refresh patterns cache', { error });
      // Don't throw - use existing cache if available
      if (this.patternsCache.length === 0) {
        throw new Error('No patterns available and cache refresh failed');
      }
    }
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up OptimizelyPatternTool...');
    // No cleanup needed for this tool
  }
} 