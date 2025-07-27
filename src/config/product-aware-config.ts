import * as path from 'path';
import { ProductDetectionEngine } from '../engine/product-detection-engine.js';
import type { 
  RulesEngineConfig, 
  RuleSource,
  ProductDetectionConfig
} from '../types/index.js';
import { OptimizelyProduct } from '../types/index.js';

export class ProductAwareConfig {
  /**
   * Get default configuration for product-aware rules engine
   */
  static getDefaultConfig(): RulesEngineConfig {
    return {
      enableAutoApplication: true,
      contextSensitivity: 'high',
      ruleCategories: ['frontend', 'backend', 'project-structure', 'quality', 'general'],
      rulesSources: this.getDefaultRuleSources(),
      productDetection: ProductDetectionEngine.getDefaultConfig()
    };
  }

  /**
   * Get configuration for external rules directory
   */
  static getExternalRulesConfig(rulesPath: string): RulesEngineConfig {
    const config = this.getDefaultConfig();
    
    // Replace default sources with external path
    config.rulesSources = [
      {
        type: 'local-directory',
        path: rulesPath,
        enabled: true,
        refreshInterval: 5 // 5 minutes
      }
    ];

    return config;
  }

  /**
   * Get configuration for multi-product environment
   */
  static getMultiProductConfig(rulesBasePath: string): RulesEngineConfig {
    const config = this.getDefaultConfig();
    
    // Configure sources for each product
    config.rulesSources = [
             // Product-specific directories
       {
         type: 'local-directory',
         path: path.join(rulesBasePath, 'configured-commerce'),
         product: OptimizelyProduct.CONFIGURED_COMMERCE,
         enabled: true,
         refreshInterval: 10
       },
       {
         type: 'local-directory',
         path: path.join(rulesBasePath, 'cms-paas'),
         product: OptimizelyProduct.CMS_PAAS,
         enabled: true,
         refreshInterval: 10
       },
       {
         type: 'local-directory',
         path: path.join(rulesBasePath, 'cms-saas'),
         product: OptimizelyProduct.CMS_SAAS,
         enabled: true,
         refreshInterval: 10
       },
       {
         type: 'local-directory',
         path: path.join(rulesBasePath, 'dxp'),
         product: OptimizelyProduct.ODP,
         enabled: true,
         refreshInterval: 10
       },
       {
         type: 'local-directory',
         path: path.join(rulesBasePath, 'experimentation'),
         product: OptimizelyProduct.EXPERIMENTATION,
         enabled: true,
         refreshInterval: 10
       },
      // Shared rules
      {
        type: 'local-directory',
        path: path.join(rulesBasePath, 'shared'),
        enabled: true,
        refreshInterval: 5
      }
    ];

    return config;
  }

  /**
   * Get configuration for hybrid (local + remote) rules
   */
  static getHybridRulesConfig(
    localRulesPath: string,
    remoteRepository?: string,
    documentationAPI?: string
  ): RulesEngineConfig {
    const config = this.getDefaultConfig();
    
    config.rulesSources = [
      // Local rules (highest priority)
      {
        type: 'local-directory',
        path: localRulesPath,
        enabled: true,
        refreshInterval: 5
      }
    ];

    // Add remote repository if provided
    if (remoteRepository) {
      config.rulesSources.push({
        type: 'remote-repository',
        path: remoteRepository,
        enabled: true,
        refreshInterval: 60, // 1 hour
        authentication: {
          type: 'api-key',
          credentials: {
            token: process.env.RULES_REPO_TOKEN || ''
          }
        }
      });
    }

    // Add documentation API if provided
    if (documentationAPI) {
      config.rulesSources.push({
        type: 'documentation-api',
        path: documentationAPI,
        enabled: true,
        refreshInterval: 120, // 2 hours
        authentication: {
          type: 'api-key',
          credentials: {
            apiKey: process.env.DOCS_API_KEY || ''
          }
        }
      });
    }

    return config;
  }

