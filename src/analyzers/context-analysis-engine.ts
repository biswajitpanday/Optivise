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
  Logger,
  PromptContext,
  ContextBlock
} from '../types/index.js';

import { DEFAULT_RELEVANCE_THRESHOLD } from '../types/index.js';

import { PromptAnalyzer } from './prompt-analyzer.js';
import { ProductDetectionService } from '../services/product-detection-service.js';
import { RuleIntelligenceService } from '../services/rule-intelligence-service.js';
import { DocumentationService } from '../services/documentation-service.js';
import { PromptAwareSearchService } from '../services/prompt-aware-search.js';
import { SessionMemoryService } from '../services/session-memory.js';
import { PromptCache } from '../services/prompt-cache.js';
import { chromaDBService } from '../integrations/chromadb-client.js';
import { openAIClient } from '../integrations/openai-client.js';

export class ContextAnalysisEngine {
  private readonly promptAnalyzer: PromptAnalyzer;
  private readonly productDetectionService: ProductDetectionService;
  private readonly ruleIntelligenceService: RuleIntelligenceService;
  private readonly documentationService: DocumentationService;
  private readonly promptSearch: PromptAwareSearchService;
  private readonly sessionMemory: SessionMemoryService;
  private readonly promptCache = new PromptCache<ContextAnalysisResponse>(60 * 1000);
  private readonly logger: Logger;
  private isInitialized = false;
  private aiEnabled = false;

  constructor(logger: Logger) {
    this.logger = logger;
    this.promptAnalyzer = new PromptAnalyzer(logger);
    this.productDetectionService = new ProductDetectionService(logger);
    this.ruleIntelligenceService = new RuleIntelligenceService(logger);
    this.documentationService = new DocumentationService(logger);
    this.promptSearch = new PromptAwareSearchService(logger);
    this.sessionMemory = new SessionMemoryService(logger);
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
      this.logger.info('Context Analysis Engine initialized successfully', {
        aiEnabled: this.aiEnabled
      });

      // Initialize AI services asynchronously (non-blocking)
      this.initializeAIServicesAsync();

    } catch (error) {
      this.logger.error('Failed to initialize Context Analysis Engine', error as Error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Clean up AI clients and caches
      openAIClient.cleanup?.();
      await chromaDBService.cleanup?.();
      // Clear documentation cache
      this.documentationService.destroy?.();
      this.logger.info('Context Analysis Engine shutdown completed');
    } catch (error) {
      this.logger.warn('Context Analysis Engine shutdown encountered errors', { error: error as Error });
    }
  }

  /**
   * Initialize AI services asynchronously without blocking the main initialization
   */
  private initializeAIServicesAsync(): void {
    this.initializeAIServices().catch((error) => {
      this.logger.warn('AI services not available - running in basic mode', {
        openAI: false,
        chromaDB: false
      });
    });
  }

  /**
   * Initialize AI services (OpenAI and ChromaDB) if available
   */
  private async initializeAIServices(): Promise<void> {
    try {
      // Initialize OpenAI client
      const openAIInitialized = await openAIClient.initialize();
      
      // Initialize ChromaDB
      const chromaInitialized = await chromaDBService.initialize();
      
      this.aiEnabled = openAIInitialized && chromaInitialized;
      
      if (this.aiEnabled) {
        this.logger.info('AI services initialized successfully', {
          openAI: openAIInitialized,
          chromaDB: chromaInitialized
        });
      } else {
        this.logger.warn('AI services not available - running in basic mode', {
          openAI: openAIInitialized,
          chromaDB: chromaInitialized
        });
      }
    } catch (error) {
      this.logger.warn('Failed to initialize AI services, continuing without AI features', { error: error as Error });
      this.aiEnabled = false;
    }
  }

  /**
   * Check if AI features are available
   */
  isAIEnabled(): boolean {
    return this.aiEnabled;
  }

