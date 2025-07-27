# OptiDevDoc Product-Aware Migration Guide

## 🎯 Overview

This guide helps you migrate from the current flat rule structure to the new product-aware architecture that supports multiple Optimizely products with proper isolation.

## 📊 Current vs. New Architecture

### **Current Structure** ❌
```
Resources/rules/
├── blueprint-development.mdc    (hardcoded to 'configured-commerce')
├── extension-development.mdc    (hardcoded to 'configured-commerce') 
├── handler-chain-pattern.mdc    (hardcoded to 'configured-commerce')
├── project-structure.mdc        (hardcoded to 'configured-commerce')
└── perfections.mdc              (hardcoded to 'configured-commerce')
```

**Problems:**
- All rules treated as Commerce rules
- No product isolation
- CMS/DXP rules would interfere with Commerce development
- Fixed directory structure

### **New Architecture** ✅
```
rules/
├── configured-commerce/
│   ├── frontend/
│   │   ├── blueprint-development.mdc
│   │   └── widget-patterns.mdc
│   ├── backend/
│   │   ├── extension-development.mdc
│   │   └── handler-chain-pattern.mdc
│   └── general/
│       ├── project-structure.mdc
│       └── perfections.mdc
├── cms-paas/
│   ├── content-types/
│   │   └── block-development.mdc
│   └── templates/
│       └── razor-patterns.mdc
├── cms-saas/
│   └── components/
│       └── react-components.mdc
├── dxp/
│   └── personalization/
│       └── visitor-groups.mdc
├── experimentation/
│   └── sdk/
│       └── implementation-patterns.mdc
└── shared/
    ├── common-patterns.mdc
    └── quality-standards.mdc
```

**Benefits:**
- Product-specific rule isolation
- Automatic product detection
- Scalable for future products
- Flexible rule sources (local/remote/API)

## 🚀 Migration Steps

### **Step 1: Backup Current Rules**
```bash
cp -r Resources/rules Resources/rules-backup
```

### **Step 2: Create New Directory Structure**
```bash
# Create product directories
mkdir -p rules/configured-commerce/{frontend,backend,general}
mkdir -p rules/cms-paas/{content-types,templates}
mkdir -p rules/cms-saas/components
mkdir -p rules/dxp/personalization
mkdir -p rules/experimentation/sdk
mkdir -p rules/shared
```

### **Step 3: Move & Categorize Existing Rules**
```bash
# Move Commerce rules to new structure
mv Resources/rules/blueprint-development.mdc rules/configured-commerce/frontend/
mv Resources/rules/extension-development.mdc rules/configured-commerce/backend/
mv Resources/rules/handler-chain-pattern.mdc rules/configured-commerce/backend/
mv Resources/rules/project-structure.mdc rules/configured-commerce/general/
mv Resources/rules/perfections.mdc rules/shared/
```

### **Step 4: Add Product Frontmatter to Rules**

Update each rule file to include product metadata:

**Example: `rules/configured-commerce/frontend/blueprint-development.mdc`**
```markdown
---
description: when there is a front-end changes required or understanding of front-end changes is needed.
product: configured-commerce
productVersion: "latest"
category: frontend
priority: high
applicableProducts: ["configured-commerce"]
globs: ["*.tsx", "*.jsx", "FrontEnd/modules/blueprints/**/*"]
---
# Blueprint Development Guidelines
...
```

**Example: `rules/shared/perfections.mdc`**
```markdown
---
description: Quality standards for all Optimizely development
product: configured-commerce
category: quality
priority: high
applicableProducts: ["configured-commerce", "cms-paas", "cms-saas", "dxp", "experimentation"]
---
Be 100% sure before implementing anything. If you have any confusion, please ask feedback questions.
```

### **Step 5: Configure OptiDevDoc**

Update your OptiDevDoc configuration to use the new structure:

**Option A: Environment Variables**
```bash
export OPTIDEVDOC_RULES_PATH="/path/to/your/rules"
export OPTIDEVDOC_MULTI_PRODUCT="true"
```

**Option B: Custom Configuration**
```typescript
// In your project
import { ProductAwareConfig } from 'optidevdoc/config';

const config = ProductAwareConfig.getMultiProductConfig('/path/to/your/rules');
```

### **Step 6: Test Product Detection**

Test the product detection with sample projects:

```bash
# Test with Commerce project
cd /path/to/commerce-project
optidevdoc apply-development-rules --scenario "Create custom widget"

# Test with CMS project  
cd /path/to/cms-project
optidevdoc apply-development-rules --scenario "Create content block"
```

## 🔧 Configuration Options

### **Basic Single-Product Setup**
```typescript
// For single product (e.g., only Commerce)
const config = ProductAwareConfig.getExternalRulesConfig('/path/to/rules/configured-commerce');
```

### **Multi-Product Setup**
```typescript
// For multiple products
const config = ProductAwareConfig.getMultiProductConfig('/path/to/rules');
```

### **Hybrid Setup (Local + Remote)**
```typescript
// Local rules + remote repository + documentation API
const config = ProductAwareConfig.getHybridRulesConfig(
  '/path/to/local/rules',
  'https://github.com/your-org/optimizely-rules.git',
  'https://docs-api.optimizely.com/rules'
);
```

## 📝 Creating Rules for New Products

### **CMS PaaS Rules Example**
Create `rules/cms-paas/content-types/block-development.mdc`:

