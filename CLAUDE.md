# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Optivise** is an intelligent MCP (Model Context Protocol) tool that serves as a context-aware intermediary between Optimizely developers and LLMs. It analyzes developer prompts for Optimizely relevance and provides curated, contextual information to enhance AI-assisted development. The tool automatically detects Optimizely product contexts and delivers precise, up-to-date guidance without overwhelming the AI with irrelevant data.

**Current Status**: v4.0.0 Architectural Rewrite (from legacy v2.x multi-tool approach)

## Development Commands

### Building (Modern TypeScript)
```bash
npm run build        # Build using native TypeScript compiler (tsc)
npm run build:watch  # Watch mode for development
npm run clean        # Clean dist/ directory
```

### Development & Testing
```bash
npm run dev          # Start MCP server in development mode
npm run test         # Run Vitest test suite  
npm run test:watch   # Watch mode for tests
npm run test:coverage # Generate coverage report
```

### Code Quality
```bash
npm run lint         # ESLint check on src/**/*.ts
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Prettier format src/**/*.ts
npm run typecheck    # TypeScript type checking
```

### Deployment
```bash
npm run deploy       # Deploy to NPM registry
npm run deploy:render # Deploy to Render.com (optional)
```

## New Simplified Architecture (v3.0.0)

### Core Components
- **Single MCP Tool**: `optidev_context_analyzer` - unified tool for all functionality
- **Context Analysis Engine**: Analyzes prompts for Optimizely relevance (0-1 scoring)
- **Product Detection Service**: Intelligent detection of 10+ Optimizely products
- **Rule Intelligence System**: Reads and enhances IDE rules (.cursorrules, VS Code settings)
- **Documentation Service**: Live fetching from Optimizely sources with caching
- **Knowledge Base**: Local learning system that improves over time

### Key Directories (New Structure)
- `src/core/`: Core MCP server and context analysis engine
- `src/services/`: Product detection, documentation, rule intelligence services  
- `src/analyzers/`: Prompt analysis, relevance scoring, context curation
- `src/knowledge/`: Knowledge base management and learning systems
- `src/types/`: TypeScript type definitions and interfaces
- `src/utils/`: Shared utilities and helpers

### Supported Optimizely Products
- **Commerce**: Configured Commerce, Commerce Connect
- **Content**: CMS (PaaS/SaaS), CMP (Content Marketing Platform)
- **Experience**: DXP (Digital Experience Platform)
- **Experimentation**: Web Experimentation, Feature Experimentation
- **Platform**: Data Platform, Connect Platform, Recommendations

### Product Detection Logic
```typescript
interface ProductDetectionResult {
  products: OptimizelyProduct[];
  confidence: number;
  context: 'ide' | 'prompt';          // IDE file analysis or prompt-based
  evidence: DetectionEvidence[];       // What triggered the detection
  suggestedActions: string[];          // Recommended next steps
}
```

### Context Analysis Flow
1. **Prompt Analysis**: Check relevance to Optimizely (0-1 score)
2. **Product Detection**: Identify relevant Optimizely products
3. **Context Curation**: Gather relevant information from multiple sources
4. **Response Generation**: Structure actionable context for LLM
5. **Learning**: Store successful patterns for future improvement

## TypeScript Configuration (Modern)
- **Compiler**: Native TypeScript (tsc) - No Babel complexity
- **Target**: ES2022 with Node.js module resolution
- **Strict**: Full strict mode enabled
- **Output**: `dist/` directory with source maps
- **Modules**: ES modules with proper Node.js compatibility

## Development Workflow

### Code Organization Principles
- **Single Responsibility**: Each service has one clear purpose
- **Dependency Injection**: Services are modular and testable
- **Type Safety**: Comprehensive TypeScript coverage
- **Error Handling**: Graceful degradation and recovery

### Testing Strategy
- **Unit Tests**: Individual service and analyzer testing
- **Integration Tests**: MCP protocol and IDE integration testing
- **Performance Tests**: Response time and memory usage benchmarks
- **E2E Tests**: Full workflow testing with real IDE integration

### Key Development Patterns
- **Context-First Design**: Everything starts with understanding user context
- **Relevance Filtering**: Only respond to Optimizely-related queries
- **Local-First**: Privacy-focused, local processing and storage
- **Progressive Enhancement**: Core features work offline, enhanced features require network

## Important Implementation Notes

### Critical Requirements
- **Relevance Threshold**: Only respond to queries with >0.7 Optimizely relevance
- **Response Time**: <300ms for cached content, <2s for live documentation fetch
- **Memory Efficiency**: <512MB total memory usage including knowledge base
- **Privacy First**: No source code transmission, local-only learning

### IDE Integration
- **Primary**: Cursor IDE via MCP protocol
- **Secondary**: VS Code and other MCP-compatible editors
- **Rule Reading**: Parse `.cursorrules`, `.cursor-rules`, workspace settings
- **Non-Intrusive**: Seamless integration without disrupting workflow

### Documentation Sources
- **Official**: Optimizely documentation sites and learning center
- **Caching**: Intelligent TTL-based caching for offline access
- **Updates**: Automatic detection of new documentation and product updates
- **Fallback**: Graceful degradation to cached content when offline

### Learning & Knowledge Evolution
- **User Feedback**: Collect helpful/not helpful ratings
- **Pattern Recognition**: Learn from successful interaction patterns
- **Rule Enhancement**: Suggest improvements to existing IDE rules
- **Privacy Controls**: All learning is local and opt-in

### Legacy Migration Strategy
- **Parallel Development**: New architecture developed alongside legacy system
- **Incremental Migration**: Features migrated one at a time with user feedback
- **Backward Compatibility**: Legacy functionality maintained during transition
- **Data Migration**: User knowledge bases and settings preserved

## Getting Started for Development

1. **Environment Setup**: Node.js >=18.0.0, TypeScript toolchain
2. **Install Dependencies**: `npm install`
3. **Run Tests**: `npm run test` (ensure >80% coverage)
4. **Start Development**: `npm run dev` 
5. **Type Check**: `npm run typecheck` (must pass before commits)
6. **Lint & Format**: `npm run lint:fix && npm run format`

## Debugging & Troubleshooting

### Common Issues
- **MCP Connection**: Check IDE MCP configuration and protocol version
- **Product Detection**: Verify project structure and dependency analysis
- **Performance**: Monitor response times and memory usage
- **Documentation Access**: Check network connectivity and cache status

### Development Tools
- **Logging**: Structured logging with configurable levels
- **Monitoring**: Performance metrics and health checks
- **Debugging**: Source maps and breakpoint support
- **Testing**: Comprehensive test suite with coverage reporting

## Conversation Rules

### Required "What's Next" Section
- **At the end of every conversation response**, provide a "What's Next" section
- Include immediate next steps for the current development phase
- Suggest logical progression for feature development
- Highlight any blockers or dependencies that need attention
- Format as a clear, actionable list with priorities

### Documentation Update Rule
- **Always update README.md and docs/ directory** after making significant changes
- Keep documentation in sync with code changes and new features
- Update version information, installation instructions, and usage examples
- Ensure all new commands and features are properly documented
- Update troubleshooting sections with new solutions found