# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.7.17 | **Updated:** 2026-05-16

---

## Current Status

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

**方案C Phase 1+2 — Duplicate Page Detection & Merge**
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
| **v1.8.0** | TBD | Phase 1 refactoring: constants.ts, utils helpers, lint caching/batching | Planned |
| **v1.10.0** | TBD | Ingest Wizard, lint per-item review, output diversity | Planned |
| **v2.0.0** | TBD | Agent mode, multi-modal | Concept |

---

**Maintainer:** Greener-Dalii
