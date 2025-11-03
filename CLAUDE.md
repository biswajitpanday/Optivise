# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Optivise** is an intelligent MCP (Model Context Protocol) server that provides AI-powered context analysis for Optimizely development. It acts as a context-aware intermediary between developers and LLMs, analyzing prompts for Optimizely relevance and delivering precise, curated information.

**Current Version**: 5.2.3
**Status**: Production-ready MCP server with optional AI enhancements

## Core Architecture

### Dual-Mode Operation
The application operates in two distinct modes controlled by `OPTIVISE_MODE` environment variable:

1. **MCP Mode** (default): Communicates via stdio using MCP protocol for IDE integration
2. **HTTP Server Mode**: Provides REST API endpoints for browser testing and deployment

Entry point: `src/index.ts` determines mode and initializes appropriate server (`OptiviseMCPServer` or `OptiviseHTTPServer`).

### Directory Structure
```
src/
├── core/           # MCP server implementation (mcp-server.ts)
├── analyzers/      # Context and prompt analysis engines
├── tools/          # 5 specialized MCP tools (implementation-guide, debug-helper, code-analyzer, project-helper, context-analyzer)
├── services/       # Business logic (product detection, documentation, rule intelligence, etc.)
├── integrations/   # External services (OpenAI, ChromaDB, API key detection)
├── formatters/     # Response formatting and templates
├── utils/          # Logger, validation, circuit breakers, correlation IDs
├── types/          # TypeScript type definitions
├── cli/            # CLI utilities (diagnostics-cli, health-cli, indexing-cli, rules-cli)
├── server/         # HTTP server implementation
└── index.ts        # Main entry point with mode detection
```

### MCP Tools (5 Specialized Tools)
All tools are registered in `src/core/mcp-server.ts`:

1. **`optidev_context_analyzer`**: Core context analysis with product detection and relevance scoring
2. **`optidev_implementation_guide`**: Jira ticket analysis and implementation planning
3. **`optidev_debug_helper`**: Bug analysis and resolution assistance
4. **`optidev_code_analyzer`**: Real-time code analysis and optimization
5. **`optidev_project_helper`**: Project setup, migration, and configuration

Each tool is implemented in `src/tools/` and uses `ContextAnalysisEngine` from `src/analyzers/`.

### Key Services

**ContextAnalysisEngine** (`src/analyzers/context-analysis-engine.ts`):
- Orchestrates all analysis operations
- Coordinates prompt analysis, product detection, rule intelligence, and documentation services
- Handles AI service initialization (OpenAI, ChromaDB) asynchronously
- Manages caching and session memory

**ProductDetectionService** (`src/services/product-detection-service.ts`):
- Detects Optimizely products from project context and prompts
- Supports: Commerce, CMS, Experimentation, DXP, Data Platform, etc.

**RuleIntelligenceService** (`src/services/rule-intelligence-service.ts`):
- Discovers and analyzes IDE rules (.cursorrules, .cursor/rules/, workspace settings)
- Provides rule precedence and merging logic
- Suggests rule improvements

**PromptAwareSearchService** (`src/services/prompt-aware-search.ts`):
- Semantic search using OpenAI embeddings and ChromaDB
- Falls back to keyword search when AI unavailable

### AI Integration (Optional)
- **OpenAI**: Text embeddings (text-embedding-ada-002) for semantic search
- **ChromaDB**: Vector database for documentation storage and retrieval
- **Automatic Fallback**: All AI features degrade gracefully to rule-based analysis
- **API Key Detection**: Automatically discovers existing IDE AI keys with user permission

## Development Commands

### Building
```bash
npm run build        # Clean + TypeScript compilation + copy assets + make executable
npm run clean        # Remove dist/ directory
npm run typecheck    # Type check without emitting files
```

Build process (defined in package.json scripts):
1. `rimraf dist` - Clean output directory
2. `tsc` - Compile TypeScript using native compiler (no Babel)
3. `copyfiles` - Copy JSON and MD files to dist/
4. `chmod 755 dist/index.js` - Make executable (cross-platform safe)

### Testing
```bash
npm run test                      # Run Vitest test suite
npm run test:e2e:inspector        # Test with MCP Inspector
```

All tests in `src/test/`:
- Unit tests for analyzers, services, formatters
- E2E tests for MCP protocol integration
- Integration tests for AI services

### Running Locally
```bash
npm start                         # Start compiled MCP server
node dist/index.js               # Direct server start
optivise mcp                     # Via CLI wrapper
optivise server                  # Start HTTP server mode (port 3007)
optivise dev                     # Development mode with tsx

# CLI utilities
optivise-diag                    # Diagnostics and version info
optivise-health                  # Health check queries
optivise-rules propose <path>    # Analyze and propose .cursorrules
optivise-index                   # Documentation indexing
```

### Code Quality
```bash
npm run lint         # ESLint check (see eslint.config.js)
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Prettier format all TypeScript files
```