  /**
   * Get enhanced product detection configuration
   */
  static getEnhancedProductDetectionConfig(): ProductDetectionConfig {
    const baseConfig = ProductDetectionEngine.getDefaultConfig();
    
    // Add more comprehensive detection patterns
    baseConfig.methods.push(
      // CMS-specific patterns
      {
        type: 'file-pattern',
        weight: 0.8,
        patterns: [
                     {
             pattern: '*.ascx',
             product: OptimizelyProduct.CMS_PAAS,
             confidence: 0.7,
             description: 'ASP.NET User Control (CMS)'
           },
           {
             pattern: '*Controller.cs',
             product: OptimizelyProduct.CMS_PAAS,
             confidence: 0.5,
             description: 'MVC Controller'
           },
           {
             pattern: '*.cshtml',
             product: OptimizelyProduct.CMS_PAAS,
             confidence: 0.6,
             description: 'Razor view file'
           }
        ]
      },
      // Commerce-specific patterns  
      {
        type: 'directory-structure',
        weight: 0.9,
        patterns: [
          {
            pattern: 'InsiteCommerce.Web',
            product: OptimizelyProduct.CONFIGURED_COMMERCE,
            confidence: 0.95,
            description: 'Insite Commerce main directory'
          },
          {
            pattern: 'FrontEnd/modules/client-framework',
            product: OptimizelyProduct.CONFIGURED_COMMERCE,
            confidence: 0.9,
            description: 'Commerce frontend framework'
          }
        ]
      },
      // Experimentation patterns
      {
        type: 'package-dependencies',
        weight: 0.95,
        patterns: [
          {
            pattern: '@optimizely/optimizely-sdk',
            product: OptimizelyProduct.EXPERIMENTATION,
            confidence: 0.95,
            description: 'Optimizely Experimentation SDK'
          },
          {
            pattern: '@optimizely/react-sdk',
            product: OptimizelyProduct.EXPERIMENTATION,
            confidence: 0.9,
            description: 'Optimizely React SDK'
          }
        ]
      }
    );

    return baseConfig;
  }

  /**
   * Default rule sources for backward compatibility
   */
  private static getDefaultRuleSources(): RuleSource[] {
    return [
      {
        type: 'local-directory',
        path: path.join(process.cwd(), 'Resources', 'rules'),
        enabled: true,
        refreshInterval: 5
      }
    ];
  }

  /**
   * Create configuration based on environment and user preferences
   */
  static createConfigFromEnvironment(): RulesEngineConfig {
    const rulesPath = process.env.OPTIDEVDOC_RULES_PATH;
    const remoteRepo = process.env.OPTIDEVDOC_REMOTE_RULES;
    const docsAPI = process.env.OPTIDEVDOC_DOCS_API;
    const isMultiProduct = process.env.OPTIDEVDOC_MULTI_PRODUCT === 'true';

    if (rulesPath) {
      if (isMultiProduct) {
        return this.getMultiProductConfig(rulesPath);
      } else if (remoteRepo || docsAPI) {
        return this.getHybridRulesConfig(rulesPath, remoteRepo, docsAPI);
      } else {
        return this.getExternalRulesConfig(rulesPath);
      }
    }

    return this.getDefaultConfig();
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: RulesEngineConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check rule sources
    if (!config.rulesSources || config.rulesSources.length === 0) {
      errors.push('At least one rule source must be configured');
    }

    // Check enabled sources
    const enabledSources = config.rulesSources.filter(s => s.enabled);
    if (enabledSources.length === 0) {
      errors.push('At least one rule source must be enabled');
    }

    // Validate local directory sources
    for (const source of config.rulesSources) {
      if (source.type === 'local-directory' && !source.path) {
        errors.push(`Local directory source missing path`);
      }
    }

    // Check product detection
    if (config.productDetection.enabled) {
      if (!config.productDetection.methods || config.productDetection.methods.length === 0) {
        errors.push('Product detection enabled but no detection methods configured');
      }

      if (config.productDetection.confidence.threshold < 0 || config.productDetection.confidence.threshold > 1) {
        errors.push('Product detection confidence threshold must be between 0 and 1');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Migration helpers for existing setups
   */
  static createMigrationPlan(currentRulesPath: string): {
    currentStructure: string;
    recommendedStructure: string;
    migrationSteps: string[];
  } {
    return {
      currentStructure: `
Current: ${currentRulesPath}/
├── blueprint-development.mdc
├── extension-development.mdc  
├── handler-chain-pattern.mdc
├── project-structure.mdc
└── perfections.mdc`,
      
      recommendedStructure: `
Recommended: ${currentRulesPath}/
├── configured-commerce/
│   ├── frontend/
│   │   └── blueprint-development.mdc
│   ├── backend/
│   │   ├── extension-development.mdc
│   │   └── handler-chain-pattern.mdc
│   └── general/
│       ├── project-structure.mdc
│       └── perfections.mdc
├── cms-paas/
│   ├── content-types/
│   └── templates/
├── cms-saas/
├── dxp/
├── experimentation/
└── shared/
    └── common-patterns.mdc`,
      
      migrationSteps: [
        '1. Create product-specific directories',
        '2. Move existing rules to configured-commerce/ folder',
        '3. Organize rules by category (frontend/, backend/, general/)',
        '4. Add product frontmatter to rule files',
        '5. Update OptiDevDoc configuration to use new structure',
        '6. Test product detection with sample projects',
        '7. Add rules for other Optimizely products as needed'
      ]
    };
  }
} 