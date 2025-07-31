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

export class ContextAnalysisEngine {
  private promptAnalyzer: PromptAnalyzer;
  private productDetectionService: ProductDetectionService;
  private logger: Logger;
  private isInitialized = false;

  constructor(logger: Logger) {
    this.logger = logger;
    this.promptAnalyzer = new PromptAnalyzer(logger);
    this.productDetectionService = new ProductDetectionService(logger);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.debug('Initializing Context Analysis Engine');
      
      await Promise.all([
        this.promptAnalyzer.initialize(),
        this.productDetectionService.initialize()
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

      // Step 4: Curate context based on analysis and detection
      const curatedContext = await this.curateContext(promptAnalysis, productDetection);

      // Step 5: Build final response
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

  private async curateContext(
    promptAnalysis: PromptAnalysisResult,
    detectedProducts: OptimizelyProduct[]
  ): Promise<CuratedResponse> {
    // This is Phase 1 basic implementation
    // In Phase 2, this will integrate with documentation service
    // In Phase 3, this will include rule intelligence
    // In Phase 4, this will include knowledge base learning

    const context: CuratedResponse = {
      relevance: promptAnalysis.relevance,
      productContext: detectedProducts,
      summary: this.generateSummary(promptAnalysis, detectedProducts),
      actionableSteps: this.generateActionableSteps(promptAnalysis, detectedProducts),
      codeExamples: [], // Will be populated in Phase 2 with documentation service
      documentation: [], // Will be populated in Phase 2 with documentation service
      bestPractices: this.generateBasicBestPractices(detectedProducts)
    };

    return context;
  }

  private generateSummary(
    promptAnalysis: PromptAnalysisResult,
    detectedProducts: OptimizelyProduct[]
  ): string {
    const productNames = detectedProducts.map(p => this.getProductDisplayName(p));
    const productContext = productNames.length > 0 
      ? `for ${productNames.join(', ')} development`
      : 'for Optimizely development';

    switch (promptAnalysis.intent) {
      case 'code-help':
        return `Code assistance ${productContext} - analyzing development requirements and providing implementation guidance.`;
      case 'documentation':
        return `Documentation search ${productContext} - providing relevant documentation and reference materials.`;
      case 'troubleshooting':
        return `Troubleshooting support ${productContext} - helping diagnose and resolve development issues.`;
      case 'best-practices':
        return `Best practices guidance ${productContext} - sharing recommended approaches and patterns.`;
      case 'configuration':
        return `Configuration help ${productContext} - assisting with setup and configuration tasks.`;
      default:
        return `Development assistance ${productContext} - providing contextual guidance and support.`;
    }
  }

  private generateActionableSteps(
    promptAnalysis: PromptAnalysisResult,
    detectedProducts: OptimizelyProduct[]
  ): string[] {
    const steps: string[] = [];

    if (detectedProducts.length > 0) {
      steps.push(`Working with ${detectedProducts.map(p => this.getProductDisplayName(p)).join(', ')}`);
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

  private generateBasicBestPractices(detectedProducts: OptimizelyProduct[]): string[] {
    const practices: string[] = [];

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

    // General best practices
    practices.push('Follow Optimizely naming conventions and coding standards');
    practices.push('Implement comprehensive error handling and logging');
    practices.push('Write maintainable and well-documented code');

    return practices;
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