## TypeScript Configuration

- **Compiler**: Native TypeScript (tsc) - no Babel, no bundler
- **Target**: ES2022 with Node.js module resolution
- **Module**: ES2022 modules (type: "module" in package.json)
- **Strict Mode**: Full strict type checking enabled
- **Output**: `dist/` directory with source maps and declarations
- **Key Settings**:
  - `noUncheckedIndexedAccess: true` - Safe array/object access
  - `exactOptionalPropertyTypes: false` - Flexible optional properties
  - `useUnknownInCatchVariables: true` - Type-safe error handling

## MCP Protocol Integration

### IDE Configuration
Cursor IDE example (`.cursor/mcp.json` or `cursor-mcp.json`):
```json
{
  "mcpServers": {
    "optivise": {
      "command": "npx",
      "args": ["optivise-mcp"]
    }
  }
}
```

### Protocol Implementation
- Uses `@modelcontextprotocol/sdk` v1.12.0
- Transport: `StdioServerTransport` for IDE communication
- **Critical**: MCP protocol requires clean stdout - all logging goes to stderr
- Server implements `ListToolsRequestSchema` and `CallToolRequestSchema`

### Binary Entry Points
The package provides multiple binaries (see package.json `bin`):
- `optivise`: Main CLI wrapper (bin/optivise - Node.js script)
- `optivise-mcp`: Direct MCP server (dist/index.js)
- `optivise-rules`: Rules CLI (dist/cli/rules-cli.js)
- `optivise-diag`: Diagnostics CLI (dist/cli/diagnostics-cli.js)
- `optivise-health`: Health check CLI (dist/cli/health-cli.js)
- `optivise-index`: Indexing CLI (dist/cli/indexing-cli.js)

## Environment Variables

### Core Configuration
- `OPTIVISE_MODE`: "mcp" (default) or "server" (HTTP mode)
- `LOG_LEVEL`: "error" | "warn" | "info" | "debug" (default: "info" in HTTP mode, "error" in MCP mode)
- `OPTIDEV_DEBUG`: Set to "true" for startup debug messages on stderr

### AI Features (Optional)
- `OPENAI_API_KEY`: Enable OpenAI embeddings and semantic search
- `ENABLE_PRODUCT_DETECTION`: Set to "false" to disable (default: true)

### HTTP Server Mode
- `PORT`: Server port (default: 3007)
- `NODE_ENV`: "production" triggers HTTP mode
- `CORS_ALLOW_ORIGINS`: Allowed CORS origins (default: "*")
- `REQUEST_TIMEOUT_MS`: Request timeout (default: 15000)

### Advanced
- `MAX_BLOCK_CHARS`: Max characters per context block (default: 5000)
- `MAX_TOTAL_TOKENS`: Token ceiling for context (default: 4000)
- `OPTIVISE_AUDIT`: "true" to enable audit trail
- `AUDIT_API_KEY`: Required if audit enabled

## Key Implementation Patterns

### Logging and Observability
- **Logger**: Structured JSON logging with correlation IDs (see `src/utils/logger.ts`)
- **Correlation IDs**: Each request gets unique ID for tracing (see `src/utils/correlation.ts`)
- **MCP Compatibility**: All logs to stderr, never stdout (stdout reserved for MCP protocol)
- **Circuit Breakers**: Protect external service calls (see `src/utils/circuit-breaker.ts`)
- **Monitoring**: Per-stage timing and relevance breakdown (see `src/services/monitoring-service.ts`)

### Security and Safety
- **Secret Redaction**: API keys/tokens/passwords redacted from logs (see `src/utils/sensitive.ts`)
- **Content Sanitization**: HTML/script/iframe/data URI blocking in formatter
- **Size Limits**: Content truncation and token ceilings enforced
- **Audit Trail**: Optional in-memory audit with protected endpoint (see `src/services/audit-trail.ts`)

### Error Handling
- Graceful degradation: AI features fail → fall back to rule-based analysis
- All async operations wrapped in try-catch with proper logging
- Zod validation for all MCP tool inputs (see `src/utils/validation.ts`)
- Circuit breakers prevent cascading failures

### Caching Strategy
- **PromptCache**: In-memory cache with TTL (60s default) for repeated prompts
- **SessionMemory**: Conversation context across multiple interactions
- **Documentation Cache**: Persistent cache for Optimizely docs (TTL-based)

## Optimizely Product Detection

Supported products (defined in `src/types/optimizely.ts`):
- Commerce: "configured-commerce", "commerce-connect"
- Content: "cms", "cmp"
- Experience: "dxp"
- Experimentation: "web-experimentation", "feature-experimentation"
- Platform: "data-platform", "connect-platform", "recommendations"

