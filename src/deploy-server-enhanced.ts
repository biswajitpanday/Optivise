import express from 'express';
import cors from 'cors';
import { Logger } from './utils/logger.js';
import { ConfigManager } from './config/config-manager.js';
import { OptimizelyPatternTool } from './tools/optimizely-pattern-tool.js';
import { OptimizelyBugAnalyzer } from './tools/optimizely-bug-analyzer.js';

// Enhanced mock data with comprehensive Optimizely patterns across all products
const enhancedMockDocumentation = [
  {
    id: 'configured-commerce-pricing-handler',
    title: 'Custom Pricing Handler Implementation',
    content: `# Custom Pricing Handler in Optimizely Configured Commerce

## Overview
Implement custom pricing logic using the Handler pattern to override default pricing calculations.

## Handler Pattern Implementation

\`\`\`csharp
public class CustomPriceHandler : IHandler<GetProductPriceParameter, GetProductPriceResult>
{
    public int Order => 100;

    public GetProductPriceResult Execute(GetProductPriceParameter parameter, 
        GetProductPriceResult result, 
        ExecuteHandlerDelegate executeHandler)
    {
        // Your custom pricing logic here
        if (parameter.Product.IsDiscountEligible)
        {
            result.UnitNetPrice *= 0.9m; // 10% discount
        }

        return executeHandler().Invoke(parameter, result);
    }
}
\`\`\`

## Registration
Register your handler in Startup.cs:

\`\`\`csharp
services.AddHandler<GetProductPriceParameter, GetProductPriceResult, CustomPriceHandler>();
\`\`\`

## Best Practices
- Always call executeHandler() to maintain the chain
- Use Order property to control execution sequence
- Keep handlers focused on single responsibility`,
    url: 'https://docs.developers.optimizely.com/configured-commerce/pricing/custom-pricing',
    product: 'configured-commerce',
    category: 'handler',
    version: '13.x',
    lastUpdated: '2024-01-15T10:30:00Z',
    relevanceScore: 1.0,
    codeExamples: [
      {
        language: 'csharp',
        code: `public class CustomPriceHandler : IHandler<GetProductPriceParameter, GetProductPriceResult>
{
    public int Order => 100;

    public GetProductPriceResult Execute(GetProductPriceParameter parameter, 
        GetProductPriceResult result, 
        ExecuteHandlerDelegate executeHandler)
    {
        if (parameter.Product.IsDiscountEligible)
        {
            result.UnitNetPrice *= 0.9m;
        }
        return executeHandler().Invoke(parameter, result);
    }
}`,
        description: 'Custom pricing handler implementation'
      }
    ],
    tags: ['pricing', 'handler', 'commerce', 'discount'],
    breadcrumb: ['Home', 'Configured Commerce', 'Pricing', 'Custom Handlers'],
    rules: [
      'Always call executeHandler() to maintain the handler chain',
      'Use Order property to control execution sequence',
      'Keep handlers focused on single responsibility'
    ],
    guidelines: [
      'Implement comprehensive unit tests for custom handlers',
      'Document the business logic clearly',
      'Consider performance impact of complex calculations'
    ],
    useCases: [
      'Volume-based pricing discounts',
      'Customer-specific pricing rules',
      'Time-based promotional pricing'
    ]
  },
  {
    id: 'cms-content-block-pattern',
    title: 'Content Block Development Pattern',
    content: `# Content Block Development in Optimizely CMS

## Block Pattern Implementation

\`\`\`csharp
[ContentType(DisplayName = "Hero Block", 
    GUID = "12345678-1234-1234-1234-123456789012",
    Description = "A hero banner block with image and call-to-action")]
public class HeroBlock : BlockData
{
    [Display(
        Name = "Heading",
        Description = "Main heading text",
        GroupName = SystemTabNames.Content,
        Order = 10)]
    public virtual string Heading { get; set; }

    [Display(
        Name = "Background Image",
        Description = "Hero background image",
        GroupName = SystemTabNames.Content,
        Order = 20)]
    public virtual ContentReference BackgroundImage { get; set; }

    [Display(
        Name = "Call to Action",
        Description = "CTA button configuration",
        GroupName = SystemTabNames.Content,
        Order = 30)]
    public virtual LinkItem CallToAction { get; set; }
}
\`\`\`

## View Implementation

\`\`\`html
@model HeroBlock

<div class="hero-block" style="background-image: url('@Url.ContentUrl(Model.BackgroundImage)')">
    <div class="hero-content">
        <h1>@Model.Heading</h1>
        @if (Model.CallToAction != null)
        {
            <a href="@Model.CallToAction.Href" class="btn btn-primary">
                @Model.CallToAction.Text
            </a>
        }
    </div>
</div>
\`\`\``,
    url: 'https://docs.developers.optimizely.com/content-management-system/blocks',
    product: 'cms-paas',
    category: 'best-practice',
    version: '12.x',
    lastUpdated: '2024-01-10T14:20:00Z',
    relevanceScore: 0.95,
    codeExamples: [
      {
        language: 'csharp',
        code: `[ContentType(DisplayName = "Hero Block")]
public class HeroBlock : BlockData
{
    [Display(Name = "Heading", Order = 10)]
    public virtual string Heading { get; set; }
    
    [Display(Name = "Background Image", Order = 20)]
    public virtual ContentReference BackgroundImage { get; set; }
}`,
        description: 'Content block definition'
      }
    ],
    tags: ['cms', 'block', 'content', 'template'],
    breadcrumb: ['Home', 'CMS', 'Blocks', 'Development'],
    rules: [
      'Always specify GUID for content types in production',
      'Use Display attributes for proper editor experience',
      'Follow naming conventions for properties'
    ],
    guidelines: [
      'Group related properties using GroupName',
      'Provide meaningful descriptions for editors',
      'Consider responsive design in block templates'
    ],
    useCases: [
      'Hero banners and promotional content',
      'Reusable content components',
      'Dynamic page layouts'
    ]
  },
  {
    id: 'commerce-pipeline-pattern',
    title: 'Commerce Pipeline Implementation',
    content: `# Pipeline Pattern in Optimizely Configured Commerce

## Pipeline Overview
Pipelines provide a way to execute a sequence of handlers in a specific order.

## Pipeline Implementation

\`\`\`csharp
public class CustomCheckoutPipeline : IPipeline<CheckoutParameter, CheckoutResult>
{
    private readonly IHandler<CheckoutParameter, CheckoutResult>[] handlers;

    public CustomCheckoutPipeline(IHandler<CheckoutParameter, CheckoutResult>[] handlers)
    {
        this.handlers = handlers.OrderBy(h => h.Order).ToArray();
    }

    public CheckoutResult Execute(CheckoutParameter parameter)
    {
        var result = new CheckoutResult();
        
        foreach (var handler in handlers)
        {
            result = handler.Execute(parameter, result, 
                () => (p, r) => r); // Continue execution
        }
        
        return result;
    }
}
\`\`\`

## Handler Chain Registration

\`\`\`csharp
// In Startup.cs
services.AddPipeline<CheckoutParameter, CheckoutResult, CustomCheckoutPipeline>();
services.AddHandler<CheckoutParameter, CheckoutResult, ValidateInventoryHandler>();
services.AddHandler<CheckoutParameter, CheckoutResult, CalculatePricingHandler>();
services.AddHandler<CheckoutParameter, CheckoutResult, ProcessPaymentHandler>();
\`\`\``,
    url: 'https://docs.developers.optimizely.com/configured-commerce/pipelines',
    product: 'configured-commerce',
    category: 'pipeline',
    version: '13.x',
    lastUpdated: '2024-01-08T16:45:00Z',
    relevanceScore: 0.9,
    codeExamples: [
      {
        language: 'csharp',
        code: `public class CustomCheckoutPipeline : IPipeline<CheckoutParameter, CheckoutResult>
{
    public CheckoutResult Execute(CheckoutParameter parameter)
    {
        var result = new CheckoutResult();
        foreach (var handler in handlers.OrderBy(h => h.Order))
        {
            result = handler.Execute(parameter, result, continueExecution);
        }
        return result;
    }
}`,
        description: 'Pipeline implementation pattern'
      }
    ],
    tags: ['pipeline', 'commerce', 'checkout', 'workflow'],
    breadcrumb: ['Home', 'Configured Commerce', 'Pipelines', 'Checkout'],
    rules: [
      'Execute handlers in order based on Order property',
      'Always handle exceptions within pipeline execution',
      'Ensure proper dependency injection setup'
    ],
    guidelines: [
      'Keep pipelines focused on specific business processes',
      'Design handlers to be loosely coupled',
      'Use appropriate logging throughout the pipeline'
    ],
    useCases: [
      'Multi-step checkout processes',
      'Order processing workflows',
      'Data validation sequences'
    ]
  },
  {
    id: 'cmp-email-automation',
    title: 'Email Automation Workflows in Content Marketing Platform',
    content: `# Email Automation in Optimizely CMP

## Overview
Create sophisticated email automation workflows to nurture leads and engage customers.

## Workflow Setup

\`\`\`javascript
// CMP Automation API Example
const automation = {
  name: "Welcome Series",
  trigger: {
    type: "list_subscription",
    listId: "welcome_list"
  },
  actions: [
    {
      type: "send_email",
      template: "welcome_email_1",
      delay: 0
    },
    {
      type: "send_email", 
      template: "welcome_email_2",
      delay: 86400 // 24 hours
    }
  ]
};

// Create automation
fetch('/api/automations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(automation)
});
\`\`\`

## Best Practices
- Segment your audience for targeted messaging
- Test email templates before deployment
- Monitor engagement metrics and optimize`,
    url: 'https://docs.developers.optimizely.com/content-marketing-platform/automation',
    product: 'cmp',
    category: 'best-practice',
          version: '2.1.0',
    lastUpdated: '2024-01-20T09:15:00Z',
    relevanceScore: 0.95,
    codeExamples: [
      {
        language: 'javascript',
        code: `const automation = {
  name: "Welcome Series",
  trigger: { type: "list_subscription", listId: "welcome_list" },
  actions: [
    { type: "send_email", template: "welcome_email_1", delay: 0 },
    { type: "send_email", template: "welcome_email_2", delay: 86400 }
  ]
};`,
        description: 'Email automation workflow configuration'
      }
    ],
    tags: ['cmp', 'email', 'automation', 'marketing', 'workflow'],
    breadcrumb: ['Home', 'CMP', 'Automation', 'Email'],
    rules: [
      'Always test automation workflows before activation',
      'Segment audiences for better engagement',
      'Monitor and optimize based on metrics'
    ],
    guidelines: [
      'Use clear and compelling subject lines',
      'Personalize content based on subscriber data',
      'Provide clear unsubscribe options'
    ],
    useCases: [
      'Welcome email series for new subscribers',
      'Abandoned cart recovery campaigns',
      'Customer onboarding sequences'
    ]
  },
  {
    id: 'odp-audience-segmentation',
    title: 'Real-time Audience Segmentation in ODP',
    content: `# Audience Segmentation in Optimizely Data Platform

## Overview
Create dynamic audience segments based on real-time behavioral data and customer attributes.

## Segment Creation

\`\`\`javascript
// ODP Audience API Example
const audienceSegment = {
  name: "High Value Customers",
  description: "Customers with lifetime value > $1000",
  conditions: {
    and: [
      {
        field: "customer_lifetime_value",
        operator: "greater_than",
        value: 1000
      },
      {
        field: "last_purchase_date",
        operator: "within_days",
        value: 90
      }
    ]
  },
  realtime: true
};

// Create segment via API
const response = await fetch('https://api.zaius.com/v3/audiences', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(audienceSegment)
});
\`\`\`

## Event Tracking

\`\`\`javascript
// Track custom events for segmentation
window.zaius = window.zaius || [];
zaius.push(['track', 'product_view', {
  product_id: 'SKU123',
  category: 'electronics',
  price: 299.99
}]);
\`\`\``,
    url: 'https://docs.developers.optimizely.com/data-platform/audiences',
    product: 'odp',
    category: 'api',
    version: '3.0',
    lastUpdated: '2024-01-18T11:30:00Z',
    relevanceScore: 0.9,
    codeExamples: [
      {
        language: 'javascript',
        code: `const audienceSegment = {
  name: "High Value Customers",
  conditions: {
    and: [
      { field: "customer_lifetime_value", operator: "greater_than", value: 1000 },
      { field: "last_purchase_date", operator: "within_days", value: 90 }
    ]
  }
};`,
        description: 'Audience segment configuration'
      }
    ],
    tags: ['odp', 'audience', 'segmentation', 'data', 'analytics'],
    breadcrumb: ['Home', 'ODP', 'Audiences', 'Segmentation'],
    rules: [
      'Define clear criteria for segment membership',
      'Use real-time data for dynamic segments',
      'Test segment logic before deployment'
    ],
    guidelines: [
      'Start with simple segments and add complexity gradually',
      'Monitor segment size and performance regularly',
      'Document segment logic for team collaboration'
    ],
    useCases: [
      'Personalized content delivery',
      'Targeted marketing campaigns',
      'A/B testing with specific user groups'
    ]
  },
  {
    id: 'experimentation-feature-flags',
    title: 'Feature Flag Implementation with Optimizely',
    content: `# Feature Flags in Optimizely Experimentation

## Overview
Implement feature flags to safely deploy and test new features with controlled rollouts.

## SDK Implementation

\`\`\`javascript
// Initialize Optimizely SDK
import { createInstance } from '@optimizely/optimizely-sdk';

const optimizely = createInstance({
  sdkKey: 'YOUR_SDK_KEY'
});

// Check feature flag
const isEnabled = optimizely.isFeatureEnabled('new_checkout_flow', 'user_123');

if (isEnabled) {
  // Show new checkout flow
  renderNewCheckout();
} else {
  // Show existing checkout flow
  renderExistingCheckout();
}

// Get feature variable
const buttonColor = optimizely.getFeatureVariableString(
  'new_checkout_flow',
  'button_color',
  'user_123'
);
\`\`\`

## React Hook Example

\`\`\`jsx
import { useFeatureFlag } from '@optimizely/react-sdk';

function CheckoutButton() {
  const [isEnabled] = useFeatureFlag('new_checkout_flow');
  const buttonColor = isEnabled ? 'blue' : 'green';
  
  return (
    <button 
      style={{ backgroundColor: buttonColor }}
      onClick={handleCheckout}
    >
      {isEnabled ? 'Proceed to New Checkout' : 'Checkout'}
    </button>
  );
}
\`\`\``,
    url: 'https://docs.developers.optimizely.com/experimentation/feature-flags',
    product: 'experimentation',
    category: 'integration',
    version: '4.0',
    lastUpdated: '2024-01-16T14:45:00Z',
    relevanceScore: 0.85,
    codeExamples: [
      {
        language: 'javascript',
        code: `const isEnabled = optimizely.isFeatureEnabled('new_checkout_flow', 'user_123');
if (isEnabled) {
  renderNewCheckout();
} else {
  renderExistingCheckout();
}`,
        description: 'Feature flag implementation'
      }
    ],
    tags: ['experimentation', 'feature flags', 'rollout', 'testing'],
    breadcrumb: ['Home', 'Experimentation', 'Feature Flags', 'Implementation'],
    rules: [
      'Always provide fallback behavior for disabled features',
      'Use meaningful flag names that describe the feature',
      'Implement proper error handling for SDK calls'
    ],
    guidelines: [
      'Start with small rollout percentages and gradually increase',
      'Monitor feature performance and user feedback',
      'Clean up unused feature flags regularly'
    ],
    useCases: [
      'Gradual feature rollouts to minimize risk',
      'A/B testing new functionality',
      'Emergency feature toggles for quick rollbacks'
    ]
  }
];

