import { z } from 'zod';
import type { Logger } from '../utils/logger.js';
import type { ServerConfig } from '../types/index.js';
import { EnhancedRulesEngine } from '../engine/enhanced-rules-engine.js';
import { Config } from '../config/index.js';
import type { RuleApplication, RulesEngineConfig } from '../types/index.js';
import { OptimizelyProduct } from '../types/index.js';

const ApplyDevelopmentRulesArgsSchema = z.object({
  scenario: z.string().min(1).max(500),
  context: z.object({
    filePattern: z.string().optional(),
    directory: z.string().optional(),
    technology: z.array(z.string()).optional(),
    category: z.enum(['frontend', 'backend', 'project-structure', 'quality', 'general']).optional(),
    product: z.enum(['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation']).optional(),
    projectPath: z.string().optional(),
  }).optional(),
  includeExamples: z.boolean().default(true),
  maxRules: z.number().min(1).max(10).default(5),
});

const GenerateCursorConfigArgsSchema = z.object({
  projectPath: z.string().optional(),
  includeAllRules: z.boolean().default(true),
  categories: z.array(z.enum(['frontend', 'backend', 'project-structure', 'quality', 'general'])).optional(),
  products: z.array(z.enum(['configured-commerce', 'cms-paas', 'cms-saas', 'cmp', 'odp', 'experimentation', 'commerce-connect', 'search-navigation'])).optional(),
});

const DetectProductArgsSchema = z.object({
  projectPath: z.string().optional(),
  includeDetails: z.boolean().default(false),
});

type ApplyDevelopmentRulesArgs = z.infer<typeof ApplyDevelopmentRulesArgsSchema>;
type GenerateCursorConfigArgs = z.infer<typeof GenerateCursorConfigArgsSchema>;
type DetectProductArgs = z.infer<typeof DetectProductArgsSchema>;

export class EnhancedDevelopmentRulesTool {
  private logger: Logger;
  private rulesEngine: EnhancedRulesEngine;
  private config: ServerConfig;

  constructor(config: ServerConfig, logger: Logger) {
    this.logger = logger;
    this.config = config;
    
    // Create product-aware configuration
    const rulesConfig = this.createRulesConfig(config);
    this.rulesEngine = new EnhancedRulesEngine(logger, rulesConfig);
  }

  private createRulesConfig(config: ServerConfig): RulesEngineConfig {
    // Try to use custom rules path or environment configuration
    if (config.customRulesPath) {
      return Config.getExternalRulesConfig(config.customRulesPath);
    }
    
    // Use environment-based configuration
    return Config.createConfigFromEnvironment();
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Enhanced Development Rules Tool...');
    await this.rulesEngine.initialize();
    this.logger.info('Enhanced Development Rules Tool initialized successfully');
  }

  async executeApplyRules(args: unknown): Promise<{ content: { text: string } }> {
    try {
      const validatedArgs = ApplyDevelopmentRulesArgsSchema.parse(args);
      this.logger.info('Applying product-aware development rules', { 
        scenario: validatedArgs.scenario, 
        context: validatedArgs.context 
      });

      // Convert string product to enum if present
      const contextWithProduct = validatedArgs.context ? {
        ...validatedArgs.context,
        product: validatedArgs.context.product as OptimizelyProduct | undefined
      } : undefined;

      const ruleApplications = await this.rulesEngine.applyRules(
        validatedArgs.scenario,
        contextWithProduct
      );

      const limitedApplications = ruleApplications.slice(0, validatedArgs.maxRules);

      return {
        content: {
          text: await this.formatRuleApplications(limitedApplications, validatedArgs),
        },
      };
    } catch (error) {
      this.logger.error('Error in Enhanced Development Rules Tool.executeApplyRules', { error, args });
      throw error;
    }
  }

