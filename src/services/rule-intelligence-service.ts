/**
 * Rule Intelligence Service
 * Reads and analyzes IDE rules for enhanced context
 */

import { promises as fs } from 'fs';
import * as path from 'path';

import type {
  IDERule,
  RuleAnalysisResult,
  RuleEnhancement,
  OptimizelyProduct,
  Logger
} from '../types/index.js';

export class RuleIntelligenceService {
  private logger: Logger;
  private isInitialized = false;

  // Common IDE rule file patterns
  private readonly ruleFilePatterns = [
    '.cursorrules',
    '.cursor-rules',
    'cursor-rules.md',
    '.vscode/settings.json',
    '.vscode/extensions.json',
    'workspace.code-workspace'
  ];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.debug('Initializing Rule Intelligence Service');
    this.isInitialized = true;
    this.logger.info('Rule Intelligence Service initialized');
  }

  async analyzeIDERules(projectPath: string): Promise<RuleAnalysisResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Analyzing IDE rules', { projectPath });
      
      const rules: IDERule[] = [];
      const foundFiles: string[] = [];

      // Search for rule files
      for (const pattern of this.ruleFilePatterns) {
        const filePath = path.join(projectPath, pattern);
        
        try {
          await fs.access(filePath);
          foundFiles.push(pattern);
          
          const rule = await this.parseRuleFile(filePath, pattern);
          if (rule) {
            rules.push(rule);
          }
        } catch {
          // File doesn't exist, continue
        }
      }

      // Analyze rules for Optimizely relevance
      const optimizelyRelevance = this.calculateOptimizelyRelevance(rules);
      const enhancements = this.generateRuleEnhancements(rules, optimizelyRelevance);

      const result: RuleAnalysisResult = {
        foundFiles,
        existingRules: rules,
        optimizelyRelevance,
        suggestedEnhancements: enhancements,
        analysisTime: Date.now() - startTime,
        timestamp: new Date()
      };

      this.logger.info('IDE rule analysis completed', {
        filesFound: foundFiles.length,
        rulesExtracted: rules.length,
        relevance: optimizelyRelevance,
        processingTime: result.analysisTime
      });

      return result;

    } catch (error) {
      this.logger.error('IDE rule analysis failed', error as Error, {
        projectPath,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  private async parseRuleFile(filePath: string, fileName: string): Promise<IDERule | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Parse based on file type
      if (fileName.endsWith('.json')) {
        return this.parseJSONRule(content, filePath, fileName);
      } else {
        return this.parseTextRule(content, filePath, fileName);
      }
    } catch (error) {
      this.logger.warn(`Failed to parse rule file: ${fileName}`);
      return null;
    }
  }

  private parseJSONRule(content: string, filePath: string, fileName: string): IDERule {
    const parsed = JSON.parse(content);
    
    return {
      type: 'json',
      source: fileName as string,
      path: filePath,
      content: content,
      rules: this.extractJSONRules(parsed),
      optimizelyTerms: this.findOptimizelyTerms(content),
      lastModified: new Date(),
      size: content.length
    };
  }

  private parseTextRule(content: string, filePath: string, fileName: string): IDERule {
    return {
      type: 'text',
      source: fileName as string,
      path: filePath,
      content: content,
      rules: this.extractTextRules(content),
      optimizelyTerms: this.findOptimizelyTerms(content),
      lastModified: new Date(),
      size: content.length
    };
  }

  private extractJSONRules(parsed: any): string[] {
    const rules: string[] = [];
    
    // Extract VS Code settings
    if (parsed['typescript.preferences']) {
      rules.push('TypeScript preferences configured');
    }
    
    if (parsed['eslint.rules']) {
      rules.push('ESLint rules configured');
    }
    
    if (parsed['editor.formatOnSave']) {
      rules.push('Format on save enabled');
    }
    
    // Extract extensions
    if (parsed.recommendations) {
      rules.push(`${parsed.recommendations.length} recommended extensions`);
    }
    
    return rules;
  }

  private extractTextRules(content: string): string[] {
    const rules: string[] = [];
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    
    // Look for common patterns
    for (const line of lines) {
      if (line.startsWith('#')) {
        rules.push(`Section: ${line.substring(1).trim()}`);
      } else if (line.startsWith('-') || line.startsWith('*')) {
        rules.push(`Rule: ${line.substring(1).trim()}`);
      } else if (line.includes(':')) {
        rules.push(`Directive: ${line}`);
      }
    }
    
    return rules.slice(0, 20); // Limit to prevent noise
  }

  private findOptimizelyTerms(content: string): string[] {
    const optimizelyTerms = [
      'optimizely', 'episerver', 'commerce', 'cms', 'dxp',
      'experimentation', 'blueprint', 'extension', 'handler',
      'pipeline', 'content-type', 'block', 'template',
      'personalization', 'visitor-group', 'ab-test', 'feature-flag'
    ];
    
    const found: string[] = [];
    const lowerContent = content.toLowerCase();
    
    for (const term of optimizelyTerms) {
      if (lowerContent.includes(term)) {
        found.push(term);
      }
    }
    
    return found;
  }

  private calculateOptimizelyRelevance(rules: IDERule[]): number {
    if (rules.length === 0) return 0;
    
    let totalRelevance = 0;
    let totalTerms = 0;
    
    for (const rule of rules) {
      const relevance = rule.optimizelyTerms.length / Math.max(rule.content.length / 100, 1);
      totalRelevance += relevance;
      totalTerms += rule.optimizelyTerms.length;
    }
    
    // Normalize to 0-1 scale
    const avgRelevance = totalRelevance / rules.length;
    const termDensity = totalTerms / rules.length;
    
    return Math.min((avgRelevance + termDensity) / 2, 1.0);
  }

  private generateRuleEnhancements(rules: IDERule[], relevance: number): RuleEnhancement[] {
    const enhancements: RuleEnhancement[] = [];
    
    if (relevance < 0.3) {
      enhancements.push({
        type: 'add',
        priority: 'high',
        suggestion: 'Add Optimizely-specific file associations and snippets',
        rationale: 'Current rules have low Optimizely relevance',
        implementation: `Add file associations for .cs, .tsx, .cshtml files with Optimizely context`
      });
    }
    
    // Check for missing TypeScript support
    const hasTypeScript = rules.some(rule => 
      rule.content.includes('typescript') || rule.content.includes('.ts')
    );
    
    if (!hasTypeScript) {
      enhancements.push({
        type: 'add',
        priority: 'medium',
        suggestion: 'Add TypeScript support for modern Optimizely development',
        rationale: 'TypeScript improves development experience with Optimizely SDKs',
        implementation: 'Configure TypeScript compiler options and IntelliSense'
      });
    }
    
    // Check for missing ESLint/Prettier
    const hasLinting = rules.some(rule =>
      rule.content.includes('eslint') || rule.content.includes('prettier')
    );
    
    if (!hasLinting) {
      enhancements.push({
        type: 'add',
        priority: 'medium',
        suggestion: 'Add code quality tools (ESLint, Prettier)',
        rationale: 'Consistent code quality improves maintainability',
        implementation: 'Configure ESLint rules for React/TypeScript and Prettier formatting'
      });
    }
    
    return enhancements;
  }

  isEnabled(): boolean {
    return this.isInitialized;
  }
}