import { z } from 'zod';
import type { Logger } from '../utils/logger.js';
import type { ServerConfig } from '../types/index.js';
import { RulesEngine } from '../engine/rules-engine.js';
import type { RuleApplication, RulesEngineConfig } from '../types/index.js';

const ApplyDevelopmentRulesArgsSchema = z.object({
  scenario: z.string().min(1).max(500),
  context: z.object({
    filePattern: z.string().optional(),
    directory: z.string().optional(),
    technology: z.array(z.string()).optional(),
    category: z.enum(['frontend', 'backend', 'project-structure', 'quality', 'general']).optional(),
  }).optional(),
  includeExamples: z.boolean().default(true),
  maxRules: z.number().min(1).max(10).default(5),
});

const GenerateCursorConfigArgsSchema = z.object({
  projectPath: z.string().optional(),
  includeAllRules: z.boolean().default(true),
  categories: z.array(z.enum(['frontend', 'backend', 'project-structure', 'quality', 'general'])).optional(),
});

type ApplyDevelopmentRulesArgs = z.infer<typeof ApplyDevelopmentRulesArgsSchema>;
type GenerateCursorConfigArgs = z.infer<typeof GenerateCursorConfigArgsSchema>;

export class DevelopmentRulesTool {
  private logger: Logger;
  private rulesEngine: RulesEngine;
  private config: ServerConfig;

  constructor(config: ServerConfig, logger: Logger) {
    this.logger = logger;
    this.config = config;
    
    const rulesConfig: RulesEngineConfig = {
      enableAutoApplication: true,
      contextSensitivity: 'high',
      ruleCategories: ['frontend', 'backend', 'project-structure', 'quality', 'general'],
      customRulesPath: config.customRulesPath
    };
    
    this.rulesEngine = new RulesEngine(logger, rulesConfig);
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing DevelopmentRulesTool...');
    await this.rulesEngine.initialize();
    this.logger.info('DevelopmentRulesTool initialized successfully');
  }

  async executeApplyRules(args: unknown): Promise<{ content: { text: string } }> {
    try {
      const validatedArgs = ApplyDevelopmentRulesArgsSchema.parse(args);
      this.logger.info('Applying development rules', { 
        scenario: validatedArgs.scenario, 
        context: validatedArgs.context 
      });

      const ruleApplications = await this.rulesEngine.applyRules(
        validatedArgs.scenario,
        validatedArgs.context
      );

      const limitedApplications = ruleApplications.slice(0, validatedArgs.maxRules);

      return {
        content: {
          text: this.formatRuleApplications(limitedApplications, validatedArgs),
        },
      };
    } catch (error) {
      this.logger.error('Error in DevelopmentRulesTool.executeApplyRules', { error, args });
      throw error;
    }
  }

  async executeGenerateCursorConfig(args: unknown): Promise<{ content: { text: string } }> {
    try {
      const validatedArgs = GenerateCursorConfigArgsSchema.parse(args);
      this.logger.info('Generating Cursor IDE configuration', { args: validatedArgs });

      const allRules = this.rulesEngine.getAllRules();
      const filteredRules = validatedArgs.categories 
        ? allRules.filter(rule => validatedArgs.categories!.includes(rule.category))
        : allRules;

      return {
        content: {
          text: this.generateCursorConfiguration(filteredRules, validatedArgs),
        },
      };
    } catch (error) {
      this.logger.error('Error in DevelopmentRulesTool.executeGenerateCursorConfig', { error, args });
      throw error;
    }
  }

