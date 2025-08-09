/**
 * Code Analyzer Tool (optidev_code_analyzer)
 * Real-time code analysis for performance, security, and best practices
 */

import { ProductDetectionService } from '../services/product-detection-service.js';
import { RuleIntelligenceService } from '../services/rule-intelligence-service.js';
import type { Logger, LLMRequest, PromptContext, ContextBlock } from '../types/index.js';
import { RequestFormatter } from '../formatters/request-formatter.js';
import { FormatterTemplates } from '../formatters/templates.js';
import { z } from 'zod';

export const CodeAnalyzerRequestSchema = z.object({
  codeSnippet: z.string().min(1, 'codeSnippet is required'),
  language: z.enum(['typescript', 'javascript', 'csharp']).default('typescript'),
  analysisType: z.enum(['performance', 'security', 'best-practices', 'all']).default('all'),
  userPrompt: z.string().optional(),
  promptContext: z.any().optional(),
  projectPath: z.string().optional()
});

export interface CodeAnalyzerRequest {
  codeSnippet: string;
  language: string;
  analysisType: 'performance' | 'security' | 'best-practices' | 'all';
  userPrompt?: string;
  promptContext?: PromptContext;
  projectPath?: string;
}

export interface CodeIssue {
  line: number;
  column?: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  message: string;
  suggestion: string;
  codeExample?: string;
}

export interface PerformanceAnalysis {
  overallScore: number; // 0-100
  issues: CodeIssue[];
  optimizations: Array<{
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    codeExample?: string;
  }>;
}

export interface SecurityAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  vulnerabilities: CodeIssue[];
  recommendations: string[];
}

export interface BestPracticesAnalysis {
  complianceScore: number; // 0-100
  violations: CodeIssue[];
  suggestions: Array<{
    category: string;
    description: string;
    examples: string[];
  }>;
}

export interface CodeAnalyzerResponse {
  detectedProducts: string[];
  language: string;
  analysisType: string;
  performance?: PerformanceAnalysis;
  security?: SecurityAnalysis;
  bestPractices?: BestPracticesAnalysis;
  overallQuality: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    summary: string;
  };
  refactoringOpportunities: Array<{
    type: string;
    description: string;
    benefits: string[];
    estimatedEffort: string;
  }>;
  llm_request?: LLMRequest;
}

export class CodeAnalyzerTool {
  private productDetection: ProductDetectionService;
  private logger: Logger;
  private ruleService: RuleIntelligenceService;

