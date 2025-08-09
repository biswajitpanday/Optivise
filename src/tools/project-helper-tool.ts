/**
 * Project Helper Tool (optidev_project_helper)
 * Project setup, migration assistance, and development guidance
 */

import { chromaDBService } from '../integrations/chromadb-client.js';
import { ProductDetectionService } from '../services/product-detection-service.js';
import { RuleIntelligenceService } from '../services/rule-intelligence-service.js';
import type { Logger, LLMRequest, PromptContext, ContextBlock } from '../types/index.js';
import { RequestFormatter } from '../formatters/request-formatter.js';
import { FormatterTemplates } from '../formatters/templates.js';
import { z } from 'zod';

export const ProjectHelperRequestSchema = z.object({
  requestType: z.enum(['setup', 'migration', 'configuration', 'best-practices']),
  projectDetails: z.string().min(1, 'projectDetails is required'),
  targetVersion: z.string().optional(),
  userPrompt: z.string().optional(),
  promptContext: z.any().optional(),
  projectPath: z.string().optional()
});

export interface ProjectHelperRequest {
  requestType: 'setup' | 'migration' | 'configuration' | 'best-practices';
  projectDetails: string;
  targetVersion?: string;
  userPrompt?: string;
  promptContext?: PromptContext;
  projectPath?: string;
}

export interface ProjectSetupGuide {
  steps: Array<{
    step: number;
    title: string;
    description: string;
    commands?: string[];
    files?: Array<{
      path: string;
      content: string;
      description: string;
    }>;
    verification: string;
  }>;
  estimatedTime: string;
  prerequisites: string[];
  troubleshooting: Array<{
    issue: string;
    solution: string;
  }>;
}

export interface MigrationPlan {
  fromVersion: string;
  toVersion: string;
  compatibility: 'full' | 'partial' | 'breaking';
  breakingChanges: Array<{
    component: string;
    change: string;
    impact: 'low' | 'medium' | 'high';
    action: string;
  }>;
  migrationSteps: Array<{
    phase: string;
    tasks: string[];
    duration: string;
    risks: string[];
  }>;
  testingStrategy: string[];
  rollbackPlan: string[];
}

export interface ConfigurationGuide {
  environment: string;
  settings: Array<{
    category: string;
    key: string;
    value: string;
    description: string;
    required: boolean;
  }>;
  securityConsiderations: string[];
  performanceOptimizations: string[];
  monitoringSetup: string[];
}

export interface BestPracticesGuide {
  architecture: Array<{
    principle: string;
    description: string;
    examples: string[];
    benefits: string[];
  }>;
  codeOrganization: Array<{
    pattern: string;
    description: string;
    structure: string;
  }>;
  developmentWorkflow: Array<{
    stage: string;
    activities: string[];
    tools: string[];
  }>;
  qualityAssurance: Array<{
    aspect: string;
    practices: string[];
    metrics: string[];
  }>;
}

export interface ProjectHelperResponse {
  requestType: string;
  detectedProducts: string[];
  projectSetup?: ProjectSetupGuide;
  migrationPlan?: MigrationPlan;
  configurationGuide?: ConfigurationGuide;
  bestPracticesGuide?: BestPracticesGuide;
  recommendations: Array<{
    category: string;
    recommendation: string;
    priority: 'low' | 'medium' | 'high';
    effort: string;
  }>;
  resources: Array<{
    title: string;
    type: 'documentation' | 'tutorial' | 'tool' | 'template';
    url?: string;
    description: string;
  }>;
  llm_request?: LLMRequest;
}

export class ProjectHelperTool {
  private productDetection: ProductDetectionService;
  private logger: Logger;
  private ruleService: RuleIntelligenceService;