  async executeDetectProduct(args: unknown): Promise<{ content: { text: string } }> {
    try {
      const validatedArgs = DetectProductArgsSchema.parse(args);
      this.logger.info('Detecting Optimizely product context', { projectPath: validatedArgs.projectPath });

      const productContext = await this.rulesEngine.getProductContext(validatedArgs.projectPath);

      return {
        content: {
          text: this.formatProductDetection(productContext, validatedArgs.includeDetails),
        },
      };
    } catch (error) {
      this.logger.error('Error in product detection', { error, args });
      throw error;
    }
  }

  async executeGenerateCursorConfig(args: unknown): Promise<{ content: { text: string } }> {
    try {
      const validatedArgs = GenerateCursorConfigArgsSchema.parse(args);
      this.logger.info('Generating product-aware Cursor IDE configuration', { args: validatedArgs });

      // Get product context if project path provided
      let productContext;
      if (validatedArgs.projectPath) {
        productContext = await this.rulesEngine.getProductContext(validatedArgs.projectPath);
      }

      // Get rules for specified products or detected product
      const targetProducts = validatedArgs.products || 
        (productContext ? [productContext.detectedProduct] : ['configured-commerce']);
      
      const allRules = this.getAllRulesForProducts(targetProducts);
      const filteredRules = validatedArgs.categories 
        ? allRules.filter(rule => validatedArgs.categories!.includes(rule.category))
        : allRules;

      return {
        content: {
          text: this.generateCursorConfiguration(filteredRules, validatedArgs, productContext),
        },
      };
    } catch (error) {
      this.logger.error('Error in Enhanced Development Rules Tool.executeGenerateCursorConfig', { error, args });
      throw error;
    }
  }

  private getAllRulesForProducts(products: string[]): any[] {
    const allRules: any[] = [];
    
    for (const productStr of products) {
      const product = productStr as OptimizelyProduct;
      const productRules = this.rulesEngine.getAllRulesForProduct(product);
      const sharedRules = this.rulesEngine.getSharedRulesForProduct(product);
      
      allRules.push(...productRules, ...sharedRules);
    }
    
    return allRules;
  }

