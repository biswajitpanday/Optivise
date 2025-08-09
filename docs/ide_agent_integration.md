## IDE Agent Integration Guide

This document explains how an IDE agent (Cursor, VS Code, etc.) should consume `LLMRequest` objects returned by Optivise tools and inject them into the model prompt.

### Contract Overview

Tools emit an `llm_request` object with fields:

- systemPrompt: String for the model system message
- userPrompt: The user-facing instruction text
- contextBlocks: Array of structured blocks `{ type, title, content, source, tokensEstimate, relevance }`
- citations: Array of `{ title, url }` entries
- tags: Array like `[tool:optidev_code_analyzer]`, `[optimizely:product=cms-paas]`, `[intent:bugfix]`, `[severity:high]`, `[version:cms12]`
- safetyDirectives: Short guardrails (e.g., no-PII)
- constraints: Additional constraints (e.g., output format)
- modelHints: Optional `{ maxTokens, temperature }`
- tokenEstimate, telemetry: Optional metrics for budgeting

### Recommended Prompt Assembly (Cursor / VS Code)

1) Create a system message from `systemPrompt`.
2) Create a user message combining:
   - Tags (joined as a single line, optional): `[intent:bugfix] [optimizely:product=cms-paas] ...`
   - `userPrompt`
   - Render context blocks as a compact appendix:
     - Summary first if present
     - Rules, detection evidence
      - Code (trimmed to fit); render only top-N blocks by relevance first
     - Documentation links (with titles and URLs)
3) Apply safety directives and constraints as additional system or tool messages per the model/agent framework.
4) Respect `modelHints` and `tokenEstimate` when choosing model parameters.
5) Respect `correlationId` (if present) for log correlation; include it in agent telemetry.

### Example Integration (Pseudocode)

```ts
const { llm_request } = toolResult.data;

const tagsLine = (llm_request.tags || []).join(' ');
const contextText = llm_request.contextBlocks
  .map(b => `## ${b.title || b.type}\n${b.content}`)
  .join('\n\n');

const userText = [
  tagsLine,
  llm_request.userPrompt,
  '',
  '---',
  'Context',
  contextText
].filter(Boolean).join('\n');

agent.send({
  system: llm_request.systemPrompt,
  user: userText,
  modelHints: llm_request.modelHints
});
```

### Content Types & Preview

- Agents can show a preview panel using `text/markdown` built from context blocks.
- The raw `llm_request` should be available as `application/json` for downstream plugins.
- Use `previewMarkdown` to render a collapsible, read-only summary in the IDE.

### Truncation & Safety

- Use `tokenEstimate` and `telemetry` to apply truncation. Prefer dropping lowest-relevance blocks first.
- Honor `safetyDirectives`; redact secrets/PII and annotate redactions.
- Enforce max block lengths and overall token ceilings; do not forward unsafe HTML/JS.

### Cursor/VS Code Notes

- Cursor: configure `cursor-mcp.json` (or workspace settings) to point at `npx optivise-mcp`.
- VS Code: use MCP-compatible extensions or a thin adapter that forwards tool responses to the model provider.

#### Example Cursor config snippet

```json
{
  "mcpServers": {
    "optivise": {
      "command": "npx",
      "args": ["optivise-mcp"],
      "env": {
        "OPTIDEV_DEBUG": "true",
        "LOG_LEVEL": "error"
      }
    }
  }
}
```

### Testing

- Use `npm run build && npm test` for core and E2E stdio tests.
- Optional: run `npx @modelcontextprotocol/inspector npx optivise-mcp` locally to inspect tool payloads.

### Troubleshooting

- If the agent prompt overflows, lower the max context blocks or increase truncation by dropping lowest relevance first.
- Ensure your IDE honors `contentTypes` and does not render raw HTML from blocks.
- Validate `correlationId` appears in logs to trace a request across stages.