  // Version compatibility matrix
  private static readonly VERSION_COMPATIBILITY = {
    'configured-commerce': {
      '14.0': { supportedUntil: '2026-12-31', latestPatches: ['14.32.0'] },
      '13.0': { supportedUntil: '2025-12-31', latestPatches: ['13.47.0'] },
      '12.0': { supportedUntil: '2024-12-31', latestPatches: ['12.24.0'] }
    },
    'cms-paas': {
      '12.0': { supportedUntil: '2026-12-31', latestPatches: ['12.22.0'] },
      '11.0': { supportedUntil: '2025-12-31', latestPatches: ['11.20.7'] }
    },
    'experimentation': {
      'v4': { supportedUntil: '2027-12-31', latestPatches: ['4.5.2'] },
      'v3': { supportedUntil: '2025-06-30', latestPatches: ['3.9.1'] }
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
    this.logger.info('Project Helper Tool initialized');
  }

  /**
   * Provide project assistance based on request type
   */
  async provideAssistance(request: ProjectHelperRequest): Promise<ProjectHelperResponse> {
    try {
      const parsed = ProjectHelperRequestSchema.safeParse(request);
      if (!parsed.success) {
        throw parsed.error;
      }
      this.logger.info('Providing project assistance', { 
        requestType: request.requestType,
        targetVersion: request.targetVersion 
      });

      // 1. Detect relevant products
      const detectedProducts = await this.detectProducts(request.projectDetails);

      // 2. Provide assistance based on request type
      const response: Partial<ProjectHelperResponse> = {};

      switch (request.requestType) {
        case 'setup':
          response.projectSetup = await this.generateSetupGuide(detectedProducts, request);
          break;
        case 'migration':
          response.migrationPlan = await this.generateMigrationPlan(detectedProducts, request);
          break;
        case 'configuration':
          response.configurationGuide = await this.generateConfigurationGuide(detectedProducts, request);
          break;
        case 'best-practices':
          response.bestPracticesGuide = await this.generateBestPracticesGuide(detectedProducts, request);
          break;
      }

      // 3. Generate recommendations
      const recommendations = await this.generateRecommendations(detectedProducts, request);

      // 4. Compile resources
      const resources = await this.compileResources(detectedProducts, request);

      const base: ProjectHelperResponse = {
        requestType: request.requestType,
        detectedProducts,
        ...response,
        recommendations,
        resources
      } as ProjectHelperResponse;

      const blocks: ContextBlock[] = [];
      if (response.projectSetup) {
        blocks.push({ type: 'analysis', title: 'Project Setup Guide', content: JSON.stringify(response.projectSetup).slice(0, 4000), relevance: 0.9 });
      }
      if (response.migrationPlan) {
        blocks.push({ type: 'analysis', title: 'Migration Plan', content: JSON.stringify(response.migrationPlan).slice(0, 4000), relevance: 0.95 });
      }
      if (response.configurationGuide) {
        blocks.push({ type: 'analysis', title: 'Configuration Guide', content: JSON.stringify(response.configurationGuide).slice(0, 4000), relevance: 0.85 });
      }
      if (response.bestPracticesGuide) {
        blocks.push({ type: 'analysis', title: 'Best Practices Guide', content: JSON.stringify(response.bestPracticesGuide).slice(0, 4000), relevance: 0.8 });
      }
      if (request.projectPath) {
        try {
          const rules = await this.ruleService.analyzeIDERules(request.projectPath);
          blocks.push({
            type: 'rules',
            title: 'IDE Rules Summary',
            content: JSON.stringify({ files: rules.foundFiles, lintWarnings: rules.lintWarnings, conflicts: rules.conflicts, proposed: rules.proposedCursorRules?.slice(0, 2000), diff: rules.proposedCursorRulesDiff?.slice(0, 2000) }).slice(0, 4000),
            source: request.projectPath,
            relevance: 0.6
          });
        } catch {}
      }

      if (request.projectPath) {
        try {
          const rules = await this.ruleService.analyzeIDERules(request.projectPath);
          blocks.push({
            type: 'rules',
            title: 'IDE Rules Summary',
            content: JSON.stringify({ files: rules.foundFiles, lintWarnings: rules.lintWarnings, conflicts: rules.conflicts }).slice(0, 4000),
            source: request.projectPath
          });
        } catch {}
      }

      base.llm_request = RequestFormatter.format({
        toolName: 'optidev_project_helper',
        userPrompt: request.userPrompt,
        promptContext: request.promptContext,
        summary: 'Provide next-step guidance and, if needed, generate concise messages to share with the team.',
        products: detectedProducts,
        blocks,
        template: FormatterTemplates.optidev_project_helper
      });

      return base;

    } catch (error) {
      this.logger.error('Failed to provide project assistance', error as Error);
      throw error;
    }
  }

  /**
   * Detect products from project details
   */
  private async detectProducts(projectDetails: string): Promise<string[]> {
    const detection = await this.productDetection.detectFromPrompt(projectDetails);
    return detection.products;
  }

  /**
   * Generate project setup guide
   */
  private async generateSetupGuide(
    products: string[],
    request: ProjectHelperRequest
  ): Promise<ProjectSetupGuide> {
    const primaryProduct = products[0] || 'platform';
    
    const steps = await this.generateSetupSteps(primaryProduct, request.projectDetails);
    const estimatedTime = this.calculateSetupTime(steps.length, primaryProduct);
    const prerequisites = this.getPrerequisites(primaryProduct);
    const troubleshooting = this.getCommonTroubleshooting(primaryProduct);

    return {
      steps,
      estimatedTime,
      prerequisites,
      troubleshooting
    };
  }

  /**
   * Generate setup steps for specific product
   */
  private async generateSetupSteps(
    product: string,
    projectDetails: string
  ): Promise<ProjectSetupGuide['steps']> {
    const baseSteps: ProjectSetupGuide['steps'] = [
      {
        step: 1,
        title: 'Environment Preparation',
        description: 'Set up development environment and required tools',
        commands: ['node --version', 'npm --version', 'git --version'],
        verification: 'All tools show their version numbers'
      },
      {
        step: 2,
        title: 'Project Initialization',
        description: 'Create new project structure',
        commands: ['mkdir my-optimizely-project', 'cd my-optimizely-project'],
        verification: 'Project directory created successfully'
      }
    ];

    // Product-specific steps
    switch (product) {
      case 'configured-commerce':
        baseSteps.push(
          {
            step: 3,
            title: 'Commerce Foundation Setup',
            description: 'Install Commerce Foundation and core packages',
            commands: [
              'dotnet new web -n MyCommerceProject',
              'cd MyCommerceProject',
              'dotnet add package EPiServer.Commerce',
              'dotnet add package EPiServer.Commerce.UI'
            ],
            verification: 'Commerce packages installed without errors'
          },
          {
            step: 4,
            title: 'Database Configuration',
            description: 'Set up Commerce and CMS databases',
            files: [{
              path: 'appsettings.json',
              content: JSON.stringify({
                "ConnectionStrings": {
                  "EPiServerDB": "Server=(localdb)\\MSSQLLocalDB;Database=MyCommerceDB;Integrated Security=true;",
                  "EcfSqlConnection": "Server=(localdb)\\MSSQLLocalDB;Database=MyCommerceDB_Commerce;Integrated Security=true;"
                }
              }, null, 2),
              description: 'Database connection configuration'
            }],
            verification: 'Database connections configured correctly'
          }
        );
        break;

      case 'cms-paas':
        baseSteps.push(
          {
            step: 3,
            title: 'CMS Foundation Setup',
            description: 'Install CMS packages and create basic structure',
            commands: [
              'dotnet new web -n MyCMSProject',
              'cd MyCMSProject',
              'dotnet add package EPiServer.CMS',
              'dotnet add package EPiServer.CMS.UI'
            ],
            verification: 'CMS packages installed successfully'
          },
          {
            step: 4,
            title: 'Content Model Setup',
            description: 'Create basic page and block types',
            files: [{
              path: 'Models/Pages/StartPage.cs',
              content: `
using EPiServer.Core;
using EPiServer.DataAbstraction;
using EPiServer.DataAnnotations;
using System.ComponentModel.DataAnnotations;

[ContentType(DisplayName = "Start Page", GUID = "19671657-B684-4D95-A61F-8DD4FE60D559")]
public class StartPage : PageData
{
    [Display(Name = "Heading", GroupName = SystemTabNames.Content, Order = 100)]
    public virtual string Heading { get; set; }
    
    [Display(Name = "Main Content", GroupName = SystemTabNames.Content, Order = 200)]
    public virtual XhtmlString MainContent { get; set; }
}`.trim(),
              description: 'Basic start page model'
            }],
            verification: 'Content types compile without errors'
          }
        );
        break;

      case 'experimentation':
        baseSteps.push(
          {
            step: 3,
            title: 'Experimentation SDK Setup',
            description: 'Install and configure Optimizely SDK',
            commands: [
              'npm init -y',
              'npm install @optimizely/optimizely-sdk',
              'npm install @optimizely/js-web-sdk'
            ],
            verification: 'SDK packages installed successfully'
          },
          {
            step: 4,
            title: 'Basic Experiment Configuration',
            description: 'Set up basic experiment tracking',
            files: [{
              path: 'optimizely-config.js',
              content: `
import { createInstance } from '@optimizely/optimizely-sdk';

const optimizely = createInstance({
  datafile: process.env.OPTIMIZELY_DATAFILE,
  logger: {
    log: (level, message) => console.log(\`[\${level}] \${message}\`)
  }
});

export default optimizely;`.trim(),
              description: 'Basic Optimizely configuration'
            }],
            verification: 'Configuration loads without errors'
          }
        );
        break;

      default:
        baseSteps.push({
          step: 3,
          title: 'Generic Optimizely Setup',
          description: 'Set up basic Optimizely integration',
          commands: ['npm install optimizely-sdk'],
          verification: 'SDK installed successfully'
        });
    }

    // Final steps
    baseSteps.push(
      {
        step: baseSteps.length + 1,
        title: 'Development Tools Setup',
        description: 'Configure development and debugging tools',
        commands: ['npm install --save-dev nodemon', 'npm install --save-dev typescript'],
        verification: 'Development tools ready'
      },
      {
        step: baseSteps.length + 2,
        title: 'Verification & Testing',
        description: 'Verify installation and run initial tests',
        commands: ['npm run build', 'npm run test'],
        verification: 'Build and tests pass successfully'
      }
    );

    return baseSteps;
  }

  /**
   * Calculate estimated setup time
   */
  private calculateSetupTime(stepCount: number, product: string): string {
    const baseTime = {
      'configured-commerce': 3,
      'cms-paas': 2,
      'experimentation': 1,
      'platform': 1
    };

    const productTime = baseTime[product as keyof typeof baseTime] || 1;
    const totalHours = productTime + (stepCount * 0.5);

    if (totalHours < 1) return '30-45 minutes';
    if (totalHours < 2) return '1-1.5 hours';
    if (totalHours < 4) return '2-3 hours';
    return '4+ hours';
  }

  /**
   * Get prerequisites for product
   */
  private getPrerequisites(product: string): string[] {
    const commonPrereqs = [
      'Git installed and configured',
      'Code editor (VS Code, Visual Studio, etc.)',
      'Basic understanding of the target platform'
    ];

    const productPrereqs: Record<string, string[]> = {
      'configured-commerce': [
        '.NET 6.0 or later SDK',
        'SQL Server or LocalDB',
        'IIS Express or similar web server',
        'Understanding of C# and ASP.NET Core'
      ],
      'cms-paas': [
        '.NET 6.0 or later SDK',
        'SQL Server or LocalDB',
        'Basic understanding of MVC pattern',
        'Familiarity with Razor syntax'
      ],
      'experimentation': [
        'Node.js 14 or later',
        'npm or yarn package manager',
        'Basic JavaScript/TypeScript knowledge',
        'Understanding of A/B testing concepts'
      ]
    };

    return [
      ...commonPrereqs,
      ...(productPrereqs[product] || ['Node.js 14 or later', 'npm package manager'])
    ];
  }

  /**
   * Get common troubleshooting tips
   */
  private getCommonTroubleshooting(product: string): Array<{ issue: string; solution: string }> {
    const commonIssues = [
      {
        issue: 'Package installation fails',
        solution: 'Clear npm cache with "npm cache clean --force" and try again'
      },
      {
        issue: 'Build errors after installation',
        solution: 'Ensure all dependencies are installed and check for version conflicts'
      }
    ];

    const productIssues: Record<string, Array<{ issue: string; solution: string }>> = {
      'configured-commerce': [
        {
          issue: 'Database connection errors',
          solution: 'Verify SQL Server is running and connection strings are correct'
        },
        {
          issue: 'Commerce Manager not accessible',
          solution: 'Check IIS configuration and ensure Commerce modules are properly installed'
        }
      ],
      'cms-paas': [
        {
          issue: 'Admin interface not loading',
          solution: 'Verify CMS UI packages are installed and check web.config settings'
        },
        {
          issue: 'Content types not appearing',
          solution: 'Rebuild solution and restart application to refresh content type definitions'
        }
      ],
      'experimentation': [
        {
          issue: 'SDK initialization fails',
          solution: 'Check datafile URL and ensure it\'s accessible from your environment'
        },
        {
          issue: 'Events not tracking',
          solution: 'Verify event tracking is properly configured and test with browser developer tools'
        }
      ]
    };

    return [
      ...commonIssues,
      ...(productIssues[product] || [])
    ];
  }

  /**
   * Generate migration plan
   */
  private async generateMigrationPlan(
    products: string[],
    request: ProjectHelperRequest
  ): Promise<MigrationPlan> {
    const primaryProduct = products[0] || 'platform';
    const currentVersion = this.extractCurrentVersion(request.projectDetails);
    const targetVersion = request.targetVersion || 'latest';

    const compatibility = this.assessCompatibility(primaryProduct, currentVersion, targetVersion);
    const breakingChanges = this.identifyBreakingChanges(primaryProduct, currentVersion, targetVersion);
    const migrationSteps = this.generateMigrationSteps(primaryProduct, currentVersion, targetVersion);
    const testingStrategy = this.generateTestingStrategy(primaryProduct);
    const rollbackPlan = this.generateRollbackPlan(primaryProduct);

    return {
      fromVersion: currentVersion,
      toVersion: targetVersion,
      compatibility,
      breakingChanges,
      migrationSteps,
      testingStrategy,
      rollbackPlan
    };
  }

  /**
   * Extract current version from project details
   */
  private extractCurrentVersion(projectDetails: string): string {
    // Try to extract version from project details
    const versionPatterns = [
      /version[:\s]+([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i,
      /v([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i,
      /([0-9]+\.[0-9]+(?:\.[0-9]+)?)/
    ];

    for (const pattern of versionPatterns) {
      const match = projectDetails.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    return 'unknown';
  }

  /**
   * Assess compatibility between versions
   */
  private assessCompatibility(
    product: string,
    fromVersion: string,
    toVersion: string
  ): MigrationPlan['compatibility'] {
    // Simple compatibility assessment based on version numbers
    const fromMajor = parseInt(fromVersion.split('.')[0] || '0');
    const toMajor = parseInt(toVersion.split('.')[0] || '0');

    if (fromMajor === toMajor) return 'full';
    if (Math.abs(fromMajor - toMajor) === 1) return 'partial';
    return 'breaking';
  }

  /**
   * Identify breaking changes between versions
   */
  private identifyBreakingChanges(
    product: string,
    fromVersion: string,
    toVersion: string
  ): MigrationPlan['breakingChanges'] {
    // This would ideally come from a comprehensive database of breaking changes
    const commonBreakingChanges = [
      {
        component: 'API',
        change: 'Deprecated methods removed',
        impact: 'medium' as const,
        action: 'Update method calls to use new API'
      },
      {
        component: 'Configuration',
        change: 'Configuration format updated',
        impact: 'low' as const,
        action: 'Update configuration files to new format'
      }
    ];

    const productBreakingChanges: Record<string, MigrationPlan['breakingChanges']> = {
      'configured-commerce': [
        {
          component: 'Order System',
          change: 'Order processing workflow redesigned',
          impact: 'high' as const,
          action: 'Migrate custom order processing logic'
        },
        {
          component: 'Catalog',
          change: 'Product property system updated',
          impact: 'medium' as const,
          action: 'Review and update product property definitions'
        }
      ]
    };

    return [
      ...commonBreakingChanges,
      ...(productBreakingChanges[product] || [])
    ];
  }

  /**
   * Generate migration steps
   */
  private generateMigrationSteps(
    product: string,
    fromVersion: string,
    toVersion: string
  ): MigrationPlan['migrationSteps'] {
    return [
      {
        phase: 'Preparation',
        tasks: [
          'Backup current system and database',
          'Review migration documentation',
          'Set up testing environment',
          'Identify customizations and extensions'
        ],
        duration: '1-2 days',
        risks: ['Data loss during backup', 'Testing environment setup issues']
      },
      {
        phase: 'Code Updates',
        tasks: [
          'Update package references',
          'Resolve compilation errors',
          'Update deprecated API calls',
          'Refactor breaking changes'
        ],
        duration: '3-5 days',
        risks: ['Complex refactoring requirements', 'Third-party package compatibility']
      },
      {
        phase: 'Database Migration',
        tasks: [
          'Run database migration scripts',
          'Verify data integrity',
          'Update stored procedures',
          'Test database performance'
        ],
        duration: '1-2 days',
        risks: ['Database migration failures', 'Performance degradation']
      },
      {
        phase: 'Testing & Validation',
        tasks: [
          'Execute comprehensive test suite',
          'Perform user acceptance testing',
          'Load testing and performance validation',
          'Security testing'
        ],
        duration: '2-3 days',
        risks: ['Regression bugs', 'Performance issues', 'Security vulnerabilities']
      },
      {
        phase: 'Deployment',
        tasks: [
          'Deploy to staging environment',
          'Final validation',
          'Deploy to production',
          'Monitor system health'
        ],
        duration: '1 day',
        risks: ['Deployment failures', 'Production issues', 'Rollback requirements']
      }
    ];
  }

  /**
   * Generate testing strategy
   */
  private generateTestingStrategy(product: string): string[] {
    return [
      'Unit tests for all custom code',
      'Integration tests for external dependencies',
      'End-to-end tests for critical user workflows',
      'Performance testing under expected load',
      'Security testing for vulnerabilities',
      'Browser compatibility testing (if web-based)',
      'Data migration validation',
      'Rollback procedure testing'
    ];
  }

  /**
   * Generate rollback plan
   */
  private generateRollbackPlan(product: string): string[] {
    return [
      'Maintain complete backup of pre-migration state',
      'Document rollback procedures step-by-step',
      'Test rollback process in staging environment',
      'Prepare downtime communication plan',
      'Have dedicated rollback team on standby',
      'Monitor key metrics post-rollback',
      'Plan for data reconciliation if needed'
    ];
  }

  /**
   * Generate configuration guide
   */
  private async generateConfigurationGuide(
    products: string[],
    request: ProjectHelperRequest
  ): Promise<ConfigurationGuide> {
    const environment = this.detectEnvironment(request.projectDetails);
    const settings = this.generateConfigurationSettings(products[0] || 'platform', environment);
    const securityConsiderations = this.generateSecurityConsiderations(products);
    const performanceOptimizations = this.generatePerformanceOptimizations(products);
    const monitoringSetup = this.generateMonitoringSetup(products);

    return {
      environment,
      settings,
      securityConsiderations,
      performanceOptimizations,
      monitoringSetup
    };
  }

  /**
   * Detect environment from project details
   */
  private detectEnvironment(projectDetails: string): string {
    const details = projectDetails.toLowerCase();
    if (details.includes('production') || details.includes('prod')) return 'production';
    if (details.includes('staging') || details.includes('stage')) return 'staging';
    if (details.includes('test') || details.includes('testing')) return 'testing';
    return 'development';
  }

  /**
   * Generate configuration settings
   */
  private generateConfigurationSettings(
    product: string,
    environment: string
  ): ConfigurationGuide['settings'] {
    const commonSettings = [
      {
        category: 'Application',
        key: 'Environment',
        value: environment,
        description: 'Current application environment',
        required: true
      },
      {
        category: 'Logging',
        key: 'LogLevel',
        value: environment === 'production' ? 'Warning' : 'Information',
        description: 'Minimum log level for application logging',
        required: true
      }
    ];

    const productSettings: Record<string, typeof commonSettings> = {
      'configured-commerce': [
        {
          category: 'Commerce',
          key: 'CommerceDatabaseConnection',
          value: 'Server=localhost;Database=Commerce;Integrated Security=true;',
          description: 'Commerce database connection string',
          required: true
        },
        {
          category: 'Commerce',
          key: 'DefaultMarket',
          value: 'DEFAULT',
          description: 'Default market for commerce operations',
          required: true
        }
      ],
      'cms-paas': [
        {
          category: 'CMS',
          key: 'CMSDatabaseConnection',
          value: 'Server=localhost;Database=CMS;Integrated Security=true;',
          description: 'CMS database connection string',
          required: true
        },
        {
          category: 'CMS',
          key: 'BlobProvider',
          value: 'FileBlobProvider',
          description: 'Blob storage provider configuration',
          required: false
        }
      ]
    };

    return [
      ...commonSettings,
      ...(productSettings[product] || [])
    ];
  }

  /**
   * Generate security considerations
   */
  private generateSecurityConsiderations(products: string[]): string[] {
    return [
      'Use environment variables for sensitive configuration',
      'Enable HTTPS in production environments',
      'Implement proper authentication and authorization',
      'Regular security updates and patches',
      'Use secure connection strings',
      'Implement request rate limiting',
      'Enable security headers',
      'Regular security audits and penetration testing'
    ];
  }

  /**
   * Generate performance optimizations
   */
  private generatePerformanceOptimizations(products: string[]): string[] {
    const optimizations = [
      'Enable response compression',
      'Configure appropriate caching strategies',
      'Optimize database queries and indexes',
      'Use CDN for static assets',
      'Implement connection pooling',
      'Configure memory limits appropriately'
    ];

    if (products.includes('configured-commerce')) {
      optimizations.push(
        'Enable Commerce catalog caching',
        'Optimize product search indexing',
        'Configure inventory caching'
      );
    }

    if (products.includes('cms-paas')) {
      optimizations.push(
        'Enable CMS output caching',
        'Optimize media delivery',
        'Configure content search indexing'
      );
    }

    return optimizations;
  }

  /**
   * Generate monitoring setup
   */
  private generateMonitoringSetup(products: string[]): string[] {
    return [
      'Set up application performance monitoring (APM)',
      'Configure log aggregation and analysis',
      'Implement health check endpoints',
      'Monitor database performance',
      'Set up alerting for critical errors',
      'Track key business metrics',
      'Monitor system resource usage',
      'Implement uptime monitoring'
    ];
  }

  /**
   * Generate best practices guide
   */
  private async generateBestPracticesGuide(
    products: string[],
    request: ProjectHelperRequest
  ): Promise<BestPracticesGuide> {
    const architecture = this.generateArchitecturePrinciples(products);
    const codeOrganization = this.generateCodeOrganizationPatterns(products);
    const developmentWorkflow = this.generateDevelopmentWorkflow(products);
    const qualityAssurance = this.generateQualityAssurancePractices(products);

    return {
      architecture,
      codeOrganization,
      developmentWorkflow,
      qualityAssurance
    };
  }

  /**
   * Generate architecture principles
   */
  private generateArchitecturePrinciples(products: string[]): BestPracticesGuide['architecture'] {
    return [
      {
        principle: 'Separation of Concerns',
        description: 'Separate business logic, data access, and presentation layers',
        examples: [
          'Use repository pattern for data access',
          'Implement service layer for business logic',
          'Keep controllers thin and focused'
        ],
        benefits: [
          'Improved maintainability',
          'Better testability',
          'Easier to modify individual layers'
        ]
      },
      {
        principle: 'Dependency Injection',
        description: 'Use dependency injection for loose coupling',
        examples: [
          'Register services in DI container',
          'Inject dependencies through constructors',
          'Avoid service locator pattern'
        ],
        benefits: [
          'Loose coupling between components',
          'Easier unit testing',
          'Better code reusability'
        ]
      },
      {
        principle: 'Single Responsibility',
        description: 'Each class should have one reason to change',
        examples: [
          'Create focused, single-purpose classes',
          'Split large classes into smaller ones',
          'Use composition over inheritance'
        ],
        benefits: [
          'Easier to understand and maintain',
          'Better testability',
          'Reduced coupling'
        ]
      }
    ];
  }

  /**
   * Generate code organization patterns
   */
  private generateCodeOrganizationPatterns(products: string[]): BestPracticesGuide['codeOrganization'] {
    const patterns = [
      {
        pattern: 'Feature-based Organization',
        description: 'Organize code by features rather than technical layers',
        structure: `
/Features
  /Products
    - ProductController.cs
    - ProductService.cs
    - ProductRepository.cs
    - ProductModels.cs
  /Orders
    - OrderController.cs
    - OrderService.cs
    - OrderRepository.cs`
      },
      {
        pattern: 'Shared Components',
        description: 'Extract common functionality into shared components',
        structure: `
/Shared
  /Services
  /Models
  /Extensions
  /Utilities`
      }
    ];

    if (products.includes('configured-commerce')) {
      patterns.push({
        pattern: 'Commerce Extension Structure',
        description: 'Organize Commerce extensions following Optimizely patterns',
        structure: `
/Extensions
  /Business
    - CustomLineItemCalculator.cs
  /Catalog
    - CustomCatalogContent.cs
  /Orders
    - CustomOrderForm.cs'`
      });
    }

    return patterns;
  }

  /**
   * Generate development workflow
   */
  private generateDevelopmentWorkflow(products: string[]): BestPracticesGuide['developmentWorkflow'] {
    return [
      {
        stage: 'Development',
        activities: [
          'Feature branch creation',
          'Test-driven development',
          'Code review process',
          'Continuous integration'
        ],
        tools: ['Git', 'Unit testing framework', 'Code analysis tools', 'CI/CD pipeline']
      },
      {
        stage: 'Testing',
        activities: [
          'Unit testing',
          'Integration testing',
          'End-to-end testing',
          'Performance testing'
        ],
        tools: ['xUnit/NUnit', 'Selenium', 'Postman', 'Performance testing tools']
      },
      {
        stage: 'Deployment',
        activities: [
          'Automated builds',
          'Environment promotion',
          'Database migrations',
          'Monitoring and logging'
        ],
        tools: ['Azure DevOps', 'Docker', 'Kubernetes', 'Application monitoring']
      }
    ];
  }

  /**
   * Generate quality assurance practices
   */
  private generateQualityAssurancePractices(products: string[]): BestPracticesGuide['qualityAssurance'] {
    return [
      {
        aspect: 'Code Quality',
        practices: [
          'Code reviews for all changes',
          'Static code analysis',
          'Coding standards enforcement',
          'Technical debt management'
        ],
        metrics: [
          'Code coverage percentage',
          'Cyclomatic complexity',
          'Technical debt ratio',
          'Code duplication percentage'
        ]
      },
      {
        aspect: 'Testing',
        practices: [
          'Test-driven development',
          'Automated testing pipeline',
          'Performance testing',
          'Security testing'
        ],
        metrics: [
          'Test coverage',
          'Test execution time',
          'Defect detection rate',
          'Test automation percentage'
        ]
      },
      {
        aspect: 'Performance',
        practices: [
          'Performance monitoring',
          'Load testing',
          'Code profiling',
          'Database optimization'
        ],
        metrics: [
          'Response time',
          'Throughput',
          'Resource utilization',
          'Error rates'
        ]
      }
    ];
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(
    products: string[],
    request: ProjectHelperRequest
  ): Promise<ProjectHelperResponse['recommendations']> {
    const recommendations: ProjectHelperResponse['recommendations'] = [];

    // Get contextual recommendations from documentation if available
    if (chromaDBService.isAvailable()) {
      const docs = await chromaDBService.searchDocuments(
        `${request.requestType} ${request.projectDetails}`,
        { product: products[0], limit: 2 }
      );
      
      docs.forEach(doc => {
        recommendations.push({
          category: 'Documentation',
          recommendation: `Review: ${doc.metadata.title}`,
          priority: 'medium' as const,
          effort: '30 minutes'
        });
      });
    }

    // Add specific recommendations based on request type
    switch (request.requestType) {
      case 'setup':
        recommendations.push(
          {
            category: 'Development Environment',
            recommendation: 'Set up automated development environment using Docker or similar',
            priority: 'high' as const,
            effort: '2-4 hours'
          },
          {
            category: 'Version Control',
            recommendation: 'Implement Git hooks for code quality enforcement',
            priority: 'medium' as const,
            effort: '1-2 hours'
          }
        );
        break;

      case 'migration':
        recommendations.push(
          {
            category: 'Risk Management',
            recommendation: 'Create comprehensive rollback plan before migration',
            priority: 'high' as const,
            effort: '4-6 hours'
          },
          {
            category: 'Testing',
            recommendation: 'Implement automated testing for migration validation',
            priority: 'high' as const,
            effort: '8-12 hours'
          }
        );
        break;
    }

    return recommendations;
  }

  /**
   * Compile relevant resources
   */
  private async compileResources(
    products: string[],
    request: ProjectHelperRequest
  ): Promise<ProjectHelperResponse['resources']> {
    const resources: ProjectHelperResponse['resources'] = [];

    // Official documentation
    products.forEach(product => {
      const productUrls: Record<string, string> = {
        'configured-commerce': 'https://docs.optimizely.com/configured-commerce/',
        'cms-paas': 'https://docs.optimizely.com/content-management-system/',
        'experimentation': 'https://docs.optimizely.com/web-experimentation/'
      };

      if (productUrls[product]) {
        resources.push({
          title: `${product} Official Documentation`,
          type: 'documentation',
          url: productUrls[product],
          description: `Complete documentation for ${product}`
        });
      }
    });

    // Request-type specific resources
    if (request.requestType === 'setup') {
      resources.push({
        title: 'Development Environment Setup Guide',
        type: 'tutorial',
        description: 'Step-by-step guide for setting up development environment'
      });
    }

    if (request.requestType === 'migration') {
      resources.push({
        title: 'Migration Planning Template',
        type: 'template',
        description: 'Template for planning and tracking migration progress'
      });
    }

    return resources;
  }
}