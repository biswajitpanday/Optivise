# Optivise - Production Readiness & Feature Matrix

## 🎯 Updated User Flow (Aligned)

- [ ] Configure MCP → Detect context from user Prompt → call a tool → analyzer + detection + rules + docs  → Request Formatter (format the user prompt, add necessary tags/context) → Send the formatted request to LLM (via IDE's active Agent) → curated, product‑aware output

## 🚧 Must‑Do for Production Grade (GA)

- [ ] Single entry path respecting `OPTIVISE_MODE`; no double starts
- [ ] Analyzer initialization executed in MCP path (`ContextAnalysisEngine.initialize()`)
- [ ] Graceful shutdown for AI, caches, sync, HTTP
- [ ] Health/ready endpoints expose feature matrix (AI/Chroma/index)
- [ ] Input schemas and validation for every tool (zod) with structured errors
- [ ] Evidence‑rich responses (files, patterns, rules, docs sources) across tools
- [ ] Integration tests for all tools via MCP inspector

## 🧠 Prompt‑Based Context Detection (New)

- [ ] Prompt Context Schema: define fields like `userIntent`, `taskType`, `targetProducts`, `artifacts` (files/classes/URLs), `constraints`, `acceptanceCriteria`
- [ ] Intent Classification: categories (bugfix, feature, migration, config, performance, security, content); thresholds + tests
- [ ] Entity Extraction: detect product names (Commerce, CMS, CMP, DXP, Search & Nav), versions, frameworks, file names, environments; map to detector hints
- [ ] Prompt‑Aware Workspace Search: locate mentioned files/symbols; widen to neighbors (imports, project items)
- [ ] Session Memory: maintain short‑term context (recent tools, files, products) merged with current prompt
- [ ] Scoring: combine prompt entities + detector heuristics + rules; expose confidence and evidence
- [ ] Safety: trim/snippet limits; PII redaction; token budget guardrails
- [ ] Caching: prompt hash for dedupe; invalidate on workspace changes
- [ ] Tool Contract: extend all tools to accept `user_prompt` and optional `prompt_context` payload
- [ ] Observability: debug mode emits extracted entities, evidence, and scores (stderr only)
- [ ] E2E Tests: user‑prompt driven scenarios across common Optimizely tasks
- [ ] Docs & Examples: recipe‑style prompts with expected outputs

## 🧾 Request Formatter & LLM Handoff (New)

- [ ] Formatter Schema: define `{ systemPrompt, userPrompt, contextBlocks[], citations[], tags[], safetyDirectives, constraints }`
- [ ] Tag Vocabulary: standard tags like `[optimizely:product=commerce]`, `[intent:bugfix]`, `[severity:high]`, `[version:cms12]`
- [ ] Context Blocks: structured chunks for rules, detection evidence, code snippets, and docs; include source metadata
- [ ] Token Budgeting: measure, truncate, and chunk context to fit model limits; configurable targets per model
- [ ] Tool Templates: per‑tool, product‑aware formatter templates (system + user); unit tests (golden prompts)
- [ ] MCP‑Compliant Output: return a structured `llm_request` object in tool results plus a human‑readable summary
- [ ] Content Types: include `text/markdown` for IDE preview and `application/json` payload for agents that support structured handoff
- [ ] IDE Agent Integration Docs: add `docs/ide_agent_integration.md` describing how Cursor/VS Code agents can inject `llm_request` content into model prompts
- [ ] Safety Filters: remove secrets/PII; hash or mask when needed; annotate redactions
- [ ] Telemetry: capture formatted size, token estimates, truncation events (debug only; never stdout)
- [ ] E2E: verify agent‑ready outputs for common flows (bugfix, migration, performance)

## 🔍 Analysis Pipeline (Analyzer → Detection → Rules → Docs)

- [ ] Normalize analyzer output; forward to detectors/rules/docs
- [ ] Deterministic relevance scoring; tie‑break by evidence weight
- [ ] Per‑stage timings and cache indicators in debug mode

## 🧭 Product Detection & Evidence

- [ ] Recursive scan; support `.csproj`, `Directory.Packages.props`, `packages.config`
- [ ] Versioned maps of dependencies/keywords per product family
- [ ] Evidence API: detected product(s) with file paths and match reasons
- [ ] Confidence score and multi‑product resolution strategy

## 📐 Rule Intelligence

- [ ] Discover rules from `.cursorrules`, `.cursor/mcp.json`, workspace settings, repo rules
- [ ] Merge precedence defined and enforced; validation and linting
- [ ] Suggestions for duplicates/dead rules with proposed diffs

## 📚 Documentation & Indexing

- [ ] Live fetchers for Optimizely docs with product‑aware selectors
- [ ] ChromaDB config (host/port/SSL); validate on boot; fail soft
- [ ] Embedding model configurable; 429/backoff and timeouts
- [ ] Indexing CLI: seed, reindex, clear, stats
- [ ] Hybrid relevance (keyword + vector + recency)
- [ ] Auto‑sync behind feature flag; status in `/health`

## 🤖 AI Integration & Fallbacks

- [ ] Timeouts, retries with jitter, circuit breaker
- [ ] Token accounting and max context safeguards
- [ ] Versioned prompt templates with tests
- [ ] Offline parity tests for no‑AI mode
- [ ] MCP Mode: server does not call LLM directly; provides formatted handoff payload for the IDE agent

## 🔒 Security & Privacy

- [ ] Redact logs; no PII/secret leakage; secure defaults
- [ ] Secret management via env/secret store
- [ ] Sanitize HTML/docs; bound content sizes
- [ ] Optional audit trail for tool invocations (opt‑in)

## 🌐 HTTP API (Render) Hardening

- [ ] zod/ajv schema validation for `/analyze` and friends
- [ ] Rate limiting, request timeouts, strict CORS
- [ ] `/health` and `/ready` include AI/Chroma/index stats

## 📈 Monitoring & Observability

- [ ] Instrument MCP handlers for timings, error rates, and tool usage
- [ ] Correlation IDs across pipeline stages (including formatter stage)
- [ ] Structured JSON logs; silence stdout in MCP mode

## 👥 Collaboration & Learning

- [ ] Minimal collaboration API (in‑memory → SQLite) for sharing rules/notes
- [ ] Wire `LearningService.recordInteraction`; optional explicit feedback
- [ ] Data retention policy; export/delete utilities

## 🧪 Quality Engineering

- [ ] Unit + integration tests; coverage > 80%
- [ ] E2E MCP tests in CI via `@modelcontextprotocol/inspector`
- [ ] Property‑based tests for detectors and rule merging
- [ ] Re‑enable strict ESLint rules where feasible

## ⚡ Performance & Capacity

- [ ] Baselines: cache hit rate, P95 latency, memory ceilings
- [ ] Load tests (AI on/off); cold‑start vs warm path
- [ ] SLOs documented with alert thresholds

## 🧰 Packaging & Developer Experience

- [ ] README/docs aligned to actual features; beta features labeled
- [ ] Example configs for Cursor/VS Code; sample `render.yaml`
- [ ] `optivise` CLI: index ops, diagnostics, health

## 🔄 CI/CD & Release Gates

- [ ] Lint/test/typecheck on PR; block coverage regressions
- [ ] SBOM + dependency audit; supply‑chain checks
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


