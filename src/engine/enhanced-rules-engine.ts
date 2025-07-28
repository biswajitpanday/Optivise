import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { Logger } from '../utils/logger.js';
import { ProductDetectionEngine } from './product-detection-engine.js';
import type { 
  DevelopmentRule, 
  RuleContext, 
  RuleApplication, 
  RulesEngineConfig,
  OptimizelyProduct,
  CodeExample,
  RuleSource,
  ProductContext
} from '../types/index.js';

export class EnhancedRulesEngine {
  private productRules: Map<OptimizelyProduct, Map<string, DevelopmentRule>> = new Map();
  private sharedRules: Map<string, DevelopmentRule> = new Map();
  private logger: Logger;
  private config: RulesEngineConfig;
  private productDetection: ProductDetectionEngine;
  private rulesCache: Map<OptimizelyProduct, DevelopmentRule[]> = new Map();
  private lastLoadTime: number = 0;
  private cacheValidityMs = 5 * 60 * 1000; // 5 minutes

  constructor(logger: Logger, config: RulesEngineConfig) {
    this.logger = logger;
    this.config = config;
    this.productDetection = new ProductDetectionEngine(logger, config.productDetection);
    this.initializeProductMaps();
  }

  private initializeProductMaps(): void {
    // Initialize maps for all products
    const allProducts: OptimizelyProduct[] = [
      'configured-commerce',
      'cms-paas', 
      'cms-saas',
      'cmp',
      'odp',
      'experimentation',
      'commerce-connect',
      'search-navigation'
    ];

    allProducts.forEach(product => {
      this.productRules.set(product, new Map());
      this.rulesCache.set(product, []);
    });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Enhanced Rules Engine...');
    await this.loadRulesFromAllSources();
    this.logger.info(`Enhanced Rules Engine initialized with rules for ${this.productRules.size} products`);
  }

  /**
   * Load rules from all configured sources
   */
  async loadRulesFromAllSources(): Promise<void> {
    try {
      this.clearAllRules();

      for (const source of this.config.rulesSources) {
        if (!source.enabled) continue;

        this.logger.info(`Loading rules from ${source.type} source`, { path: source.path, product: source.product });

        switch (source.type) {
          case 'local-directory':
            await this.loadFromLocalDirectory(source);
            break;
          
          case 'remote-repository':
            await this.loadFromRemoteRepository(source);
            break;
          
          case 'documentation-api':
            await this.loadFromDocumentationAPI(source);
            break;
          
          case 'database':
            await this.loadFromDatabase(source);
            break;
        }
      }

      this.updateCache();
      this.lastLoadTime = Date.now();
      
      this.logger.info('Rules loading completed', {
        productRulesCount: Array.from(this.productRules.entries()).map(([product, rules]) => 
          ({ product, count: rules.size })
        ),
        sharedRulesCount: this.sharedRules.size
      });
    } catch (error) {
      this.logger.error('Failed to load rules from sources', { error });
      throw error;
    }
  }

  private async loadFromLocalDirectory(source: RuleSource): Promise<void> {
    try {
      const sourcePath = path.resolve(source.path);
      
      if (source.product) {
        // Product-specific directory
        await this.loadProductRulesFromDirectory(sourcePath, source.product);
      } else {
        // Multi-product directory structure
        await this.loadMultiProductRulesFromDirectory(sourcePath);
      }
    } catch (error) {
      this.logger.error(`Failed to load from local directory: ${source.path}`, { error });
    }
  }

