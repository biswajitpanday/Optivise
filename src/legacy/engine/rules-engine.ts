import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { Logger } from '../utils/logger.js';
import type { 
  DevelopmentRule, 
  RuleContext, 
  RuleApplication, 
  RulesEngineConfig,
  OptimizelyProduct,
  CodeExample 
} from '../types/index.js';

export class RulesEngine {
  private rules: Map<string, DevelopmentRule> = new Map();
  private logger: Logger;
  private config: RulesEngineConfig;
  private rulesCache: DevelopmentRule[] = [];
  private lastLoadTime: number = 0;
  private cacheValidityMs = 5 * 60 * 1000; // 5 minutes

  constructor(logger: Logger, config: RulesEngineConfig) {
    this.logger = logger;
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Rules Engine...');
    await this.loadRules();
    this.logger.info(`Rules Engine initialized with ${this.rules.size} rules`);
  }

  /**
   * Load rules from MDC files in the Resources/rules directory
   */
  async loadRules(): Promise<void> {
    try {
      const rulesDir = path.join(process.cwd(), 'Resources', 'rules');
      const files = await fs.readdir(rulesDir);
      const mdcFiles = files.filter(file => file.endsWith('.mdc'));

      this.rules.clear();

      for (const file of mdcFiles) {
        const filePath = path.join(rulesDir, file);
        const rule = await this.parseMDCFile(filePath);
        if (rule) {
          this.rules.set(rule.id, rule);
        }
      }

      this.rulesCache = Array.from(this.rules.values());
      this.lastLoadTime = Date.now();
      
      this.logger.info(`Loaded ${this.rules.size} development rules from MDC files`);
    } catch (error) {
      this.logger.error('Failed to load rules', { error });
      throw error;
    }
  }

