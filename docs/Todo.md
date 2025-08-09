# Optivise - Production Readiness & Feature Matrix

## 🎯 Updated User Flow (Aligned)

- [x] Configure MCP → Detect context from user Prompt → call a tool → analyzer + detection + rules + docs  → Request Formatter (format the user prompt, add necessary tags/context) → Send the formatted request to LLM (via IDE's active Agent) → curated, product‑aware output

## 🚧 Must‑Do for Production Grade (GA)

- [ ] Single entry path respecting `OPTIVISE_MODE`; no double starts
- [x] Single entry path respecting `OPTIVISE_MODE`; no double starts
- [x] Analyzer initialization executed in MCP path (`ContextAnalysisEngine.initialize()`)
- [x] Graceful shutdown for AI, caches, sync, HTTP
- [x] Health/ready endpoints expose feature matrix (AI/Chroma/index)
 - [x] Input schemas and validation for every tool (zod) with structured errors
- [x] Evidence‑rich responses (files, patterns, rules, docs sources) across tools
- [ ] Integration tests for all tools via MCP inspector
  - [x] Basic E2E MCP tests (stdio) for key tools returning `llm_request`
  - [x] Add coverage for `optidev_project_helper` and `optidev_context_analyzer`

## 🧠 Prompt‑Based Context Detection (New)

- [x] Prompt Context Schema: define fields like `userIntent`, `taskType`, `targetProducts`, `artifacts` (files/classes/URLs), `constraints`, `acceptanceCriteria`
- [x] Intent Classification: categories (bugfix, feature, migration, config, performance, security, content); thresholds + tests (basic heuristics)
- [x] Entity Extraction: detect product names (Commerce, CMS, CMP, DXP, Search & Nav), versions, file names, URLs, classes (initial)
- [x] Prompt‑Aware Workspace Search: initial file/symbol lookup; seeds evidence collection
- [ ] Session Memory: maintain short‑term context (recent tools, files, products) merged with current prompt
- [x] Session Memory: in-memory recent products/files/tools snapshot
- [ ] Scoring: combine prompt entities + detector heuristics + rules; expose confidence and evidence
- [x] Scoring: hybrid detection (prompt+project) and evidence-based relevance boost (initial)
- [ ] Safety: trim/snippet limits; PII redaction; token budget guardrails
- [ ] Caching: prompt hash for dedupe; invalidate on workspace changes
- [x] Caching: prompt hash-based dedupe (in-memory TTL)
- [x] Tool Contract: extend all tools to accept `user_prompt` and optional `prompt_context` payload
- [ ] Observability: debug mode emits extracted entities, evidence, and scores (stderr only)
- [x] Observability: debug-mode stderr emissions for entities, products, evidence boost
- [ ] E2E Tests: user‑prompt driven scenarios across common Optimizely tasks
- [ ] Docs & Examples: recipe‑style prompts with expected outputs

## 🧾 Request Formatter & LLM Handoff (New)

- [x] Formatter Schema: define `{ systemPrompt, userPrompt, contextBlocks[], citations[], tags[], safetyDirectives, constraints }`
- [x] Tag Vocabulary: standard tags like `[optimizely:product=commerce]`, `[intent:bugfix]`, `[severity:high]`, `[version:cms12]`
- [x] Context Blocks: structured chunks for rules, detection evidence, code snippets, and docs; include source metadata
- [x] Token Budgeting: measure, truncate, and chunk context to fit model limits; configurable targets per model
- [x] Tool Templates: per‑tool, product‑aware formatter templates (system + user); unit tests (golden prompts)
- [x] MCP‑Compliant Output: return a structured `llm_request` object in tool results plus a human‑readable summary
- [x] Content Types: include `text/markdown` for IDE preview and `application/json` payload for agents that support structured handoff
  - [x] Formatter emits `contentTypes` and a `previewMarkdown` field
  - [x] Correlation ID threaded into `LLMRequest.correlationId` and telemetry
 - [ ] IDE Agent Integration Docs: add `docs/ide_agent_integration.md` describing how Cursor/VS Code agents can inject `llm_request` content into model prompts
   - [x] Added `docs/ide_agent_integration.md` and expanded with Cursor config, preview usage, truncation & safety guidance
- [x] Safety Filters: remove secrets/PII; hash or mask when needed; annotate redactions
   - [x] Strengthened safety directives; improved sanitization (strip scripts/iframes/JS/data URIs; mask tokens)
   - [x] Enforced block-size and overall token ceilings with truncation markers
- [x] Telemetry: capture formatted size, token estimates, truncation events (debug only; never stdout)
  - [x] Basic telemetry fields (sizeInBytes, tokenEstimate, droppedBlocks, truncationApplied)
- [x] E2E: verify agent‑ready outputs for common flows (bugfix, migration, performance)
  - [x] Tools now inject rules and detection evidence into context blocks when `projectPath` provided
  - [x] Relevance-aware ordering of blocks in formatter; unit tests added
  - [x] Added unit tests ensuring rules block is present across tools when `projectPath` is provided
  - [x] Added E2E formatting tests for bugfix, migration, and performance flows

## 🔍 Analysis Pipeline (Analyzer → Detection → Rules → Docs)

- [x] Normalize analyzer output; forward to detectors/rules/docs
- [x] Deterministic relevance scoring; tie‑break via prompt/evidence/rules components
- [x] Per‑stage timings and cache indicators (cacheHit) added to diagnostics
  - [x] Evidence carries weights; product detection confidence normalized

## 🧭 Product Detection & Evidence

- [x] Recursive scan; support `.csproj`, `Directory.Packages.props`, `packages.config` (initial patterns)
- [x] Versioned maps of dependencies/keywords per product family (initial heuristics)
- [ ] Evidence API: detected product(s) with file paths and match reasons
  - [x] Basic evidence endpoint (`GET /evidence`) for inspection (limited; debug/testing)
- [ ] Confidence score and multi‑product resolution strategy

## 📐 Rule Intelligence

- [ ] Discover rules from `.cursorrules`, `.cursor/mcp.json`, workspace settings, repo rules
- [x] Merge precedence defined and enforced (basic); validation/parsing stubs
- [x] Suggestions for duplicates/dead rules with proposed cleanups
- [x] Basic linting and conflict detection (formatOnSave contradictions, ESLint/Prettier pairing)
- [x] Recursive discovery in `rules/`, `docs/*.rules.md`, and `.cursor/*`; added consolidation suggestion
- [x] Normalization/merge notes surfaced; preliminary directive normalization
- [x] Generate proposed `.cursorrules` content; surface in tool context blocks
- [x] Proposed `.cursorrules` unified diff surfaced in tool context blocks

## 📚 Documentation & Indexing

- [ ] Live fetchers for Optimizely docs with product‑aware selectors
- [ ] ChromaDB config (host/port/SSL); validate on boot; fail soft
- [ ] Embedding model configurable; 429/backoff and timeouts
- [x] Indexing CLI: seed, reindex, clear, stats (basic)
- [ ] Hybrid relevance (keyword + vector + recency)
- [ ] Auto‑sync behind feature flag; status in `/health`

## 🤖 AI Integration & Fallbacks

- [x] Timeouts, retries with jitter, circuit breaker
  - [x] OpenAI: request timeout, basic retry with jitter, circuit breaker (cooldown)
- [x] Token accounting and max context safeguards
- [ ] Versioned prompt templates with tests
- [ ] Offline parity tests for no‑AI mode
- [x] MCP Mode: server does not call LLM directly; provides formatted handoff payload for the IDE agent

## 🔒 Security & Privacy

- [x] Redact logs; no PII/secret leakage; secure defaults
- [x] Secret management via env/secret store (pluggable providers scaffold)
- [x] Sanitize HTML/docs; bound content sizes
- [x] Optional audit trail for tool invocations (opt‑in)
  - [x] In-memory audit trail scaffold; tool events recorded; secure `/audit` (opt-in)

## 🌐 HTTP API (Render) Hardening

- [ ] zod/ajv schema validation for `/analyze` and friends
  - [x] Basic zod schema validation for `/analyze`
- [x] Rate limiting, request timeouts, strict CORS
  - [x] Naive in-process rate limiting and payload size guard
  - [x] Request timeouts via Promise.race guard
  - [x] Strict CORS allow-list (env-driven)
- [x] `/health` and `/ready` include AI/Chroma/index stats
  - [x] `/ready` includes feature flags, service availability, and index stats (initial)
  - [x] `/health` includes uptime, AI availability, index stats, and doc sync status (initial)
  - [x] Basic payload size guard for `/analyze`

## 📈 Monitoring & Observability

- [ ] Instrument MCP handlers for timings, error rates, and tool usage
- [x] Basic instrumentation: timings recorded per tool via MonitoringService
- [x] Correlation IDs across pipeline stages (HTTP + MCP entry points)
- [x] Structured JSON logs on stderr; stdout silenced in MCP mode

## 👥 Collaboration & Learning

- [ ] Minimal collaboration API (in‑memory → SQLite) for sharing rules/notes
- [ ] Wire `LearningService.recordInteraction`; optional explicit feedback
- [ ] Data retention policy; export/delete utilities

## 🧪 Quality Engineering

- [ ] Unit + integration tests; coverage > 80%
- [ ] E2E MCP tests in CI via `@modelcontextprotocol/inspector`
- [ ] Property‑based tests for detectors and rule merging
- [ ] Re‑enable strict ESLint rules where feasible
- [x] Add tests: JSON logs with correlation IDs; Rule Intelligence precedence/cleanup

## ⚡ Performance & Capacity

- [ ] Baselines: cache hit rate, P95 latency, memory ceilings
- [ ] Load tests (AI on/off); cold‑start vs warm path
- [ ] SLOs documented with alert thresholds

## 🧰 Packaging & Developer Experience

- [ ] README/docs aligned to actual features; beta features labeled
- [ ] Example configs for Cursor/VS Code; sample `render.yaml`
- [ ] `optivise` CLI: index ops, diagnostics, health
  - [x] Added `optivise-rules` CLI to propose/write `.cursorrules`
  - [x] Added `optivise-diag` CLI for version/features/services diagnostics
  - [x] Added `optivise-health` CLI to query local HTTP health endpoint

## 🔄 CI/CD & Release Gates

- [ ] Lint/test/typecheck on PR; block coverage regressions
  - [x] CI workflow added to build, typecheck, lint, and run tests
- [x] SBOM + dependency audit; supply‑chain checks
- [ ] Versioning + changelog; signed releases

## 🧭 Multi‑IDE Support

- [ ] Cursor and VS Code first‑class; JetBrains backlog documented
- [ ] Per‑IDE setup and troubleshooting docs

## 🗺️ Documentation & Examples

- [ ] Walkthroughs for each tool with real Optimizely scenarios
- [ ] Architecture and data‑flow diagrams up to date

## 🐞 Known Bugs / Inconsistencies

- [ ] `src/index.ts` should not run `simplifiedMain()` unconditionally
- [ ] Ensure `OptiviseMCPServer.initialize` performs all required init steps
- [ ] Improve docs relevance scoring to avoid skew

## ✅ Feature Matrix: With / Without AI (Targets)

- [ ] Without AI: all tools functional using heuristics and rules
- [ ] With AI: vector search + summarization; <300ms cached, <2s live

## 📌 GA Gate

Use this file as the authoritative release gate. GA when all items above are checked and corresponding tests/automation are in place.


