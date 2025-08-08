/**
 * Implementation Guide Tool (optidev_implementation_guide)
 * Analyzes Jira tickets and provides complete implementation guidance
 */

import { chromaDBService } from '../integrations/chromadb-client.js';
import { openAIClient } from '../integrations/openai-client.js';
import { ProductDetectionService } from '../services/product-detection-service.js';
import { RuleIntelligenceService } from '../services/rule-intelligence-service.js';
import type { Logger, LLMRequest, PromptContext, ContextBlock } from '../types/index.js';
import { RequestFormatter } from '../formatters/request-formatter.js';
import { FormatterTemplates } from '../formatters/templates.js';
import { z } from 'zod';

export const ImplementationGuideRequestSchema = z.object({
  ticketContent: z.string().min(1, 'ticketContent is required'),
  projectContext: z.string().optional(),
  userPrompt: z.string().optional(),
  promptContext: z.any().optional(),
  projectPath: z.string().optional()
});

export interface ImplementationGuideRequest {
  ticketContent: string;
  projectContext?: string;
  userPrompt?: string;
  promptContext?: PromptContext;
  projectPath?: string;
}

export interface ImplementationPlan {
  approach: string;
  architecture: string;
  estimatedEffort: string;
  keyComponents: string[];
  risks: string[];
  dependencies: string[];
}

export interface CodeTemplate {
  filename: string;
  language: string;
  content: string;
  description: string;
}

export interface ImplementationGuideResponse {
  ticketAnalysis: {
    summary: string;
    requirements: string[];
    acceptanceCriteria: string[];
    complexity: 'low' | 'medium' | 'high' | 'enterprise';
    estimatedStoryPoints: number;
  };
  detectedProducts: string[];
  implementationPlan: ImplementationPlan;
  codeTemplates: CodeTemplate[];
  testingStrategy: {
    unitTests: string[];
    integrationTests: string[];
    e2eTests: string[];
    userAcceptanceTests: string[];
  };
  deploymentConsiderations: string[];
  documentation: {
    technicalSpecs: string[];
    userGuides: string[];
    apiDocumentation: string[];
  };
  suggestedMilestones: Array<{
    name: string;
    deliverables: string[];
    duration: string;
  }>;
  llm_request?: LLMRequest;
}

export class ImplementationGuideTool {
  private productDetection: ProductDetectionService;
  private logger: Logger;
  private ruleService: RuleIntelligenceService;

  constructor(logger: Logger) {
    this.logger = logger;
    this.productDetection = new ProductDetectionService(logger);
    this.ruleService = new RuleIntelligenceService(logger);
  }

  async initialize(): Promise<void> {
    await this.productDetection.initialize();
    await this.ruleService.initialize();
    this.logger.info('Implementation Guide Tool initialized');
  }