Detection methods:
1. **File structure analysis**: Check for Extensions/, modules/, package.json dependencies
2. **Prompt keywords**: "Commerce", "CMS", "Experimentation", etc.
3. **IDE rules**: Parse .cursorrules and .cursor/rules/ for product mentions

## Response Formatting

All tool responses formatted via `RequestFormatter` (`src/formatters/request-formatter.ts`):
- Converts analysis results to structured `LLMRequest` format
- Applies templates from `src/formatters/templates.ts`
- Enforces size limits and sanitization
- Provides context blocks optimized for LLM consumption

Response structure (`LLMRequest`):
```typescript
{
  blocks: ContextBlock[];  // Structured context sections
  metadata: {
    relevanceScore: number;
    detectedProducts: string[];
    confidence: number;
    generatedAt: Date;
  };
  diagnostics: {
    timing: Record<string, number>;
    dataUsed: string[];
    fallbacks?: string[];
  };
}
```

## Testing Strategy

### Test Organization
All tests in `src/test/`:
- `*-e2e.test.ts`: End-to-end MCP integration tests
- `*.test.ts`: Unit tests for services and utilities

### Running Tests
```bash
npm run test              # Run all Vitest tests
npm run test:e2e:inspector # Manual MCP Inspector testing
```

### Key Test Files
- `e2e-mcp.test.ts`: Core MCP protocol interactions
- `context-analysis-e2e.test.ts`: Full analysis workflow
- `formatter-safety.test.ts`: Security and sanitization
- `prompt-analyzer.test.ts`: Prompt analysis logic
- `rule-intelligence-*.test.ts`: Rule discovery and merging

## Deployment

### NPM Package
```bash
npm run prepublishOnly   # Runs typecheck before publish
npm publish             # Deploy to NPM registry
```

### Render.com (HTTP Server Mode)
See `render.yaml`:
- Builds with `npm install && npm run build`
- Starts with `npm start` (triggers HTTP mode via NODE_ENV=production)
- Health checks at `/health` endpoint
- Environment variables: OPTIVISE_MODE=server, CORS_ALLOW_ORIGINS, etc.

## Common Development Patterns

### Adding a New MCP Tool
1. Create tool implementation in `src/tools/` (extend pattern from existing tools)
2. Register in `OptiviseMCPServer` constructor (`src/core/mcp-server.ts`)
3. Add tool handler in `handleToolCall()` method
4. Define Zod schema for input validation
5. Add integration tests in `src/test/`

### Adding a New Service
1. Create service in `src/services/`
2. Define TypeScript interface in `src/types/`
3. Inject logger in constructor
4. Implement `initialize()` and `cleanup()` methods if needed
5. Register in `ContextAnalysisEngine` if part of analysis pipeline

### Working with AI Features
- Check `chromaDBService.isAvailable()` and `openAIClient.isAvailable()` before use
- Always provide fallback logic for when AI unavailable
- Use circuit breakers for external API calls
- Log warnings (not errors) when AI features degrade

## Important Constraints

### MCP Protocol Requirements
- **Never write to stdout directly** - use logger (goes to stderr) or return via MCP response
- All tool responses must be JSON-serializable strings
- Keep responses under size limits (MAX_TOTAL_TOKENS)
- Handle malformed inputs gracefully (Zod validation)

### Performance Targets
- Context analysis: < 300ms for cached content
- With AI search: < 2s total response time
- Memory usage: < 512MB including AI services
- Startup time: < 5s for basic mode, < 30s with AI initialization

### Compatibility
- Node.js >= 18.0.0 required
- ES modules only (no CommonJS)
- Cross-platform: Windows, macOS, Linux
- IDE support: Cursor, VS Code (any MCP-compatible IDE)

## Cursor Rules Integration

From `.cursorrules`:
- Follow handler chain patterns for Optimizely Commerce development
- Use dependency injection
- Implement proper error handling
- Use strict TypeScript type checking
- Follow ESLint rules and Prettier formatting
- Implement comprehensive testing

## Troubleshooting

### MCP Server Not Starting
1. Check compilation: `npm run build`
2. Verify Node version: `node --version` (>= 18.0.0)
3. Test direct start: `node dist/index.js`
4. Enable debug: `OPTIDEV_DEBUG=true node dist/index.js`

### IDE Not Detecting Tools
1. Verify MCP config in `.cursor/mcp.json`
2. Check binary is executable: `chmod +x dist/index.js`
3. Restart IDE after config changes
4. Test with MCP Inspector: `npm run test:e2e:inspector`

### AI Features Not Working
1. Check API keys: `OPENAI_API_KEY` set in environment
2. Review logs: Set `LOG_LEVEL=debug`
3. Verify fallback working: Should still provide basic analysis
4. Check circuit breaker state in diagnostics

### Build Failures
1. Clean: `npm run clean`
2. Reinstall: `rm -rf node_modules && npm install`
3. Type check: `npm run typecheck` (fix errors before build)
4. Check TypeScript version: Should be ^5.6.3