  private async formatRuleApplications(
    applications: RuleApplication[], 
    args: ApplyDevelopmentRulesArgs
  ): Promise<string> {
    if (applications.length === 0) {
      return this.formatNoRulesMessage(args);
    }

    // Get product context for better formatting
    let productContext;
    if (args.context?.projectPath) {
      productContext = await this.rulesEngine.getProductContext(args.context.projectPath);
    }

    let output = `# 🎯 Product-Aware Development Rules for "${args.scenario}"\n\n`;
    
    if (productContext) {
      output += `**Detected Product:** ${this.formatProductName(productContext.detectedProduct)} `;
      output += `(${Math.round(productContext.confidence * 100)}% confidence)\n`;
      output += `**Context:** ${applications[0]?.context || 'General development'}\n`;
    } else {
      output += `**Context:** ${applications[0]?.context || 'General development'}\n`;
    }
    
    output += `Found ${applications.length} applicable rule(s):\n\n`;

    applications.forEach((app, index) => {
      const rule = app.rule;
      const relevancePercentage = Math.round(app.relevanceScore * 100);
      
      output += `## ${index + 1}. ${rule.title}\n\n`;
      output += `**Product:** ${this.formatProductName(rule.product)} | `;
      output += `**Category:** ${this.formatCategoryName(rule.category)} | `;
      output += `**Priority:** ${this.formatPriority(rule.priority)} | `;
      output += `**Relevance:** ${relevancePercentage}%`;
      
      if (app.productMatch) {
        output += ` | ✅ **Product Match**`;
      }
      output += `\n\n`;

      // Description
      if (rule.description) {
        output += `### Description\n${rule.description}\n\n`;
      }

      // Key suggestions from rule application
      if (app.suggestions.length > 0) {
        output += `### 📋 Key Guidelines\n`;
        app.suggestions.forEach(suggestion => {
          output += `${suggestion}\n`;
        });
        output += '\n';
      }

      // Violations to avoid
      if (rule.violations && rule.violations.length > 0) {
        output += `### ⚠️ Important Restrictions\n`;
        rule.violations.slice(0, 2).forEach(violation => {
          output += `- ${violation}\n`;
        });
        output += '\n';
      }

      // Code examples
      if (args.includeExamples && rule.examples && rule.examples.length > 0) {
        const productSpecificExamples = rule.examples.filter(ex => 
          !ex.product || ex.product === rule.product
        );
        
        const goodExample = productSpecificExamples.find(ex => ex.type === 'good');
        const badExample = productSpecificExamples.find(ex => ex.type === 'bad');
        
        if (goodExample) {
          output += `### ✅ Good Example (${rule.product})\n`;
          output += `\`\`\`${goodExample.language}\n${goodExample.code.substring(0, 800)}\n\`\`\`\n\n`;
        }
        
        if (badExample) {
          output += `### ❌ Avoid This\n`;
          output += `\`\`\`${badExample.language}\n${badExample.code.substring(0, 400)}\n\`\`\`\n\n`;
        }
      }

      // Product-specific contexts
      if (rule.contexts.length > 0) {
        const productContexts = rule.contexts.filter(ctx => 
          !ctx.product || ctx.product === rule.product
        );
        
        if (productContexts.length > 0) {
          output += `### 🎯 Applicable Contexts\n`;
          productContexts.slice(0, 3).forEach(ctx => {
            output += `- **${ctx.type}**: ${ctx.pattern} - ${ctx.description}\n`;
          });
          output += '\n';
        }
      }

      // References
      if (rule.references && rule.references.length > 0) {
        output += `### 📚 References\n`;
        rule.references.slice(0, 2).forEach(ref => {
          output += `- ${ref}\n`;
        });
        output += '\n';
      }

      // Tags
      if (rule.tags.length > 0) {
        output += `**Tags:** ${rule.tags.join(', ')}\n\n`;
      }

      output += `---\n\n`;
    });

    output += this.generateContextualAdvice(args.scenario, args.context, productContext);
    
    return output;
  }

  private formatProductDetection(productContext: any, includeDetails: boolean): string {
    let output = `# 🎯 Optimizely Product Detection Results\n\n`;
    
    output += `**Detected Product:** ${this.formatProductName(productContext.detectedProduct)}\n`;
    output += `**Confidence:** ${Math.round(productContext.confidence * 100)}%\n`;
    
    if (productContext.version) {
      output += `**Version:** ${productContext.version}\n`;
    }
    
    if (productContext.projectPath) {
      output += `**Project Path:** ${productContext.projectPath}\n`;
    }
    
    output += `\n`;

    // Confidence assessment
    if (productContext.confidence >= 0.8) {
      output += `✅ **High Confidence** - Product detection is very reliable\n\n`;
    } else if (productContext.confidence >= 0.6) {
      output += `⚠️ **Medium Confidence** - Product detection is reasonably reliable\n\n`;
    } else {
      output += `❌ **Low Confidence** - Product detection may be inaccurate\n\n`;
    }

    if (includeDetails && productContext.detectionMethods) {
      output += `## 🔍 Detection Details\n\n`;
      
      productContext.detectionMethods.forEach((method: any, index: number) => {
        if (method.matches.length > 0) {
          output += `### ${index + 1}. ${method.method}\n`;
          output += `**Confidence:** ${Math.round(method.confidence * 100)}%\n`;
          output += `**Matches Found:**\n`;
          method.matches.slice(0, 5).forEach((match: string) => {
            output += `- ${match}\n`;
          });
          if (method.matches.length > 5) {
            output += `- *...and ${method.matches.length - 5} more matches*\n`;
          }
          output += `\n`;
        }
      });
    }

    if (productContext.configFiles && productContext.configFiles.length > 0) {
      output += `## ⚙️ Configuration Files Found\n\n`;
      productContext.configFiles.forEach((file: string) => {
        output += `- ${file}\n`;
      });
      output += `\n`;
    }

    output += `## 💡 Recommendations\n\n`;
    
    if (productContext.confidence < 0.6) {
      output += `- Consider specifying the product explicitly using \`--context '{"product": "${productContext.detectedProduct}"}'}\`\n`;
      output += `- Ensure your project structure follows standard Optimizely patterns\n`;
      output += `- Check that required dependencies and configuration files are present\n\n`;
    }
    
    output += `- Use product-specific rules by running: \`optidevdoc apply-development-rules --scenario "your scenario"\`\n`;
    output += `- Generate IDE configuration: \`optidevdoc generate-cursor-config --products '["${productContext.detectedProduct}"]\`\n`;

    return output;
  }

