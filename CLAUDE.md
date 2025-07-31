# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OptiDevDoc is an intelligent Optimizely development assistant with product-aware rules, pattern analysis, bug resolution, and comprehensive documentation search. It operates as an MCP (Model Context Protocol) server that can automatically detect which Optimizely product is being used (Commerce, CMS, DXP, Experimentation) and provide product-specific guidance.

## Development Commands

### Building
```bash
npm run build        # Build using Babel transpilation to dist/
npm run build:full   # Full build with all extensions
```

### Development Servers
```bash
npm run dev          # Start simple MCP server (port from config)
npm run dev:enhanced # Start enhanced server with product detection
npm run dev:http     # Start HTTP transport server
```

### Testing
```bash
npm test             # Run Vitest test suite
npm run test:watch   # Watch mode for tests
npm run test:coverage # Generate coverage report
```

### Code Quality
```bash
npm run lint         # ESLint check on src/**/*.ts
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Prettier format src/**/*.ts
```

### Deployment
```bash
npm run deploy       # Deploy patch version
npm run deploy:minor # Deploy minor version
npm run deploy:major # Deploy major version
```

## Architecture Overview

### Core Architecture
- **MCP Server Implementation**: Two server modes - `OptimizelyMCPServer` (simple) and `EnhancedOptimizelyMCPServer` (product-aware)
- **Product Detection Engine**: Automatically detects Optimizely product context from project files
- **Rules Engine**: Product-specific development rules with perfect isolation between products
- **Tool System**: Modular MCP tools for different capabilities

### Key Directories
- `src/server/`: MCP server implementations and HTTP transport
- `src/engine/`: Core engines (product detection, rules, documentation crawling)
- `src/tools/`: MCP tools (development rules, documentation search, bug analysis)
- `src/database/`: SQLite database management for caching
- `src/config/`: Centralized configuration system
- `rules/`: Product-specific development rules (Commerce, CMS, DXP, Experimentation)

### Configuration System
- Environment-based config loading: `.env` → `config/{NODE_ENV}.env` → `config/default.env`
- Server modes controlled by `OPTIDEVDOC_MODE` (simple/enhanced)
- Feature flags: `ENABLE_PRODUCT_DETECTION`, `ENABLE_ENHANCED_RULES`, etc.

### Product Detection
The `ProductDetectionEngine` analyzes project files to determine which Optimizely product is being used:
- File pattern matching (package.json, config files, etc.)
- Directory structure analysis
- Dependency analysis
- Confidence scoring system

### Rules System
- Product-specific rules stored in `rules/{product}/` directories
- Rules are isolated per product to prevent cross-contamination
- Supports both simple and enhanced rule engines
- Rules include development patterns, best practices, and bug fixes

## TypeScript Configuration
- Target: ES2022 with Node module resolution
- Strict mode enabled
- Output to `dist/` directory
- Babel transpilation instead of tsc for better compatibility

## Database
- SQLite database for caching documentation and patterns
- Schema defined in `src/database/schema.ts`
- Managed by `DatabaseManager` class

## Testing
- Vitest for unit testing
- Test files excluded from TypeScript compilation
- Coverage reporting available

## Important Development Notes
- Always run lint before committing changes
- Use the enhanced server mode for product detection features
- Rules are loaded dynamically based on detected product context
- The system supports both CLI and MCP server modes
- HTTP transport available for non-MCP integrations