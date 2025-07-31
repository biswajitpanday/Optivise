/**
 * Product Detection Service
 * Detects Optimizely products from project context and prompts
 */

import { promises as fs } from 'fs';
import * as path from 'path';

import type {
  ProductDetectionResult,
  OptimizelyProduct,
  DetectionEvidence,
  Logger
} from '../types/index.js';

export class ProductDetectionService {
  private logger: Logger;
  private isInitialized = false;

  // Detection patterns for different products
  private readonly detectionPatterns: Record<OptimizelyProduct, {
    files: string[];
    directories: string[];
    dependencies: string[];
    content: string[];
  }> = {
    'configured-commerce': {
      files: ['*Handler.cs', '*Pipeline.cs', '*.Blueprint.tsx', 'Startup.cs'],
      directories: ['Extensions/', 'FrontEnd/modules/blueprints/', 'src/Extensions/'],
      dependencies: ['insite-*', 'InsiteCommerce*', '@insite/*'],
      content: ['HandlerChainManager', 'IPipelineAssemblyOptions', 'IHandlerFactory']
    },
    'commerce-connect': {
      files: ['*Connector.cs', '*Sync.cs', 'Commerce.Connect.*'],
      directories: ['Connectors/', 'Commerce.Connect/'],
      dependencies: ['Optimizely.Commerce.Connect*'],
      content: ['ICommerceConnector', 'SynchronizationService']
    },
    'cms-paas': {
      files: ['*.ascx', '*Controller.cs', 'Startup.cs', 'web.config'],
      directories: ['modules/', 'App_Data/', 'Views/', 'Controllers/'],
      dependencies: ['episerver*', 'optimizely*cms*', 'EPiServer*'],
      content: ['ContentType', 'PropertyFor', 'EPiServer', 'IContentRepository']
    },
    'cms-saas': {
      files: ['*.json', 'next.config.js', 'gatsby-config.js'],
      directories: ['components/', 'src/components/', 'pages/'],
      dependencies: ['@optimizely/cms*', '@episerver/*', 'optimizely-graph*'],
      content: ['OptimizelyGraph', 'ContentDelivery', 'headless']
    },
    'cmp': {
      files: ['campaign-config.*', 'marketing-*'],
      directories: ['campaigns/', 'marketing/'],
      dependencies: ['@optimizely/marketing*', 'optimizely-campaign*'],
      content: ['CampaignManager', 'MarketingAutomation']
    },
    'dxp': {
      files: ['personalization.*', 'visitor-groups.*'],
      directories: ['Personalization/', 'VisitorGroups/'],
      dependencies: ['optimizely-dxp*', 'episerver-dxp*'],
      content: ['VisitorGroup', 'PersonalizationProvider', 'RecommendationService']
    },
    'web-experimentation': {
      files: ['optimizely.js', 'experiment-*', '*.experiment.*'],
      directories: ['experiments/', 'src/experiments/'],
      dependencies: ['@optimizely/optimizely-sdk', 'optimizely-client-sdk'],
      content: ['optimizely.createInstance', 'activate', 'track', 'isFeatureEnabled']
    },
    'feature-experimentation': {
      files: ['feature-flags.*', 'rollout.*', 'datafile.*'],
      directories: ['features/', 'flags/', 'rollouts/'],
      dependencies: ['@optimizely/sdk', '@optimizely/feature-experimentation'],
      content: ['createUserContext', 'decide', 'trackEvent', 'OptimizelyUserContext']
    },
    'data-platform': {
      files: ['data-platform.*', 'analytics.*', 'tracking.*'],
      directories: ['analytics/', 'tracking/', 'data/'],
      dependencies: ['@optimizely/data-platform*', 'optimizely-analytics*'],
      content: ['DataPlatform', 'EventTracker', 'CustomerData']
    },
    'connect-platform': {
      files: ['connect.*', 'integration.*', 'webhook.*'],
      directories: ['integrations/', 'webhooks/', 'connect/'],
      dependencies: ['@optimizely/connect*', 'optimizely-integration*'],
      content: ['ConnectPlatform', 'IntegrationService', 'WebhookHandler']
    },
    'recommendations': {
      files: ['recommendations.*', 'recs.*'],
      directories: ['recommendations/', 'recs/'],
      dependencies: ['@optimizely/recommendations*', 'optimizely-recs*'],
      content: ['RecommendationEngine', 'ProductRecommendations']
    }
  };

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.debug('Initializing Product Detection Service');
    