async function startEnhancedDeployServer(): Promise<void> {
  try {
    console.log('🚀 Starting OptiDevDoc Enhanced Deploy Server...');
    
    const app = express();
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    // Initialize configuration and logger
    const configManager = ConfigManager.getInstance();
    configManager.loadFromEnvironment();
    const config = configManager.getConfig();
    const logger = new Logger(config.logging);

    // Initialize enhanced tools
    const patternTool = new OptimizelyPatternTool(config, logger);
    const bugAnalyzer = new OptimizelyBugAnalyzer(config, logger);

    try {
      await patternTool.initialize();
      await bugAnalyzer.initialize();
      console.log('✅ Enhanced tools initialized successfully');
    } catch (error) {
      console.warn('⚠️  Enhanced tools initialization failed, using fallback mode:', error);
    }

    // Middleware
    app.use(cors({
      origin: ['http://localhost:3000', 'https://cursor.sh', 'vscode-webview://*'],
      credentials: false,
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        server: 'OptiDevDoc Enhanced Deploy Server',
        documentation_count: enhancedMockDocumentation.length,
        features: {
          pattern_search: true,
          bug_analysis: true,
          enhanced_documentation: true
        }
      });
    });

    // API documentation endpoint
    app.get('/api/docs', (_req, res) => {
      res.json({
        title: 'OptiDevDoc Enhanced API',
        version: '2.1.0',
        description: 'Enhanced Optimizely documentation and pattern analysis API with product-aware rules',
        endpoints: {
          '/api/search': {
            method: 'POST',
            description: 'Search Optimizely documentation',
            parameters: {
              query: 'string (required) - Search terms',
              product: 'string (optional) - Filter by product'
            }
          },
          '/api/patterns': {
            method: 'POST',
            description: 'Find Optimizely patterns by scenario',
            parameters: {
              scenario: 'string (required) - Development scenario',
              product: 'string (optional) - Optimizely product',
              category: 'string (optional) - Pattern category',
              includeCode: 'boolean (optional) - Include code examples'
            }
          },
          '/api/analyze-bug': {
            method: 'POST',
            description: 'Analyze bugs and get Optimizely-specific solutions',
            parameters: {
              bugDescription: 'string (required) - Bug description',
              errorMessage: 'string (optional) - Error message',
              product: 'string (optional) - Optimizely product',
              context: 'string (optional) - Additional context'
            }
          }
        },
        examples: {
          search: { query: 'pricing handler' },
          patterns: { scenario: 'custom pricing for bulk orders' },
          bug_analysis: { bugDescription: 'NullReferenceException in pricing calculation' }
        }
      });
    });

    // Enhanced search endpoint (backwards compatible)
    app.post('/api/search', async (req, res) => {
      try {
        const { query, product } = req.body;

        if (!query || typeof query !== 'string') {
          res.status(400).json({
            error: 'Invalid request',
            message: 'Query parameter is required and must be a string',
          });
          return;
        }

        console.log(`🔍 Enhanced search request: "${query}" (product: ${product || 'all'})`);

        // Enhanced search across mock documentation
        const results = enhancedMockDocumentation
          .map(doc => {
            let score = 0;
            
            // Title matching (highest weight)
            if (doc.title.toLowerCase().includes(query.toLowerCase())) {
              score += 10;
            }
            
            // Content matching
            if (doc.content.toLowerCase().includes(query.toLowerCase())) {
              score += 5;
            }
            
            // Tags matching
            doc.tags.forEach(tag => {
              if (tag.toLowerCase().includes(query.toLowerCase())) {
                score += 3;
              }
            });

            // Rules and guidelines matching
            if (doc.rules) {
              doc.rules.forEach(rule => {
                if (rule.toLowerCase().includes(query.toLowerCase())) {
                  score += 2;
                }
              });
            }

            // Category bonus
            if (doc.category && query.toLowerCase().includes(doc.category)) {
              score += 4;
            }

            // Product filtering
            if (product && product !== 'all' && doc.product !== product) {
              score = 0;
            }

            return { ...doc, relevanceScore: score };
          })
          .filter(doc => doc.relevanceScore > 0)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 10);

        res.json({
          success: true,
          query,
          product: product || 'all',
          results,
          total_count: results.length,
          timestamp: new Date().toISOString(),
          server_info: {
            type: 'enhanced_deploy_server',
            search_method: 'enhanced_pattern_search',
            documentation_source: 'enhanced_mock_data',
            features: ['pattern_analysis', 'bug_analysis', 'rule_extraction']
          }
        });

      } catch (error) {
        console.error('Enhanced search error:', error);
        res.status(500).json({
          error: 'Search failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // New pattern search endpoint
    app.post('/api/patterns', async (req, res) => {
      try {
        const result = await patternTool.execute(req.body);
        res.json({
          success: true,
          type: 'pattern_search',
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Pattern search error:', error);
        res.status(500).json({
          error: 'Pattern search failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // New bug analysis endpoint
    app.post('/api/analyze-bug', async (req, res) => {
      try {
        const result = await bugAnalyzer.execute(req.body);
        res.json({
          success: true,
          type: 'bug_analysis',
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Bug analysis error:', error);
        res.status(500).json({
          error: 'Bug analysis failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Root endpoint
    app.get('/', (_req, res) => {
      res.json({
        message: 'OptiDevDoc Enhanced Deploy Server',
        status: 'running',
        version: '2.1.0',
        features: {
          enhanced_search: true,
          pattern_analysis: true,
          bug_analysis: true,
          rule_extraction: true,
          product_aware_rules: true
        },
        endpoints: {
          health: '/health',
          api_docs: '/api/docs',
          search: '/api/search (POST)',
          patterns: '/api/patterns (POST)',
          bug_analysis: '/api/analyze-bug (POST)'
        },
        quick_tests: {
          search: 'POST to /api/search with {"query": "pricing handler"}',
          patterns: 'POST to /api/patterns with {"scenario": "custom pricing logic"}',
          bug_analysis: 'POST to /api/analyze-bug with {"bugDescription": "NullReferenceException in handler"}'
        }
      });
    });

    // 404 handler
    app.use((_req, res) => {
      res.status(404).json({
        error: 'Not Found',
        available_endpoints: [
          'GET /health',
          'GET /api/docs', 
          'POST /api/search',
          'POST /api/patterns',
          'POST /api/analyze-bug'
        ],
      });
    });

    // Start server
    const server = app.listen(port, host, () => {
      console.log(`🚀 OptiDevDoc Enhanced Deploy Server started successfully`);
      console.log(`📍 Server: http://${host}:${port}`);
      console.log(`❤️  Health: http://${host}:${port}/health`);
      console.log(`📚 API Docs: http://${host}:${port}/api/docs`);
      console.log(`🔍 Search: POST http://${host}:${port}/api/search`);
      console.log(`🎯 Patterns: POST http://${host}:${port}/api/patterns`);
      console.log(`🐛 Bug Analysis: POST http://${host}:${port}/api/analyze-bug`);
      console.log(`📊 Enhanced documentation entries: ${enhancedMockDocumentation.length}`);
      console.log(`✨ Features: Pattern Analysis, Bug Analysis, Rule Extraction`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n⚠️  Received ${signal}, shutting down gracefully...`);
      
      try {
        await patternTool.cleanup();
        await bugAnalyzer.cleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
      
      server.close(() => {
        console.log('✅ Enhanced server shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start enhanced deploy server:', error);
    process.exit(1);
  }
}

// Start the enhanced server
startEnhancedDeployServer().catch((error) => {
  console.error('❌ Failed to start enhanced server:', error);
  process.exit(1);
}); 