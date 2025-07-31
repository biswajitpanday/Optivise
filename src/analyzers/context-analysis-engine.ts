/**
 * Context Analysis Engine
 * Core engine for analyzing prompts and curating Optimizely context
 */

import type {
  ContextAnalysisRequest,
  ContextAnalysisResponse,
  CuratedResponse,
  PromptAnalysisResult,
  OptimizelyProduct,
  Logger
} from '../types/index.js';

import { DEFAULT_RELEVANCE_THRESHOLD } from '../types/index.js';

import { PromptAnalyzer } from './prompt-analyzer.js';
import { ProductDetectionService } from '../services/product-detection-service.js';
import { RuleIntelligenceService } from '../services/rule-intelligence-service.js';
import { DocumentationService } from '../services/documentation-service.js';

export class ContextAnalysisEngine {
  private readonly promptAnalyzer: PromptAnalyzer;
  private readonly productDetectionService: ProductDetectionService;
  private readonly ruleIntelligenceService: RuleIntelligenceService;
  private readonly documentationService: DocumentationService;
  private readonly logger: Logger;
  private isInitialized = false;

  constructor(logger: Logger) {
    this.logger = logger;
    this.promptAnalyzer = new PromptAnalyzer(logger);
    this.productDetectionService = new ProductDetectionService(logger);
    this.ruleIntelligenceService = new RuleIntelligenceService(logger);
    this.documentationService = new DocumentationService(logger);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.debug('Initializing Context Analysis Engine');
      
      await Promise.all([
        this.promptAnalyzer.initialize(),
        this.productDetectionService.initialize(),
        this.ruleIntelligenceService.initialize(),
        this.documentationService.initialize()
      ]);

      this.isInitialized = true;
      this.logger.info('Context Analysis Engine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Context Analysis Engine', error as Error);
      throw error;
    }
  }

  async analyze(request: ContextAnalysisRequest): Promise<ContextAnalysisResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Analyze prompt for Optimizely relevance
      const promptAnalysis = await this.promptAnalyzer.analyze(request.prompt);
      
      // Step 2: Check relevance threshold - only proceed if relevant
      if (promptAnalysis.relevance < DEFAULT_RELEVANCE_THRESHOLD) {
        return this.createLowRelevanceResponse(promptAnalysis, startTime);
      }

      // Step 3: Detect Optimizely product context
      const productDetection = await this.detectProductContext(request, promptAnalysis);

      // Step 4: Analyze IDE rules (if project path available)
      const ruleAnalysis = request.projectPath ? 
        await this.analyzeProjectRules(request.projectPath) : null;

      // Step 5: Fetch relevant documentation
      const documentation = await this.fetchRelevantDocumentation(productDetection, promptAnalysis.intent);

      // Step 6: Curate context based on analysis and detection
      const curatedContext = await this.curateContext(promptAnalysis, productDetection, ruleAnalysis, documentation);

      // Step 7: Build final response
      const response: ContextAnalysisResponse = {
        relevance: promptAnalysis.relevance,
        detectedProducts: productDetection,
        curatedContext,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };

      this.logger.debug('Context analysis completed', {
        relevance: response.relevance,
        products: response.detectedProducts,
        processingTime: response.processingTime
      });

      return response;

    } catch (error) {
      this.logger.error('Context analysis failed');
      throw error;
    }
  }

  private createLowRelevanceResponse(
    promptAnalysis: PromptAnalysisResult,
    startTime: number
  ): ContextAnalysisResponse {
    this.logger.debug('Prompt below relevance threshold', {
      relevance: promptAnalysis.relevance,
      threshold: DEFAULT_RELEVANCE_THRESHOLD
    });

    return {
      relevance: promptAnalysis.relevance,
      detectedProducts: [],
      curatedContext: {
        relevance: promptAnalysis.relevance,
        productContext: [],
        summary: 'This query does not appear to be related to Optimizely development. OptiDevAssistant specializes in providing context for Optimizely-specific questions.',
        actionableSteps: [],
        codeExamples: [],
        documentation: [],
        bestPractices: []
      },
      processingTime: Date.now() - startTime,
      timestamp: new Date()
    };
  }

  private async detectProductContext(
    request: ContextAnalysisRequest,
    promptAnalysis: PromptAnalysisResult
  ): Promise<OptimizelyProduct[]> {
    try {
      // Use project path if available (IDE mode)
      if (request.projectPath) {
        const detection = await this.productDetectionService.detectFromProject(request.projectPath);
        return detection.products;
      }

      // Fall back to prompt-based detection
      const detection = await this.productDetectionService.detectFromPrompt(
        request.prompt,
        promptAnalysis.productHints
      );
      return detection.products;

    } catch (error) {
      this.logger.warn('Product detection failed, using prompt hints');
      return promptAnalysis.productHints;
    }
  }

  private async analyzeProjectRules(projectPath: string) {
    try {
      return await this.ruleIntelligenceService.analyzeIDERules(projectPath);
    } catch (error) {
      this.logger.warn('Rule analysis failed, continuing without rules');
      return null;
    }
  }

  private async fetchRelevantDocumentation(products: OptimizelyProduct[], intent?: string) {
    try {
      if (products.length === 0) return [];
      
      // For Phase 2, fetch documentation for detected products
      const documentation = await this.documentationService.fetchDocumentation(products);
      
      this.logger.debug('Documentation fetched', {
        products,
        documentsRetrieved: documentation.length
      });
      
      return documentation;
    } catch (error) {
      this.logger.warn('Documentation fetch failed, continuing without docs');
      return [];
    }
  }

  private async curateContext(
    promptAnalysis: PromptAnalysisResult,
    detectedProducts: OptimizelyProduct[],
    ruleAnalysis?: any,
    documentation?: any[]
  ): Promise<CuratedResponse> {
    // Phase 2 implementation with rule intelligence and documentation service
    const context: CuratedResponse = {
      relevance: promptAnalysis.relevance,
      productContext: detectedProducts,
      summary: this.generateSummary(promptAnalysis, detectedProducts, ruleAnalysis),
      actionableSteps: this.generateActionableSteps(promptAnalysis, detectedProducts, ruleAnalysis),
      codeExamples: this.extractCodeExamples(documentation || []),
      documentation: this.formatDocumentationLinks(documentation || []),
      bestPractices: this.generateBestPractices(detectedProducts, ruleAnalysis)
    };

    return context;
  }

  private generateSummary(
    promptAnalysis: PromptAnalysisResult,
    detectedProducts: OptimizelyProduct[],
    ruleAnalysis?: any
  ): string {
    const productNames = detectedProducts.map(p => this.getProductDisplayName(p));
    const productContext = productNames.length > 0 
      ? `for ${productNames.join(', ')} development`
      : 'for Optimizely development';

    // Add rule context if available
    const ruleContext = ruleAnalysis?.foundFiles?.length 
      ? ` (${ruleAnalysis.foundFiles.length} IDE rule files detected with ${ruleAnalysis.optimizelyRelevance.toFixed(1)} relevance)`
      : '';

    switch (promptAnalysis.intent) {
      case 'code-help':
        return `Code assistance ${productContext}${ruleContext} - analyzing development requirements and providing implementation guidance.`;
      case 'documentation':
        return `Documentation search ${productContext}${ruleContext} - providing relevant documentation and reference materials.`;
      case 'troubleshooting':
        return `Troubleshooting support ${productContext}${ruleContext} - helping diagnose and resolve development issues.`;
      case 'best-practices':
        return `Best practices guidance ${productContext}${ruleContext} - sharing recommended approaches and patterns.`;
      case 'configuration':
        return `Configuration help ${productContext}${ruleContext} - assisting with setup and configuration tasks.`;
      default:
        return `Development assistance ${productContext}${ruleContext} - providing contextual guidance and support.`;
    }
  }

  private generateActionableSteps(
    promptAnalysis: PromptAnalysisResult,
    detectedProducts: OptimizelyProduct[],
    ruleAnalysis?: any
  ): string[] {
    const steps: string[] = [];

    if (detectedProducts.length > 0) {
      steps.push(`Working with ${detectedProducts.map(p => this.getProductDisplayName(p)).join(', ')}`);
    }

    // Add rule enhancement suggestions
    if (ruleAnalysis?.suggestedEnhancements?.length) {
      steps.push(`Rule enhancement available: ${ruleAnalysis.suggestedEnhancements[0].suggestion}`);
    }

    switch (promptAnalysis.intent) {
      case 'code-help':
        steps.push('Review relevant code examples and implementation patterns');
        steps.push('Check official documentation for API references');
        steps.push('Consider best practices for your specific use case');
        break;
      case 'troubleshooting':
        steps.push('Identify the specific error or issue');
        steps.push('Check logs and error messages for additional context');
        steps.push('Review recent changes that might have caused the issue');
        break;
      case 'best-practices':
        steps.push('Review established patterns and conventions');
        steps.push('Consider performance and maintainability implications');
        steps.push('Validate approach against official recommendations');
        break;
      default:
        steps.push('Gather more specific requirements');
        steps.push('Review relevant documentation and examples');
    }

    return steps;
  }

  private generateBestPractices(detectedProducts: OptimizelyProduct[], ruleAnalysis?: any): string[] {
    const practices: string[] = [];

    // Add rule-based practices first
    if (ruleAnalysis?.suggestedEnhancements?.length) {
      for (const enhancement of ruleAnalysis.suggestedEnhancements.slice(0, 2)) {
        practices.push(`${enhancement.suggestion}: ${enhancement.rationale}`);
      }
    }

    if (detectedProducts.includes('configured-commerce')) {
      practices.push('Follow handler chain patterns for extending commerce functionality');
      practices.push('Use proper dependency injection in your extensions');
      practices.push('Implement proper error handling and logging');
    }

    if (detectedProducts.includes('cms-paas') || detectedProducts.includes('cms-saas')) {
      practices.push('Use content types and properties appropriately');
      practices.push('Follow MVC patterns in your implementations');
      practices.push('Implement proper caching strategies');
    }

    if (detectedProducts.includes('web-experimentation') || detectedProducts.includes('feature-experimentation')) {
      practices.push('Implement proper event tracking and analytics');
      practices.push('Use feature flags to control experiment rollouts');
      practices.push('Ensure proper audience targeting and segmentation');
    }

    // IDE-specific practices based on rule analysis
    if (ruleAnalysis?.optimizelyRelevance < 0.5) {
      practices.push('Consider adding Optimizely-specific IDE configurations for better development experience');
    }

    // General best practices
    practices.push('Follow Optimizely naming conventions and coding standards');
    practices.push('Implement comprehensive error handling and logging');
    practices.push('Write maintainable and well-documented code');

    return practices;
  }

  private extractCodeExamples(documentation: any[]): any[] {
    const codeExamples: any[] = [];
    
    for (const doc of documentation) {
      if (doc?.content) {
        // Extract code blocks from documentation content
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(doc.content)) !== null && match.index !== undefined) {
          const language = match[1] || 'text';
          const code = match[2]?.trim() || '';
          
          if (code.length > 10) { // Only include substantial code blocks
            codeExamples.push({
              language,
              code,
              description: this.extractCodeDescription(doc.content, match.index),
              source: doc.source || 'Documentation',
              relevance: 0.8
            });
          }
        }
      }
    }
    
    // Sort by relevance and limit to top 5
    return codeExamples
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }

  private formatDocumentationLinks(documentation: any[]): any[] {
    return documentation
      .filter(doc => doc?.source && doc?.title)
      .map(doc => ({
        title: doc.title,
        url: doc.source,
        description: this.extractDocDescription(doc),
        relevance: doc.relevanceScore || 0.8,
        lastUpdated: doc.lastUpdated
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3); // Limit to top 3 most relevant docs
  }

  private extractCodeDescription(content: string, codeIndex: number): string {
    // Look for the heading or paragraph before the code block
    const beforeCode = content.substring(0, codeIndex);
    const lines = beforeCode.split('\n').reverse();
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || (trimmed.length > 10 && !trimmed.startsWith('```'))) {
        return trimmed.replace(/^#+\s*/, '').substring(0, 100);
      }
    }
    
    return 'Code example from documentation';
  }

  private extractDocDescription(doc: any): string {
    if (doc.content) {
      // Extract first meaningful paragraph
      const paragraphs = doc.content.split('\n\n');
      for (const paragraph of paragraphs) {
        const cleaned = paragraph.replace(/#+\s*/g, '').trim();
        if (cleaned.length > 50 && !cleaned.startsWith('```')) {
          return cleaned.substring(0, 150) + '...';
        }
      }
    }
    
    return `Documentation for ${doc.products?.join(', ') || 'Optimizely'} development`;
  }

  private getProductDisplayName(product: OptimizelyProduct): string {
    const names: Record<OptimizelyProduct, string> = {
      'configured-commerce': 'Configured Commerce',
      'commerce-connect': 'Commerce Connect',
      'cms-paas': 'CMS (PaaS)',
      'cms-saas': 'CMS (SaaS)',
      'cmp': 'Content Marketing Platform',
      'dxp': 'Digital Experience Platform',
      'web-experimentation': 'Web Experimentation',
      'feature-experimentation': 'Feature Experimentation',
      'data-platform': 'Data Platform',
      'connect-platform': 'Connect Platform',
      'recommendations': 'Recommendations'
    };
    return names[product] || product;
  }

  isProductDetectionEnabled(): boolean {
    return this.productDetectionService?.isEnabled() || false;
  }
}