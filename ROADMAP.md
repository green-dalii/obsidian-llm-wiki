# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.14.0 | **Updated:** 2026-06-01

---

## Current Status

### Implemented (v1.14.0) — Architecture Quality & Test Infrastructure

Comprehensive test infrastructure expansion addressing third-party model review feedback, core architecture refactoring with pure function extraction, and model compatibility fixes.

**Key changes:**
- Model compatibility expansion (Issues #64/#65): DeepSeek-R1, QwQ, LM Studio fully supported
- Test infrastructure expansion: Mock infrastructure (`createMockContext`), 400 tests (+200), test coverage doubled
- TypeScript type safety complete: All type errors fixed, dual gate verification enforced
- Dual Gate Verification: ESLint + TypeScript both required, single tool insufficient
- Core architecture refactoring: 4 pure function modules in `src/core/` (conflict-resolver, dead-link-detector, orphan-matcher, prompt-builders)
- Constants centralization: `src/constants.ts` 192 lines, WIKI_SUBFOLDERS, notice durations, token budgets activated
- Query engine stability: Page content capped at 3000 tokens, prevents overflow
- Documentation upgrades: TDD Standard, Development Protocol, ROADMAP architecture quality plan
- Code quality: 2576 lines added, 503 removed, 44 files changed, zero breaking changes

### Implemented (v1.13.0) — Quality & Infrastructure

Extraction reliability, duplicate prevention, and build verification improvements.

**Key changes:**
- Cross-type duplicate prevention (#54): resolvePagePath checks opposite folder, contributed by @dmarchevsky
- Multi-round extraction dedup with aliases injection — LLM no longer relies on internal state
- Extraction aliases seeding (aliases? field) → page generation quality improvement
- Source analysis false abort fix (#61): gate changed from || to &&, contributed by @Indexed-Apogrypha
- normalizeBatchResponse pure function + BatchValidity enum (unusable/empty/valid)
- Alias self-pointing dedup (filterRedundantAliases)
- Build verification passes (CI matches Obsidian verification exactly)
- Three-No Principle structured evaluation framework
- 191 tests across 4 test files (+18 since v1.12.4)

### Implemented (v1.12.0) — Production-Grade Performance

Production-critical performance release. Extraction fundamentally rearchitected — wiki page list no longer embedded in every LLM prompt. Extraction speed is now independent of wiki size.

**Key changes:**
- Extraction prompt rearchitected: ~80% faster ingestion, scales independently of wiki size
- Dynamic batch limits, short-content auto-downgrade, convergence detection (A+C+D)
- Deterministic related_pages matching (slug + alias, zero LLM cost)
- esbuild upgraded to 0.28.0, console.debug suppressed in production
- 140 tests across 3 test files (+27)
- What's New section in all 8 READMEs with proper localized TOC

### Evaluated & Rejected (v1.12.0)

| Proposal | Reason |
|----------|--------|
| Hexagonal Architecture (Port-Adapter) | Over-engineering for Obsidian plugin context |
| Vector search (Ollama embeddings) | Requires infrastructure <1% of users have |
| Hash-bucket dedup (O(n²)→O(n log n)) | No user-reported perf issue; solve when it hurts |
| Anthropic prompt caching (Issue #38) | System prompts too small for 1024-token cache threshold |

### Next: v1.15.0 — Core Engine Tests + Client Refinement

**P0 — Quick Fixes (This Week)**

| # | Item | Source | Effort | Status |
|---|------|--------|--------|--------|
| 0 | Auto-init wiki structure on LLM Ready + wiki init status indicator | Issue #80 | 1h | ⬜ |
| 1 | `main.ts` initialization timing comment | Model Audit B #6 | 10min | ⬜ |

**P1 — Client Refinement (This Week)**

| # | Item | Source | Effort | Status |
|---|------|--------|--------|--------|
| 2 | Extract `parseSSEEvents` shared function | Model Audit B #2 | 1.5h | ✅ |
| 3 | Add `AnthropicClient` truncation retry tests | Audit consensus | 30min | ✅ |

**P2 — Core Engine Tests (Next Week)**

| # | Item | Source | Effort | Status |
|---|------|--------|--------|--------|
| 4 | wiki-engine `ingestSource` full-path tests | 7th audit repeat | 2-3d | ⬜ **Deferred to P3** |
| 5 | query-engine core flow tests (Layer 1/2/3) | Audit consensus | 1-2d | ⬜ **Deferred to P3** |
| 6 | Extract `withTruncationRetry` helper | Model Audit B #2 | 1h | ✅ |

**P3 — Architecture Refactoring (v1.16.0+)**

| # | Item | Source | Effort | Status |
|---|------|--------|--------|--------|
| 7 | Local model context-window-aware token budget | Issues #75/#76 | 2-3d | ⬜ Deferred |
| 8 | Split QueryModal → QueryEngine class | Model Audit B #4 | 2d | ⬜ Deferred |
| 9 | Extensible SSE parser (reasoning events, etc.) | Issue #64 ext | 1d | ⬜ Deferred |
| 10 | `source-analyzer.ts` 局部 `MAX_TOKENS` → `MAX_TOKENS_BATCH` | Second audit | 5min | ⬜ |
| 11 | `parseJsonResponse` 内部 strip think blocks | Second audit | 15min | ⬜ |
| 12 | `disable_thinking` interface + per-client implementation | Issue #72 | 2-3h | ⬜ |
| 13 | Restore true streaming for 3rd-party providers (fetch + ReadableStream or SDK option) | User UX feedback 2026-06-02 | 1-2d | ⬜ Deferred |
| 14 | wiki-engine `ingestSource` full-path integration tests (deferred from P2 — requires heavy Obsidian App + 5 submodule mocks) | 7th audit repeat | 2-3d | ⬜ Deferred |
| 15 | query-engine core flow tests (deferred from P2 — requires Modal + MarkdownRenderer + DOM + LLMWikiPlugin mocks) | Audit consensus | 1-2d | ⬜ Deferred |

**Second Audit Deep Findings (2026-06-02):**
- `source-analyzer.ts:113` shadows `MAX_TOKENS_BATCH` with local `MAX_TOKENS = 16000`
- `parseJsonResponse` (11 call sites) lacks think-block stripping — `extractBalancedJson` can silently extract wrong JSON from `<think>` reasoning pseudocode
- `disable_thinking?: boolean` on `LLMClient.createMessage` with provider-specific mapping (LM Studio `model_kwargs` vs Anthropic `thinking.type`) is the cleanest #72 fix

**Completed (v1.15.0 — P1 + selective P2)**
- ✅ `parseSSEEvents` shared function extraction (#2) — pure function, 11 tests
- ✅ `AnthropicClient` truncation retry tests (#3) — 9 tests, all paths covered
- ✅ `withTruncationRetry` helper extraction (#6) — pure function, 7 tests
- ✅ Issue #80 wiki init UX (auto-init on LLM Ready + status indicator)
- ✅ `isWikiInitialized` helper extraction (DRY fix in settings.ts) + 10 tests
- ✅ Streaming architecture investigation (P3 #13 documented for future)

**Deferred from P2 (too complex for current ROI):**
- ⏸ wiki-engine `ingestSource` full-path tests — requires Obsidian App + 5 submodule mocks
- ⏸ query-engine core flow tests — requires Modal + MarkdownRenderer + DOM mocks

**Completed (v1.14.0)**
- ✅ `withRetry` nested retry fix (3×→1× calls)
- ✅ `promptIncludesConstraints` dead code removal
- ✅ `foundAliases` dead code fix
- ✅ `PAGES_CACHE_TTL_MS` constant centralization
- ✅ `saveSummary` i18n (8 languages)
- ✅ `source-analyzer.test.ts` magic string cleanup
- ✅ `firstBatchData` type narrowing (`NormalizedBatch`)
- ✅ `extractedNames` alias indexing (batch-merger)
- ✅ `WIKI_SUBFOLDERS` full migration (lint-fixes.ts)
- ✅ `Decision Tree` vs `resolveEntityDedup` — design intentional (different phases)
- ✅ `UNIVERSAL_LINK_CONSTRAINTS` + `{{constraints}}` injection (all 4 prompts verified)

**Evaluated & Rejected**
- `{{constraints}}` missing in prompts — FALSE POSITIVE (all 4 prompts verified to have placeholder)

### Evaluated & Rejected

| Proposal | Reason |
|----------|--------|
| Hexagonal Architecture (Port-Adapter) | Over-engineering for Obsidian plugin context |
| Vector search (Ollama embeddings) | Requires infrastructure <1% of users have |
| Hash-bucket dedup (O(n²)→O(n log n)) | No user-reported perf issue; solve when it hurts |
| Anthropic prompt caching (Issue #38) | System prompts too small for 1024-token cache threshold |
| API URL validation | Obsidian's requestUrl already validates; self-phishing impossible |

---

## Known Gaps (from Karpathy audit)

| # | Gap | Severity |
|---|-----|----------|
| 1 | Lint: no stale-claim detection | Medium |
| 2 | Lint: no missing-important-page detection | Medium |
| 3 | Lint: no suggested-questions output | Low |
| 4 | Lint: batch fix without per-item review | Medium |
| 5 | Ingest: no interactive "discuss key takeaways with user" before writing | Medium |
| 6 | Query: output format limited to markdown (no tables/slides/charts) | Low |
| 7 | Schema: rules-engine based, not co-evolved LLM instruction doc | Low |

---

## Planned (Postponed)

### Ingest Wizard + Lint Per-Item Review

Karpathy: *"I like to do them one at a time, and be involved myself."*

- **Ingest Wizard** — Step-by-step guided ingest with user review before writing
- **Lint per-item review** — Preview LLM fix proposals before applying
- **Proactive schema suggestions** — After ingest, flag new types outside schema categories
- **Output format diversity** — Tables, comparison views

### Long-term Vision

| Feature | Description |
|---------|-------------|
| Wiki Health Dashboard | Obsidian custom view with growth, link density, contradiction trends |
| Wiki Content Export | GraphML, JSON, static site formats |
| Agent Mode | Full auto-maintain lifecycle, proactive suggestions |
| Multi-modal Support | Images, PDF, audio/video knowledge extraction |

---

## Version Timeline

| Version | Date | Key Features | Status |
|---------|------|-------------|--------|
| **v1.14.0** | 2026-06 | Architecture quality, test infrastructure, dual gate verification | Released |
| **v1.13.0** | 2026-05 | Cross-type dedup, normalizeBatchResponse, aliases seeding, Three-No framework | Released |
| **v1.12.6** | 2026-05 | Build verification fix, dependency pinning | Released |
| **v1.12.0** | 2026-05 | Extraction rearchitected (~80% faster), dynamic batch limits, convergence detection | Released |
| **v1.11.0** | 2026-05 | llmReady gating, cancel ingestion, ribbon icon, double-nested link fix | Released |
| **v1.10.x** | 2026-05 | Aliases support, minimal/custom granularity, slug normalization | Released |
| **v1.9.x** | 2026-05 | 4-layer pollution defense, code quality upgrade (B+→A-), lint report enhancements | Released |
| **v1.8.x** | 2026-05 | Full i18n for 8 languages, dynamic download badge, rate limit detection | Released |
| **v1.7.x** | 2026-05 | Code quality milestone, 20 releases, lint UI freeze fix, modular refactoring | Released |
| **v1.6.x** | 2026-05 | Wiki output language, iterative batch extraction, query-to-wiki feedback | Released |
| **v1.4.0** | 2026-04 | Schema layer, auto-maintenance, ESLint compliance | Released |
| **v1.0.0** | 2026-04 | Multi-page generation, entity/concept extraction, bidirectional links | Released |
| **v1.15.0** | TBD | Wiki engine full-path tests, query engine core flow | Planned |

---

**Maintainer:** Greener-Dalii

**Evaluated & Rejected:**
- #38 Anthropic prompt caching — system prompts too small for cache threshold; `cacheBreakpoint` already handles main savings
- `getExistingWikiPages` cache bypass → Solve when it hurts
- `runLintWiki` 760-line method → Flat > Nested
- Custom YAML parser → Correct choice for Obsidian plugin constraints

### Implemented (v1.11.0) — Full Issue Resolution & UX Hardening

- **106 unit tests** via vitest: slugify (13), parseFrontmatter (9), detectRateLimitFailures (8), formatRateLimitNotice (2), cleanMarkdownResponse (8), enforceFrontmatterConstraints (13), parseJsonResponse (14), mergeFrontmatter (9), preserveFrontmatterReviewTag (4), isPageEmpty (5), detectPollutedPages (6), fixDoubleNestedWikiLinks (5), custom granularity (6), slug normalization (4)
- CI-ready: `pnpm lint && pnpm test && pnpm build && npx tsc --noEmit`
- Previously: **F (zero tests)** → v1.9.1: **B-** (pure functions) → v1.10.3: **B+** (106 tests)

### Implemented (v1.10.3) — Robustness & UX Improvements

**6 Issues Resolved (#34, #37, #40, #41, #43) + PageFactory Refactoring + Lint Enhancements**

- **#41 — 529 "Overloaded" retry**: Error messages embed HTTP status codes, retry regex includes `overload` keyword across all client classes.
- **#37 — Double-nested wiki-links**: Three-layer defense (prompt + post-processing + integrity check). `updateRelatedPage` returns `boolean`. Lint auto-fix for historical damage.
- **#43 — Cancel ingestion mid-run**: `AbortController` + batch checkpoints + status bar + command palette. Folder loop aware. Immediate Notice feedback.
- **#40 — Opposite-directory stubs**: Slug-equivalence matching in both LLM and deterministic stub safety nets.
- **#34 — Extraction prompt rewrite**: Graph-centric "wiki-link test" replaces document-centric criteria. Bibliographic references excluded.
- **PageFactory refactoring**: 8 methods → 4 generic (563→424 lines, -25%).
- **Lint cancel support**: Shared with ingest cancel infrastructure.
- **Double-nested link auto-fix**: Programmatic `[[[[...]]]]` detection across all wiki files during lint.

### Implemented (v1.9.0) — Pollution Defense & Quality Upgrade

**Pollution Defense System (4-layer)**
- L1 (write gate): Expanded regex catches both display-name and path-duplication patterns in `createOrUpdateFile`
- L2 (index purification): Filters polluted entries from all LLM input sources (fixDeadLink, fillEmptyPage, linkOrphanPage, buildPagesListForPrompt, resolvePagePath)
- L3 (stub sanitization): Strips folder prefixes from stub titles before file creation
- L4 (detection & repair): `detectPollutedPages()` scans existing pages; `fixPollutedPage()` renames + updates all incoming links
- "Fix polluted pages" button in Lint report + Smart Fix All Phase -1

**Code Quality Upgrade (B+ → A-)**
- P0: Removed `analyzeMerge` dead code (50 lines, zero callers); extracted `createLLMClient` factory; consolidated `updateRelatedPage` prompt into PROMPTS
- P1: `getText` type safety (`keyof typeof TEXTS.en`); ~130 console logs standardized to English; slider onChange partial refresh; CONTRIBUTING.md
- P2: Python Zen design principles + Key Design Decisions in CLAUDE.md; EngineContext interface comments

**Lint Report & UX**
- Missing aliases now listed per-page (was count only)
- Long source ingestion notice (>1000 lines)
- Modal 8-language support

### Implemented (v1.8.1) — UX Hardening

**Internationalization Expansion**
- Extended plugin UI from 2 languages (English, Chinese) to 8 languages (Japanese, Korean, German, French, Spanish, Portuguese)
- Created 6 new translation files (269+ fields each) with natural local expressions, proper technical terminology handling, and placeholder integrity
- All 8 language variants maintain sentence case compliance and formal style appropriate for software UI
- Language switcher dropdown now offers 8 options in all language interfaces

**Badge Automation**
- Dynamic download badge: README badges fetch real-time download counts from Obsidian's official `community-plugin-stats.json` via shields.io dynamic JSON badge
- Complete badge suite: 8 standardized badges (Version, License, Maintenance, Build, Obsidian Compatibility, Stars, Downloads, Languages, Providers) added to all README variants with consistent flat-square styling

**Settings UX**
- Language settings consolidation: Interface Language and Wiki Output Language grouped at top (Sections 1-2)
- Restart notice: All 8 language setting descriptions include explicit restart instructions for command palette language changes
- Language type expansion: Updated from `'en' | 'zh'` to 8-language union type with full dropdown UI

### Implemented (v1.7.20) — Code Quality Phase 1: 5 Deep Fixes + Modular Splits

**LLM prompt path leakage**
- Root cause: Two repair prompts (`mergeDuplicatePages`, `fillEmptyPage`) passed full file paths (`wiki/entities/DeepSeek-V3`) to LLM, causing it to misinterpret folder names as part of page titles
- Result: merged pages got polluted titles like `entitiesDeepSeek-V3-2`, `conceptsBiaozheng Xuexi`
- Fix: Removed `{{source_path}}` from mergeDuplicatePages and `{{page_path}}` from fillEmptyPage — LLM only needs body content and type, not file system paths
- Defense layer: Added contaminated alias filtering to reject aliases matching `entities*`, `concepts*`, `sources*` patterns, preventing existing pollution from spreading

### Implemented (v1.7.17) — Lint Performance + Smart Fix All Fixes

**Lint UI Freeze Resolution**
- Fixed 10-40 second UI blocking on large wikis (1200+ pages) during duplicate candidate generation
- Phase 1 frontmatter parsing: Added async yield every 50 pages
- Inner loop signal processing: Added async yield every 500 comparisons (covering sharedLinks/bigram calculations)
- Root cause: O(n²) algorithm with 743 comparisons per outer iteration, no yield points caused continuous blocking

**Smart Fix All Enhancements**
- Button count fix: `totalFixable` now includes `pagesMissingAliases` (Phase 0 aliases completion visible)
- Phase 0 added: Aliases completion runs before Phase 1 duplicate merge, ensuring aliases exist for duplicate detection
- Phase numbering: Aliases (Phase 0) → Duplicates (Phase 1) → Dead links (Phase 2) → Orphans (Phase 3) → Empty pages (Phase 4)

### Implemented (v1.7.13) — Aliases Unified Mechanism + README i18n

**Provider-Aware Model ID Filtering**
- Fixed OpenRouter: model IDs containing `/` (e.g., `openai/gpt-4o`) are now preserved
- Fixed Ollama: model IDs containing `:` (e.g., `qwen3.5:latest`) are now preserved
- Smart `getModelFilter()` function with provider-specific rules for all 10+ providers

**Alias-Aware Wiki Index & Query**
- `generateFlatIndex()` now reads each page's frontmatter `aliases` and appends them in backtick-brackets to index entries
- `selectRelevantPagesWithLLM` prompt updated with explicit alias-matching instruction
- Users upgrading from earlier versions should run "Regenerate index" to enable alias-aware search

### Implemented (v1.7.11) — Alias Infrastructure + Duplicate Detection Scaling

**Mandatory Page Aliases**
- All three page generation prompts require non-empty `aliases:` field with fallback hierarchy (translation → source name → original name)
- New `generateAliases` prompt for filling missing aliases on existing pages
- Alias deficiency detection in Lint with "Complete aliases" button and parallel batch processing

**Duplicate Detection Scaling**
- Removed `sharedSources` signal (62% false-positive rate from same-source pages)
- Raised `sharedLinks` Jaccard threshold from 0.25 to 0.4
- Semantic tiering: Tier 1 (crossLang, abbreviation, bigram ≥ 0.6) always verified; Tier 2 (bigram 0.4–0.6, sharedLinks ≥ 0.4) fills 15K token budget
- Token-budget batching: 100 candidates per batch at 4000 max_tokens, parallelized with configurable concurrency
- `DuplicateCandidate` interface with `signal` and `score` fields for clean tier classification

**Lint Enhancements**
- Smart Fix All: causality-ordered batch fix (duplicates → dead links → orphans → empty pages)
- Lint report modal redesigned with 4-layer button layout
- Report summary includes alias deficiency count

**Fixes**
- Frontmatter corruption: blank line after closing `---` in `enforceFrontmatterConstraints()` and `mergeDuplicatePages()`
- Frontmatter leaked to LLM in merge path: stripped before sending, prompt updated
- `minAppVersion` bumped to 1.6.6 for `FileManager.trashFile()` API
- `main.ts` fully migrated from legacy shim to complete plugin entry point

### Implemented (v1.7.10) — Knowledge Deduplication + Error Resilience

**Plan C Phase 1+2 — Duplicate Page Detection & Merge**
- Three-layer duplicate detection: Programmatic candidates (shared sources/links/bigram) → LLM title scan (cross-lingual) → LLM content verification
- Intelligent merge: LLM fuses content and discovers aliases, programmatic frontmatter merge, source page trashed, wiki-links rewritten
- Aliases infrastructure: Full aliases support in frontmatter parsing, merge, enforcement, dead link fallback
- Duplicate section in lint report with "Merge duplicates" action button

**5xx Retry & Error Resilience**
- LLM client retry on HTTP 5xx/429 with exponential backoff (max 2 retries) across all three clients
- Persistent progress notices across all lint/fix/ingest stages
- Per-item failure Notices across all fix loops

### Implemented (v1.7.9) — Supply Chain Security

- GitHub artifact attestations for cryptographic provenance verification of release assets

### Implemented (v1.7.8) — Obsidian Bot Review Compliance

- API compliance fixes (window.setTimeout, type safety), CSS format fixes
- Removed deprecated `builtin-modules` dependency

### Implemented (v1.7.7) — Save-to-Wiki Quality + Smart Batch Skip

- Conversation summary LLM generation (same quality as file ingestion)
- Duplicate save prevention via hash tracking
- Smart batch skip for already-ingested files
- Plugin ID renamed: `llm-wiki` → `karpathywiki`

### Implemented (v1.7.6) — Parallelization + Path Fixes

- Related page update parallelization (up to 3× faster)
- Hardcoded wiki path fixes in FileSuggestModal, FolderSuggestModal, query-engine

### Implemented (v1.7.3) — Ingestion Acceleration

- Configurable 1–5 concurrent page generation
- Verbatim source mentions preservation
- Enhanced entity/concept relationship sections

### Implemented (v1.7.2) — Intelligent Multi-Source Merge

- Programmatic frontmatter merge (sources appended, created preserved, updated refreshed)
- LLM intelligent body fusion with schema-guided sections
- Reviewed page minimal-append mode, NO_NEW_CONTENT signal

### Implemented (v1.7.1) — Multi-Folder Watch

- Multi-folder auto-watch with Web Clipper preset
- Semantic entity deduplication, granularity-linked iteration caps

### Implemented (v1.7.0) — Quality Milestone

- Content truncation protection (8000 max_tokens + auto-retry)
- Lint report and command palette i18n
- Batch ingest aggregated reports

### Earlier Versions (v1.6.x)

- Wiki Output Language (8 languages), English LLM prompts with language directive
- Iterative batch extraction, adaptive batch sizing, JSON output enforcement
- Dual-layer JSON parsing, Anthropic prompt caching
- Query-to-Wiki feedback, contradiction state machine, conversational ingest
- Schema layer, auto-maintenance, modular architecture

---

## Known Gaps (from Karpathy audit)

| # | Gap | Severity |
|---|-----|----------|
| 1 | Lint: no stale-claim detection | Medium |
| 2 | Lint: no missing-important-page detection | Medium |
| 3 | Lint: no suggested-questions output | Low |
| 4 | Lint: batch fix without per-item review | Medium |
| 5 | Ingest: no interactive "discuss key takeaways with user" before writing | Medium |
| 6 | Query: output format limited to markdown (no tables/slides/charts) | Low |
| 7 | Schema: rules-engine based, not co-evolved LLM instruction doc | Low |

---

## Next Milestone: v1.7.17 — Code Quality & Architecture Refactoring

**Priority shift:** v1.8.0 new features postponed. Focus on code quality, maintainability, and performance optimization before adding new capabilities.

---

### v1.8.0 — Code Quality Phase 1 (Immediate)

**Code Reuse Optimization**
- Create `src/constants.ts` for all frontmatter keys, wiki subfolders, magic numbers
- Add utility helpers to `src/utils.ts`: `getTodayDate()`, `WIKI_LINK_REGEX`, `normalizeWikiPath()`
- Reduce ~200 lines of duplicated code across 14 files

**Performance Fixes**
- lint-controller.ts: Use cached `getExistingWikiPages()` instead of direct calls (multiple reads per lint cycle)
- lint-fixes.ts: Limit `mergeDuplicatePages` vault scan to wiki folder only (currently scans entire vault)
- main.ts: Batch `isAlreadyIngested` checks (N+1 pattern → Set lookup)

**Architecture Simplification**
- prompts.ts: Parameterize entity/concept/summary page templates (`buildPagePrompt(type, fields)`)
- page-factory.ts: Generalize create/merge methods (`createPage(type, data)`, `mergePage(type, existing, new)`)

**Estimated impact:** Lint performance +30-50% (after Phase 1 caching/batching), maintainability significantly improved

### v1.9.0 — Phase 2: Shared Utilities + Concurrency (Requires Testing)

- llm-client.ts: Extract `withRetry<T>(fn, options)` wrapper (shared retry logic across 3 client classes)
- lint-controller.ts: Parallel dead link fixes with `Promise.allSettled` + concurrency control
- lint-controller.ts: Cache settings access (`wikiFolder` accessed 50+ times in single function)
- utils.ts: Flatten `parseFrontmatter` 4-level nesting → early returns + helpers
- lint-fixes.ts: Use existing `extractBody()` utility instead of inline regex

### v2.0.0 — Phase 3: Long-term Architecture Refactoring

- Extract `WikiLinkParser` class (`extractLinks()`, `validateLink()`, `resolveLink()`)
- Refactor `EngineContext` interface (split by concern or use Builder pattern)
- SSE parser utility for Anthropic/OpenAI clients
- Change detection guards in query-engine timer + lint regex compilation

### Implemented (v1.7.17) — Lint Performance Fix

**Known Issue: Lint UI Freeze (RESOLVED)**

**Original symptom:** Obsidian UI became unresponsive for 10-40 seconds during lint before reaching "checking duplicate pages" phase (1200+ page wikis).

**Root cause identified:** Duplicate candidate generation Phase 1 (frontmatter parsing) and inner loops (signal processing) had no yield points. Outer loop iteration took ~1.1 seconds with ~743 comparisons per iteration, causing continuous blocking.

**Fix applied:** Added two yield patterns:
- Phase 1: `await new Promise(resolve => window.setTimeout(resolve, 0))` every 50 pages during frontmatter parsing and link extraction
- Inner loops: Track `comparisonCount` across all sharedLinks/bigram loops, yield every 500 comparisons

**Result:** UI remains responsive throughout lint cycle, duplicate candidate generation no longer blocks event loop.

---

## Planned (Postponed)

### v1.10.0 — Conversational Ingest + Experience Polish

Karpathy: *"I like to do them one at a time, and be involved myself."*

- **Ingest Wizard** — Step-by-step guided ingest with user review before writing
- **Lint per-item review** — Preview LLM fix proposals before applying
- **Proactive schema suggestions** — After ingest, flag new types outside schema categories
- **Output format diversity** — Tables, comparison views

### v2.x — Long-term Vision

| Feature | Description |
|---------|-------------|
| Wiki Health Dashboard | Obsidian custom view with growth, link density, contradiction trends |
| Wiki Content Export | GraphML, JSON, static site formats |
| Agent Mode | Full auto-maintain lifecycle, proactive suggestions |
| Multi-modal Support | Images, PDF, audio/video knowledge extraction |

---

## Version Timeline

| Version | Date | Key Features | Status |
|---------|------|-------------|--------|
| **v1.13.0** | 2026-05 | Cross-type dedup, normalizeBatchResponse, aliases seeding, Three-No framework | Ready |
| **v1.12.6** | 2026-05 | Build verification fix, dependency pinning | Released |
| **v1.7.17** | 2026-05 | Lint UI freeze fix (async yield in Phase 1 + inner loops), Smart Fix All button count fix, Phase 0 aliases completion | Released |
| **v1.7.13** | 2026-05 | Provider-aware model filtering (OpenRouter/Ollama), alias-aware wiki index & query | Released |
| **v1.7.11** | 2026-05 | Mandatory page aliases, semantic-tier duplicate detection, token-budget batching, alias completion, Smart Fix All, frontmatter fixes | Released |
| **v1.7.10** | 2026-05 | Three-layer duplicate detection/merge, 5xx retry, persistent notices, error overhaul, tag validation | Released |
| **v1.7.9** | 2026-05 | GitHub artifact attestations (supply chain security) | Released |
| **v1.7.8** | 2026-05 | Obsidian Bot review compliance, API fixes, dependency cleanup | Released |
| **v1.7.7** | 2026-05 | Save-to-Wiki quality fixes, smart batch skip, plugin ID rename | Released |
| **v1.7.6** | 2026-05 | Related page parallelization, hardcoded path fixes | Released |
| **v1.7.5** | 2026-05 | TypeScript compilation fixes (20+ errors) | Released |
| **v1.7.3** | 2026-05 | Ingestion acceleration, verbatim mentions, schema optimization | Released |
| **v1.7.2** | 2026-05 | Programmatic frontmatter merge, intelligent content fusion | Released |
| **v1.7.1** | 2026-05 | Multi-folder watch, semantic dedup, granularity caps | Released |
| **v1.7.0** | 2026-05 | Content truncation protection, lint/command i18n, batch reports | Released |
| **v1.6.5** | 2026-05 | Wiki output language (8 languages), English LLM prompts | Released |
| **v1.6.2** | 2026-05 | Iterative batch extraction, granularity control, JSON enforcement | Released |
| **v1.4.0** | 2026-04 | Schema layer, auto-maintenance, ESLint compliance | Released |
| **v1.0.0** | 2026-04 | Multi-page generation, entity/concept extraction, bidirectional links | Released |
| **v1.9.0** | 2026-05 | 4-layer pollution defense, code quality upgrade (B+→A-), lint report enhancements, long source notice | Released |
| **v1.8.x** | — | ~~Quality upgrade~~ Merged into v1.9.0 | Superseded |
| **v1.10.0** | TBD | Ingest Wizard, lint per-item review, query keyword pre-filter | Planned |
| **v2.0.0** | TBD | Agent mode, multi-modal | Concept |

---

**Maintainer:** Greener-Dalii
