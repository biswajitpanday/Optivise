# Developer Guide

This guide explains how to develop, run, test, and integrate Optivise locally.

## Prerequisites

- Node.js >= 18
- npm >= 9
- Optional integrations:
  - OpenAI API key for AI features: set `OPENAI_API_KEY`
  - ChromaDB running locally for vector search (optional)

## Install and Build

```bash
npm install
npm run build
```

## Running

- MCP mode (default):
```bash
node dist/index.js
# or via CLI
optivise mcp
```

- HTTP server mode (for browser testing / health endpoints):
```bash
set OPTIVISE_MODE=server   # on Windows PowerShell: $env:OPTIVISE_MODE='server'
npm start
```

## IDE Integration

- Cursor `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "optivise": { "command": "npx", "args": ["optivise-mcp"] }
  }
}
```

- VS Code settings:
```json
{
  "mcp.servers": [
    { "name": "optivise", "command": "npx", "args": ["optivise-mcp"] }
  ]
}
```

## Useful CLI Commands

```bash
# Show version
optivise --version
optivise version

# Start MCP
optivise mcp

# Start HTTP server
optivise server

# Quick connectivity test
optivise test --debug

# Propose Cursor rules for a project
optivise-rules propose .

# Diagnostics
optivise-diag

# Health checks against local HTTP server
optivise-health
optivise-health --ready
```

## Environment Variables

- `LOG_LEVEL` (error|warn|info|debug)
- `OPTIVISE_MODE` (mcp|server)
- `OPENAI_API_KEY` (optional)
- `MAX_BLOCK_CHARS`, `MAX_TOTAL_TOKENS`
- `CORS_ALLOW_ORIGINS`, `REQUEST_TIMEOUT_MS`
- `OPTIVISE_AUDIT` and `AUDIT_API_KEY` (optional audit endpoint)

## Local Testing

```bash
# Unit tests
npm test

# E2E smoke with MCP inspector
npm run test:e2e:inspector

# Typecheck and lint
npm run typecheck
npm run lint
```

## Development Workflow

1. Make code edits under `src/`
2. Run `npm run build`
3. Use `optivise mcp` locally, or `OPTIVISE_MODE=server npm start`
4. Validate with `optivise test --debug`
5. Update docs and `docs/Todo.md` as needed

## Release (local)

- Generate version (changelog not automated without CI):
```bash
npm run release
```

- Build SBOM (local):
```bash
npm run sbom
```

## Troubleshooting

- If `optivise test` warns about MCP startup, run with `--debug` and check stderr.
- Ensure `dist/index.js` exists (`npm run build`).
- Windows: prefer quotes and forward slashes in JSON config.