  // Language-specific analysis patterns
  private static readonly LANGUAGE_PATTERNS = {
    typescript: {
      performance: [
        { pattern: /\.map\(.*\)\.filter\(.*\)/g, message: 'Chained map+filter can be optimized', severity: 'warning' as const },
        { pattern: /for\s*\(\s*let\s+\w+\s*=\s*0[^}]*{[^}]*}/g, message: 'Consider using forEach or map for better readability', severity: 'info' as const },
        { pattern: /JSON\.parse\(JSON\.stringify\(/g, message: 'Deep cloning with JSON is inefficient', severity: 'warning' as const },
        { pattern: /new\s+Date\(\)/g, message: 'Creating dates in loops can be expensive', severity: 'info' as const }
      ],
      security: [
        { pattern: /eval\s*\(/g, message: 'eval() is dangerous and should be avoided', severity: 'critical' as const },
        { pattern: /innerHTML\s*=/g, message: 'innerHTML can lead to XSS vulnerabilities', severity: 'error' as const },
        { pattern: /localStorage\./g, message: 'localStorage may expose sensitive data', severity: 'warning' as const },
        { pattern: /password.*=.*['"]/g, message: 'Hardcoded passwords are security risks', severity: 'critical' as const }
      ],
      bestPractices: [
        { pattern: /var\s+/g, message: 'Use let or const instead of var', severity: 'warning' as const },
        { pattern: /==\s*[^=]/g, message: 'Use strict equality (===) instead of ==', severity: 'warning' as const },
        { pattern: /console\.log/g, message: 'Remove console.log in production code', severity: 'info' as const },
        { pattern: /function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g, message: 'Consider using arrow functions for consistency', severity: 'info' as const }
      ]
    },
    csharp: {
      performance: [
        { pattern: /string\s+\w+\s*=\s*[^+]*\+[^;]*;/g, message: 'Use StringBuilder for string concatenation', severity: 'warning' as const },
        { pattern: /foreach\s*\([^)]*\)\s*{[^}]*\.Add\(/g, message: 'Consider using LINQ methods instead of foreach+Add', severity: 'info' as const },
        { pattern: /new\s+List<[^>]*>\(\)/g, message: 'Consider specifying initial capacity for List', severity: 'info' as const },
        { pattern: /\.ToList\(\)\.Count/g, message: 'Use .Count() instead of .ToList().Count', severity: 'warning' as const }
      ],
      security: [
        { pattern: /SqlCommand\([^)]*\+/g, message: 'SQL injection vulnerability - use parameterized queries', severity: 'critical' as const },
        { pattern: /Password\s*=\s*['"]\w+['"]/g, message: 'Hardcoded passwords in connection strings', severity: 'critical' as const },
        { pattern: /Random\s*\(\)/g, message: 'Use cryptographically secure random for security purposes', severity: 'warning' as const },
        { pattern: /catch\s*\([^)]*\)\s*{\s*}/g, message: 'Empty catch blocks hide exceptions', severity: 'error' as const }
      ],
      bestPractices: [
        { pattern: /public\s+(?!class|interface)[^{]*{[^}]*public\s+/g, message: 'Consider encapsulation - avoid too many public members', severity: 'info' as const },
        { pattern: /if\s*\([^)]*==\s*null\)\s*return/g, message: 'Consider using null-conditional operator (?)', severity: 'info' as const },
        { pattern: /async\s+void/g, message: 'Avoid async void except for event handlers', severity: 'warning' as const },
        { pattern: /ConfigureAwait\(false\)/g, message: 'Good practice: ConfigureAwait(false) in library code', severity: 'info' as const }
      ]
    },
    javascript: {
      performance: [
        { pattern: /document\.getElementById.*getElementById/g, message: 'Cache DOM queries instead of repeated lookups', severity: 'warning' as const },
        { pattern: /for\s*\([^)]*\.length[^)]*\)/g, message: 'Cache array length in for loops', severity: 'info' as const },
        { pattern: /\+\s*new\s+Date/g, message: 'Use Date.now() instead of +new Date()', severity: 'info' as const }
      ],
      security: [
        { pattern: /eval\s*\(/g, message: 'eval() is dangerous and should be avoided', severity: 'critical' as const },
        { pattern: /innerHTML\s*=/g, message: 'innerHTML can lead to XSS vulnerabilities', severity: 'error' as const },
        { pattern: /document\.write/g, message: 'document.write can be exploited for XSS', severity: 'error' as const }
      ],
      bestPractices: [
        { pattern: /var\s+/g, message: 'Use let or const instead of var', severity: 'warning' as const },
        { pattern: /==\s*[^=]/g, message: 'Use strict equality (===) instead of ==', severity: 'warning' as const },
        { pattern: /function\s*\(/g, message: 'Consider using arrow functions', severity: 'info' as const }
      ]
    }
  };

  // Optimizely-specific patterns
  private static readonly OPTIMIZELY_PATTERNS = {
    commerce: {
      performance: [
        { pattern: /GetChildren<.*>\(\)\.Where/g, message: 'Consider using filtered GetChildren overload', severity: 'warning' as const },
        { pattern: /\.Current\.(?!Store)/g, message: 'Avoid excessive use of .Current properties', severity: 'info' as const }
      ],
      bestPractices: [
        { pattern: /ServiceLocator\.Current/g, message: 'Use dependency injection instead of ServiceLocator', severity: 'warning' as const },
        { pattern: /\[Serializable\]/g, message: 'Consider if Serializable is needed for performance', severity: 'info' as const }
      ]
    },
    cms: {
      performance: [
        { pattern: /DataFactory\.Instance/g, message: 'Use IContentRepository with dependency injection', severity: 'warning' as const },
        { pattern: /GetChildren\(\)\.Count\(\)/g, message: 'Use GetChildren().Count() extension for better performance', severity: 'info' as const }
      ],
      bestPractices: [
        { pattern: /PageData/g, message: 'Consider using strongly-typed page models', severity: 'info' as const },
        { pattern: /\[Display.*Name\s*=\s*"[^"]*"\]/g, message: 'Good practice: Using Display attributes for editor labels', severity: 'info' as const }
      ]
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
    this.logger.info('Code Analyzer Tool initialized');
  }

  /**
   * Analyze code snippet for various quality aspects
   */
  async analyzeCode(request: CodeAnalyzerRequest): Promise<CodeAnalyzerResponse> {
    try {
      const parsed = CodeAnalyzerRequestSchema.safeParse(request);
      if (!parsed.success) {
        throw parsed.error;
      }
      this.logger.info('Analyzing code snippet', { 
        language: request.language, 
        analysisType: request.analysisType,
        codeLength: request.codeSnippet.length 
      });

      // 1. Detect Optimizely products in code (and capture evidence)
      const detection = await this.productDetection.detectFromPrompt(request.codeSnippet);
      const detectedProducts = detection.products;

      // 2. Perform requested analysis
      const analysisResults: Partial<CodeAnalyzerResponse> = {};

      if (request.analysisType === 'performance' || request.analysisType === 'all') {
        analysisResults.performance = this.analyzePerformance(request, detectedProducts);
      }

      if (request.analysisType === 'security' || request.analysisType === 'all') {
        analysisResults.security = this.analyzeSecurity(request, detectedProducts);
      }

      if (request.analysisType === 'best-practices' || request.analysisType === 'all') {
        analysisResults.bestPractices = this.analyzeBestPractices(request, detectedProducts);
      }

      // 3. Calculate overall quality
      const overallQuality = this.calculateOverallQuality(analysisResults);

      // 4. Identify refactoring opportunities
      const refactoringOpportunities = this.identifyRefactoringOpportunities(
        request,
        detectedProducts,
        analysisResults
      );

      const base: CodeAnalyzerResponse = {
        detectedProducts,
        language: request.language,
        analysisType: request.analysisType,
        ...analysisResults,
        overallQuality,
        refactoringOpportunities
      } as CodeAnalyzerResponse;

      // Build formatter blocks
      const blocks: ContextBlock[] = [];
      blocks.push({ type: 'analysis', title: 'Code Quality Summary', content: base.overallQuality.summary, relevance: 0.95 });
      // Always include a detection evidence block for downstream consumers/tests
      blocks.push({
        type: 'detection-evidence',
        title: 'Product Detection Evidence',
        content: JSON.stringify(detection?.evidence?.slice(0, 20) || []),
        source: 'product-detection',
        relevance: 0.6
      });

      // Optional: include rule intelligence if projectPath provided
      if (request.projectPath) {
        try {
          const ruleAnalysis = await this.ruleService.analyzeIDERules(request.projectPath);
          blocks.push({
            type: 'rules',
            title: 'IDE Rules Summary',
            content: JSON.stringify({
              files: ruleAnalysis.foundFiles,
              lintWarnings: ruleAnalysis.lintWarnings,
              conflicts: ruleAnalysis.conflicts,
              normalized: ruleAnalysis.normalizedDirectives?.slice(0, 20),
              proposed: ruleAnalysis.proposedCursorRules?.slice(0, 2000),
              diff: ruleAnalysis.proposedCursorRulesDiff?.slice(0, 2000)
            }),
            source: request.projectPath
          });
        } catch {}
      }
      if (analysisResults.performance) {
        blocks.push({ type: 'analysis', title: 'Performance Issues', content: JSON.stringify(analysisResults.performance.issues).slice(0, 4000), relevance: 0.85 });
      }
      if (analysisResults.security) {
        blocks.push({ type: 'analysis', title: 'Security Findings', content: JSON.stringify(analysisResults.security.vulnerabilities).slice(0, 4000), relevance: 0.9 });
      }
      if (analysisResults.bestPractices) {
        blocks.push({ type: 'analysis', title: 'Best Practices Violations', content: JSON.stringify(analysisResults.bestPractices.violations).slice(0, 4000), relevance: 0.7 });
      }

      // Attach formatted LLM request (handoff to IDE agent)
      const llm_request = RequestFormatter.format({
        toolName: 'optidev_code_analyzer',
        userPrompt: request.userPrompt,
        promptContext: request.promptContext,
        summary: 'Analyze the provided code issues and propose improvements with examples.',
        products: detectedProducts,
        blocks,
        template: FormatterTemplates.optidev_code_analyzer
      });

      base.llm_request = llm_request;

      return base;

    } catch (error) {
      this.logger.error('Failed to analyze code', error as Error);
      throw error;
    }
  }

  /**
   * Detect Optimizely products in code
   */
  private async detectProductsInCode(codeSnippet: string): Promise<string[]> {
    const detection = await this.productDetection.detectFromPrompt(codeSnippet);
    return detection.products;
  }

  /**
   * Analyze code performance
   */
  private analyzePerformance(
    request: CodeAnalyzerRequest,
    products: string[]
  ): PerformanceAnalysis {
    const issues: CodeIssue[] = [];
    const optimizations: PerformanceAnalysis['optimizations'] = [];

    // Apply language-specific patterns
    const languagePatterns = CodeAnalyzerTool.LANGUAGE_PATTERNS[request.language as keyof typeof CodeAnalyzerTool.LANGUAGE_PATTERNS];
    if (languagePatterns?.performance) {
      issues.push(...this.findPatternMatches(
        request.codeSnippet,
        languagePatterns.performance,
        'performance'
      ));
    }

    // Apply Optimizely-specific patterns
    products.forEach(product => {
      const productPatterns = CodeAnalyzerTool.OPTIMIZELY_PATTERNS[product as keyof typeof CodeAnalyzerTool.OPTIMIZELY_PATTERNS];
      if (productPatterns?.performance) {
        issues.push(...this.findPatternMatches(
          request.codeSnippet,
          productPatterns.performance,
          'performance'
        ));
      }
    });

    // Generate optimizations based on issues found
    issues.forEach(issue => {
      optimizations.push(this.generateOptimization(issue, request.language));
    });

    // Calculate performance score
    const overallScore = Math.max(0, 100 - (issues.length * 10) - (issues.filter(i => i.severity === 'error').length * 20));

    return {
      overallScore,
      issues,
      optimizations
    };
  }

  /**
   * Analyze code security
   */
  private analyzeSecurity(
    request: CodeAnalyzerRequest,
    products: string[]
  ): SecurityAnalysis {
    const vulnerabilities: CodeIssue[] = [];

    // Apply language-specific security patterns
    const languagePatterns = CodeAnalyzerTool.LANGUAGE_PATTERNS[request.language as keyof typeof CodeAnalyzerTool.LANGUAGE_PATTERNS];
    if (languagePatterns?.security) {
      vulnerabilities.push(...this.findPatternMatches(
        request.codeSnippet,
        languagePatterns.security,
        'security'
      ));
    }

    // Determine risk level
    const criticalIssues = vulnerabilities.filter(v => v.severity === 'critical').length;
    const errorIssues = vulnerabilities.filter(v => v.severity === 'error').length;
    
    let riskLevel: SecurityAnalysis['riskLevel'] = 'low';
    if (criticalIssues > 0) riskLevel = 'critical';
    else if (errorIssues > 0) riskLevel = 'high';
    else if (vulnerabilities.length > 0) riskLevel = 'medium';

    // Generate recommendations
    const recommendations = this.generateSecurityRecommendations(vulnerabilities, request.language);

    return {
      riskLevel,
      vulnerabilities,
      recommendations
    };
  }

  /**
   * Analyze best practices compliance
   */
  private analyzeBestPractices(
    request: CodeAnalyzerRequest,
    products: string[]
  ): BestPracticesAnalysis {
    const violations: CodeIssue[] = [];

    // Apply language-specific best practice patterns
    const languagePatterns = CodeAnalyzerTool.LANGUAGE_PATTERNS[request.language as keyof typeof CodeAnalyzerTool.LANGUAGE_PATTERNS];
    if (languagePatterns?.bestPractices) {
      violations.push(...this.findPatternMatches(
        request.codeSnippet,
        languagePatterns.bestPractices,
        'best-practices'
      ));
    }

    // Apply Optimizely-specific patterns
    products.forEach(product => {
      const productPatterns = CodeAnalyzerTool.OPTIMIZELY_PATTERNS[product as keyof typeof CodeAnalyzerTool.OPTIMIZELY_PATTERNS];
      if (productPatterns?.bestPractices) {
        violations.push(...this.findPatternMatches(
          request.codeSnippet,
          productPatterns.bestPractices,
          'best-practices'
        ));
      }
    });

    // Calculate compliance score
    const complianceScore = Math.max(0, 100 - (violations.length * 8) - (violations.filter(v => v.severity === 'error').length * 15));

    // Generate suggestions
    const suggestions = this.generateBestPracticeSuggestions(violations, request.language, products);

    return {
      complianceScore,
      violations,
      suggestions
    };
  }

  /**
   * Find pattern matches in code
   */
  private findPatternMatches(
    code: string,
    patterns: Array<{ pattern: RegExp; message: string; severity: CodeIssue['severity'] }>,
    category: string
  ): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = code.split('\n');

    patterns.forEach(({ pattern, message, severity }) => {
      lines.forEach((line, lineIndex) => {
        const matches = line.match(pattern);
        if (matches) {
          issues.push({
            line: lineIndex + 1,
            column: line.indexOf(matches[0]) + 1,
            severity,
            category,
            message,
            suggestion: this.generateSuggestion(message, category)
          });
        }
      });
    });

    return issues;
  }

  /**
   * Generate suggestion based on issue
   */
  private generateSuggestion(message: string, category: string): string {
    const suggestionMap: Record<string, string> = {
      'Use let or const instead of var': 'Replace "var" with "let" for block-scoped variables or "const" for constants',
      'Use strict equality (===) instead of ==': 'Replace "==" with "===" to avoid type coercion issues',
      'eval() is dangerous and should be avoided': 'Use safer alternatives like JSON.parse() or Function constructor',
      'innerHTML can lead to XSS vulnerabilities': 'Use textContent for text or sanitize HTML content before assignment',
      'Use StringBuilder for string concatenation': 'Replace string concatenation with StringBuilder.Append() for better performance'
    };

    return suggestionMap[message] || `Consider reviewing this ${category} issue and applying appropriate fixes`;
  }

  /**
   * Generate optimization recommendation
   */
  private generateOptimization(issue: CodeIssue, language: string): PerformanceAnalysis['optimizations'][0] {
    const optimizationMap: Record<string, any> = {
      'Chained map+filter can be optimized': {
        title: 'Combine map and filter operations',
        description: 'Use a single reduce or flatMap operation instead of chaining map and filter',
        impact: 'medium' as const,
        effort: 'low' as const,
        codeExample: `
// Instead of:
items.map(x => transform(x)).filter(x => x.isValid)

// Use:
items.reduce((acc, x) => {
  const transformed = transform(x);
  return transformed.isValid ? [...acc, transformed] : acc;
}, [])`
      },
      'Cache DOM queries instead of repeated lookups': {
        title: 'Cache DOM element references',
        description: 'Store frequently accessed DOM elements in variables',
        impact: 'high' as const,
        effort: 'low' as const,
        codeExample: `
// Instead of:
document.getElementById('myElement').style.color = 'red';
document.getElementById('myElement').style.fontSize = '14px';

// Use:
const element = document.getElementById('myElement');
element.style.color = 'red';
element.style.fontSize = '14px';`
      }
    };

    return optimizationMap[issue.message] || {
      title: 'General optimization opportunity',
      description: issue.message,
      impact: 'medium' as const,
      effort: 'medium' as const
    };
  }

  /**
   * Generate security recommendations
   */
  private generateSecurityRecommendations(
    vulnerabilities: CodeIssue[],
    language: string
  ): string[] {
    const recommendations = [
      'Implement input validation and sanitization',
      'Use parameterized queries to prevent SQL injection',
      'Avoid storing sensitive data in client-side code',
      'Implement proper error handling without exposing system details'
    ];

    // Add specific recommendations based on vulnerabilities found
    if (vulnerabilities.some(v => v.message.includes('eval'))) {
      recommendations.push('Replace eval() with safer alternatives like JSON.parse()');
    }
    if (vulnerabilities.some(v => v.message.includes('innerHTML'))) {
      recommendations.push('Use textContent or sanitize HTML before using innerHTML');
    }
    if (vulnerabilities.some(v => v.message.includes('password'))) {
      recommendations.push('Move sensitive credentials to secure configuration files');
    }

    return recommendations;
  }

  /**
   * Generate best practice suggestions
   */
  private generateBestPracticeSuggestions(
    violations: CodeIssue[],
    language: string,
    products: string[]
  ): BestPracticesAnalysis['suggestions'] {
    const suggestions: BestPracticesAnalysis['suggestions'] = [];

    // Language-specific suggestions
    if (language === 'typescript' || language === 'javascript') {
      suggestions.push({
        category: 'Modern JavaScript/TypeScript',
        description: 'Use modern ES6+ features for cleaner, more maintainable code',
        examples: [
          'Use const and let instead of var',
          'Use arrow functions for shorter syntax',
          'Use template literals instead of string concatenation',
          'Use destructuring for object and array operations'
        ]
      });
    }

    if (language === 'csharp') {
      suggestions.push({
        category: 'C# Best Practices',
        description: 'Follow C# coding standards and modern language features',
        examples: [
          'Use dependency injection instead of service locator pattern',
          'Implement proper async/await patterns',
          'Use null-conditional operators for safer null checking',
          'Follow proper exception handling practices'
        ]
      });
    }

    // Optimizely-specific suggestions
    if (products.includes('commerce')) {
      suggestions.push({
        category: 'Optimizely Commerce',
        description: 'Follow Commerce development best practices',
        examples: [
          'Use dependency injection for service access',
          'Implement proper caching strategies for catalog data',
          'Use strongly-typed models for business objects',
          'Follow extension development patterns'
        ]
      });
    }

    if (products.includes('cms-paas') || products.includes('cms-saas')) {
      suggestions.push({
        category: 'Optimizely CMS',
        description: 'Follow CMS development best practices',
        examples: [
          'Use IContentRepository instead of DataFactory',
          'Implement proper content type definitions',
          'Use strongly-typed page and block models',
          'Follow template and component organization patterns'
        ]
      });
    }

    return suggestions;
  }

  /**
   * Calculate overall code quality
   */
  private calculateOverallQuality(
    analysisResults: Partial<CodeAnalyzerResponse>
  ): CodeAnalyzerResponse['overallQuality'] {
    let totalScore = 0;
    let scoreCount = 0;

    if (analysisResults.performance) {
      totalScore += analysisResults.performance.overallScore;
      scoreCount++;
    }

    if (analysisResults.security) {
      // Convert risk level to score
      const securityScore = {
        critical: 20,
        high: 40,
        medium: 70,
        low: 90
      }[analysisResults.security.riskLevel];
      totalScore += securityScore;
      scoreCount++;
    }

    if (analysisResults.bestPractices) {
      totalScore += analysisResults.bestPractices.complianceScore;
      scoreCount++;
    }

    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 50;

    // Determine grade
    let grade: CodeAnalyzerResponse['overallQuality']['grade'];
    if (averageScore >= 90) grade = 'A';
    else if (averageScore >= 80) grade = 'B';
    else if (averageScore >= 70) grade = 'C';
    else if (averageScore >= 60) grade = 'D';
    else grade = 'F';

    // Generate summary
    const summary = this.generateQualitySummary(averageScore, grade, analysisResults);

    return {
      score: averageScore,
      grade,
      summary
    };
  }

  /**
   * Generate quality summary
   */
  private generateQualitySummary(
    score: number,
    grade: string,
    analysisResults: Partial<CodeAnalyzerResponse>
  ): string {
    const issueCount = (analysisResults.performance?.issues.length || 0) +
                     (analysisResults.security?.vulnerabilities.length || 0) +
                     (analysisResults.bestPractices?.violations.length || 0);

    if (score >= 90) {
      return `Excellent code quality (${score}/100). ${issueCount === 0 ? 'No issues found.' : `Only ${issueCount} minor issues to address.`}`;
    } else if (score >= 80) {
      return `Good code quality (${score}/100) with ${issueCount} issues to address.`;
    } else if (score >= 70) {
      return `Average code quality (${score}/100). Consider addressing ${issueCount} identified issues.`;
    } else if (score >= 60) {
      return `Below average code quality (${score}/100). ${issueCount} issues need attention.`;
    } else {
      return `Poor code quality (${score}/100). Significant improvements needed - ${issueCount} issues identified.`;
    }
  }

  /**
   * Identify refactoring opportunities
   */
  private identifyRefactoringOpportunities(
    request: CodeAnalyzerRequest,
    products: string[],
    analysisResults: Partial<CodeAnalyzerResponse>
  ): CodeAnalyzerResponse['refactoringOpportunities'] {
    const opportunities: CodeAnalyzerResponse['refactoringOpportunities'] = [];

    // Performance-based refactoring
    if (analysisResults.performance && analysisResults.performance.overallScore < 70) {
      opportunities.push({
        type: 'Performance Optimization',
        description: 'Multiple performance issues detected that could benefit from refactoring',
        benefits: [
          'Improved application responsiveness',
          'Reduced resource consumption',
          'Better user experience'
        ],
        estimatedEffort: '2-4 hours'
      });
    }

    // Security-based refactoring
    if (analysisResults.security && ['critical', 'high'].includes(analysisResults.security.riskLevel)) {
      opportunities.push({
        type: 'Security Hardening',
        description: 'Security vulnerabilities require immediate refactoring',
        benefits: [
          'Improved application security',
          'Reduced risk of attacks',
          'Compliance with security standards'
        ],
        estimatedEffort: '4-8 hours'
      });
    }

    // Best practices refactoring
    if (analysisResults.bestPractices && analysisResults.bestPractices.complianceScore < 70) {
      opportunities.push({
        type: 'Code Modernization',
        description: 'Code doesn\'t follow modern best practices and could be improved',
        benefits: [
          'Improved code maintainability',
          'Better team collaboration',
          'Easier debugging and testing'
        ],
        estimatedEffort: '1-3 hours'
      });
    }

    // Optimizely-specific refactoring
    if (products.length > 0) {
      opportunities.push({
        type: 'Optimizely Integration Optimization',
        description: `Code could better leverage ${products.join(', ')} platform capabilities`,
        benefits: [
          'Better platform integration',
          'Improved performance with platform features',
          'More maintainable Optimizely code'
        ],
        estimatedEffort: '2-6 hours'
      });
    }

    return opportunities;
  }
}