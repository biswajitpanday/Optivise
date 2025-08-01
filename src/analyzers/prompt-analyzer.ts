/**
 * Prompt Analyzer
 * Analyzes user prompts for Optimizely relevance and intent
 */

import type {
  PromptAnalysisResult,
  PromptIntent,
  OptimizelyProduct,
  Logger
} from '../types/index.js';

export class PromptAnalyzer {
  private readonly logger: Logger;
  private isInitialized = false;

  // Optimizely-specific keywords and patterns
  private readonly optimizelyKeywords = [
    // General Optimizely terms
    'optimizely', 'episerver', 'opti',
    
    // Commerce terms
    'configured commerce', 'commerce connect', 'insite', 'spire',
    'b2b commerce', 'ecommerce', 'shopping cart', 'product catalog',
    'pricing', 'inventory', 'order management',
    
    // CMS terms
    'cms', 'content management', 'episerver cms', 'optimizely cms',
    'content types', 'blocks', 'pages', 'properties',
    'episerver ui', 'cms admin', 'content area',
    
    // Experimentation terms
    'experimentation', 'a/b test', 'ab test', 'feature flag',
    'experiment', 'variation', 'audience', 'targeting',
    'conversion', 'funnel', 'rollout',
    
    // DXP terms
    'dxp', 'digital experience', 'personalization',
    'visitor groups', 'recommendations',
    
    // Technical terms
    'handler', 'pipeline', 'extension', 'blueprint',
    'startup.cs', 'appsettings', 'web.config',
    'ioc container', 'dependency injection'
  ];

  private readonly productKeywords: Record<OptimizelyProduct, string[]> = {
    'configured-commerce': [
      'configured commerce', 'insite', 'spire', 'b2b commerce',
      'handler', 'pipeline', 'extension', 'blueprint',
      'product catalog', 'pricing', 'inventory', 'cart',
      'checkout', 'order', 'customer', 'account'
    ],
    'commerce-connect': [
      'commerce connect', 'connector', 'integration',
      'synchronization', 'product sync', 'order sync'
    ],
    'cms-paas': [
      'cms', 'episerver cms', 'optimizely cms', 'content management',
      'content types', 'blocks', 'pages', 'properties',
      'startup.cs', 'iservicecollection', 'mvc'
    ],
    'cms-saas': [
      'cms saas', 'cloud cms', 'headless cms',
      'content graph', 'optimizely graph'
    ],
    'cmp': [
      'content marketing', 'campaign', 'orchestration',
      'marketing automation', 'content calendar'
    ],
    'dxp': [
      'dxp', 'digital experience', 'personalization',
      'visitor groups', 'content recommendations'
    ],
    'web-experimentation': [
      'web experimentation', 'a/b test', 'ab test',
      'experiment', 'variation', 'audience targeting',
      'javascript sdk', 'optimizely x'
    ],
    'feature-experimentation': [
      'feature experimentation', 'feature flag', 'rollout',
      'sdk', 'datafile', 'user context'
    ],
    'data-platform': [
      'data platform', 'customer data', 'analytics',
      'event tracking', 'data warehouse', 'segments'
    ],
    'connect-platform': [
      'connect platform', 'integration', 'webhook',
      'api gateway', 'data sync'
    ],
    'recommendations': [
      'recommendations', 'product recommendations',
      'recommendation engine', 'personalized content'
    ]
  };

  private readonly intentPatterns: Record<PromptIntent, RegExp[]> = {
    'code-help': [
      /how\s+to\s+(implement|create|write|build|develop)/i,
      /can\s+you\s+(help|show|write|create)/i,
      /example\s+of|sample\s+code|code\s+example/i,
      /(implement|implementation|developing|building)/i
    ],
    'documentation': [
      /where\s+(can\s+i\s+find|is\s+the)\s+documentation/i,
      /documentation\s+(for|about)/i,
      /api\s+(reference|documentation)/i,
      /docs|documentation/i
    ],
    'troubleshooting': [
      /(error|issue|problem|bug|not\s+working|failing|broken)/i,
      /why\s+(is|does|doesn't|isn't)/i,
      /(fix|solve|resolve|debug)/i,
      /(troubleshoot|diagnose)/i
    ],
    'best-practices': [
      /best\s+practices?/i,
      /recommended\s+(approach|way|method)/i,
      /should\s+i|what's\s+the\s+best\s+way/i,
      /(convention|standard|guideline)/i
    ],
    'configuration': [
      /(configure|configuration|setup|install|installation)/i,
      /(setting|settings|config)/i,
      /how\s+do\s+i\s+(set\s+up|configure)/i
    ],
    'unknown': []
  };

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.debug('Initializing Prompt Analyzer');
    
