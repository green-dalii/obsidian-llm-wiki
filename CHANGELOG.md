# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.15.0] - 2026-06-03

### Added
- **Wiki auto-initialization UX (Issue #80)**: Wiki structure auto-creates on first successful LLM connection — no more "Generate Default Schema" button doing nothing on empty vaults. Settings panel shows real-time wiki init status (✅/⚠️).
- **`saveSummary` i18n**: Query-to-Wiki save dialog now uses localized summary strings across all 8 languages instead of hardcoded English/Chinese.

### Fixed
- **Issue #80**: Empty vault → "Generate Default Schema" button silently failed because `schema/` folder didn't exist. Now auto-creates via defensive `createFolder()`.
- **withRetry nesting**: Removed nested `withRetry` in truncation retry paths — reduced from max 9 calls to max 3 per client. Outer `withRetry` handles all network errors.

### Changed
- **Core architecture**: Extracted 2 new pure function modules to `src/core/`:
  - `sse-parser.ts` — shared SSE event parser for streaming responses (Anthropic + OpenAI formats)
  - `truncation-retry.ts` — shared token truncation retry policy (3 clients → 1 helper)
- **DRY fix**: Extracted `isWikiInitialized()` from duplicate code in `settings.ts`.
- **Dead code cleanup**: `promptIncludesConstraints` (zero callers) removed; `foundAliases` Array.isArray check simplified.
- **Constants**: `PAGES_CACHE_TTL_MS` centralized.
- **Test infrastructure**: +37 tests (446 total across 21 files), covering SSE parsing, AnthropicClient truncation, wiki initialization.

## [1.14.0] - 2026-06-01

### Added
- **Model compatibility expansion**: DeepSeek-R1, QwQ (reasoning models), and LM Studio now fully supported. Think token stripping (Issue #64) removes ` Schweizer

<think>`/`<thinking>` blocks from reasoning model outputs. LM Studio compatibility fix (Issue #65) removes unsupported `response_format: json_object` parameter.

- **Test infrastructure expansion**: Mock infrastructure (`createMockContext`, `createMockFile`) enables unit testing of core engine modules without Obsidian runtime. Total tests increased from ~200 to 400 (+200 tests), covering previously untestable core logic.

### Fixed
- **TypeScript type safety complete**: Fixed 8 type errors in `page-factory-core.test.ts` (interface completeness, null checks, parameter types). Project achieves TypeScript strict mode compliance.

- **Query engine stability**: Page content loading capped at 3000 tokens (MAX_PAGE_CONTENT_CHARS) to prevent token overflow in `loadRelevantPages`.

- **Dual Gate Verification Mechanism**: Upgraded quality gates to require both ESLint and TypeScript passing (0 errors + 0 warnings each). ESLint alone is insufficient for type safety.

### Changed
- **Core architecture refactoring**: Extracted 4 pure function modules to `src/core/` directory:
  - `conflict-resolver.ts` — zero-IO conflict detection
  - `dead-link-detector.ts` — dead link identification
  - `orphan-matcher.ts` — orphan page matching
  - `prompt-builders.ts` — prompt template builders
  
- **Constants centralization**: Centralized 30+ scattered magic numbers into `src/constants.ts` (192 lines). Activated semantic constants: WIKI_SUBFOLDERS, notice durations, token budgets, retry parameters.

- **lint-fixes.ts refactoring**: Extracted pure logic to core modules, reduced file complexity (~180 lines removed).

- **Documentation upgrades**:
  - TDD Standard: "write failing test first, then implementation"
  - Development Protocol: "plan first, then execute"
  - ROADMAP architecture quality upgrade plan
  - Dual Gate Verification documentation (ESLint + TypeScript both required)

- **Code quality**: 2576 lines added, 503 lines removed across 44 files. Zero side effects, zero breaking changes, backward-compatible refactorings.

## [1.13.0] - 2026-05-31

### Added
- **Extraction aliases seeding**: Entity and concept extraction now supports `aliases` field (optional). Pre-generated aliases serve as seeds for page generation and act as signals in multi-round extraction to prevent duplicate extractions. Contributed by @Indexed-Apogrypha (PR #61) and @green-dalii (PR #67).
- **Multi-round extraction context**: Non-first extraction rounds now receive a list of already-extracted names and aliases, enabling the LLM to reliably avoid duplicates even on small/local models that struggle to maintain session state.

### Fixed
- **Source analysis false abort (#61)**: First batch gate changed from `||` to `&&` — only aborts when BOTH entities and concepts are absent. Previously a glossary source (entities only, no concepts) would incorrectly abort. Contributed by @Indexed-Apogrypha (Matthew Harper).
- **Hidden TypeError on non-array LLM output**: `normalizeBatchResponse` uses typed `coerceToArray` to handle models returning `entities: true` (or similar non-array truthy values), preventing `TypeError` in downstream `.filter()` calls.
- **Alias self-pointing duplication**: `appendAliases` now skips aliases that equal the page's own filename, preventing redundant self-pointing frontmatter entries on cross-type collisions.

### Changed
- **NormalizeBatchResponse pure function**: Extracted 8 scattered `|| []` fallbacks into a centralized pure function with `BatchValidity` enum (`unusable`/`empty`/`valid`), improving testability and fixing edge case handling.
- **Prompt task 0 clarified**: Separated "field round restrictions" from "content requirements" — each is now an independent task item with front-loaded scope markers.
- **Generation prompt receives aliases seeds**: Page creation template now includes `{{extraction_aliases}}` field, enabling the LLM to build on pre-extracted alias suggestions.
- **Three-No Principle structured**: Replaced abstract manual-check descriptions with actionable evaluation procedures (call-site audit, data flow trace, state mutation analysis, breaking-change matrix).
- **Official blog links added**: All 8 READMEs now include links to the official blog (CHN: `/zh/blog/`, others: `/blog/`).

## [1.12.6] - 2026-05-30

### Fixed
- **Build verification failure**: CI workflow switched from `pnpm install + pnpm build` to `npm install --legacy-peer-deps + npm run build` to match Obsidian's verification system exactly. Root cause was different node_modules structures between pnpm and npm causing esbuild to embed different module path comments in `main.js`.
- **Dependency version pinning**: All dependencies now use exact versions (no `^` ranges or `latest` tag). This prevents lockfile drift between `pnpm-lock.yaml` and `package-lock.json`, ensuring reproducible builds across environments.

### Changed
- **CI Node version**: Updated from `24.x` to `22.x` for stability and compatibility.

## [1.12.5] - 2026-05-30

### Fixed
- **Cross-folder entity/concept duplicates prevented (#54)**: `resolvePagePath()` now checks the opposite folder (entities ↔ concepts) when same-type matching fails. When a cross-type collision is found, a new file is no longer created — instead the new content (summary, mentions, sources) is merged into the existing page of the opposite type, and the name is appended as an alias. No more duplicate pages for the same topic in both folders, and no silent loss of ingested information. Contributed by @dmarchevsky.
- **Historical cross-type duplicate detection in Fast path 1**: When the same-type exact slug match hits, the opposite folder is also checked. If a historical duplicate exists (e.g. both `entities/foo.md` and `concepts/foo.md` existed before this release), an alias is bridged and a warning is logged.
- **IngestReportModal now displays collisions**: The ingestion report modal now includes a "Cross-type collisions" section listing all items that were merged as aliases. Previously collision info was aggregated but never displayed in the batch report.
- **Redundant I/O eliminated**: Cross-type collision detection now uses in-memory path matching from `allPages` instead of an additional `tryReadFile()` call, reducing I/O by one file read per extraction.

### Changed
- **Type-safe i18n access**: Added `getText()` helper to `utils.ts` — replaces 13 instances of `as unknown as Record<string, string>` across 6 files, making missing i18n keys detectable at compile time rather than runtime fallbacks.
- **README Usage section**: Added sidebar button ingestion method to all 8 language variants (EN/ZH/JA/KO/DE/FR/ES/PT).
- **Tests**: Added 8 unit tests for `getText()` (multi-language retrieval, placeholder replacement, fallback behavior). Total: 173 tests.

## [1.12.1] - 2026-05-28

### Fixed
- **Query modal auto-save prompt disabled**: Closing the Query window no longer triggers LLM evaluation and SuggestSaveModal prompt.
- **Lint status bar text corrected**: Status bar now shows "Linting... click to cancel" instead of "Ingesting... click to cancel" during lint operations.
- **Notice toast i18n completed**: All remaining hardcoded English notices converted to i18n (`mdOnlyFile`, `lintPollutedFixed`, `regenerateIndexCompleted`, `operationFailed`). 8-language coverage.

### Added
- **`packageManager` field**: Added to `package.json` for unambiguous pnpm usage.
- **4 lint scanner functions extracted & tested**: `buildKnownTargets`, `scanDeadLinks`, `scanOrphans`, `detectAliasDeficiency` extracted to `src/wiki/lint/scanners.ts` with zero Obsidian dependencies. 15 unit tests.
- **PageFactory error context**: `createNewPage`, `mergePage`, `appendToReviewedPage` now wrap errors with entity name and operation type for better diagnostics.
- **165 unit tests** (+25 since v1.12.0): scanners (15), escapeRegex (3), normalizeFrontmatterDates (4), extractBody (3), computeSlug (3).

### Changed
- **Privacy & Transparency sections**: Added localized Privacy & Security + Transparency & Compliance sections to all 8 READMEs.
- **Obsidian score**: Updated to 95/100 across all READMEs.
- **Branch protection workflow**: Documented in CLAUDE.md and memory. Main branch requires PR-based merges.

## [1.12.0] - 2026-05-27

### Added
- **Extraction prompt rearchitected**: Full page list removed from prompt. Extraction speed independent of wiki size (~80% faster).
- **Dynamic batch limits + convergence detection**: Short content finishes in 1–2 batches. Low-yield batches terminate early.
- **Short-content auto-downgrade**: Sources <20K chars cap maxTotalItems proportionally.
- **Deterministic related_pages matching**: `matchExtractedToExisting()` uses slug + alias matching — zero LLM cost.
- **build:dev command**: One-shot dev build with debug output preserved.
- **Silent slug operations**: Eliminates ~30K lines of debug output per ingestion.

### Changed
- **esbuild upgraded**: 0.17.3 → 0.28.0 (dev-server vulnerability fixed).
- **Production build suppresses console.debug**: Clean logs in production.
- **Granularity ≤ notation**: 8 languages synchronized.
- **140 tests** across 3 test files (+27 since v1.11.0).

### Evaluated & Rejected
- Hexagonal Architecture — over-engineering for Obsidian plugin
- Vector search (Ollama embeddings) — <1% of users have this
- Hash-bucket dedup optimization — no user-reported perf issue
- page-factory try/catch completion — exceptions handled at wiki-engine level
- API URL validation — Obsidian's requestUrl already validates

## [1.11.0] - 2026-05-26

### Added
- **llmReady gating (#42)**: New users must complete Provider → API Key → Fetch Models → Test Connection before core features unlock.
- **Cancel ingestion mid-run (#43)**: `AbortController` with batch boundary checkpoints.
- **Ribbon icon + ingest current file (#44)**: One-click ingest of active editor tab.
- **Lint double-nested link auto-fix**: Programmatic detection across all wiki files, zero LLM cost.
- **Opposite-directory stubs (#40)**: Slug-equivalence matching in stub safety nets.
- **Extraction prompt rewrite** (#34): Graph-centric "wiki-link test". Bibliographic references excluded.
- **`mentions_in_source` filtering** (#39): Capped at 500 chars.
- **529 Overload retry** (#41): All clients cover overload keyword.
- **PageFactory refactoring**: 8 methods → 4 generic (563→424 lines, -25%).
- **LLM client retry extraction**: Shared `withRetry<T>` helper.
- **113 unit tests** via vitest.

### Fixed
- **#37 Double-nested wiki-links**: Three-layer defense.
- **#38 Anthropic prompt caching**: Evaluated & rejected — system prompts too small for cache threshold.

## [1.10.x] - 2026-05-20

### Added (v1.10.0)
- **Aliases support** (#30/#31): EntityInfo/ConceptInfo.aliases? for cross-language dedup.
- **Minimal + Custom granularity**: 5 levels (Minimal/Coarse/Standard/Fine/Custom).
- **Slug normalization in resolvePagePath** (#32): Fast path 2 checks title + aliases.

### Fixed (v1.10.x)
- **Custom granularity per-type limits ignored** (v1.10.2): In custom mode, entity and concept limits now enforced separately.
- **Numeric inputs accepting text** (v1.10.0): Custom limit and conversation history inputs now restricted to numbers.
- **Aliases omitted in duplicate detection** (#30): analyzeSource and resolveEntityDedup now include aliases.

## [1.9.x] - 2026-05-19

### Added (v1.9.0)
- **Pollution defense system (4-layer)**: Write gate → index purification → stub sanitization → detection & repair.
- **"Fix polluted pages" in Lint report**: One-click repair.
- **Missing aliases section in Lint report**: Lists each page individually.
- **Long source ingestion notice**: Files >1000 lines trigger persistent Notice.

### Fixed (v1.9.1)
- **`renderComponent` memory leak in QueryModal**: Fixed dangling component.
- **`createMessageStream` language type**: 3 client implementations now accept 8 languages.
- **Missing i18n keys in zh.ts**: Added `lintNoIssuesFound` and `lintContradictionOpen`.
- **Batch delay default**: 300ms → 500ms.

## [1.8.x] - 2026-05-17/18

### Added (v1.8.0/v1.8.1)
- **Full i18n for 8 languages**: 269+ UI fields. English, Chinese, Japanese, Korean, German, French, Spanish, Portuguese.
- **Dynamic download badge**: Real-time counts from Obsidian's community-plugin-stats.json.
- **Complete badge suite**: 8 standardized badges across all READMEs.
- **Rate limit detection**: HTTP 429 errors trigger actionable suggestions.
- **Smart Fix All completion modal**: Per-phase results report.

### Fixed (v1.8.1)
- **Single-value aliases crash**: YAML frontmatter with `aliases: single-value` now normalized.
- **README command accuracy**: Usage table corrected across all 8 language READMEs.

## [1.7.x] - 2026-05-06 to 2026-05-17 (Code Quality Milestone)

### Highlights
- **Quality Milestone** (v1.7.0): Content truncation protection, lint/command i18n, batch reports.
- **Multi-source merge** (v1.7.2): Programmatic frontmatter + LLM intelligent fusion.
- **Ingestion acceleration** (v1.7.3): Configurable 1–5 concurrent page generation.
- **Parallelization + path fixes** (v1.7.6): Related page update parallelization.
- **Save-to-wiki quality** (v1.7.7): Smart batch skip, plugin ID rename `llm-wiki` → `karpathywiki`.
- **Supply chain security** (v1.7.9): GitHub artifact attestations.
- **Knowledge dedup + error resilience** (v1.7.10): 5xx retry, persistent notices.
- **Mandatory page aliases** (v1.7.11): Alias deficiency detection, "Complete aliases" button.
- **README i18n (8 languages)** (v1.7.13): Provider-aware model filtering, alias-aware index.
- **Query modal overhaul** (v1.7.14): Cmd+Enter to send, Stop button, Copy button, auto-scroll.
- **Lint UI freeze fix** (v1.7.15/17): Async yield points every 50 pages and 500 comparisons.
- **Pollution fix** (v1.7.18/20): Folder name leakage defense layer, alias convergence.
- **Lint modular refactoring** (v1.7.19): Split monolithic files into 4 focused modules.

### Fixed
- **#37 Double-nested wiki-links**: Three-layer defense.
- **#40 Opposite-directory stubs**: Slug-equivalence matching.
- **#43 Cancel ingestion mid-run**: `AbortController` + batch checkpoints.
- **#14 OpenRouter/Ollama model filtering**: Provider-aware smart filter.

## [1.6.x] - 2026-04-29 to 2026-05-03 (Internationalization & Performance)

### Added
- **Wiki Output Language (8 languages)**: English LLM prompts with language directive.
- **Iterative batch extraction**: Adaptive batch sizing, JSON output enforcement.
- **Dual-layer JSON parsing**: Robust error recovery.
- **Query-to-Wiki feedback**: Contradiction state machine, conversational ingest.

### Changed
- **Schema layer**: Auto-maintenance, modular architecture.

## Earlier Versions (v1.4.0–v1.5.x)

- v1.4.0 (2026-04-29): Schema layer, auto-maintenance, ESLint compliance
- v1.3.0 (2026-04-28): Modular architecture refactor
- v1.2.0 (2026-04-27): Bidirectional links, entity/concept extraction
- v1.0.0 (2026-04-26): Multi-page generation, foundational architecture

## [0.2.0–0.2.2] - Earlier Beta

- Initial plugin development and concept validation.

