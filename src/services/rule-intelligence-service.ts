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
  private readonly logger: Logger;
  private isInitialized = false;

  // Common IDE rule file patterns
  private readonly ruleFilePatterns = [
    '.cursorrules',
    '.cursor-rules',
    'cursor-rules.md',
    '.cursor/mcp.json',
    '.vscode/settings.json',
    '.vscode/extensions.json',
    'workspace.code-workspace'
  ];

  // Additional recursive discovery patterns (regex-like)
  private readonly recursivePatterns = [
    { dir: 'rules', match: /\.(md|json)$/i, label: 'rules/*' },
    { dir: 'docs', match: /\.rules\.md$/i, label: 'docs/*.rules.md' },
    { dir: '.cursor', match: /\.(json|md)$/i, label: '.cursor/*' }
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

      // Search for rule files (shallow)
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

      // Search recursively in common locations
      const additionalFiles = await this.discoverAdditionalRuleFiles(projectPath);
      for (const file of additionalFiles) {
        try {
          const rule = await this.parseRuleFile(file.fullPath, file.relativePath);
          if (rule) {
            rules.push(rule);
            foundFiles.push(file.relativePath);
          }
        } catch {}
      }

      // Merge precedence: .cursorrules > .cursor/mcp.json > .cursor-rules > cursor-rules.md > rules/* > docs/*.rules.md > .vscode/* > workspace
      rules.sort((a, b) => {
        const precedence = (name: string) => {
          if (name === '.cursorrules') return 6;
          if (name.endsWith('mcp.json')) return 5;
          if (name === '.cursor-rules') return 4;
          if (name === 'cursor-rules.md') return 3;
          if (name.startsWith('rules/')) return 2.5;
          if (name.startsWith('docs/') && name.endsWith('.rules.md')) return 2.2;
          if (name.startsWith('.vscode/')) return 2;
          return 1;
        };
        return precedence(b.source) - precedence(a.source);
      });

      // Analyze rules for Optimizely relevance
      const optimizelyRelevance = this.calculateOptimizelyRelevance(rules);
      const enhancements = this.generateRuleEnhancements(rules, optimizelyRelevance);
      // Duplicate/Dead suggestions (basic)
      const suggestions: RuleEnhancement[] = this.suggestDuplicateAndDeadRules(rules);
      enhancements.push(...suggestions);
      // Lint and conflicts
      const { warnings, conflicts } = this.lintRules(rules);
      const { normalized, notes } = this.normalizeAndMerge(rules);
      const proposedCursorRules = this.generateProposedCursorRules(normalized, rules);
      const proposedCursorRulesDiff = await this.generateProposedCursorRulesDiff(projectPath, proposedCursorRules);
      enhancements.push(...this.proposeRuleDiffs(rules));

      const result: RuleAnalysisResult = {
        foundFiles,
        existingRules: rules,
        optimizelyRelevance,
        suggestedEnhancements: enhancements,
        lintWarnings: warnings,
        conflicts,
        normalizedDirectives: normalized,
        mergeNotes: notes,
        proposedCursorRules,
        proposedCursorRulesDiff,
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

  private async discoverAdditionalRuleFiles(projectPath: string): Promise<Array<{ fullPath: string; relativePath: string }>> {
    const discovered: Array<{ fullPath: string; relativePath: string }> = [];
    const maxDepth = 3;

    for (const pattern of this.recursivePatterns) {
      const startDir = path.join(projectPath, pattern.dir);
      try {
        await fs.access(startDir);
      } catch {
        continue;
      }
      const walk = async (dir: string, depth: number) => {
        if (depth > maxDepth) return;
        let entries: any[] = [];
        try {
          entries = await fs.readdir(dir, { withFileTypes: true } as any);
        } catch { return; }
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          const rel = path.relative(projectPath, full).replace(/\\/g, '/');
          if (entry.isDirectory()) {
            await walk(full, depth + 1);
          } else if (pattern.match.test(entry.name)) {
            discovered.push({ fullPath: full, relativePath: rel });
          }
        }
      };
      await walk(startDir, 0);
    }
    return discovered;
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

    // Basic validation for .cursor/mcp.json-like content
    if (parsed && (parsed.tools || parsed.mcp)) {
      rules.push('MCP configuration detected');
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

  private normalizeAndMerge(rules: IDERule[]): { normalized: string[]; notes: string[] } {
    const normalized: Set<string> = new Set();
    const notes: string[] = [];

    // Simple directive normalization: coalesce common items
    for (const rule of rules) {
      for (const line of rule.rules) {
        const k = line.trim().toLowerCase();
        if (!k) continue;
        // Normalize synonyms
        const normalizedLine = k
          .replace('format on save enabled', 'editor.formatOnSave=true')
          .replace('typescript preferences configured', 'typescript.preferences=set')
          .replace('eslint rules configured', 'eslint.config=present');
        normalized.add(normalizedLine);
      }
    }

    // Merge hints
    if (rules.some(r => r.source === '.cursorrules') && rules.some(r => r.source.startsWith('.vscode/'))) {
      notes.push('Using .cursorrules as primary source; .vscode settings considered secondary');
    }

    return { normalized: Array.from(normalized).slice(0, 50), notes };
  }

  private generateProposedCursorRules(normalized: string[], rules: IDERule[]): string {
    const header = '# .cursorrules (Proposed)\n\n';
    const sections: string[] = [];
    // Project context
    sections.push('## Project Context');
    sections.push('- Optimizely: enabled');
    if (rules.some(r => r.optimizelyTerms.includes('commerce'))) sections.push('- Product: Configured Commerce');
    if (rules.some(r => r.optimizelyTerms.includes('cms'))) sections.push('- Product: CMS');
    // Formatting
    if (normalized.includes('editor.formatOnSave=true')) {
      sections.push('\n## Editor');
      sections.push('- editor.formatOnSave: true');
    }
    // TypeScript / ESLint hints
    if (normalized.some(n => n.startsWith('typescript.preferences'))) {
      sections.push('\n## TypeScript');
      sections.push('- preferences: set');
    }
    if (normalized.includes('eslint.config=present')) {
      sections.push('\n## Linting');
      sections.push('- eslint: present');
    }
    // MCP integration hint
    sections.push('\n## MCP');
    sections.push('- tools: optidev_*');
    return header + sections.join('\n');
  }

  private async generateProposedCursorRulesDiff(projectPath: string, proposed: string): Promise<string> {
    const target = path.join(projectPath, '.cursorrules');
    try {
      const existing = await fs.readFile(target, 'utf-8');
      return this.simpleUnifiedDiff('.cursorrules', existing, proposed);
    } catch {
      // No existing file; show add-only diff
      return `--- .cursorrules (absent)\n+++ .cursorrules (proposed)\n${proposed.split('\n').map(l => `+ ${l}`).join('\n')}`;
    }
  }

  private simpleUnifiedDiff(filename: string, oldText: string, newText: string): string {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const max = Math.max(oldLines.length, newLines.length);
    const diff: string[] = [`--- ${filename} (current)`, `+++ ${filename} (proposed)`];
    for (let i = 0; i < max; i++) {
      const o = oldLines[i] ?? '';
      const n = newLines[i] ?? '';
      if (o === n) {
        continue;
      }
      if (o && !n) diff.push(`- ${o}`);
      else if (!o && n) diff.push(`+ ${n}`);
      else {
        diff.push(`- ${o}`);
        diff.push(`+ ${n}`);
      }
    }
    return diff.join('\n');
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

  private suggestDuplicateAndDeadRules(rules: IDERule[]): RuleEnhancement[] {
    const enhancements: RuleEnhancement[] = [];
    const seen = new Set<string>();
    for (const rule of rules) {
      const key = `${rule.type}:${rule.source}`;
      if (seen.has(key)) {
        enhancements.push({
          type: 'cleanup',
          priority: 'low',
          suggestion: `Remove duplicate rule file ${rule.source}`,
          rationale: 'Duplicate rule files increase confusion',
          implementation: `Keep one copy of ${rule.source} and remove duplicates`
        });
      }
      seen.add(key);
      if (rule.size < 5 && rule.rules.length === 0) {
        enhancements.push({
          type: 'cleanup',
          priority: 'low',
          suggestion: `Remove empty rule file ${rule.source}`,
          rationale: 'Empty rule files add noise',
          implementation: `Delete ${rule.source}`
        });
      }
    }
    return enhancements;
  }

  private lintRules(rules: IDERule[]): { warnings: string[]; conflicts: Array<{ type: string; description: string; severity: 'error' | 'warning' | 'info' }>; } {
    const warnings: string[] = [];
    const conflicts: Array<{ type: string; description: string; severity: 'error' | 'warning' | 'info' }> = [];
    // Simple lints: look for contradictory directives
    const hasFormatOnSave = rules.some(r => /formatOnSave\s*[:=]\s*true/.test(r.content));
    const hasFormatDisabled = rules.some(r => /formatOnSave\s*[:=]\s*false/.test(r.content));
    if (hasFormatOnSave && hasFormatDisabled) {
      conflicts.push({ type: 'contradiction', description: 'Conflicting editor.formatOnSave settings detected', severity: 'warning' });
    }
    const hasESLint = rules.some(r => /eslint/i.test(r.content));
    const hasPrettier = rules.some(r => /prettier/i.test(r.content));
    if (hasESLint && !hasPrettier) warnings.push('ESLint present but Prettier not detected');
    if (hasPrettier && !hasESLint) warnings.push('Prettier present but ESLint not detected');
    return { warnings, conflicts };
  }

  private proposeRuleDiffs(rules: IDERule[]): RuleEnhancement[] {
    const enhancements: RuleEnhancement[] = [];
    const hasCursorRules = rules.some(r => r.source === '.cursorrules');
    const hasDocsRules = rules.some(r => r.source.startsWith('docs/') && r.source.endsWith('.rules.md'));
    const hasRulesDir = rules.some(r => r.source.startsWith('rules/'));
    if (!hasCursorRules && (hasDocsRules || hasRulesDir)) {
      enhancements.push({
        type: 'add',
        priority: 'medium',
        suggestion: 'Create a consolidated .cursorrules with key directives',
        rationale: 'Centralize IDE behavior for Cursor and MCP integration',
        implementation: 'Create .cursorrules at repo root with sections for project context, file associations, lint/format, and MCP tool hints.'
      });
    }
    return enhancements;
  }

  isEnabled(): boolean {
    return this.isInitialized;
  }
}