  async analyze(request: ContextAnalysisRequest): Promise<ContextAnalysisResponse> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};

    try {
      // Cache: prompt hash dedupe
      const cacheKey = request.prompt?.length > 0 ? PromptCache.hashPrompt(request.prompt) : '';
      if (cacheKey) {
        const cached = this.promptCache.get(cacheKey);
        if (cached) {
          return { ...cached, processingTime: Date.now() - startTime, diagnostics: { ...(cached.diagnostics || {}), cacheHit: true } };
        }
      }
      // Step 1: Analyze prompt for Optimizely relevance
      const t1 = Date.now();
      const promptAnalysis = await this.promptAnalyzer.analyze(request.prompt);
      const normalized = this.normalizePromptAnalysis(promptAnalysis);
      timings['promptAnalyzer'] = Date.now() - t1;
      
      // Step 2: Check relevance threshold - only proceed if relevant
      if (promptAnalysis.relevance < DEFAULT_RELEVANCE_THRESHOLD) {
        const low = this.createLowRelevanceResponse(promptAnalysis, startTime);
        low.diagnostics = { timings, cacheHit: false };
        return low;
      }

      // Step 3: Detect Optimizely product context
      const t2 = Date.now();
      const productDetection = await this.detectProductContext(request, normalized);
      timings['productDetection'] = Date.now() - t2;

      // Step 4: Analyze IDE rules (if project path available)
      const t3 = Date.now();
      const ruleAnalysis = request.projectPath ? await this.analyzeProjectRules(request.projectPath) : null;
      if (request.projectPath) timings['ruleIntelligence'] = Date.now() - t3;

      // Step 4.1: Prompt-aware workspace search for mentioned artifacts
      const t4 = Date.now();
      const promptSearchResults = request.projectPath && normalized.entities
        ? await this.promptSearch.findMentionedArtifacts(request.projectPath, { files: normalized.entities.files, classes: normalized.entities.classes })
        : [];
      if (request.projectPath && normalized.entities) timings['promptAwareSearch'] = Date.now() - t4;

      // Step 5: Fetch relevant documentation
      const t5 = Date.now();
      const documentation = await this.fetchRelevantDocumentation(productDetection, promptAnalysis.intent);
      timings['documentation'] = Date.now() - t5;

      // Step 6: Curate context based on analysis and detection
      const t6 = Date.now();
      const curatedContext = await this.curateContext(normalized, productDetection, ruleAnalysis, documentation);
      timings['curation'] = Date.now() - t6;
      // Deterministic relevance: prompt + evidence + rules (bounded)
      const promptComponent = Math.max(0, Math.min(1, promptAnalysis.relevance));
      const evidenceSignals = (promptAnalysis.entities?.files?.length || 0) + (promptAnalysis.entities?.classes?.length || 0);
      const rulesSignals = ruleAnalysis?.foundFiles?.length || 0;
      const evidenceComponent = Math.min(0.6, evidenceSignals * 0.05);
      const rulesComponent = Math.min(0.4, rulesSignals * 0.05);
      const finalRelevance = Math.min(1, (promptComponent * 0.6) + evidenceComponent + rulesComponent);

      // Step 6.1: Build promptContext for formatter stage
      const promptContext: PromptContext = {
        userIntent: normalized.intent,
        targetProducts: productDetection,
        artifacts: [
          ...((normalized.entities?.files || []).map(v => ({ kind: 'file' as const, value: v }))),
          ...((normalized.entities?.urls || []).map(v => ({ kind: 'url' as const, value: v }))),
          ...((normalized.entities?.classes || []).map(v => ({ kind: 'class' as const, value: v }))),
          ...((promptSearchResults || []).map((p: any) => ({ kind: 'file' as const, value: p?.path || p })))
        ],
        constraints: [],
        acceptanceCriteria: [],
        sessionHints: {}
      };

      // Step 7: Build final response
      const response: ContextAnalysisResponse = {
        relevance: finalRelevance,
        detectedProducts: productDetection,
        curatedContext,
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
        promptContext,
        diagnostics: { timings, cacheHit: false, relevanceBreakdown: { prompt: promptComponent, evidence: evidenceComponent, rules: rulesComponent, final: finalRelevance } }
      };

      // Record in session memory
      this.sessionMemory.recordInteraction({
        products: productDetection,
        files: (promptAnalysis.entities?.files || []),
        toolName: 'optidev_context_analyzer'
      });

      // Store in cache
      if (cacheKey) {
        this.promptCache.set(cacheKey, response);
      }

      if (process.env.OPTIDEV_DEBUG === 'true') {
        console.error('[observability] entities', normalized.entities);
        console.error('[observability] ruleFiles', ruleAnalysis?.foundFiles);
        console.error('[observability] products', productDetection);
        console.error('[observability] relevance', { promptComponent, evidenceComponent, rulesComponent, finalRelevance });
      }

      this.logger.debug('Context analysis completed', {
        relevance: response.relevance,
        products: response.detectedProducts,
        processingTime: response.processingTime
      });

      return response;

    } catch (error) {
      this.logger.error('Context analysis failed', error as Error);
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

    const artifacts = [
      ...((promptAnalysis.entities?.files || []).map(v => ({ kind: 'file' as const, value: v }))),
      ...((promptAnalysis.entities?.urls || []).map(v => ({ kind: 'url' as const, value: v }))),
      ...((promptAnalysis.entities?.classes || []).map(v => ({ kind: 'class' as const, value: v })))
    ];

    return {
      relevance: promptAnalysis.relevance,
      detectedProducts: [],
      curatedContext: {
        relevance: promptAnalysis.relevance,
        productContext: [],
        summary: 'This query does not appear to be related to Optimizely development. Optivise specializes in providing context for Optimizely-specific questions.',
        actionableSteps: [],
        codeExamples: [],
        documentation: [],
        bestPractices: []
      },
      processingTime: Date.now() - startTime,
      timestamp: new Date(),
      promptContext: {
        userIntent: promptAnalysis.intent || 'unknown',
        targetProducts: [],
        artifacts,
        constraints: [],
        acceptanceCriteria: [],
        sessionHints: {}
      }
    };
  }

  private async detectProductContext(
    request: ContextAnalysisRequest,
    promptAnalysis: PromptAnalysisResult
  ): Promise<OptimizelyProduct[]> {
    try {
      // If project path available (IDE mode), prefer project detection
      if (request.projectPath) {
        const project = await this.productDetectionService.detectFromProject(request.projectPath);
        // Hybrid scoring: blend with prompt-based detection
        const prompt = await this.productDetectionService.detectFromPrompt(
          request.prompt,
          promptAnalysis.productHints
        );
        // Expose evidence in debug
        if (process.env.OPTIDEV_DEBUG === 'true') {
          console.error('[evidence] project', project.evidence?.slice(0, 5));
          console.error('[evidence] prompt', prompt.evidence?.slice(0, 5));
        }
        const merged = new Map<OptimizelyProduct, number>();
        project.products.forEach(p => merged.set(p, (merged.get(p) || 0) + project.confidence));
        prompt.products.forEach(p => merged.set(p, (merged.get(p) || 0) + prompt.confidence * 0.8));
        // Sort by score desc
        return Array.from(merged.entries()).sort((a,b)=>b[1]-a[1]).map(([p])=>p).slice(0,3);
      }

      // Prompt-only
      const detection = await this.productDetectionService.detectFromPrompt(request.prompt, promptAnalysis.productHints);
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
      
      // Use AI-powered vector search if available
      if (this.aiEnabled && intent) {
        return await this.fetchAIEnhancedDocumentation(products, intent);
      }
      
      // Fallback to basic documentation service
      const documentation = await this.documentationService.fetchDocumentation(products);
      
      this.logger.debug('Documentation fetched (basic mode)', {
        products,
        documentsRetrieved: documentation.length
      });
      
      return documentation;
    } catch (error) {
      this.logger.warn('Documentation fetch failed, continuing without docs');
      return [];
    }
  }

  /**
   * Fetch documentation using AI-powered vector search
   */
  private async fetchAIEnhancedDocumentation(products: OptimizelyProduct[], query: string) {
    try {
      const results = [];
      
      // Search across all relevant product collections
      for (const product of products.slice(0, 2)) { // Limit to top 2 products
        const searchResults = await chromaDBService.searchDocuments(query, {
          product,
          limit: 5,
          threshold: 0.7
        });
        
        results.push(...searchResults.map(result => ({
          title: result.metadata.title || 'Documentation',
          content: result.content,
          url: result.metadata.url || '#',
          product: result.metadata.product,
          relevance: result.similarity,
          contentType: result.metadata.contentType
        })));
      }
      
      // Also search general platform documentation
      const platformResults = await chromaDBService.searchDocuments(query, {
        product: 'platform',
        limit: 3,
        threshold: 0.6
      });
      
      results.push(...platformResults.map(result => ({
        title: result.metadata.title || 'Platform Documentation',
        content: result.content,
        url: result.metadata.url || '#',
        product: 'platform',
        relevance: result.similarity,
        contentType: result.metadata.contentType
      })));
      
      // Sort by relevance and deduplicate
      const uniqueResults = results
        .sort((a, b) => b.relevance - a.relevance)
        .filter((result, index, array) => 
          array.findIndex(r => r.url === result.url) === index
        )
        .slice(0, 10); // Limit to top 10 results
      
      this.logger.debug('AI-enhanced documentation fetched', {
        products,
        query,
        documentsRetrieved: uniqueResults.length,
        avgRelevance: uniqueResults.reduce((sum, r) => sum + r.relevance, 0) / uniqueResults.length
      });
      
      return uniqueResults;
    } catch (error) {
      this.logger.error('AI-enhanced documentation fetch failed', error as Error);
      // Fallback to basic documentation service
      return await this.documentationService.fetchDocumentation(products);
    }
  }

  private normalizePromptAnalysis(promptAnalysis: PromptAnalysisResult): PromptAnalysisResult {
    // Ensure entities and intent are present; clamp relevance
    return {
      ...promptAnalysis,
      relevance: Math.max(0, Math.min(1, promptAnalysis.relevance ?? 0)),
      intent: promptAnalysis.intent || 'unknown',
      entities: {
        files: promptAnalysis.entities?.files || [],
        urls: promptAnalysis.entities?.urls || [],
        classes: promptAnalysis.entities?.classes || [],
        versions: promptAnalysis.entities?.versions || []
      },
      productHints: promptAnalysis.productHints || []
    };
  }

  private async curateContext(
    promptAnalysis: PromptAnalysisResult,
    detectedProducts: OptimizelyProduct[],
    ruleAnalysis?: any,
    documentation?: any[]
  ): Promise<CuratedResponse> {
    // Enhanced Phase 3 implementation with AI-powered curation
    const context: CuratedResponse = {
      relevance: promptAnalysis.relevance,
      productContext: detectedProducts,
      summary: await this.generateEnhancedSummary(promptAnalysis, detectedProducts, ruleAnalysis, documentation),
      actionableSteps: await this.generateEnhancedActionableSteps(promptAnalysis, detectedProducts, ruleAnalysis, documentation),
      codeExamples: this.extractCodeExamples(documentation || []),
      documentation: this.formatDocumentationLinks(documentation || []),
      bestPractices: await this.generateEnhancedBestPractices(detectedProducts, ruleAnalysis, documentation)
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

  /**
   * Generate enhanced summary using AI when available
   */
  private async generateEnhancedSummary(
    promptAnalysis: PromptAnalysisResult,
    detectedProducts: OptimizelyProduct[],
    ruleAnalysis?: any,
    documentation?: any[]
  ): Promise<string> {
    if (!this.aiEnabled || !documentation?.length) {
      return this.generateSummary(promptAnalysis, detectedProducts, ruleAnalysis);
    }

    try {
      // Use AI to create a more contextual summary based on retrieved documentation
      const relevantContent = documentation
        .filter(doc => doc.relevance > 0.7)
        .slice(0, 3)
        .map(doc => doc.content.substring(0, 200))
        .join(' ');

      if (relevantContent.length < 50) {
        return this.generateSummary(promptAnalysis, detectedProducts, ruleAnalysis);
      }

      const productNames = detectedProducts.map(p => this.getProductDisplayName(p));
      const productContext = productNames.length > 0 
        ? `for ${productNames.join(', ')} development`
        : 'for Optimizely development';

      // Enhanced summary with AI-retrieved context
      return `AI-enhanced analysis ${productContext} - Found ${documentation.length} relevant documentation sources with average relevance of ${(documentation.reduce((sum, doc) => sum + (doc.relevance || 0), 0) / documentation.length).toFixed(2)}. Context includes: ${relevantContent.split(' ').slice(0, 20).join(' ')}...`;

    } catch (error) {
      this.logger.warn('Failed to generate AI-enhanced summary, falling back to basic', { error: error as Error });
      return this.generateSummary(promptAnalysis, detectedProducts, ruleAnalysis);
    }
  }

  /**
   * Generate enhanced actionable steps using AI-retrieved documentation
   */
  private async generateEnhancedActionableSteps(
    promptAnalysis: PromptAnalysisResult,
    detectedProducts: OptimizelyProduct[],
    ruleAnalysis?: any,
    documentation?: any[]
  ): Promise<string[]> {
    const basicSteps = this.generateActionableSteps(promptAnalysis, detectedProducts, ruleAnalysis);

    if (!this.aiEnabled || !documentation?.length) {
      return basicSteps;
    }

    try {
      const enhancedSteps = [...basicSteps];

      // Add AI-powered contextual steps based on documentation
      const highRelevanceDocs = documentation.filter(doc => doc.relevance > 0.75);
      
      if (highRelevanceDocs.length > 0) {
        enhancedSteps.unshift(`🤖 AI-Suggested: Review ${highRelevanceDocs.length} highly relevant documentation sources (avg relevance: ${(highRelevanceDocs.reduce((sum, doc) => sum + doc.relevance, 0) / highRelevanceDocs.length).toFixed(2)})`);
      }

      // Add specific documentation links as actionable steps
      const topDocs = documentation.slice(0, 2);
      topDocs.forEach(doc => {
        if (doc.url && doc.url !== '#') {
          enhancedSteps.push(`📖 Review: ${doc.title} (relevance: ${doc.relevance.toFixed(2)})`);
        }
      });

      return enhancedSteps.slice(0, 8); // Limit to 8 steps

    } catch (error) {
      this.logger.warn('Failed to generate AI-enhanced steps, using basic', { error: error as Error });
      return basicSteps;
    }
  }

  /**
   * Generate enhanced best practices using AI-retrieved documentation
   */
  private async generateEnhancedBestPractices(
    detectedProducts: OptimizelyProduct[],
    ruleAnalysis?: any,
    documentation?: any[]
  ): Promise<string[]> {
    const basicPractices = this.generateBestPractices(detectedProducts, ruleAnalysis);

    if (!this.aiEnabled || !documentation?.length) {
      return basicPractices;
    }

    try {
      const enhancedPractices = [...basicPractices];

      // Extract best practices from AI-retrieved documentation
      const practiceKeywords = ['best practice', 'recommended', 'should', 'avoid', 'pattern', 'guideline'];
      
      documentation.forEach(doc => {
        if (doc.relevance > 0.6 && doc.contentType === 'documentation') {
          const content = doc.content.toLowerCase();
          const hasPracticeContent = practiceKeywords.some(keyword => content.includes(keyword));
          
          if (hasPracticeContent) {
            // Extract sentences that contain best practice keywords
            const sentences = doc.content.split(/[.!?]/);
            const practiceSentences = sentences.filter((sentence: string) => 
              practiceKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
            );
            
            if (practiceSentences.length > 0) {
              const cleanSentence = practiceSentences[0].trim().replace(/^[^A-Z]*/, '');
              if (cleanSentence.length > 20 && cleanSentence.length < 150) {
                enhancedPractices.push(`🤖 AI-Found: ${cleanSentence}`);
              }
            }
          }
        }
      });

      return [...new Set(enhancedPractices)].slice(0, 10); // Deduplicate and limit

    } catch (error) {
      this.logger.warn('Failed to generate AI-enhanced best practices, using basic', { error: error as Error });
      return basicPractices;
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
      .filter(doc => (doc?.source || doc?.url) && doc?.title)
      .map(doc => ({
        title: doc.title,
        url: doc.source || doc.url,
        description: this.extractDocDescription(doc),
        relevance: doc.relevanceScore || doc.relevance || 0.8,
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
    const productLabel = doc.product || (Array.isArray(doc.products) ? doc.products.join(', ') : 'Optimizely');
    return `Documentation for ${productLabel} development`;
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