  /**
   * Parse an MDC file into a DevelopmentRule
   */
  private async parseMDCFile(filePath: string): Promise<DevelopmentRule | null> {
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

      // Extract rule metadata
      const rule: DevelopmentRule = {
        id: filename,
        title: this.extractTitle(markdownContent) || filename.replace('-', ' '),
        description: frontmatter.description || '',
        category: this.inferCategory(filename),
        product: 'configured-commerce' as OptimizelyProduct,
        priority: this.inferPriority(markdownContent),
        tags: this.extractTags(markdownContent),
        contexts: this.extractContexts(frontmatter, filename),
        content: markdownContent,
        examples: this.extractCodeExamples(markdownContent),
        violations: this.extractViolations(markdownContent),
        references: this.extractReferences(markdownContent),
        lastUpdated: new Date().toISOString()
      };

      return rule;
    } catch (error) {
      this.logger.error(`Failed to parse MDC file ${filePath}`, { error });
      return null;
    }
  }

  /**
   * Extract title from markdown content
   */
  private extractTitle(content: string): string | null {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : null;
  }

  /**
   * Infer category from filename
   */
  private inferCategory(filename: string): DevelopmentRule['category'] {
    if (filename.includes('blueprint') || filename.includes('frontend')) {
      return 'frontend';
    }
    if (filename.includes('extension') || filename.includes('handler') || filename.includes('backend')) {
      return 'backend';
    }
    if (filename.includes('project-structure')) {
      return 'project-structure';
    }
    if (filename.includes('perfection') || filename.includes('quality')) {
      return 'quality';
    }
    return 'general';
  }

  /**
   * Infer priority from content
   */
  private inferPriority(content: string): DevelopmentRule['priority'] {
    const highPriorityKeywords = ['important', 'critical', 'must', 'required', 'never modify'];
    const lowPriorityKeywords = ['optional', 'consider', 'might', 'could'];
    
    const contentLower = content.toLowerCase();
    
    if (highPriorityKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'high';
    }
    if (lowPriorityKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const tags: Set<string> = new Set();
    
    // Extract technology tags
    const techKeywords = ['react', 'redux', 'typescript', 'c#', '.net', 'spire', 'mobius', 'ssr'];
    techKeywords.forEach(tech => {
      if (content.toLowerCase().includes(tech)) {
        tags.add(tech);
      }
    });

    // Extract pattern tags
    if (content.includes('handler')) tags.add('handler');
    if (content.includes('pipeline')) tags.add('pipeline');
    if (content.includes('widget')) tags.add('widget');
    if (content.includes('extension')) tags.add('extension');
    if (content.includes('blueprint')) tags.add('blueprint');

    return Array.from(tags);
  }

  /**
   * Extract contexts from frontmatter and content
   */
  private extractContexts(frontmatter: any, filename: string): RuleContext[] {
    const contexts: RuleContext[] = [];

    // File pattern contexts from globs
    if (frontmatter.globs && Array.isArray(frontmatter.globs)) {
      frontmatter.globs.forEach((glob: string) => {
        contexts.push({
          type: 'file-pattern',
          pattern: glob,
          description: `Files matching ${glob}`
        });
      });
    }

    // Infer contexts from filename
    if (filename.includes('blueprint')) {
      contexts.push({
        type: 'directory',
        pattern: 'FrontEnd/modules/blueprints/*',
        description: 'Frontend blueprint development'
      });
    }

    if (filename.includes('extension')) {
      contexts.push({
        type: 'directory',
        pattern: 'Extensions/*',
        description: 'Backend extension development'
      });
    }

    if (filename.includes('handler')) {
      contexts.push({
        type: 'file-pattern',
        pattern: '**/*Handler.cs',
        description: 'Handler chain implementation'
      });
    }

    return contexts;
  }

  /**
   * Extract code examples from markdown content
   */
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

  /**
   * Extract description for code example
   */
  private extractCodeDescription(contextBefore: string): string {
    const sentences = contextBefore.split(/[.!?]+/);
    return sentences[sentences.length - 2]?.trim() || 'Code example';
  }

  /**
   * Extract violations/warnings from content
   */
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

  /**
   * Extract references/links from content
   */
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

  /**
   * Apply rules to a given context/scenario
   */
  async applyRules(scenario: string, context?: {
    filePattern?: string;
    directory?: string;
    technology?: string[];
    category?: string;
  }): Promise<RuleApplication[]> {
    await this.ensureFreshCache();
    
    const applications: RuleApplication[] = [];
    
    for (const rule of this.rulesCache) {
      const relevanceScore = this.calculateRuleRelevance(rule, scenario, context);
      
      if (relevanceScore > 0.3) { // Only include reasonably relevant rules
        applications.push({
          rule,
          relevanceScore,
          context: this.buildContextDescription(context),
          suggestions: this.generateSuggestions(rule, scenario, context)
        });
      }
    }

    // Sort by relevance score (highest first)
    return applications.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate relevance score for a rule given scenario and context
   */
  private calculateRuleRelevance(
    rule: DevelopmentRule, 
    scenario: string, 
    context?: any
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

  /**
   * Check if a file path matches a pattern
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filePath);
  }

  /**
   * Build context description for display
   */
  private buildContextDescription(context?: any): string {
    if (!context) return 'General development';
    
    const parts: string[] = [];
    if (context.category) parts.push(`${context.category} development`);
    if (context.technology) parts.push(`using ${context.technology.join(', ')}`);
    if (context.directory) parts.push(`in ${context.directory}`);
    if (context.filePattern) parts.push(`for ${context.filePattern} files`);
    
    return parts.join(' ') || 'General development';
  }

  /**
   * Generate actionable suggestions based on rule and context
   */
  private generateSuggestions(rule: DevelopmentRule, scenario: string, context?: any): string[] {
    const suggestions: string[] = [];

    // Add rule-specific suggestions
    if (rule.violations && rule.violations.length > 0) {
      suggestions.push(`⚠️ Avoid: ${rule.violations[0]}`);
    }

    // Add examples if available
    if (rule.examples && rule.examples.length > 0) {
      const goodExample = rule.examples.find(ex => ex.type === 'good');
      if (goodExample) {
        suggestions.push(`✅ Follow pattern: ${goodExample.description}`);
      }
    }

    // Add category-specific suggestions
    if (rule.category === 'frontend') {
      suggestions.push('📱 Ensure SSR compatibility and responsive design');
    } else if (rule.category === 'backend') {
      suggestions.push('🔧 Follow handler chain pattern with proper Order values');
    }

    // Add references
    if (rule.references && rule.references.length > 0) {
      suggestions.push(`📚 Reference: ${rule.references[0]}`);
    }

    return suggestions.slice(0, 3); // Limit to 3 most relevant suggestions
  }

  /**
   * Ensure cache is fresh
   */
  private async ensureFreshCache(): Promise<void> {
    if (Date.now() - this.lastLoadTime > this.cacheValidityMs) {
      await this.loadRules();
    }
  }

  /**
   * Get all rules
   */
  getAllRules(): DevelopmentRule[] {
    return this.rulesCache;
  }

  /**
   * Get rule by ID
   */
  getRule(id: string): DevelopmentRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: DevelopmentRule['category']): DevelopmentRule[] {
    return this.rulesCache.filter(rule => rule.category === category);
  }
} 