    // No async initialization needed for Phase 1
    // In future phases, this might load ML models or pattern databases
    
    this.isInitialized = true;
    this.logger.info('Prompt Analyzer initialized');
  }

  async analyze(prompt: string): Promise<PromptAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const normalizedPrompt = prompt.toLowerCase().trim();
      
      // Calculate Optimizely relevance score
      const relevance = this.calculateOptimizelyRelevance(normalizedPrompt);
      
      // Extract keywords
      const keywords = this.extractOptimizelyKeywords(normalizedPrompt);
      
      // Determine user intent
      const intent = this.determineIntent(normalizedPrompt);
      
      // Identify potential product hints
      const productHints = this.identifyProductHints(normalizedPrompt, keywords);
      
      // Calculate overall confidence
      const confidence = this.calculateConfidence(relevance, keywords.length, productHints.length);

      const result: PromptAnalysisResult = {
        relevance,
        keywords,
        intent,
        productHints,
        confidence
      };

      this.logger.debug('Prompt analysis completed', {
        relevance,
        intent,
        keywordCount: keywords.length,
        productHints: productHints.length,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      this.logger.error('Prompt analysis failed', error as Error, {
        promptLength: prompt.length,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  private calculateOptimizelyRelevance(prompt: string): number {
    let score = 0;
    let maxScore = 0;

    // Direct Optimizely mentions (high weight)
    const directMentions = ['optimizely', 'episerver', 'opti'].filter(term => 
      prompt.includes(term)
    );
    score += directMentions.length * 0.4;
    maxScore += 0.4;

    // Product-specific terms (medium weight)
    const productTermCount = this.optimizelyKeywords.filter(keyword => 
      prompt.includes(keyword.toLowerCase())
    ).length;
    score += Math.min(productTermCount * 0.1, 0.3);
    maxScore += 0.3;

    // Technical patterns (medium weight)
    const technicalPatterns = [
      /handler.*chain/i,
      /extension.*point/i,
      /startup\.cs/i,
      /appsettings.*json/i,
      /content.*type/i,
      /visitor.*group/i
    ];
    const technicalMatches = technicalPatterns.filter(pattern => pattern.test(prompt)).length;
    score += Math.min(technicalMatches * 0.1, 0.2);
    maxScore += 0.2;

    // Context indicators (low weight)
    const contextIndicators = [
      'commerce', 'cms', 'experimentation', 'personalization',
      'a/b test', 'feature flag', 'content management'
    ];
    const contextMatches = contextIndicators.filter(indicator => 
      prompt.includes(indicator)
    ).length;
    score += Math.min(contextMatches * 0.05, 0.1);
    maxScore += 0.1;

    // Normalize score to 0-1 range
    return Math.min(score, 1.0);
  }

  private extractOptimizelyKeywords(prompt: string): string[] {
    return this.optimizelyKeywords.filter(keyword => 
      prompt.includes(keyword.toLowerCase())
    );
  }

  private determineIntent(prompt: string): PromptIntent {
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      if (patterns.some(pattern => pattern.test(prompt))) {
        return intent as PromptIntent;
      }
    }
    return 'unknown';
  }

  private identifyProductHints(prompt: string, keywords: string[]): OptimizelyProduct[] {
    const productHints: OptimizelyProduct[] = [];
    
    for (const [product, productKeywords] of Object.entries(this.productKeywords)) {
      const matchCount = productKeywords.filter(keyword => 
        prompt.includes(keyword.toLowerCase()) || keywords.includes(keyword)
      ).length;
      
      if (matchCount > 0) {
        productHints.push(product as OptimizelyProduct);
      }
    }
    
    return productHints;
  }

  private calculateConfidence(
    relevance: number, 
    keywordCount: number, 
    productHintCount: number
  ): number {
    // Base confidence from relevance
    let confidence = relevance * 0.6;
    
    // Boost from keyword matches
    confidence += Math.min(keywordCount * 0.05, 0.25);
    
    // Boost from product hints
    confidence += Math.min(productHintCount * 0.1, 0.15);
    
    return Math.min(confidence, 1.0);
  }
}