```markdown
---
description: Guidelines for developing custom blocks in Optimizely CMS
product: cms-paas
productVersion: "12.0"
category: backend
priority: high
globs: ["*.cs", "*/Blocks/*", "*/Models/*"]
---
# Custom Block Development Guidelines

## Block Structure
- Inherit from `BlockData` for content blocks
- Use `[ContentType]` attribute for registration
- Follow naming convention: `*Block.cs`

## Best Practices
- **Important**: Always implement `IContent` interface
- Use `[Display]` attributes for editor experience
- Consider mobile-first design for rendered output

## Code Example
```csharp
[ContentType(DisplayName = "Hero Block", GUID = "12345")]
public class HeroBlock : BlockData
{
    [Display(Name = "Heading")]
    public virtual string Heading { get; set; }
    
    [Display(Name = "Description")]
    public virtual XhtmlString Description { get; set; }
}
```
```

### **Experimentation Rules Example**
Create `rules/experimentation/sdk/implementation-patterns.mdc`:

```markdown
---
description: Best practices for implementing Optimizely Experimentation SDK
product: experimentation
category: frontend
priority: high
globs: ["*.js", "*.ts", "*.jsx", "*.tsx"]
---
# Experimentation SDK Implementation

## SDK Initialization
- Initialize once at application start
- Use environment-specific datafiles
- Implement proper error handling

## Feature Flag Patterns
- **Important**: Always provide fallback values
- Use typed feature flag interfaces
- Implement tracking for decision events

## Code Example
```typescript
import { createInstance } from '@optimizely/optimizely-sdk';

const optimizely = createInstance({
  datafile: process.env.OPTIMIZELY_DATAFILE,
  errorHandler: {
    handleError: (error) => console.error('Optimizely Error:', error)
  }
});

// Feature flag usage
const isNewFeatureEnabled = optimizely.isFeatureEnabled('new_feature', userId);
```
```

## 🎯 Product Detection Configuration

The system automatically detects which Optimizely product you're working with based on:

### **Configured Commerce Detection**
- **Files**: `*Handler.cs`, `*Pipeline.cs`, `*.tsx` in blueprints
- **Directories**: `Extensions/`, `FrontEnd/modules/blueprints/`
- **Dependencies**: `insite*`, `InsiteCommerce*`
- **Config**: `systemsettings.config`, `insite.config`

### **CMS Detection**
- **Files**: `*.ascx`, `*Controller.cs`, `*.cshtml`
- **Directories**: `modules/`, `App_Data/`
- **Dependencies**: `episerver*`, `optimizely*cms*`
- **Config**: `episerver.config`, `web.config`

### **Experimentation Detection**
- **Dependencies**: `@optimizely/optimizely-sdk`, `@optimizely/react-sdk`
- **Files**: Optimizely SDK configuration files
- **Config**: `optimizely.config.json`

## ⚡ Quick Start Commands

After migration, use these commands:

```bash
# Apply product-specific rules
optidevdoc apply-development-rules \
  --scenario "Create custom pricing handler" \
  --context '{"category": "backend", "technology": ["c#", ".net"]}'

# Generate IDE configuration with all rules
optidevdoc generate-cursor-config \
  --includeAllRules true \
  --categories '["frontend", "backend"]'

# Search with product context
optidevdoc search-optimizely-docs \
  --query "custom widget development" \
  --product "configured-commerce"
```

## 🔍 Validation & Testing

### **Validate Configuration**
```typescript
import { ProductAwareConfig } from 'optidevdoc/config';

const config = ProductAwareConfig.createConfigFromEnvironment();
const validation = ProductAwareConfig.validateConfig(config);

if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}
```

### **Test Product Detection**
```typescript
import { ProductDetectionEngine } from 'optidevdoc/engine';

const detector = new ProductDetectionEngine(logger, config.productDetection);
const context = await detector.detectProduct('/path/to/project');

console.log('Detected product:', context.detectedProduct);
console.log('Confidence:', context.confidence);
```

## 🚨 Troubleshooting

### **Issue: Rules Not Loading**
```bash
# Check if rule files are in correct locations
ls -la rules/configured-commerce/frontend/
ls -la rules/cms-paas/content-types/

# Verify file permissions
chmod -R 755 rules/
```

### **Issue: Wrong Product Detected**
```bash
# Override product detection
export OPTIMIZELY_PRODUCT="configured-commerce"

# Or specify in context
optidevdoc apply-development-rules \
  --scenario "Create widget" \
  --context '{"product": "configured-commerce"}'
```

### **Issue: Low Detection Confidence**
```typescript
// Lower the confidence threshold
const config = ProductAwareConfig.getDefaultConfig();
config.productDetection.confidence.threshold = 0.4; // Lower from 0.6
```

## 📈 Benefits After Migration

1. **Product Isolation**: CMS rules won't interfere with Commerce development
2. **Scalability**: Easy to add new products (DXP, Experimentation, etc.)
3. **Team Efficiency**: Developers get relevant rules for their specific product
4. **Flexibility**: Support for external rule sources and remote repositories
5. **Intelligent Context**: Automatic product detection based on project structure

## 🔄 Future Enhancements

After migration, you can:

1. **Add Remote Rules**: Configure remote repositories for shared team rules
2. **Auto-Generate Rules**: Extract rules from documentation APIs
3. **Custom Products**: Add support for custom Optimizely implementations
4. **Version-Specific Rules**: Rules for specific product versions (v12, v13, etc.)
5. **Team Collaboration**: Share rules across team via remote sources

---

**🏆 Migration Complete**: Your OptiDevDoc is now product-aware and ready for multi-product Optimizely development! 