  private async loadMultiProductRulesFromDirectory(basePath: string): Promise<void> {
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const productName = entry.name as OptimizelyProduct;
        const productPath = path.join(basePath, entry.name);
        
        // Check if this is a valid product directory
        if (this.productRules.has(productName)) {
          await this.loadProductRulesFromDirectory(productPath, productName);
        } else if (entry.name === 'shared') {
          await this.loadSharedRulesFromDirectory(productPath);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to load multi-product rules from ${basePath}`, { error });
    }
  }

  private async loadProductRulesFromDirectory(dirPath: string, product: OptimizelyProduct): Promise<void> {
    try {
      const mdcFiles = await this.findMDCFiles(dirPath);
      const productRulesMap = this.productRules.get(product)!;
      
      for (const filePath of mdcFiles) {
        const rule = await this.parseMDCFile(filePath, product);
        if (rule) {
          productRulesMap.set(rule.id, rule);
        }
      }
      
      this.logger.info(`Loaded ${mdcFiles.length} rules for ${product}`, { directory: dirPath });
    } catch (error) {
      this.logger.error(`Failed to load product rules for ${product}`, { error, dirPath });
    }
  }

  private async loadSharedRulesFromDirectory(dirPath: string): Promise<void> {
    try {
      const mdcFiles = await this.findMDCFiles(dirPath);
      
      for (const filePath of mdcFiles) {
        const rule = await this.parseMDCFile(filePath, 'configured-commerce', true); // Default product for shared rules
        if (rule) {
          this.sharedRules.set(rule.id, rule);
        }
      }
      
      this.logger.info(`Loaded ${mdcFiles.length} shared rules`, { directory: dirPath });
    } catch (error) {
      this.logger.error('Failed to load shared rules', { error, dirPath });
    }
  }

  private async findMDCFiles(dirPath: string): Promise<string[]> {
    const mdcFiles: string[] = [];
    
    const scanDirectory = async (currentPath: string, depth: number = 0) => {
      if (depth > 3) return; // Prevent deep recursion
      
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isFile() && entry.name.endsWith('.mdc')) {
            mdcFiles.push(fullPath);
          } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await scanDirectory(fullPath, depth + 1);
          }
        }
      } catch (error) {
        this.logger.warn(`Cannot scan directory ${currentPath}`, { error });
      }
    };

    await scanDirectory(dirPath);
    return mdcFiles;
  }

  /**
   * Parse an MDC file into a DevelopmentRule with product awareness
   */
  private async parseMDCFile(
    filePath: string, 
    defaultProduct: OptimizelyProduct,
    isShared: boolean = false
  ): Promise<DevelopmentRule | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const filename = path.basename(filePath, '.mdc');
      
      // Split frontmatter and content
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!frontmatterMatch) {
        this.logger.warn(`Invalid MDC format in ${filePath}`);
        return null;
      }

      const [, frontmatterYaml, markdownContent] = frontmatterMatch;
      const frontmatter = yaml.parse(frontmatterYaml);

      // Determine product from frontmatter, path, or default
      const product = this.inferProductFromPath(filePath) || 
                     frontmatter.product || 
                     defaultProduct;

      // Extract rule metadata
      const rule: DevelopmentRule = {
        id: filename,
        title: this.extractTitle(markdownContent) || filename.replace(/[-_]/g, ' '),
        description: frontmatter.description || '',
        category: this.inferCategory(filename),
        product: product,
        productVersion: frontmatter.productVersion,
        priority: this.inferPriority(markdownContent),
        tags: this.extractTags(markdownContent),
        contexts: this.extractContexts(frontmatter, filename, product),
        content: markdownContent,
        examples: this.extractCodeExamples(markdownContent),
        violations: this.extractViolations(markdownContent),
        references: this.extractReferences(markdownContent),
        lastUpdated: new Date().toISOString(),
        source: frontmatter.source || 'manual',
        applicableProducts: isShared ? this.extractApplicableProducts(frontmatter) : [product]
      };

      return rule;
    } catch (error) {
      this.logger.error(`Failed to parse MDC file ${filePath}`, { error });
      return null;
    }
  }

  private inferProductFromPath(filePath: string): OptimizelyProduct | null {
    const pathLower = filePath.toLowerCase();
    
    if (pathLower.includes('configured-commerce') || pathLower.includes('commerce')) {
      return 'configured-commerce';
    }
    if (pathLower.includes('cms-paas')) return 'cms-paas';
    if (pathLower.includes('cms-saas')) return 'cms-saas';
    if (pathLower.includes('cmp')) return 'cmp';
    if (pathLower.includes('odp')) return 'odp';
    if (pathLower.includes('experimentation')) return 'experimentation';
    if (pathLower.includes('commerce-connect')) return 'commerce-connect';
    if (pathLower.includes('search-navigation')) return 'search-navigation';
    
    return null;
  }

  private extractApplicableProducts(frontmatter: any): OptimizelyProduct[] {
    if (frontmatter.applicableProducts && Array.isArray(frontmatter.applicableProducts)) {
      return frontmatter.applicableProducts;
    }
    
    // Default to all products for shared rules
    return [
      'configured-commerce',
      'cms-paas',
      'cms-saas',
      'cmp',
      'odp',
      'experimentation',
      'commerce-connect',
      'search-navigation'
    ];
  }

  /**
   * Apply rules with product context awareness
   */
  async applyRules(
    scenario: string, 
    context?: {
      filePattern?: string;
      directory?: string;
      technology?: string[];
      category?: string;
      product?: OptimizelyProduct;
      projectPath?: string;
    }
  ): Promise<RuleApplication[]> {
    await this.ensureFreshCache();
    
    // Detect product context if not provided
    let productContext: ProductContext;
    if (context?.product) {
      productContext = {
        detectedProduct: context.product,
        confidence: 1.0,
        detectionMethods: [{ method: 'user-explicit', matches: [], confidence: 1.0 }],
        projectPath: context.projectPath
      };
    } else {
      productContext = await this.productDetection.detectProduct(context?.projectPath);
    }

    const applications: RuleApplication[] = [];
    
    // Only apply rules if confidence meets threshold
    if (productContext.confidence >= this.config.productDetection.confidence.threshold) {
      // Get product-specific rules
      const productRules = this.rulesCache.get(productContext.detectedProduct) || [];
      
      // Get applicable shared rules
      const applicableSharedRules = Array.from(this.sharedRules.values()).filter(rule =>
        rule.applicableProducts?.includes(productContext.detectedProduct)
      );
      
      // Combine and evaluate rules
      const allApplicableRules = [...productRules, ...applicableSharedRules];
      
      for (const rule of allApplicableRules) {
        const relevanceScore = this.calculateRuleRelevance(rule, scenario, context, productContext);
        
        if (relevanceScore > 0.3) {
          applications.push({
            rule,
            relevanceScore,
            context: this.buildContextDescription(context, productContext),
            suggestions: this.generateSuggestions(rule, scenario, context),
            productMatch: rule.product === productContext.detectedProduct || 
                         rule.applicableProducts?.includes(productContext.detectedProduct) || false
          });
        }
      }
    } else {
      this.logger.warn('Product detection confidence too low for product-specific rules', {
        confidence: productContext.confidence,
        threshold: this.config.productDetection.confidence.threshold
      });
      
      // Apply fallback rules or general rules
      const fallbackRules = this.rulesCache.get(this.config.productDetection.fallbackProduct!) || [];
      for (const rule of fallbackRules.slice(0, 3)) { // Limit fallback rules
        applications.push({
          rule,
          relevanceScore: 0.5, // Lower relevance for fallback
          context: this.buildContextDescription(context, productContext),
          suggestions: this.generateSuggestions(rule, scenario, context),
          productMatch: false
        });
      }
    }

    // Sort by relevance score (highest first)
    return applications.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private calculateRuleRelevance(
    rule: DevelopmentRule, 
    scenario: string, 
    context?: any,
    productContext?: ProductContext
  ): number {
    let score = 0;
    const scenarioLower = scenario.toLowerCase();

    // Title and description matching
    if (rule.title.toLowerCase().includes(scenarioLower)) score += 0.4;
    if (rule.description.toLowerCase().includes(scenarioLower)) score += 0.3;
    if (rule.content.toLowerCase().includes(scenarioLower)) score += 0.2;

    // Context matching
    if (context?.category && rule.category === context.category) score += 0.3;
    if (context?.technology) {
      const matchingTags = rule.tags.filter(tag => 
        context.technology!.some(tech => tech.toLowerCase().includes(tag.toLowerCase()))
      );
      score += matchingTags.length * 0.1;
    }

    // Product context boost
    if (productContext && rule.product === productContext.detectedProduct) {
      score += 0.2 * productContext.confidence;
    }

    // File pattern matching
    if (context?.filePattern) {
      const hasMatchingContext = rule.contexts.some(ctx => 
        ctx.type === 'file-pattern' && this.matchesPattern(context.filePattern!, ctx.pattern)
      );
      if (hasMatchingContext) score += 0.2;
    }

    // Directory matching
    if (context?.directory) {
      const hasMatchingContext = rule.contexts.some(ctx => 
        ctx.type === 'directory' && context.directory!.includes(ctx.pattern.replace('*', ''))
      );
      if (hasMatchingContext) score += 0.2;
    }

    // Priority adjustment
    if (rule.priority === 'high') score *= 1.2;
    else if (rule.priority === 'low') score *= 0.8;

    return Math.min(score, 1.0); // Cap at 1.0
  }

  // ... (Include all the remaining helper methods from the original RulesEngine)
  // This includes extractTitle, inferCategory, inferPriority, extractTags, extractContexts,
  // extractCodeExamples, extractViolations, extractReferences, generateSuggestions, etc.

  private clearAllRules(): void {
    this.productRules.forEach(rulesMap => rulesMap.clear());
    this.sharedRules.clear();
  }

  private updateCache(): void {
    this.productRules.forEach((rulesMap, product) => {
      this.rulesCache.set(product, Array.from(rulesMap.values()));
    });
  }

  private async ensureFreshCache(): Promise<void> {
    if (Date.now() - this.lastLoadTime > this.cacheValidityMs) {
      await this.loadRulesFromAllSources();
    }
  }

  private buildContextDescription(context?: any, productContext?: ProductContext): string {
    const parts: string[] = [];
    
    if (productContext) {
      parts.push(`${productContext.detectedProduct} development`);
      if (productContext.confidence < 1.0) {
        parts.push(`(${Math.round(productContext.confidence * 100)}% confidence)`);
      }
    }
    
    if (context?.category) parts.push(`${context.category} context`);
    if (context?.technology) parts.push(`using ${context.technology.join(', ')}`);
    if (context?.directory) parts.push(`in ${context.directory}`);
    if (context?.filePattern) parts.push(`for ${context.filePattern} files`);
    
    return parts.join(' ') || 'General development';
  }

  private matchesPattern(text: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(text);
  }

  // Additional helper methods would be included here...
  // (extractTitle, inferCategory, etc. - similar to original RulesEngine)

  /**
   * Get all rules for a specific product
   */
  getAllRulesForProduct(product: OptimizelyProduct): DevelopmentRule[] {
    return this.rulesCache.get(product) || [];
  }

  /**
   * Get shared rules applicable to a product
   */
  getSharedRulesForProduct(product: OptimizelyProduct): DevelopmentRule[] {
    return Array.from(this.sharedRules.values()).filter(rule =>
      rule.applicableProducts?.includes(product)
    );
  }

  /**
   * Get product detection context
   */
  async getProductContext(projectPath?: string): Promise<ProductContext> {
    return await this.productDetection.detectProduct(projectPath);
  }

  // Placeholder implementations for missing methods
  private extractTitle(content: string): string | null {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : null;
  }

  private inferCategory(filename: string): DevelopmentRule['category'] {
    if (filename.includes('blueprint') || filename.includes('frontend')) return 'frontend';
    if (filename.includes('extension') || filename.includes('handler') || filename.includes('backend')) return 'backend';
    if (filename.includes('project-structure')) return 'project-structure';
    if (filename.includes('perfection') || filename.includes('quality')) return 'quality';
    return 'general';
  }

  private inferPriority(content: string): DevelopmentRule['priority'] {
    const highPriorityKeywords = ['important', 'critical', 'must', 'required', 'never modify'];
    const lowPriorityKeywords = ['optional', 'consider', 'might', 'could'];
    
    const contentLower = content.toLowerCase();
    
    if (highPriorityKeywords.some(keyword => contentLower.includes(keyword))) return 'high';
    if (lowPriorityKeywords.some(keyword => contentLower.includes(keyword))) return 'low';
    return 'medium';
  }

  private extractTags(content: string): string[] {
    const tags: Set<string> = new Set();
    const techKeywords = ['react', 'redux', 'typescript', 'c#', '.net', 'spire', 'mobius', 'ssr'];
    
    techKeywords.forEach(tech => {
      if (content.toLowerCase().includes(tech)) {
        tags.add(tech);
      }
    });

    if (content.includes('handler')) tags.add('handler');
    if (content.includes('pipeline')) tags.add('pipeline');
    if (content.includes('widget')) tags.add('widget');
    if (content.includes('extension')) tags.add('extension');
    if (content.includes('blueprint')) tags.add('blueprint');

    return Array.from(tags);
  }

  private extractContexts(frontmatter: any, filename: string, product: OptimizelyProduct): RuleContext[] {
    const contexts: RuleContext[] = [];

    if (frontmatter.globs && Array.isArray(frontmatter.globs)) {
      frontmatter.globs.forEach((glob: string) => {
        contexts.push({
          type: 'file-pattern',
          pattern: glob,
          description: `Files matching ${glob}`,
          product
        });
      });
    }

    // Product-specific context inference
    if (product === 'configured-commerce') {
      if (filename.includes('blueprint')) {
        contexts.push({
          type: 'directory',
          pattern: 'FrontEnd/modules/blueprints/*',
          description: 'Frontend blueprint development',
          product
        });
      }
      if (filename.includes('extension')) {
        contexts.push({
          type: 'directory',
          pattern: 'Extensions/*',
          description: 'Backend extension development',
          product
        });
      }
    }

    return contexts;
  }

  private extractCodeExamples(content: string): CodeExample[] {
    const examples: CodeExample[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const [, language = 'text', code] = match;
      const contextBefore = content.substring(Math.max(0, match.index - 200), match.index);
      
      let type: CodeExample['type'] = 'neutral';
      if (contextBefore.toLowerCase().includes('don\'t') || contextBefore.toLowerCase().includes('bad')) {
        type = 'bad';
      } else if (contextBefore.toLowerCase().includes('example') || contextBefore.toLowerCase().includes('good')) {
        type = 'good';
      }

      examples.push({
        language: language.toLowerCase(),
        code: code.trim(),
        description: this.extractCodeDescription(contextBefore),
        type
      });
    }

    return examples;
  }

  private extractCodeDescription(contextBefore: string): string {
    const sentences = contextBefore.split(/[.!?]+/);
    return sentences[sentences.length - 2]?.trim() || 'Code example';
  }

  private extractViolations(content: string): string[] {
    const violations: string[] = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- **Important**:') || 
          trimmed.startsWith('- We do not modify') ||
          trimmed.startsWith('- Never modify') ||
          trimmed.includes('don\'t') && trimmed.includes('modify')) {
        violations.push(trimmed.replace(/^-\s*\*\*[^*]+\*\*:?\s*/, ''));
      }
    });

    return violations;
  }

  private extractReferences(content: string): string[] {
    const references: string[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const [, text, url] = match;
      if (url.startsWith('http') || url.startsWith('mdc:')) {
        references.push(`${text}: ${url}`);
      }
    }

    return references;
  }

  private generateSuggestions(rule: DevelopmentRule, scenario: string, context?: any): string[] {
    const suggestions: string[] = [];

    if (rule.violations && rule.violations.length > 0) {
      suggestions.push(`⚠️ Avoid: ${rule.violations[0]}`);
    }

    if (rule.examples && rule.examples.length > 0) {
      const goodExample = rule.examples.find(ex => ex.type === 'good');
      if (goodExample) {
        suggestions.push(`✅ Follow pattern: ${goodExample.description}`);
      }
    }

    // Product-specific suggestions
    if (rule.product === 'configured-commerce') {
      if (rule.category === 'frontend') {
        suggestions.push('📱 Ensure SSR compatibility and responsive design');
      } else if (rule.category === 'backend') {
        suggestions.push('🔧 Follow handler chain pattern with proper Order values');
      }
    }

    if (rule.references && rule.references.length > 0) {
      suggestions.push(`📚 Reference: ${rule.references[0]}`);
    }

    return suggestions.slice(0, 3);
  }

  // Stub implementations for remaining methods
  private async loadFromRemoteRepository(source: RuleSource): Promise<void> {
    this.logger.info(`Remote repository loading not yet implemented: ${source.path}`);
  }

  private async loadFromDocumentationAPI(source: RuleSource): Promise<void> {
    this.logger.info(`Documentation API loading not yet implemented: ${source.path}`);
  }

  private async loadFromDatabase(source: RuleSource): Promise<void> {
    this.logger.info(`Database loading not yet implemented: ${source.path}`);
  }
} 