  private generateCursorConfiguration(
    rules: any[], 
    args: GenerateCursorConfigArgs,
    productContext?: any
  ): string {
    const projectPath = args.projectPath || '/path/to/your/optimizely-project';
    
    let output = `# 🛠️ Product-Aware Cursor IDE Configuration\n\n`;
    
    if (productContext) {
      output += `**Detected Product:** ${this.formatProductName(productContext.detectedProduct)}\n`;
      output += `**Confidence:** ${Math.round(productContext.confidence * 100)}%\n\n`;
    }

    output += `## Automatic Setup\n\n`;
    output += `Save this configuration to your project's \`.cursor/mcp.json\` file:\n\n`;
    
    output += `\`\`\`json\n`;
    output += `{\n`;
    output += `  "mcpServers": {\n`;
    output += `    "optidevdoc": {\n`;
    output += `      "command": "optidevdoc",\n`;
    output += `      "args": ["mcp"],\n`;
    output += `      "env": {\n`;
    output += `        "DEBUG_MCP": "false"`;
    
    if (args.projectPath) {
      output += `,\n        "OPTIDEVDOC_PROJECT_PATH": "${args.projectPath}"`;
    }
    
    if (productContext) {
      output += `,\n        "OPTIMIZELY_PRODUCT": "${productContext.detectedProduct}"`;
    }
    
    output += `\n      }\n`;
    output += `    }\n`;
    output += `  }\n`;
    output += `}\n`;
    output += `\`\`\`\n\n`;

    output += `## 📋 Development Rules Integration\n\n`;
    output += `The following ${rules.length} development rules are now integrated into your IDE:\n\n`;

    // Group rules by product and category
    const rulesByProduct = this.groupRulesByProduct(rules);
    
    Object.entries(rulesByProduct).forEach(([product, productRules]: [string, any]) => {
      output += `### ${this.formatProductName(product)} (${productRules.length} rules)\n\n`;
      
      const rulesByCategory = this.groupRulesByCategory(productRules);
      Object.entries(rulesByCategory).forEach(([category, categoryRules]: [string, any]) => {
        output += `#### ${this.formatCategoryName(category)} (${categoryRules.length} rules)\n`;
        categoryRules.slice(0, 3).forEach((rule: any) => {
          output += `- **${rule.title}**: ${rule.description}\n`;
        });
        if (categoryRules.length > 3) {
          output += `- *...and ${categoryRules.length - 3} more rules*\n`;
        }
        output += '\n';
      });
    });

    output += `## 🎯 Available Tools\n\n`;
    output += `Your IDE now has access to these product-aware Optimizely development tools:\n\n`;
    
    output += `### 1. \`apply_development_rules\`\n`;
    output += `Get context-aware development guidance with automatic product detection.\n\n`;
    
    output += `### 2. \`detect_product\`\n`;
    output += `Analyze your project to identify which Optimizely product you're using.\n\n`;
    
    output += `### 3. \`generate_cursor_config\`\n`;
    output += `Generate IDE configuration with product-specific rules.\n\n`;
    
    output += `### 4. Enhanced Documentation Tools\n`;
    output += `- \`search_optimizely_docs\` - Product-aware documentation search\n`;
    output += `- \`find_optimizely_pattern\` - Pattern search with product context\n`;
    output += `- \`analyze_optimizely_bug\` - Bug analysis with product-specific solutions\n\n`;

    output += `## 🚀 Quick Start Examples\n\n`;
    output += `After saving the configuration and restarting Cursor IDE:\n\n`;
    
    output += `\`\`\`bash\n`;
    output += `# Detect your project's Optimizely product\n`;
    output += `# (This happens automatically, but you can also run it manually)\n`;
    output += `detect_product --includeDetails true\n\n`;
    
    output += `# Get product-specific development guidance\n`;
    output += `apply_development_rules --scenario "Create custom widget"\n\n`;
    
    output += `# Search documentation for your specific product\n`;
    output += `search_optimizely_docs --query "custom handlers"\n`;
    output += `\`\`\`\n\n`;

    if (productContext) {
      output += `## 🎯 ${this.formatProductName(productContext.detectedProduct)} Specific Features\n\n`;
      
      switch (productContext.detectedProduct) {
        case 'configured-commerce':
          output += `- ✅ Blueprint development patterns\n`;
          output += `- ✅ Handler and pipeline extension rules\n`;
          output += `- ✅ Frontend widget development guidelines\n`;
          output += `- ✅ Backend extension patterns\n`;
          break;
        case 'cms-paas':
        case 'cms-saas':
          output += `- ✅ Content type development patterns\n`;
          output += `- ✅ Block and template guidelines\n`;
          output += `- ✅ Razor view best practices\n`;
          break;
        case 'experimentation':
          output += `- ✅ SDK implementation patterns\n`;
          output += `- ✅ Feature flag best practices\n`;
          output += `- ✅ A/B testing guidelines\n`;
          break;
      }
      output += `\n`;
    }

    output += `## 🎓 Team Benefits\n\n`;
    output += `- **Product Isolation**: Rules specific to your Optimizely product only\n`;
    output += `- **Automatic Detection**: No manual configuration of product context\n`;
    output += `- **Consistent Patterns**: All developers follow the same established guidelines\n`;
    output += `- **Knowledge Transfer**: Senior developer expertise embedded in IDE\n`;
    output += `- **Zero Setup**: Rules automatically available without manual configuration\n\n`;

    output += `---\n\n`;
    output += `**🏆 Status**: Your Cursor IDE is now configured with ${rules.length} product-aware Optimizely development rules!\n\n`;
    output += `*The rules engine will automatically detect your project context and provide relevant guidance.*`;

    return output;
  }

