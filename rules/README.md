# Optivise Development Rules

Your rules have been successfully migrated to the new product-aware structure.

## Directory Structure

```
rules/
├── configured-commerce/   # Optimizely Configured Commerce rules
│   ├── frontend/         # React, Redux, TypeScript patterns
│   ├── backend/         # .NET, handlers, extensions
│   └── general/         # Project structure, best practices
├── cms-paas/            # Optimizely CMS (PaaS) rules
│   ├── content-types/   # Blocks, pages, media
│   ├── templates/       # Templates, layouts
│   └── general/         # CMS best practices
├── cms-saas/            # Optimizely CMS (SaaS) rules
│   ├── content-types/   # Cloud-specific content types
│   ├── templates/       # Cloud templates
│   └── general/         # Cloud best practices
├── experimentation/     # Optimizely Experimentation rules
│   ├── sdk/            # SDK implementation patterns
│   ├── integrations/   # Integration patterns
│   └── general/        # Testing best practices
├── dxp/                # Optimizely DXP rules
│   ├── patterns/       # DXP-specific patterns
│   ├── integrations/   # Integration patterns
│   └── general/        # Platform best practices
└── shared/             # Common rules for all products
```

## Rule Format

Each rule file (`.mdc`) includes frontmatter with:

- `product`: Primary Optimizely product
- `version`: Rule version
- `category`: Development category
- `applicableProducts`: List of products where rule applies
- `globs`: File patterns for rule application

## Usage

Set the rules path in your environment:

```bash
export OPTIVISE_RULES_PATH="C:\D\RND\MCPs\Optivise\rules"
```

Test with:

```bash
optivise detect
```