  /**
   * Analyze Jira ticket and generate comprehensive implementation guidance
   */
  async analyzeTicket(request: ImplementationGuideRequest): Promise<ImplementationGuideResponse> {
    try {
      ImplementationGuideRequestSchema.parse(request);
      this.logger.info('Analyzing Jira ticket for implementation guidance');

      // 1. Parse and analyze ticket content
      const ticketAnalysis = await this.parseTicketContent(request.ticketContent);

      // 2. Detect relevant Optimizely products
      const detectedProducts = await this.detectProducts(request.ticketContent, request.projectContext);

      // 3. Generate implementation plan
      const implementationPlan = await this.generateImplementationPlan(
        ticketAnalysis,
        detectedProducts,
        request.projectContext
      );

      // 4. Create code templates
      const codeTemplates = await this.generateCodeTemplates(
        ticketAnalysis,
        detectedProducts,
        implementationPlan
      );

      // 5. Define testing strategy
      const testingStrategy = this.generateTestingStrategy(ticketAnalysis, detectedProducts);

      // 6. Identify deployment considerations
      const deploymentConsiderations = this.generateDeploymentConsiderations(
        detectedProducts,
        implementationPlan
      );

      // 7. Create documentation plan
      const documentation = this.generateDocumentationPlan(ticketAnalysis, detectedProducts);

      // 8. Suggest project milestones
      const suggestedMilestones = this.generateMilestones(implementationPlan, ticketAnalysis.complexity);

      const base: ImplementationGuideResponse = {
        ticketAnalysis,
        detectedProducts,
        implementationPlan,
        codeTemplates,
        testingStrategy,
        deploymentConsiderations,
        documentation,
        suggestedMilestones
      };

      const blocks: ContextBlock[] = [
        { type: 'analysis', title: 'Ticket Analysis', content: JSON.stringify(ticketAnalysis).slice(0, 4000), relevance: 0.9 },
        { type: 'analysis', title: 'Implementation Plan', content: JSON.stringify(implementationPlan).slice(0, 4000), relevance: 0.95 }
      ];
      if (request.projectPath) {
        try {
          const rules = await this.ruleService.analyzeIDERules(request.projectPath);
          blocks.push({
            type: 'rules',
            title: 'IDE Rules Summary',
            content: JSON.stringify({ files: rules.foundFiles, lintWarnings: rules.lintWarnings, conflicts: rules.conflicts, proposed: rules.proposedCursorRules?.slice(0, 2000), diff: rules.proposedCursorRulesDiff?.slice(0, 2000) }).slice(0, 4000),
            source: request.projectPath,
            relevance: 0.65
          });
        } catch {}
      }
      if (codeTemplates?.length) {
        blocks.push({ type: 'code', title: 'Code Templates', content: JSON.stringify(codeTemplates).slice(0, 4000), relevance: 0.7 });
      }

      base.llm_request = RequestFormatter.format({
        toolName: 'optidev_implementation_guide',
        userPrompt: request.userPrompt || ticketAnalysis.summary,
        promptContext: request.promptContext,
        summary: 'Produce an actionable, product-aware implementation guide with risks and milestones.',
        products: detectedProducts,
        blocks,
        template: FormatterTemplates.optidev_implementation_guide
      });

      return base;

    } catch (error) {
      this.logger.error('Failed to analyze ticket for implementation guidance', error as Error);
      throw error;
    }
  }

  /**
   * Parse ticket content and extract key information
   */
  private async parseTicketContent(ticketContent: string): Promise<ImplementationGuideResponse['ticketAnalysis']> {
    // Extract summary
    const summary = this.extractSummary(ticketContent);

    // Extract requirements
    const requirements = this.extractRequirements(ticketContent);

    // Extract acceptance criteria
    const acceptanceCriteria = this.extractAcceptanceCriteria(ticketContent);

    // Assess complexity
    const complexity = this.assessComplexity(ticketContent, requirements);

    // Estimate story points
    const estimatedStoryPoints = this.estimateStoryPoints(complexity, requirements.length);

    return {
      summary,
      requirements,
      acceptanceCriteria,
      complexity,
      estimatedStoryPoints
    };
  }

  /**
   * Extract ticket summary
   */
  private extractSummary(content: string): string {
    // Try to find ticket title/summary patterns
    const titleMatch = content.match(/(?:title|summary|epic):\s*(.+)/i);
    if (titleMatch?.[1]) {
      return titleMatch[1].trim();
    }

    // Extract first meaningful line
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const firstLine = lines[0]?.trim() || '';
    
    // If first line is too long, truncate it
    return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
  }

  /**
   * Extract requirements from ticket content
   */
  private extractRequirements(content: string): string[] {
    const requirements: string[] = [];

    // Look for bulleted requirements
    const bulletMatches = content.match(/^[\s]*[-*•]\s*(.+)$/gm);
    if (bulletMatches) {
      requirements.push(...bulletMatches.map(match => match.replace(/^[\s]*[-*•]\s*/, '').trim()));
    }

    // Look for numbered requirements
    const numberedMatches = content.match(/^\s*\d+\.\s*(.+)$/gm);
    if (numberedMatches) {
      requirements.push(...numberedMatches.map(match => match.replace(/^\s*\d+\.\s*/, '').trim()));
    }

    // Look for "should" statements
    const shouldMatches = content.match(/\b(?:should|must|shall|will)\s+(.+?)(?:\.|$)/gi);
    if (shouldMatches) {
      requirements.push(...shouldMatches.map(match => match.trim()));
    }

    // If no explicit requirements found, extract sentences that look like requirements
    if (requirements.length === 0) {
      const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 20);
      requirements.push(...sentences.slice(0, 3).map(s => s.trim()));
    }