    // No async initialization needed for Phase 1
    // In future phases, this might load ML models or enhanced patterns
    
    this.isInitialized = true;
    this.logger.info('Product Detection Service initialized');
  }

  async detectFromProject(projectPath: string): Promise<ProductDetectionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Starting project-based product detection', { projectPath });
      
      const evidence: DetectionEvidence[] = [];
      const productScores: Map<OptimizelyProduct, number> = new Map();

      // Initialize scores
      for (const product of Object.keys(this.detectionPatterns) as OptimizelyProduct[]) {
        productScores.set(product, 0);
      }

      // Check if project path exists
      try {
        await fs.access(projectPath);
      } catch {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }

      // Analyze project structure
      await this.analyzeProjectStructure(projectPath, evidence, productScores);
      
      // Analyze package dependencies
      await this.analyzePackageDependencies(projectPath, evidence, productScores);
      
      // Calculate results
      const sortedProducts = Array.from(productScores.entries())
        .filter(([, score]) => score > 0)
        .sort(([, a], [, b]) => b - a);

      const detectedProducts = sortedProducts.slice(0, 3).map(([product]) => product);
      const confidence = sortedProducts.length > 0 ? (sortedProducts[0]?.[1] ?? 0) / 10 : 0; // Normalize to 0-1

      const result: ProductDetectionResult = {
        products: detectedProducts,
        confidence: Math.min(confidence, 1.0),
        context: 'ide',
        evidence,
        suggestedActions: this.generateSuggestedActions(detectedProducts),
        timestamp: new Date()
      };

      this.logger.info('Project-based detection completed', {
        detectedProducts,
        confidence: result.confidence,
        evidenceCount: evidence.length,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      this.logger.error('Project-based product detection failed', error as Error, {
        projectPath,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  async detectFromPrompt(
    prompt: string, 
    productHints: OptimizelyProduct[] = []
  ): Promise<ProductDetectionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Starting prompt-based product detection', { 
        promptLength: prompt.length,
        hintsCount: productHints.length 
      });

      const evidence: DetectionEvidence[] = [];
      const productScores: Map<OptimizelyProduct, number> = new Map();

      // Initialize scores with hints
      for (const product of Object.keys(this.detectionPatterns) as OptimizelyProduct[]) {
        productScores.set(product, productHints.includes(product) ? 5 : 0);
      }

      // Analyze prompt content
      this.analyzePromptContent(prompt, evidence, productScores);

      // Calculate results
      const sortedProducts = Array.from(productScores.entries())
        .filter(([, score]) => score > 0)
        .sort(([, a], [, b]) => b - a);

      const detectedProducts = sortedProducts.slice(0, 2).map(([product]) => product);
      const confidence = sortedProducts.length > 0 ? Math.min((sortedProducts[0]?.[1] ?? 0) / 10, 1.0) : 0;

      const result: ProductDetectionResult = {
        products: detectedProducts,
        confidence,
        context: 'prompt',
        evidence,
        suggestedActions: this.generateSuggestedActions(detectedProducts),
        timestamp: new Date()
      };

      this.logger.info('Prompt-based detection completed', {
        detectedProducts,
        confidence: result.confidence,
        evidenceCount: evidence.length,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      this.logger.error('Prompt-based product detection failed', error as Error, {
        promptLength: prompt.length,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  private async analyzeProjectStructure(
    projectPath: string,
    evidence: DetectionEvidence[],
    productScores: Map<OptimizelyProduct, number>
  ): Promise<void> {
    try {
      const items = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const item of items.slice(0, 50)) { // Limit for performance
        if (!item) continue;
        
        const itemPath = path.join(projectPath, item.name);
        
        if (item.isDirectory()) {
          await this.checkDirectoryPatterns(itemPath, item.name, evidence, productScores);
        } else {
          await this.checkFilePatterns(itemPath, item.name, evidence, productScores);
        }
      }
    } catch (error) {
      this.logger.warn('Error analyzing project structure');
    }
  }

  private async checkDirectoryPatterns(
    dirPath: string,
    dirName: string,
    evidence: DetectionEvidence[],
    productScores: Map<OptimizelyProduct, number>
  ): Promise<void> {
    for (const [product, patterns] of Object.entries(this.detectionPatterns)) {
      for (const pattern of patterns.directories) {
        if (this.matchesPattern(dirName, pattern)) {
          evidence.push({
            type: 'directory',
            path: dirPath,
            pattern,
            confidence: 0.7,
            description: `Directory matches ${product} pattern: ${pattern}`
          });
          
          const currentScore = productScores.get(product as OptimizelyProduct) ?? 0;
          productScores.set(product as OptimizelyProduct, currentScore + 3);
        }
      }
    }
  }

  private async checkFilePatterns(
    filePath: string,
    fileName: string,
    evidence: DetectionEvidence[],
    productScores: Map<OptimizelyProduct, number>
  ): Promise<void> {
    for (const [product, patterns] of Object.entries(this.detectionPatterns)) {
      for (const pattern of patterns.files) {
        if (this.matchesPattern(fileName, pattern)) {
          evidence.push({
            type: 'file',
            path: filePath,
            pattern,
            confidence: 0.8,
            description: `File matches ${product} pattern: ${pattern}`
          });
          
          const currentScore = productScores.get(product as OptimizelyProduct) ?? 0;
          productScores.set(product as OptimizelyProduct, currentScore + 4);
        }
      }
    }
  }

  private async analyzePackageDependencies(
    projectPath: string,
    evidence: DetectionEvidence[],
    productScores: Map<OptimizelyProduct, number>
  ): Promise<void> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      for (const [product, patterns] of Object.entries(this.detectionPatterns)) {
        for (const pattern of patterns.dependencies) {
          for (const depName of Object.keys(dependencies)) {
            if (this.matchesPattern(depName, pattern)) {
              evidence.push({
                type: 'dependency',
                path: packageJsonPath,
                pattern,
                confidence: 0.9,
                description: `Dependency matches ${product} pattern: ${pattern}`
              });
              
              const currentScore = productScores.get(product as OptimizelyProduct) ?? 0;
              productScores.set(product as OptimizelyProduct, currentScore + 5);
            }
          }
        }
      }
    } catch {
      // No package.json or parsing error - not necessarily an issue
      this.logger.debug('No package.json found or parsing failed', { projectPath });
    }
  }

  private analyzePromptContent(
    prompt: string,
    evidence: DetectionEvidence[],
    productScores: Map<OptimizelyProduct, number>
  ): void {
    const lowerPrompt = prompt.toLowerCase();
    
    for (const [product, patterns] of Object.entries(this.detectionPatterns)) {
      for (const term of patterns.content) {
        if (lowerPrompt.includes(term.toLowerCase())) {
          evidence.push({
            type: 'content',
            path: 'prompt',
            pattern: term,
            confidence: 0.6,
            description: `Prompt contains ${product} term: ${term}`
          });
          
          const currentScore = productScores.get(product as OptimizelyProduct) ?? 0;
          productScores.set(product as OptimizelyProduct, currentScore + 2);
        }
      }
    }
  }

  private matchesPattern(text: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${regexPattern}$`, 'i').test(text);
  }

  private generateSuggestedActions(detectedProducts: OptimizelyProduct[]): string[] {
    const actions: string[] = [];
    
    if (detectedProducts.length === 0) {
      actions.push('Consider providing more specific context about your Optimizely implementation');
      actions.push('Check if you are working with a supported Optimizely product');
      return actions;
    }

    actions.push(`Focus on ${detectedProducts.map(p => p.replace('-', ' ')).join(', ')} specific documentation and patterns`);
    
    if (detectedProducts.includes('configured-commerce')) {
      actions.push('Review handler chain patterns and extension development guidelines');
    }
    
    if (detectedProducts.includes('cms-paas') || detectedProducts.includes('cms-saas')) {
      actions.push('Check content type definitions and MVC implementation patterns');
    }

    if (detectedProducts.includes('web-experimentation') || detectedProducts.includes('feature-experimentation')) {
      actions.push('Verify SDK implementation and event tracking setup');
    }

    return actions;
  }

  isEnabled(): boolean {
    return this.isInitialized;
  }
}