  // Helper methods
  private formatNoRulesMessage(args: ApplyDevelopmentRulesArgs): string {
    return `# 🔍 No Specific Rules Found\n\n**Scenario:** "${args.scenario}"\n\nNo specific development rules were found for this scenario. This might mean:\n\n1. **Product Detection**: The system may not have detected your Optimizely product correctly\n2. **Generic Scenario**: Try being more specific about your development task\n3. **Missing Rules**: Rules for this scenario may not exist yet\n\n## 💡 Try These Instead\n\n- **Frontend**: "Create a custom widget for product display"\n- **Backend**: "Implement custom pricing logic with handlers"\n- **Integration**: "Add custom properties to existing entities"\n\n## 🔧 Troubleshooting\n\n- Run \`detect_product --includeDetails true\` to check product detection\n- Specify product explicitly: \`--context '{"product": "configured-commerce"}'\`\n- Check if rules exist for your specific product\n\nFor more specific guidance, provide additional context about your development scenario.`;
  }

  private formatProductName(product: string): string {
    const productNames: Record<string, string> = {
      'configured-commerce': '🛒 Configured Commerce',
      'cms-paas': '📝 CMS (PaaS)',
      'cms-saas': '☁️ CMS (SaaS)',
      'cmp': '📊 Content Marketing Platform',
      'odp': '🔗 Data Platform',
      'experimentation': '🧪 Experimentation',
      'commerce-connect': '🔌 Commerce Connect',
      'search-navigation': '🔍 Search & Navigation'
    };
    return productNames[product] || product;
  }

