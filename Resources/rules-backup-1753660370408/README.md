# Product-Aware Rules Configuration

## 🎯 **Migration Complete!**

Your rules have been successfully migrated to the new product-aware structure.

## 📁 **New Structure**

```
rules/
├── configured-commerce/      # Commerce-specific rules
│   ├── frontend/
│   │   └── blueprint-development.mdc
│   ├── backend/
│   │   ├── extension-development.mdc
│   │   └── handler-chain-pattern.mdc
│   └── general/
│       └── project-structure.mdc
├── cms-paas/                # CMS development rules
│   └── content-types/
│       └── block-development.mdc
├── experimentation/         # A/B testing and feature flags
│   └── sdk/
│       └── implementation-patterns.mdc
└── shared/                  # Cross-product quality standards
    └── perfections.mdc
```

## ⚙️ **Configuration**

### Environment Variables
Set these in your shell or IDE:

```bash
# Windows (PowerShell)
$env:OPTIDEVDOC_RULES_PATH = "./rules"
$env:OPTIDEVDOC_MULTI_PRODUCT = "true"

# Linux/Mac (Bash)
export OPTIDEVDOC_RULES_PATH="./rules"
export OPTIDEVDOC_MULTI_PRODUCT="true"
```

### For Specific Product Testing
```bash
# Test with Commerce project
$env:OPTIMIZELY_PRODUCT = "configured-commerce"

# Test with CMS project
$env:OPTIMIZELY_PRODUCT = "cms-paas" 

# Test with Experimentation project
$env:OPTIMIZELY_PRODUCT = "experimentation"
```

## 🧪 **Testing the Migration**

### Test Product Detection
```bash
# Navigate to your project directory and run:
optidevdoc detect
```

### Test Rule Application
```bash
# Test Commerce rules
optidevdoc apply-development-rules --scenario "Create custom widget"

# Test CMS rules  
optidevdoc apply-development-rules --scenario "Create content block"

# Test Experimentation rules
optidevdoc apply-development-rules --scenario "Implement feature flag"
```

## 🎉 **Benefits of the New Structure**

1. **✅ Product Isolation**: Commerce rules won't interfere with CMS development
2. **✅ Automatic Detection**: OptiDevDoc detects your project type automatically  
3. **✅ Scalable**: Easy to add new products (DXP, ODP, etc.)
4. **✅ Flexible**: Support for local, remote, and API-based rule sources
5. **✅ Team Ready**: Share rules across team without manual configuration

## 🔧 **Adding New Rules**

### For Configured Commerce
Add files to:
- `rules/configured-commerce/frontend/` for React/Blueprint rules
- `rules/configured-commerce/backend/` for C# handler/pipeline rules
- `rules/configured-commerce/general/` for project structure rules

### For CMS
Add files to:
- `rules/cms-paas/content-types/` for block development
- `rules/cms-paas/templates/` for Razor template patterns

### For All Products
Add files to:
- `rules/shared/` for quality standards and common patterns

## 📝 **Rule File Format**

Each rule file should have frontmatter like this:

```markdown
---
description: Brief description of when this rule applies
product: configured-commerce  # or cms-paas, experimentation, etc.
productVersion: "latest"
category: frontend            # or backend, general, quality
priority: high               # or medium, low
applicableProducts: ["configured-commerce"]
globs: ["*.tsx", "*.cs", "Extensions/**/*"]
alwaysApply: false
---
# Your Rule Content Here
```

## 🎯 **Next Steps**

1. Test the product detection with your actual projects
2. Add more rules specific to your team's needs
3. Configure your IDE to use the new rules path
4. Share the rules directory with your team

**Migration successful!** 🚀 