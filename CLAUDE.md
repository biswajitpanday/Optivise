# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Optivise** is an intelligent MCP (Model Context Protocol) tool that serves as a context-aware intermediary between Optimizely developers and LLMs. It analyzes developer prompts for Optimizely relevance and provides curated, contextual information to enhance AI-assisted development. The tool automatically detects Optimizely product contexts and delivers precise, up-to-date guidance without overwhelming the AI with irrelevant data.

**Current Status**: Ultimate Development Assistant (AI-powered with automatic setup)

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
npm run dev:ai       # Start with AI features enabled (requires API keys)
npm run dev:basic    # Start in basic mode (no AI dependencies)
npm run test         # Run Vitest test suite  
npm run test:watch   # Watch mode for tests
npm run test:coverage # Generate coverage report
npm run test:ai      # Test AI integration features
npm run test:e2e     # End-to-end testing with IDE integration
```

### AI & Documentation
```bash
npm run sync:docs    # Manual documentation sync from Optimizely.com
npm run setup:vector # Initialize ChromaDB vector database
npm run test:keys    # Test API key detection and validation
npm run clear:cache  # Clear documentation and vector caches
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

## Advanced Architecture

### Core Components
- **Multi-Tool MCP Suite**: Five specialized tools for comprehensive development assistance
- **AI-Powered Context Engine**: Vector-based semantic search with OpenAI embeddings
- **Automatic API Key Integration**: Zero-config setup using existing IDE AI keys
- **Real-Time Development Assistant**: Live coding support with error prevention
- **Intelligent Documentation Sync**: Daily Optimizely.com crawling with vector storage
- **Local Learning System**: Privacy-first knowledge base that improves over time

### Enhanced MCP Tools
- **`optidev_context_analyzer`**: Core context enhancement and product detection
- **`optidev_implementation_guide`**: Jira ticket analysis and implementation planning
- **`optidev_debug_helper`**: Bug fixing assistance and error resolution
- **`optidev_code_analyzer`**: Real-time code analysis and optimization
- **`optidev_project_helper`**: Project setup, migration, and best practices

### Enhanced Directory Structure
- `src/core/`: Enhanced MCP server with multi-tool support
- `src/services/`: AI-powered services (OpenAI, ChromaDB, documentation sync)
- `src/analyzers/`: Advanced context analysis with vector search
- `src/knowledge/`: SQLite knowledge base with learning algorithms
- `src/integrations/`: API key detection and IDE integration services
- `src/tools/`: Individual MCP tool implementations
- `src/types/`: Comprehensive TypeScript definitions for all features
- `src/utils/`: Enhanced utilities including security and performance helpers

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

### Advanced Context Analysis Flow
1. **API Key Detection**: Automatically discover and use existing IDE AI keys
2. **Dual-Mode Analysis**: Basic rule-based + Advanced AI-powered processing
3. **Vector-Based Search**: Semantic similarity search across documentation
4. **Multi-Source Synthesis**: IDE rules + live docs + knowledge base
5. **Real-Time Enhancement**: Live coding assistance and error prevention
6. **Continuous Learning**: Pattern recognition and knowledge base evolution

## AI Integration & Dependencies

### Core AI Services
- **OpenAI Integration**: Embeddings (text-embedding-ada-002) for semantic search
- **ChromaDB**: Vector database for intelligent documentation storage
- **Automatic Setup**: Zero-config using existing IDE AI keys with user permission
- **Privacy-First**: Local processing, no source code transmission

### MCP Integration (Fixed in v5.1.0)
- **MCP SDK**: Updated to v1.12.0 for compatibility with modern IDEs
- **Direct Binary**: `optivise-mcp` binary for direct MCP server execution
- **Cursor IDE**: Proper configuration with executable permissions
- **Multiple Entry Points**: Both wrapper script and direct MCP server access

### New Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^1.12.0", // Updated MCP SDK
  "openai": "^4.20.0",                    // AI embeddings service
  "chromadb": "^1.8.0",                  // Vector database
  "cheerio": "^1.0.0-rc.12",             // HTML parsing for web scraping
  "fast-xml-parser": "^4.3.0",           // Sitemap processing
  "langchain": "^0.2.0",                 // Text splitting and processing
  "sqlite3": "^5.1.0",                   // Local knowledge base
  "axios": "^1.6.0",                     // HTTP requests
  "node-cron": "^3.0.0"                  // Scheduled documentation sync
}
```

## TypeScript Configuration (Enhanced)
- **Compiler**: Native TypeScript (tsc) - No Babel complexity  
- **Target**: ES2022 with Node.js module resolution
- **Strict**: Full strict mode with enhanced type safety
- **Output**: `dist/` directory with source maps
- **Modules**: ES modules with proper Node.js compatibility
- **AI Types**: Comprehensive type definitions for AI services

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

### Enhanced Capabilities

#### Real-Time Development Assistant
- **Jira Ticket Implementation**: Parse tickets and provide implementation guidance
- **Bug Fixing Intelligence**: Analyze errors and provide step-by-step solutions
- **Code Analysis**: Real-time performance and security suggestions
- **Auto-completion**: Context-aware Optimizely API suggestions
- **Error Prevention**: Proactive warnings and best practice enforcement

#### Automatic API Key Integration
- **Zero-Config Setup**: Detect and use existing IDE AI keys with permission
- **Security-First**: Secure key handling with user consent
- **Fallback Options**: Manual setup if auto-detection unavailable
- **Privacy Controls**: Transparent key usage with audit logging

#### Intelligent Documentation System
- **Daily Sync**: Automated Optimizely.com content crawling
- **Vector Search**: Semantic similarity matching for precise results
- **Multi-Product Support**: Specialized collections per Optimizely product
- **Live Updates**: Real-time documentation change detection

### Critical Requirements
- **Response Time**: <300ms for cached content, <2s for live documentation fetch
- **Memory Efficiency**: <512MB total memory usage including AI features
- **Setup Experience**: <30 seconds from install to AI-powered features
- **Accuracy**: >95% product detection, >90% implementation guidance success
- **Privacy First**: Local processing, secure API key handling, user consent

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

### Modern Architecture Benefits
- **Simplified Codebase**: Legacy code removed, 57% reduction in file count
- **Single Tool Focus**: Unified `optidev_context_analyzer` tool
- **Clean Dependencies**: No legacy technical debt
- **Improved Maintainability**: Modern TypeScript patterns throughout

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