  private formatCategoryName(category: string): string {
    const categoryMap: Record<string, string> = {
      'frontend': '🎨 Frontend Development',
      'backend': '⚙️ Backend Development',
      'project-structure': '📁 Project Structure',
      'quality': '✅ Code Quality',
      'general': '📋 General Guidelines'
    };
    return categoryMap[category] || category;
  }

  private formatPriority(priority: string): string {
    const priorityMap: Record<string, string> = {
      'high': '🔴 High',
      'medium': '🟡 Medium',
      'low': '🟢 Low'
    };
    return priorityMap[priority] || priority;
  }

  private groupRulesByProduct(rules: any[]): Record<string, any[]> {
    return rules.reduce((groups, rule) => {
      const product = rule.product;
      if (!groups[product]) {
        groups[product] = [];
      }
      groups[product].push(rule);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private groupRulesByCategory(rules: any[]): Record<string, any[]> {
    return rules.reduce((groups, rule) => {
      const category = rule.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(rule);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private generateContextualAdvice(scenario: string, context?: any, productContext?: any): string {
    let advice = `## 💡 Product-Aware Development Advice\n\n`;
    
    if (productContext) {
      advice += `### 🎯 ${this.formatProductName(productContext.detectedProduct)} Specific Guidance\n\n`;
      
      switch (productContext.detectedProduct) {
        case 'configured-commerce':
          advice += `- **Frontend**: Develop in \`FrontEnd/modules/blueprints/auer-steel\` only\n`;
          advice += `- **Backend**: Place custom code in \`Extensions\` directory\n`;
          advice += `- **Patterns**: Use handler chains with proper Order values\n`;
          advice += `- **Quality**: Follow SSR compatibility for all components\n\n`;
          break;
        case 'cms-paas':
          advice += `- **Content Types**: Inherit from appropriate base classes\n`;
          advice += `- **Templates**: Use Razor syntax with proper model binding\n`;
          advice += `- **Blocks**: Implement \`IContent\` interface properly\n`;
          advice += `- **Performance**: Consider caching for expensive operations\n\n`;
          break;
        case 'experimentation':
          advice += `- **SDK**: Initialize once at application start\n`;
          advice += `- **Feature Flags**: Always provide fallback values\n`;
          advice += `- **Tracking**: Implement proper event tracking\n`;
          advice += `- **Testing**: Use typed interfaces for flag management\n\n`;
          break;
      }
    }
    
    const scenarioLower = scenario.toLowerCase();
    
    if (scenarioLower.includes('widget') || scenarioLower.includes('frontend')) {
      advice += `### 🎨 Frontend Development Tips\n`;
      advice += `- Follow responsive design principles\n`;
      advice += `- Ensure cross-browser compatibility\n`;
      advice += `- Implement proper accessibility features\n`;
      advice += `- Test on multiple device sizes\n\n`;
    }
    
    if (scenarioLower.includes('handler') || scenarioLower.includes('pipeline') || scenarioLower.includes('backend')) {
      advice += `### ⚙️ Backend Development Tips\n`;
      advice += `- Follow dependency injection patterns\n`;
      advice += `- Implement comprehensive error handling\n`;
      advice += `- Create unit tests for custom logic\n`;
      advice += `- Document API changes thoroughly\n\n`;
    }
    
    advice += `### 📚 Next Steps\n`;
    advice += `1. **Review applicable rules** above for your scenario\n`;
    advice += `2. **Check code examples** to understand implementation patterns\n`;
    advice += `3. **Follow product-specific guidelines** based on detected context\n`;
    advice += `4. **Test thoroughly** in your target environment\n`;
    advice += `5. **Ask for clarification** if any rule seems unclear\n\n`;
    
    advice += `*Remember: Be 100% sure before implementing anything. If confused, ask feedback questions.*`;
    
    return advice;
  }
} 