    return [...new Set(requirements)].slice(0, 10); // Remove duplicates and limit
  }

  /**
   * Extract acceptance criteria
   */
  private extractAcceptanceCriteria(content: string): string[] {
    const criteria: string[] = [];

    // Look for "acceptance criteria" section
    const acMatch = content.match(/acceptance\s+criteria[:\s]*((?:.|\n)*?)(?:\n\s*\n|\n\s*[A-Z]|$)/i);
    if (acMatch?.[1]) {
      const acContent = acMatch[1];
      const bulletMatches = acContent.match(/^[\s]*[-*•]\s*(.+)$/gm);
      if (bulletMatches) {
        criteria.push(...bulletMatches.map(match => match.replace(/^[\s]*[-*•]\s*/, '').trim()));
      }
    }

    // Look for "given/when/then" patterns (BDD style)
    const bddMatches = content.match(/(?:given|when|then)\s+(.+?)(?:\n|$)/gi);
    if (bddMatches) {
      criteria.push(...bddMatches.map(match => match.trim()));
    }

    // Fallback to requirements if no AC found
    if (criteria.length === 0) {
      const requirements = this.extractRequirements(content);
      criteria.push(...requirements.slice(0, 3));
    }

    return [...new Set(criteria)].slice(0, 8);
  }

  /**
   * Assess ticket complexity
   */
  private assessComplexity(content: string, requirements: string[]): 'low' | 'medium' | 'high' | 'enterprise' {
    let complexityScore = 0;

    // Length-based scoring
    if (content.length > 2000) complexityScore += 2;
    else if (content.length > 1000) complexityScore += 1;

    // Requirements-based scoring
    if (requirements.length > 8) complexityScore += 2;
    else if (requirements.length > 4) complexityScore += 1;

    // Keyword-based scoring
    const highComplexityKeywords = [
      'integration', 'api', 'database', 'migration', 'performance', 
      'security', 'authentication', 'architecture', 'microservice',
      'enterprise', 'scalability', 'multi-tenant', 'real-time'
    ];
    
    const mediumComplexityKeywords = [
      'workflow', 'automation', 'notification', 'reporting',
      'configuration', 'customization', 'extension'
    ];

    const contentLower = content.toLowerCase();
    
    const highMatches = highComplexityKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;
    
    const mediumMatches = mediumComplexityKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;

    complexityScore += highMatches * 2 + mediumMatches;

    // Determine final complexity
    if (complexityScore >= 8) return 'enterprise';
    if (complexityScore >= 5) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Estimate story points based on complexity and requirements
   */
  private estimateStoryPoints(complexity: string, requirementCount: number): number {
    const basePoints = {
      low: 2,
      medium: 5,
      high: 8,
      enterprise: 13
    };

    let points = basePoints[complexity as keyof typeof basePoints];
    
    // Adjust based on requirement count
    if (requirementCount > 8) points += 3;
    else if (requirementCount > 5) points += 2;
    else if (requirementCount > 3) points += 1;

    return Math.min(points, 21); // Cap at 21 (Fibonacci sequence)
  }

  /**
   * Detect relevant Optimizely products
   */
  private async detectProducts(ticketContent: string, projectContext?: string): Promise<string[]> {
    const context = `${ticketContent}\n\n${projectContext || ''}`;
    const detection = await this.productDetection.detectFromPrompt(context);
    return detection.products;
  }

  /**
   * Generate comprehensive implementation plan
   */
  private async generateImplementationPlan(
    ticketAnalysis: ImplementationGuideResponse['ticketAnalysis'],
    products: string[],
    projectContext?: string
  ): Promise<ImplementationPlan> {
    
    const primaryProduct = products[0] || 'platform';
    
    // Get relevant documentation if AI is available
    let contextualInfo = '';
    if (chromaDBService.isAvailable()) {
      const docs = await chromaDBService.searchDocuments(ticketAnalysis.summary, {
        product: primaryProduct,
        limit: 3
      });
      contextualInfo = docs.map(doc => doc.content).join('\n');
    }

    // Generate architecture approach based on products
    const approach = this.generateApproach(ticketAnalysis, products, contextualInfo);
    const architecture = this.generateArchitecture(products, ticketAnalysis.complexity);
    const estimatedEffort = this.estimateEffort(ticketAnalysis.complexity, ticketAnalysis.estimatedStoryPoints);
    const keyComponents = this.identifyKeyComponents(ticketAnalysis, products);
    const risks = this.identifyRisks(ticketAnalysis, products);
    const dependencies = this.identifyDependencies(products, ticketAnalysis.requirements);

    return {
      approach,
      architecture,
      estimatedEffort,
      keyComponents,
      risks,
      dependencies
    };
  }

  /**
   * Generate implementation approach
   */
  private generateApproach(
    ticketAnalysis: ImplementationGuideResponse['ticketAnalysis'],
    products: string[],
    contextualInfo: string
  ): string {
    const primaryProduct = products[0] || 'platform';
    
    const approaches = {
      'configured-commerce': 'Commerce extension-based implementation with custom business logic',
      'cms-paas': 'CMS content type and template-based solution with custom components',
      'cms-saas': 'Headless CMS approach with API-driven content delivery',
      'experimentation': 'A/B testing framework with statistical analysis and goal tracking',
      'dxp': 'Digital experience orchestration with personalization engines',
      'platform': 'Cross-platform integration with unified data layer'
    };

    let baseApproach = approaches[primaryProduct as keyof typeof approaches] || approaches.platform;

    // Enhance with complexity considerations
    if (ticketAnalysis.complexity === 'enterprise') {
      baseApproach += ' with enterprise-grade security, scalability, and monitoring';
    } else if (ticketAnalysis.complexity === 'high') {
      baseApproach += ' with comprehensive error handling and performance optimization';
    }

    // Add multi-product considerations
    if (products.length > 1) {
      baseApproach += `. Multi-product integration involving ${products.join(', ')}`;
    }

    return baseApproach;
  }

  /**
   * Generate architecture recommendation
   */
  private generateArchitecture(products: string[], complexity: string): string {
    const architectures = {
      low: 'Simple layered architecture with direct integrations',
      medium: 'Modular architecture with service layer abstraction',
      high: 'Microservices architecture with event-driven communication',
      enterprise: 'Enterprise service bus with CQRS pattern and distributed caching'
    };

    let baseArchitecture = architectures[complexity as keyof typeof architectures];

    // Add product-specific architectural considerations
    if (products.includes('configured-commerce')) {
      baseArchitecture += '. Commerce-specific: Extension framework with dependency injection';
    }
    if (products.includes('cms-paas') || products.includes('cms-saas')) {
      baseArchitecture += '. CMS integration: Content delivery pipeline with caching layer';
    }
    if (products.includes('experimentation')) {
      baseArchitecture += '. Experimentation: Statistical engine with real-time analytics';
    }

    return baseArchitecture;
  }

  /**
   * Estimate implementation effort
   */
  private estimateEffort(complexity: string, storyPoints: number): string {
    const effortMap = {
      low: '1-2 weeks',
      medium: '3-4 weeks',
      high: '6-8 weeks',
      enterprise: '12+ weeks (multiple sprints)'
    };

    let baseEffort = effortMap[complexity as keyof typeof effortMap];

    // Adjust based on story points
    if (storyPoints > 13) {
      baseEffort = '12+ weeks (epic-level implementation)';
    } else if (storyPoints > 8) {
      baseEffort = '6-10 weeks';
    }

    return baseEffort;
  }

  /**
   * Identify key components needed
   */
  private identifyKeyComponents(
    ticketAnalysis: ImplementationGuideResponse['ticketAnalysis'],
    products: string[]
  ): string[] {
    const components: string[] = [];

    // Product-specific components
    if (products.includes('configured-commerce')) {
      components.push('Commerce Extension', 'Business Logic Layer', 'Data Access Layer');
    }
    if (products.includes('cms-paas') || products.includes('cms-saas')) {
      components.push('Content Types', 'Templates', 'Content API');
    }
    if (products.includes('experimentation')) {
      components.push('Experiment Configuration', 'Variation Engine', 'Analytics Tracker');
    }

    // Generic components based on requirements
    const requirementText = ticketAnalysis.requirements.join(' ').toLowerCase();
    
    if (requirementText.includes('ui') || requirementText.includes('interface')) {
      components.push('User Interface Components');
    }
    if (requirementText.includes('api') || requirementText.includes('service')) {
      components.push('API Endpoints', 'Service Layer');
    }
    if (requirementText.includes('database') || requirementText.includes('data')) {
      components.push('Database Schema', 'Data Migration Scripts');
    }
    if (requirementText.includes('auth') || requirementText.includes('security')) {
      components.push('Authentication Module', 'Authorization Layer');
    }

    // Always include testing and configuration
    components.push('Unit Tests', 'Integration Tests', 'Configuration Management');

    return [...new Set(components)];
  }

  /**
   * Identify potential risks
   */
  private identifyRisks(
    ticketAnalysis: ImplementationGuideResponse['ticketAnalysis'],
    products: string[]
  ): string[] {
    const risks: string[] = [];

    // Complexity-based risks
    if (ticketAnalysis.complexity === 'enterprise') {
      risks.push('Integration complexity may lead to extended timeline');
      risks.push('Performance bottlenecks under high load');
      risks.push('Security vulnerabilities in complex data flows');
    } else if (ticketAnalysis.complexity === 'high') {
      risks.push('Technical debt accumulation');
      risks.push('Integration testing complexity');
    }

    // Product-specific risks
    if (products.includes('configured-commerce')) {
      risks.push('Commerce platform version compatibility');
      risks.push('Payment gateway integration issues');
    }
    if (products.includes('experimentation')) {
      risks.push('Statistical significance requirements');
      risks.push('Experiment interference with existing tests');
    }

    // Multi-product risks
    if (products.length > 1) {
      risks.push('Cross-product data synchronization challenges');
      risks.push('Version compatibility across multiple products');
    }

    // Generic risks
    risks.push('Scope creep during implementation');
    risks.push('Third-party dependency changes');

    return risks.slice(0, 6); // Limit to top risks
  }

  /**
   * Identify dependencies
   */
  private identifyDependencies(products: string[], requirements: string[]): string[] {
    const dependencies: string[] = [];

    // Product-specific dependencies
    products.forEach(product => {
      switch (product) {
        case 'configured-commerce':
          dependencies.push('Commerce Manager access', 'Extension deployment pipeline');
          break;
        case 'cms-paas':
          dependencies.push('CMS admin access', 'Content migration tools');
          break;
        case 'experimentation':
          dependencies.push('Analytics platform setup', 'Goal tracking configuration');
          break;
      }
    });

    // Requirement-based dependencies
    const reqText = requirements.join(' ').toLowerCase();
    if (reqText.includes('api')) {
      dependencies.push('API documentation', 'Rate limiting configuration');
    }
    if (reqText.includes('database')) {
      dependencies.push('Database access', 'Backup and recovery procedures');
    }
    if (reqText.includes('auth')) {
      dependencies.push('Identity provider configuration', 'Security audit');
    }

    // Common dependencies
    dependencies.push('Development environment setup', 'CI/CD pipeline configuration');

    return [...new Set(dependencies)];
  }

  /**
   * Generate code templates
   */
  private async generateCodeTemplates(
    ticketAnalysis: ImplementationGuideResponse['ticketAnalysis'],
    products: string[],
    plan: ImplementationPlan
  ): Promise<CodeTemplate[]> {
    const templates: CodeTemplate[] = [];

    // Generate templates based on primary product
    const primaryProduct = products[0] || 'platform';

    switch (primaryProduct) {
      case 'configured-commerce':
        templates.push(...this.generateCommerceTemplates(ticketAnalysis, plan));
        break;
      case 'cms-paas':
        templates.push(...this.generateCMSTemplates(ticketAnalysis, plan));
        break;
      case 'experimentation':
        templates.push(...this.generateExperimentationTemplates(ticketAnalysis, plan));
        break;
      default:
        templates.push(...this.generateGenericTemplates(ticketAnalysis, plan));
    }

    return templates;
  }

  /**
   * Generate Commerce-specific templates
   */
  private generateCommerceTemplates(
    ticketAnalysis: ImplementationGuideResponse['ticketAnalysis'],
    plan: ImplementationPlan
  ): CodeTemplate[] {
    return [
      {
        filename: 'CustomExtension.cs',
        language: 'csharp',
        description: 'Main extension class with dependency injection',
        content: `
using EPiServer.Commerce.Extensions;
using EPiServer.ServiceLocation;

namespace ${this.sanitizeNamespace(ticketAnalysis.summary)}
{
    [ServiceConfiguration(typeof(ICustomExtension))]
    public class CustomExtension : ICustomExtension
    {
        // TODO: Implement based on requirements
        public void Initialize()
        {
            // Initialization logic
        }
    }
}`.trim()
      },
      {
        filename: 'Models/CustomModel.cs',
        language: 'csharp',
        description: 'Data model for the feature',
        content: `
using System.ComponentModel.DataAnnotations;

namespace ${this.sanitizeNamespace(ticketAnalysis.summary)}.Models
{
    public class CustomModel
    {
        [Required]
        public string Name { get; set; }
        
        // TODO: Add properties based on requirements
    }
}`.trim()
      }
    ];
  }

  /**
   * Generate CMS-specific templates
   */
  private generateCMSTemplates(
    ticketAnalysis: ImplementationGuideResponse['ticketAnalysis'],
    plan: ImplementationPlan
  ): CodeTemplate[] {
    return [
      {
        filename: 'ContentTypes/CustomPageType.cs',
        language: 'csharp',
        description: 'Custom page type definition',
        content: `
using EPiServer.Core;
using EPiServer.DataAbstraction;
using EPiServer.DataAnnotations;

namespace ${this.sanitizeNamespace(ticketAnalysis.summary)}.ContentTypes
{
    [ContentType(DisplayName = "Custom Page", GUID = "GUID-HERE")]
    public class CustomPageType : PageData
    {
        [Display(Name = "Title", GroupName = SystemTabNames.Content)]
        public virtual string Title { get; set; }
        
        // TODO: Add properties based on requirements
    }
}`.trim()
      }
    ];
  }

  /**
   * Generate Experimentation templates
   */
  private generateExperimentationTemplates(
    ticketAnalysis: ImplementationGuideResponse['ticketAnalysis'],
    plan: ImplementationPlan
  ): CodeTemplate[] {
    return [
      {
        filename: 'experiment-config.js',
        language: 'javascript',
        description: 'Experiment configuration',
        content: `
// Optimizely Experiment Configuration
const experimentConfig = {
  experimentId: 'experiment_${Date.now()}',
  variations: [
    { id: 'control', name: 'Control' },
    { id: 'variation_1', name: 'Variation 1' }
  ],
  audience: {
    // TODO: Define audience criteria
  },
  goals: [
    // TODO: Define conversion goals
  ]
};

export default experimentConfig;`.trim()
      }
    ];
  }

  /**
   * Generate generic templates
   */
  private generateGenericTemplates(
    ticketAnalysis: ImplementationGuideResponse['ticketAnalysis'],
    plan: ImplementationPlan
  ): CodeTemplate[] {
    return [
      {
        filename: 'implementation.ts',
        language: 'typescript',
        description: 'Main implementation file',
        content: `
/**
 * ${ticketAnalysis.summary}
 * Generated implementation template
 */

export class Implementation {
  constructor() {
    // Initialize based on requirements
  }

  // TODO: Implement methods based on requirements
  ${ticketAnalysis.requirements.map(req => 
    `// Requirement: ${req}`
  ).join('\n  ')}
}`.trim()
      }
    ];
  }

  /**
   * Generate testing strategy
   */
  private generateTestingStrategy(
    ticketAnalysis: ImplementationGuideResponse['ticketAnalysis'],
    products: string[]
  ): ImplementationGuideResponse['testingStrategy'] {
    const unitTests = [
      'Business logic validation tests',
      'Data model validation tests',
      'Service layer unit tests'
    ];

    const integrationTests = [
      'API endpoint integration tests',
      'Database integration tests',
      'Third-party service integration tests'
    ];

    const e2eTests = [
      'Complete user workflow tests',
      'Cross-browser compatibility tests',
      'Performance and load tests'
    ];

    const userAcceptanceTests = ticketAnalysis.acceptanceCriteria.map(
      criteria => `UAT: ${criteria}`
    );

    return {
      unitTests,
      integrationTests,
      e2eTests,
      userAcceptanceTests
    };
  }

  /**
   * Generate deployment considerations
   */
  private generateDeploymentConsiderations(
    products: string[],
    plan: ImplementationPlan
  ): string[] {
    const considerations = [
      'Backup existing system before deployment',
      'Deploy during low-traffic periods',
      'Monitor system performance post-deployment'
    ];

    // Product-specific considerations
    if (products.includes('configured-commerce')) {
      considerations.push('Commerce database migration required');
      considerations.push('Payment gateway testing in production');
    }

    if (products.includes('cms-paas') || products.includes('cms-saas')) {
      considerations.push('Content migration and validation');
      considerations.push('URL structure changes impact SEO');
    }

    return considerations;
  }

  /**
   * Generate documentation plan
   */
  private generateDocumentationPlan(
    ticketAnalysis: ImplementationGuideResponse['ticketAnalysis'],
    products: string[]
  ): ImplementationGuideResponse['documentation'] {
    return {
      technicalSpecs: [
        'Architecture documentation',
        'API specification',
        'Database schema documentation',
        'Security implementation guide'
      ],
      userGuides: [
        'End-user manual',
        'Administrator guide',
        'Troubleshooting guide'
      ],
      apiDocumentation: [
        'REST API endpoints',
        'Authentication methods',
        'Rate limiting information',
        'Error codes and responses'
      ]
    };
  }

  /**
   * Generate project milestones
   */
  private generateMilestones(
    plan: ImplementationPlan,
    complexity: string
  ): ImplementationGuideResponse['suggestedMilestones'] {
    const milestones = [
      {
        name: 'Foundation Setup',
        deliverables: [
          'Development environment configured',
          'Project structure established',
          'Core dependencies installed'
        ],
        duration: '1 week'
      },
      {
        name: 'Core Implementation',
        deliverables: plan.keyComponents.slice(0, 3),
        duration: complexity === 'enterprise' ? '4-6 weeks' : '2-3 weeks'
      },
      {
        name: 'Integration & Testing',
        deliverables: [
          'Unit tests implemented',
          'Integration tests passing',
          'Performance testing completed'
        ],
        duration: '1-2 weeks'
      },
      {
        name: 'Deployment & Documentation',
        deliverables: [
          'Production deployment',
          'Documentation completed',
          'User training conducted'
        ],
        duration: '1 week'
      }
    ];

    return milestones;
  }

  /**
   * Sanitize text for use in code namespaces
   */
  private sanitizeNamespace(text: string): string {
    return text
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
      .substring(0, 50) || 'CustomImplementation';
  }
}