  private formatRuleApplications(
    applications: RuleApplication[], 
    args: ApplyDevelopmentRulesArgs
  ): string {
    if (applications.length === 0) {
      return this.formatNoRulesMessage(args);
    }

    let output = `# 🎯 Development Rules for "${args.scenario}"\n\n`;
    output += `**Context:** ${applications[0]?.context || 'General development'}\n`;
    output += `Found ${applications.length} applicable rule(s):\n\n`;

    applications.forEach((app, index) => {
      const rule = app.rule;
      const relevancePercentage = Math.round(app.relevanceScore * 100);
      
      output += `## ${index + 1}. ${rule.title}\n\n`;
      output += `**Category:** ${this.formatCategoryName(rule.category)} | `;
      output += `**Priority:** ${this.formatPriority(rule.priority)} | `;
      output += `**Relevance:** ${relevancePercentage}%\n\n`;

      // Description
      if (rule.description) {
        output += `### Description\n${rule.description}\n\n`;
      }

      // Key suggestions from rule application
      if (app.suggestions.length > 0) {
        output += `### Key Guidelines\n`;
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
        const goodExample = rule.examples.find(ex => ex.type === 'good');
        const badExample = rule.examples.find(ex => ex.type === 'bad');
        
        if (goodExample) {
          output += `### ✅ Good Example\n`;
          output += `\`\`\`${goodExample.language}\n${goodExample.code.substring(0, 800)}\n\`\`\`\n\n`;
        }
        
        if (badExample) {
          output += `### ❌ Avoid This\n`;
          output += `\`\`\`${badExample.language}\n${badExample.code.substring(0, 400)}\n\`\`\`\n\n`;
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

    output += this.generateContextualAdvice(args.scenario, args.context);
    
    return output;
  }

  private formatNoRulesMessage(args: ApplyDevelopmentRulesArgs): string {
    return `# 🔍 No Specific Rules Found

**Scenario:** "${args.scenario}"
**Context:** ${args.context ? this.buildContextDescription(args.context) : 'General development'}

No specific development rules were found for this scenario. This might mean:

1. **Generic Scenario**: The scenario might be too general. Try being more specific about:
   - What you're trying to build or modify
   - Which part of the system (frontend widgets, backend handlers, etc.)
   - What technology you're using

2. **New Pattern**: This might be a new development pattern not covered by existing rules.

## 💡 General Recommendations

- **Frontend Development**: Follow blueprint development patterns in \`FrontEnd/modules/blueprints/auer-steel\`
- **Backend Development**: Use extension patterns in \`Extensions\` directory with proper handler chains
- **Quality**: Always be 100% sure before implementing anything

## 🔧 Try These Instead

- **Frontend**: "Create a custom widget for product display"
- **Backend**: "Implement custom pricing logic with handlers"
- **Integration**: "Add custom properties to existing entities"

For more specific guidance, provide additional context about your development scenario.
`;
  }

  private generateCursorConfiguration(
    rules: any[], 
    args: GenerateCursorConfigArgs
  ): string {
    const projectPath = args.projectPath || '/path/to/your/optimizely-project';
    
    let output = `# 🛠️ Cursor IDE Configuration for Optimizely Configured Commerce

## Automatic Setup

Save this configuration to your project's \`.cursor/mcp.json\` file:

\`\`\`json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "optidevdoc",
      "args": ["mcp"],
      "env": {
        "DEBUG_MCP": "false"
      }
    }
  }
}
\`\`\`

## Development Rules Integration

The following ${rules.length} development rules are now integrated into your IDE:

### 📋 Rule Categories

`;

    // Group rules by category
    const rulesByCategory = this.groupRulesByCategory(rules);
    
    Object.entries(rulesByCategory).forEach(([category, categoryRules]) => {
      output += `#### ${this.formatCategoryName(category)} (${categoryRules.length} rules)\n`;
      categoryRules.slice(0, 3).forEach(rule => {
        output += `- **${rule.title}**: ${rule.description}\n`;
      });
      if (categoryRules.length > 3) {
        output += `- *...and ${categoryRules.length - 3} more rules*\n`;
      }
      output += '\n';
    });

    output += `## 🎯 Available Tools

Your IDE now has access to these Optimizely development tools:

### 1. \`apply_development_rules\`
Get context-aware development guidance based on your scenario.

**Example usage:**
\`\`\`
Scenario: "Create a custom product widget"
Context: Frontend development in blueprint folder
\`\`\`

### 2. \`search_optimizely_docs\`
Enhanced documentation search with pattern matching.

### 3. \`find_optimizely_pattern\`
Find coding patterns for specific development scenarios.

### 4. \`analyze_optimizely_bug\`
Get intelligent bug analysis and Optimizely-specific solutions.

## 🚀 Quick Start

1. **Save the configuration** above to \`.cursor/mcp.json\`
2. **Restart Cursor IDE** to load the MCP tools
3. **Start coding** - rules will automatically apply based on your context
4. **Ask questions** like:
   - "How do I create a custom widget?"
   - "What's the proper way to extend a handler?"
   - "Show me the blueprint development rules"

## 📁 Project Structure Recognition

The rules engine automatically detects your development context based on:

- **File patterns**: \`*.tsx\`, \`*Handler.cs\`, \`*Pipeline.cs\`
- **Directory context**: \`FrontEnd/blueprints/\`, \`Extensions/\`
- **Technology stack**: React, Redux, .NET, TypeScript

## ⚙️ Customization

To customize rule application:

\`\`\`typescript
// In your development queries, specify context:
{
  "scenario": "Add custom validation",
  "context": {
    "category": "backend",
    "technology": ["c#", ".net"],
    "directory": "Extensions/Handlers"
  }
}
\`\`\`

## 🎓 Team Benefits

- **Consistent Patterns**: All developers follow the same established patterns
- **Knowledge Transfer**: Junior developers learn from senior developer rules
- **Zero Setup**: Rules automatically available without manual configuration
- **Portable**: Rules travel with the project, not tied to individual IDE setups

---

**🏆 Status**: Your Cursor IDE is now configured with ${rules.length} Optimizely Configured Commerce development rules. Start coding with confidence!

*Need help? The rules engine provides context-aware guidance automatically as you work.*
`;

    return output;
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

  private buildContextDescription(context: any): string {
    const parts: string[] = [];
    if (context.category) parts.push(`${context.category} development`);
    if (context.technology) parts.push(`using ${context.technology.join(', ')}`);
    if (context.directory) parts.push(`in ${context.directory}`);
    if (context.filePattern) parts.push(`for ${context.filePattern} files`);
    
    return parts.join(' ') || 'General development';
  }

  private generateContextualAdvice(scenario: string, context?: any): string {
    let advice = `## 💡 Additional Context-Aware Advice\n\n`;
    
    const scenarioLower = scenario.toLowerCase();
    
    if (scenarioLower.includes('widget') || scenarioLower.includes('frontend')) {
      advice += `### 🎨 Frontend Development Tips
- Develop in \`FrontEnd/modules/blueprints/auer-steel\` only
- Use Mobius design language for UI components
- Ensure SSR compatibility for all components
- Follow React and Redux best practices
- Test across different devices and browsers\n\n`;
    }
    
    if (scenarioLower.includes('handler') || scenarioLower.includes('pipeline') || scenarioLower.includes('backend')) {
      advice += `### ⚙️ Backend Development Tips
- Place custom code in \`Extensions\` directory
- Use proper Order values for handler chains
- Follow dependency injection patterns
- Create unit tests for custom implementations
- Consider performance implications\n\n`;
    }
    
    if (scenarioLower.includes('integration') || scenarioLower.includes('api')) {
      advice += `### 🔗 Integration Development Tips
- Use existing helpers and utilities when available
- Follow handler/pipe chain patterns
- Document all custom extensions
- Implement proper error handling
- Consider caching for expensive operations\n\n`;
    }
    
    advice += `### 📚 Next Steps
1. **Review specific rules** above for your scenario
2. **Check code examples** to understand implementation patterns
3. **Follow references** for detailed documentation
4. **Apply suggestions** in your development context
5. **Ask follow-up questions** for clarification if needed

*Remember: Be 100% sure before implementing anything. If confused, ask feedback questions.*`;
    
    return advice;
  }
} 