# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.18] - 2026-05-16

### Fixed
- **Critical: Folder name leakage in LLM prompts**: LLM was receiving full file paths in two repair prompts, causing systematic folder name pollution in generated titles and content.
  - `mergeDuplicatePages`: Removed `{{source_path}}` parameter — LLM misinterpreted `wiki/entities/DeepSeek-V3` as page title, producing polluted titles like `entitiesDeepSeek-V3`, `concepts表征学习`
  - `fillEmptyPage`: Removed `{{page_path}}` parameter — same root cause, LLM doesn't need file system paths for content generation
- **Defense layer**: Added contaminated alias filtering that rejects aliases matching `entities*`, `concepts*`, `sources*` patterns, preventing existing pollution from spreading through future merges

## [1.7.17] - 2026-05-16

### Fixed
- **Smart Fix All missing aliases phase**: Added Phase 0 aliases completion before duplicate detection, ensuring Tier 1 signals (crossLang, abbreviation) work correctly. Previously, Smart Fix All skipped aliases → duplicate detection missed true duplicates → downstream fixes incomplete
- **Lint UI freeze on large wikis (10-40s blocking)**: Added async yield points in duplicate candidate generation Phase 1 (frontmatter parsing + link extraction, yield every 50 pages) and Phase 2-3 inner loops (yield every 500 comparisons). Obsidian UI thread now regains control every 0.75-1.5 seconds on 1500+ page wikis

## [1.7.16] - 2026-05-15

### Fixed
- **Obsidian Bot timer compliance**: Replaced all `activeWindow.setTimeout`/`activeWindow.clearInterval` with `window.*` equivalents. The local `eslint-plugin-obsidianmd` v0.2.8 enforces `activeWindow.*` via `prefer-active-window-timers`, but the Obsidian Bot runs a newer/different rule that enforces `window.*` — these two rules are in direct conflict. `window.*` satisfies both sides (local plugin only flags bare `setTimeout()`, not `window.setTimeout()`)
- Added custom `no-restricted-syntax` ESLint rule to catch `activeWindow.*` timer usage locally, preventing future regressions before they reach the Bot

## [1.7.15] - 2026-05-15

### Fixed
- **Obsidian Bot review compliance**: Updated `pnpm lint` script to `--max-warnings=0` matching Obsidian Bot's strict mode; fixed `pnpm-lock.yaml` stale entries
- **Lint UI freeze**: `generateDuplicateCandidates` (O(n²) pairwise comparisons) now runs asynchronously with event-loop yield points every 200 outer iterations, preventing renderer thread blocking on large wikis (1200+ pages). Page reading batched to 200 files per batch to reduce I/O contention
- **Type safety**: Added `await` to `generateDuplicateCandidates` call site in `lint-controller.ts` (async return type mismatch caused all `DuplicateCandidate` accesses to resolve as `any`)

## [1.7.14] - 2026-05-15

### Fixed
- **#17 CORS errors for OpenAI compatible endpoints**: Replaced `openai` npm SDK (browser `fetch()`, CORS-bound) with `requestUrl()`-based `OpenAICompatibleClient` across all non-Anthropic providers. The `requestUrl()` API delegates to Obsidian's Main process (Node.js), bypassing browser CORS restrictions entirely. Also rewrote model fetching in settings to use `requestUrl()`. This eliminates `x-stainless-timeout` header preflight failures and `Access-Control-Allow-Origin` rejections
- **Query modal `.modal-header` blank space**: Hidden via CSS to remove unused header area
- **Markdown rendering in Query not matching Obsidian**: Root cause was stale Component lifecycle — reusing the same `Component` across streaming chunks accumulated orphaned child components, causing tables and complex elements to render without proper styles. Fixed by creating a fresh `Component` per render call and explicitly disposing old ones. Added `markdown-reading-view` CSS class to message body containers for theme style compatibility. Added comprehensive explicit CSS for tables (border-collapse, th/td borders, alternating row backgrounds, code blocks, blockquotes) using Obsidian CSS variables

### Added
- **Query progress indicator overhaul**: Five-phase progress display with real-time updates:
  - "Analyzing Wiki index..." → "Found 3 pages: Attention, Transformer, CSA" → "Loading page content..." → "Context ready" → "Generating... (elapsed 25s)"
  - Page names displayed in found-pages phase, persisted into generating phase
  - Elapsed time counter updates every second during generation
  - Non-streaming mode clearly labeled with "Non-streaming mode, generating... (elapsed Xs)"
- **Cmd+Enter to send / Stop button**: Send now requires Cmd+Enter (Ctrl+Enter on Windows) to prevent accidental sends. Button shows keyboard shortcut hint. During LLM processing, send button transforms into red "Stop" button. Stopping preserves input text for editing
- **Copy button**: Each assistant message has a hover-visible "Copy" button that copies raw markdown to clipboard with "Copied!" feedback
- **Auto-scroll**: Chat history automatically scrolls to bottom on new messages and during streaming

### Changed
- Query modal padding removed, overflow fixed to eliminate page-level scrollbar
- `queryModalPlaceholder` simplified (shortcut hint moved to button)
- All progress texts synchronized between English and Chinese

### Removed
- `openai` npm dependency (no longer imported anywhere in src/)
- `docs/OBSIDIAN_SUBMISSION_GUIDE.md` and `docs/SECURITY.md` (outdated, not relevant for end users)

## [1.7.13] - 2026-05-15

### Fixed
- **Query alias-based page lookup**: Wiki index (`index.md`) now includes aliases for every page, and the LLM page selector prompt explicitly instructs matching by aliases. Fixes the case where "DSA" query returned no results despite `DeepSeek-Sparse-Attention` page having "DSA" alias
- **OpenRouter model filtering bug (#14)**: Model IDs containing `/` (e.g., `openai/gpt-4o`) were incorrectly filtered out, preventing OpenRouter users from selecting correct models
- **Ollama model filtering bug**: Model IDs containing `:` (e.g., `qwen3.5:latest`) were incorrectly filtered out, preventing Ollama users from selecting tagged models
- Implemented provider-aware smart filter: OpenRouter preserves `/`, Ollama preserves `:`
- **Aliases unified mechanism**: Fixed `fixDeadLink` creating stubs with hardcoded `aliases: []`, `fillEmptyPage` prompt now requires alias generation (no longer passive "preserve"), `enforceFrontmatterConstraints` empty array check fixed. All fix paths now use the same 3-tier fallback (Wiki language translation → alternative names → abbreviations)

### Changed
- `generateFlatIndex()` now reads each page's frontmatter `aliases` and appends them in backtick-brackets (`[alias1, alias2]`) to index entries
- `selectRelevantPagesWithLLM` prompt updated with explicit alias-matching instruction

### Added
- **README internationalization**: 8-language README expansion (English, Chinese, Japanese, Korean, German, French, Spanish, Portuguese) following Apple translation standards (信达雅: accurate, fluent, professional)
- Root directory: `README_JA.md` (Japanese), `README_KO.md` (Korean), `README_DE.md` (German)
- `docs/` directory: `README_FR.md` (French), `README_ES.md` (Spanish), `README_PT.md` (Portuguese)
- All technical terms kept in English (Wiki-links, Schema, Lint, Entity, Concept, Provider, Model, max_tokens)
- Official site link unified: https://llmwiki.greenerai.top/ in all language versions
- Language navigation header with mutual cross-links across 8 languages
- Interface Language i18n expansion plan (Phase 1-3, zero side effects) documented in project memory

## [1.7.11] - 2026-05-15

### Fixed
- **Lint duplicate detection 500 error on large wikis**: Removed low-quality `sharedSources` signal (generated 11K+ false-positive candidates), raised `sharedLinks` Jaccard threshold from 0.25 to 0.4, implemented semantic tiering with token-budget batching for LLM verification
- **Frontmatter corruption**: Fixed missing blank line between closing `---` and body in `enforceFrontmatterConstraints()` and `mergeDuplicatePages()` LLM output path
- **Frontmatter leaked to LLM in merge**: Stripped frontmatter before sending page content to LLM in `mergeDuplicatePages()`, updated prompt to clarify body-only input
- **minAppVersion**: Bumped from 1.4.0 to 1.6.6 for `FileManager.trashFile()` API

### Added
- **Mandatory aliases in page generation**: All three page generation prompts (`generateEntityPage`, `generateConceptPage`, `generateSummaryPage`) now require at least 1 alias with fallback hierarchy (translation → source name → original language name)
- **`generateAliases` prompt**: New LLM prompt for filling missing aliases on existing pages via Lint
- **Alias deficiency in Lint**: Detects entity/concept pages without `aliases:` frontmatter field, reports in summary and prepended to report body, "Complete aliases" button with parallel batch processing
- **Semantic tiering for duplicate candidates**: Tier 1 (crossLang, abbreviation, bigram ≥ 0.6) always sent; Tier 2 (bigram 0.4-0.6, sharedLinks ≥ 0.4) fills remaining token budget (15K input tokens)
- **Parallel batch LLM verification**: Duplicate candidates split into batches of 100, processed with configurable concurrency via `Promise.allSettled`, batch-level error isolation
- **`DuplicateCandidate` interface**: Structured candidate with `signal` and `score` fields for tier classification
- **Smart Fix All button**: Batched causality-aware fix (duplicates → dead links → orphans → empty pages) in Lint report modal
- **Console logging for alias completion**: `[Alias]` prefix batch/per-page/summary logs

### Changed
- **Lint report modal redesigned**: 4-layer button layout (pre-flight aliases → causality-ordered fixes → smart fix all → schema analysis)
- **Lint report summary**: Now includes `{aliasesMissing}` count alongside duplicates, dead links, orphans, empty pages
- **main.ts**: Fully migrated from legacy shim to complete plugin entry point
- **CLAUDE.md**: Updated project structure and phase documentation

## [1.7.10] - 2026-05-14

### Added
- **Knowledge deduplication — 方案C Phase 1+2**: Three-layer duplicate page detection and intelligent merge
  - Layer 1: Programmatic candidate generation (shared sources, shared wiki-links, title bigram similarity)
  - Layer 2: LLM title scan for cross-lingual/translation/abbreviation detection
  - Layer 3: LLM content verification of merged candidates
  - Duplicate section in lint report with "Merge duplicates" action button
  - Intelligent merge: LLM fuses content, discovers aliases from both pages, programmatic frontmatter merge (sources appended, updated refreshed)
  - Source page deleted after merge, all wiki-links rewritten to target
- **Aliases infrastructure**: `mergeFrontmatter()` and `enforceFrontmatterConstraints()` preserve aliases, `getExistingWikiPages()` reads aliases from frontmatter, `fixDeadLink` fallback checks aliases for case-insensitive matching
- **5xx retry mechanism**: All three LLM clients (`AnthropicClient`, `AnthropicCompatibleClient`, `OpenAIClient`) retry on HTTP 5xx/429 errors with exponential backoff (max 2 retries)
- **Persistent progress notices**: All lint/fix/ingest stages use `new Notice('', 0)` + `setMessage()` pattern with per-item detail (target page, source, etc.)
- **Error handling overhaul**: Per-item failure Notices (8s duration) with specific error messages in all fix loops (dead links, empty pages, orphans, merges); duplicate detection failure shows persistent Notice with error detail; outer catch blocks show error context
- **Tag validation**: `enforceFrontmatterConstraints()` validates tags against schema-defined subtypes (`VALID_ENTITY_TAGS`, `VALID_CONCEPT_TAGS`), falls back to defaults for invalid values
- `deleteFile` in EngineContext interface, implemented via `vault.trash()`

### Changed
- `getExistingWikiPages()` is now async and returns `aliases` array alongside each page entry
- `FrontmatterData` interface includes optional `aliases: string[]`
- All lint fix callbacks use `for...let i` loops with proper indices for progress reporting
- Ingestion progress uses persistent `showProgress()` instead of timed Notices
- `lintDuplicateCheckFailed` replaced with detailed `lintDuplicateCheckFailedDetail` i18n text

### Fixed
- **500 error with no retry**: Previously, HTTP 5xx errors from LLM providers were not retried (only network errors were). Now all 5xx/429 errors trigger automatic retry
- **Missing error Notices**: Dead link fix, orphan linking, and merge fix loops previously only logged errors to console without user-visible feedback
- **Duplicate detection false negatives**: Cross-lingual duplicates (e.g. "CoT" vs "思维链") were previously undetected by programmatic-only checks
- **Merge not preserving aliases/sources/updated**: Merged pages now correctly append sources (dedup), add LLM-discovered aliases, and refresh `updated` date

---

## [1.7.9] - 2026-05-13

### Added
- **GitHub artifact attestations** — Added cryptographic provenance verification for release assets (supply chain security)
  - Workflow now generates attestations for `main.js` and `styles.css` using `actions/attest-build-provenance@v1`
  - Users can cryptographically verify assets were built from source repository
  - Added workflow permissions: `attestations: write`, `id-token: write`
  - Meets Obsidian community plugin submission security requirements
  - Reference: https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds

---

## [1.7.8] - 2026-05-13

### Added
- **GitHub artifact attestations** — Added cryptographic provenance verification for release assets
  - Workflow now generates attestations for `main.js` and `styles.css` using `actions/attest-build-provenance@v1`
  - Users can verify assets were built from source repository (supply chain security)
  - Added workflow permissions: `attestations: write`, `id-token: write`
  - Meets Obsidian community submission security requirements

### Fixed
- **Obsidian Bot review compliance** — Addressed all warnings from official Obsidian community submission review
  - Replaced `activeWindow.setTimeout` with `window.setTimeout` across 7 locations (llm-client, auto-maintain, wiki-engine) per Obsidian API guidelines
  - Added type safety to `loadData()` result in main.ts with `Partial<LLMWikiSettings> | null` assertion
  - Fixed unsafe member access on `savedData.wikiLanguage` by proper type assertion
  - Expanded short hex color formats in styles.css (4 locations: #666→#666666, #ddd→#dddddd, #999→#999999) for consistency
  - Removed unused `_retryError` parameter in catch block (wiki-engine.ts)

### Changed
- **Removed deprecated dependency** — Replaced `builtin-modules` package with Node.js native `module.builtinModules` API in esbuild config
  - Eliminated third-party dependency, using built-in Node.js (v16+) functionality
  - No functional changes to build output

---

## [1.7.7] - 2026-05-12

### Added
- **Smart skip mechanism for batch ingestion**: Automatically detects and skips already-ingested source files in folder batch operations
  - Primary check: Wiki/sources page exists with matching slug → considered ingested
  - Secondary check: Optional strict verification via frontmatter sources array
  - Conservative fallback: If wiki page exists but frontmatter is missing/malformed, still skip to protect user edits
  - Batch ingest report now shows skipped file count: "跳过（已摄入）：X/Y"
  - Toast notifications: "跳过 X/Y 个已摄入文件，正在摄入 Z 个新文件..."

### Fixed
- **Conversation summary page template mismatch**: Summary pages generated from Query Wiki now use LLM prompts (same as file ingestion) instead of hardcoded templates
  - Now uses `PROMPTS.generateSummaryPage` with proper schema context and section labels
  - Frontmatter now includes `updated` field, consistent with file ingestion
  - Sources array properly populated with conversation metadata

- **Duplicate save prompts on Query Wiki**: Modal now tracks conversation hash to prevent re-evaluation of unchanged conversations
  - Added `lastOfferedQueryHash` to settings
  - Hash computed from conversation messages, checked before LLM evaluation
  - Updated on both save suggestion and successful save

- **Progress notice stuck on "Generating index..."**: Save-to-wiki operations now guarantee notice dismissal
  - Both `saveToWiki()` and `doSave()` use try-finally for cleanup
  - Progress callback wired to notice in both paths
  - Error handling always hides notice before showing error message

- **Conversation save report missing**: `ingestConversation()` now returns `IngestReport` (same as file ingestion)
  - Added `onDone` callback to `EngineContext` for unified report handling
  - Save success notice shows entity/concept count: "3 实体, 2 概念, 6 页"
  - Report includes elapsed time, created pages, failed items, contradictions

- **Notice messages hardcoded in English**: All Notice() calls now respect Interface Language setting
  - Added 7 new i18n texts for auto-maintain, query, and batch ingest notices
  - `auto-maintain.ts`: 7 notices converted to TEXTS system
  - `query-engine.ts`: 5 notices converted, removed inline ternary operators
  - `ui/settings.ts`: 1 notice converted
  - Chinese translations added for all new texts

### Changed
- **Plugin ID renamed**: `llm-wiki` → `karpathywiki` to avoid conflict with existing plugin and align with Obsidian naming guidelines
  - Updated in `manifest.json` and `package.json`
  - Plugin folder name in installation instructions changed from `llm-wiki` to `karpathywiki`
  - README.md and README_CN.md installation steps updated
  - No functionality changes — only identifier update for community submission

---

## [1.7.6] - 2026-05-09

### Added
- **Related page update parallelization**: Stage 4 now processes related pages in configurable parallel batches using `Promise.allSettled` for error isolation
  - Reuses existing `pageGenerationConcurrency` setting (1-5, default 1) for batch size control
  - Reuses `batchDelayMs` setting for inter-batch API rate limit protection
  - Per-page automatic retry with 2s delay on failure; single page failure doesn't block the batch
  - Real-time progress tracking with per-page status callbacks

### Fixed
- **Hardcoded wiki folder paths**: Several UI components used hardcoded `'wiki'` string instead of the user-configurable `wikiFolder` setting
  - `FileSuggestModal` and `FolderSuggestModal` now accept `wikiFolder` constructor parameter, correctly filtering wiki files from source selection
  - `query-engine.ts` wiki-link format instructions now use `settings.wikiFolder` dynamically in LLM prompts (e.g., `[[myWiki/entities/...]]` instead of always `[[wiki/entities/...]]`)
  - All 3 callers updated: `main.ts` (2 sites), `settings.ts` (1 site)

---

## [1.7.5] - 2026-05-09

### Fixed
- **TypeScript compilation errors** — Fixed 20+ type errors across the codebase
  - `wiki-engine.ts`: Fixed `SchemaTask` type mismatches and null safety issues
  - `query-engine.ts`: Added proper `Component` instance for `MarkdownRenderer.render()`
  - `auto-maintain.ts`: Fixed `metadataCache.on('resolved')` callback signature
  - `modals.ts` & `settings.ts`: Fixed `TEXTS` type assertions for nested i18n objects

---

## [1.7.2] - 2026-05-08

### Fixed
- **Critical: Multi-source knowledge loss on page update**
  - Frontmatter `sources` array now programmatically appended (not overwritten) when updating existing pages
  - `created` date preserved, `updated` date refreshed on each source addition
  - `reviewed: true` flag preserved in frontmatter
  - Sources maintain chronological order with deduplication

### Changed
- **Intelligent content merge architecture** (replaces simple overwrite)
  - New pages: Full LLM-generated content with complete structure
  - Existing pages: LLM performs intelligent body merge following schema-defined sections
  - Reviewed pages: Minimal append-only mode preserving user edits
  - `NO_NEW_CONTENT` signal allows skipping redundant updates when source adds nothing new
- **New prompts**:
  - `mergeEntityPage`: Schema-guided intelligent merge with contradiction preservation
  - `mergeConceptPage`: Same for concept pages
  - `appendToReviewedPage`: Minimal mode for user-reviewed content
- **Schema task**: Added `'merge'` task type for selective schema injection during content fusion

### Deprecated
- Removed `preserveFrontmatterReviewTag()` (superseded by `mergeFrontmatter()`)
- Removed old `analyzeMerge()` / `buildMergeStrategyText()` methods (superseded by new architecture)

## [1.7.1] - 2026-05-08

### Added
- **Multi-folder auto-watch**: `watchedFolders` array replaces single `watchedFolder`; users can watch any number of folders via "Add Folder" buttons in settings
- **Web Clipper preset**: one-click button adds `Clippings/` folder to watch list for seamless web-clip auto-ingestion
- **Semantic entity deduplication**: `resolvePagePath()` uses LLM fallback when slug matching fails, handling translations ("Tsinghua University" ↔ "清华大学"), abbreviations, and renamings
- **Granularity-linked iteration caps**: `coarse`/`standard`/`fine` now control batch count (3/6/12), per-batch quota (10/20/30), and cumulative soft ceiling (20/50/unlimited) — prevents runaway extraction in standard mode
- **Ingestion Notice feedback**: single-file and folder-ingest commands now show `Notice` with duration guidance so users know the operation is running
- **Network error actionable messages**: after 3 retries, OpenAI client reports specific causes (VPN, SSL/TLS, firewall, incorrect URL) and suggests using "Test Connection"

### Fixed
- **Entity name translation leak**: `langHint` now excludes names from language requirement — entity/concept names preserve source language, summaries/descriptions follow `wikiLanguage`
- **Premature iteration stop**: changed from `rawTotal < currentBatchSize` to `newTotal === 0` (post-deduplication), so legitimate duplicates no longer abort extraction early
- **`fillEmptyPage` "file not found"**: pre-read content passed directly from lint phase to fix callback, bypassing string→TFile resolution entirely
- **Settings `watchedFolders` array type migration**: older installs with string `watchedFolder` auto-reset to `[]` on load
- **Auto-maintain settings sync**: `saveSettings()` now propagates settings reference to `autoMaintainManager`, fixing stale-folder bugs after settings changes
- **Auto-maintain startup noise**: `workspace.onLayoutReady()` gates watcher registration, preventing false triggers from existing files on plugin load
- **metadataCache duplicate events**: mtime-level deduplication (`lastSeenPaths`) prevents double-ingestion on external drag-drop

### Changed
- **analyzeSource prompt quality**: summary target 100-200 → 150-250 words; item summaries 2-4 → 4-6 sentences; `mentions_in_source` now requires 2-4 verbatim source quotes with surrounding context
- **Expanded network error detection**: `ssl`, `tls`, `protocol_error` added to `isNetworkError()` regex

## [1.7.0] - 2026-05-06

### Added
- **Content truncation protection**: all page-generation `max_tokens` raised from 1500/2000 → 8000 (entity, concept, summary, fillEmptyPage, updateRelatedPage); Anthropic `stop_reason` and OpenAI `finish_reason` detection with automatic retry at 2x tokens (cap 16000) across all 3 LLM clients
- **Entity/concept breakdown in ingest reports**: `IngestReport` now includes `entitiesCreated` / `conceptsCreated` counts, displayed in `IngestReportModal`
- **Batch ingest aggregated report**: folder ingest collects per-file reports and shows a single merged `IngestReportModal` at completion

### Fixed
- **`fillEmptyPage` persistent "file not found"**: pre-read content now passed directly from lint phase to fix callback, bypassing string→TFile resolution entirely; empty-string content (zero-byte files) handled correctly
- **Frontmatter `updated` date**: `normalizeFrontmatterDates()` replaces LLM-generated dates with current date before write, preventing chronology breaks
- **Lint report always in Chinese**: `lintWiki()` now uses `TEXTS` i18n system with dynamic language lookup
- **Command palette always in English**: all `addCommand` names now use `TEXTS` i18n system
- **Lint fix log entries meaningless**: `logLintFix` now records per-item details (specific page, before/after, what changed) instead of bare counts
- **Entity name translation in source extraction**: prompt now enforces preserving original source language for entity/concept names
- **slugify punctuation**: added `,()'` to filename filter for cleaner Obsidian-compatible filenames

### Changed
- `fixDeadLink` max_tokens: 300 → 8000 (consistent with page generation)
- Batch ingest: suppressed per-file modals replaced with aggregated results report

## [1.6.5] - 2026-05-03

### Added
- **Wiki Output Language**: 8-language dropdown (`en`/`zh`/`ja`/`ko`/`de`/`fr`/`es`/`pt`) with custom input fallback; Wiki content language is now independent of UI language via `wikiLanguage` setting

### Changed
- **System prompt language directive architecture**: `buildWikiLanguageDirective()` injects `IMPORTANT: You MUST write ALL content in <language>` at the beginning of every LLM system prompt, governing all page titles, summaries, descriptions, and labels
- **All LLM-facing prompts converted to English**: granularity instructions, batch context, merge strategies, page templates, contradiction notes, and index labels are now in English — using the standard LLM training pattern of "English instruction + target language output" to prevent user-prompt language from overriding the system directive
- **Belt-and-suspenders language reinforcement**: `finalPrompt` appends a `CRITICAL LANGUAGE REQUIREMENT` hint at the end of the analyzeSource user prompt, ensuring the language directive is present in both system and user prompts
- **Query engine language alignment**: `buildWikiContext()` now emits language directive in system prompt; Chinese examples replaced with English
- **Backward-compatible migration**: existing installations with `wikiLanguage` not set inherit from `language` setting automatically

### Removed
- **"artifact" entity type**: removed from entity extraction (`person|organization|project|product|event|location|other`); type was too vague and produced hollow/generic pages

## [1.6.4] - 2026-05-02

### Added
- **Prompt caching for Anthropic**: static prompt prefix (source content + existing pages) cached via `cache_control: { type: 'ephemeral' }`, reducing redundant token processing across batches
- **Entity type expansion**: added `product`, `event`, `artifact` entity types; now 8 types (was 5) to improve entity recognition coverage
- **Entity extraction balance guidance**: prompt now emphasizes extracting important entities even with low mention frequency, preventing sparse-but-critical entities from being overlooked
- **Ingestion report enhancements**: elapsed time display (formatted as "X min Y sec"), failed-item guidance text suggesting manual page creation or granularity reduction
- **Extraction granularity cost labeling**: setting dropdown and description now show relative cost/effect (token consumption and page count) for Fine/Standard/Coarse
- **API Key password masking**: settings input now uses password field type (dots)

### Changed
- **JSON parsing**: complete rewrite with dual-layer architecture — Layer 1 normalizer (fences, `{{`/missing `{` correction, "after JSON" truncation) + Layer 2 extractor (brace counting, greedy regex fallback, LLM repair)
- **Summary quality**: entity/concept summaries upgraded from 1 sentence to 2-4 sentences with richer detail
- **Prefill safety**: both `AnthropicClient` and `AnthropicCompatibleClient` now detect and recover from prefill `{` being stripped by the provider

### Fixed
- **`{{` (double brace) JSON parse failures**: normalizer dedupes prefill echo before parsing
- **"after JSON at position N" parse failures**: normalizer extracts valid JSON prefix when trailing content exists
- **`source_title` missing validation**: prompt now explicitly requires `source_title`; code falls back to file basename if still omitted

## [1.6.3] - 2026-05-01

### Added
- **Adaptive batch_size**: when a batch response length exceeds 70% of `max_tokens` (16000 → ~11200 chars), the next batch automatically shrinks by 25% (floor: 5 items) to prevent output truncation. This balances extraction efficiency with output token headroom.

## [1.6.2] - 2026-05-01

### Added
- **Iterative batch extraction**: `analyzeSource` now extracts entities/concepts in batches of 20, preventing the `max_tokens` bottleneck that limited extraction from long sources (e.g., 700-line paper → 8 entities was capped by single-batch token limit)
- **Extraction granularity setting**: new `Fine / Standard / Coarse` dropdown in settings panel controls extraction thoroughness
- **JSON output enforcement**: `AnthropicClient` and `AnthropicCompatibleClient` now use prefill technique (append assistant `{`) to force JSON-structured responses; `OpenAIClient` uses native `response_format: { type: 'json_object' }`

### Changed
- `analyzeSource` `max_tokens`: 4000 → 16000 (immediate relief for single-batch extraction limit)

## [1.6.1] - 2026-04-30

### Fixed
- **Query Wiki page loading**: LLM-returned paths with `wiki/` prefix (e.g., `wiki/entities/xxx`) no longer produce invalid `wiki/wiki/entities/xxx.md` paths; prefix is now stripped automatically
- **Regenerate index command**: added proper async handling, progress Notice, and error feedback (was silently failing with no user indication)
- **Index format inconsistency**: removed LLM-dependent hierarchical index generation; `generateIndexFromEngine` now uses deterministic `generateFlatIndex` for all cases, producing consistent Obsidian-compatible Markdown
- **Anthropic Compatible CORS**: new `AnthropicCompatibleClient` uses Obsidian `requestUrl` instead of SDK to avoid `X-Stainless-*` headers causing preflight rejection by third-party providers
- **Anthropic Compatible model fetching**: corrected endpoint URL (`/v1/models`), auth header (`x-api-key`), and fallback behavior (custom input instead of hardcoded Claude defaults)

### Added
- **MiniMax provider**: predefined provider with `MiniMax-M2.7` default model
- **Lint AI Auto-Fix**: `fixDeadLink`, `fillEmptyPage`, `linkOrphanPage` with per-item action buttons in LintReportModal
- **Stub→fillEmptyPage chaining**: `fixDeadLink` creates stub page then immediately expands with real content

### Changed
- **Provider list reordered**: OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek, MiniMax, Kimi, GLM, Ollama, Custom, Anthropic Compatible
- **Provider names standardized**: all use English sentence case with `nameZh` for Chinese
- **Index generation simplified**: removed `generateHierarchicalIndex` prompt; index is always deterministic flat format

## [1.6.0] - 2026-04-29

### Added
- **Query-to-Wiki Feedback**: `SuggestSaveModal` on query modal close with 3-stage value assessment
- **Semantic Dedup on Save**: LLM compares conversation against existing Wiki before saving to Wiki
- **Contradiction State Machine**: `detected → review_ok → resolved` (AI fix) or `detected → pending_fix` (manual)
- **Conversational Ingest**: `ingestConversation()` extracts entities/concepts from chat history
- **Anthropic Compatible provider**: custom Anthropic-compatible endpoints (e.g., MiniMax, MiMo)
- **Google Gemini provider**: via OpenAI-compatible endpoint

### Changed
- **Multi-Source Knowledge Fusion**: enhanced LLM-powered merge analysis when multiple sources mention the same entity
- **User Feedback Loop**: `reviewed: true` frontmatter protects manual edits from overwrite during re-ingestion

## [1.4.0] - 2026-04-29

### Fixed (2026-04-29 bot re-scan)
- **Promise handling**: void fire-and-forget `runStartupCheck()`, wrap async callback in `suggestSchemaUpdate`
- **Sentence case + i18n**: all hardcoded Chinese Notice strings converted to `TEXTS[].xxx` (10 new i18n keys)
- **async without await**: `hasSourceFilesChanged()` de-async'd (was synchronous)
- **Unused variable**: removed `_failed` in wiki-engine.ts

### Added
- **JSON Output Mode**: forced `response_format: { type: "json_object" }` for all JSON-expected LLM calls (DeepSeek/OpenAI), eliminating malformed JSON at the source
- **Ingestion Report Modal**: structured report window after each ingest showing created/updated pages, failed items, contradictions found
- **Progress Notification Lifecycle**: `onDone` callback ensures progress Toast auto-dismisses when ingestion completes
- **Schema Layer**: `schema/config.md` — the third layer from Karpathy's design. Human-editable config that governs LLM operation on the Wiki
- **Auto-Maintenance**: file watcher + periodic lint + startup check (all default OFF)
- **Schema Selective Injection**: `getSchemaContext(task)` clips Schema to relevant sections per task
- **Hierarchical Index**: LLM-generated tree-structured index grouped by type, flat fallback for large wikis
- **Schema Suggestion Command**: LLM analyzes Wiki health and proposes schema improvements

### Changed
- **i18n Completion**: Settings panel fully supports English/Chinese
- **Module Architecture**: extracted schema-manager + auto-maintain modules
- **minAppVersion**: 0.15.0 → 1.4.0 to match actual API usage
- **TypeScript**: 4.7.4 → 5.9.3
- **UI Text**: pure English per Obsidian sentence case guidelines

### Fixed
- **Network Resilience**: 5-min timeout + exponential backoff retry (max 3) for transient connection errors
- **API Throttling**: 300ms delay between LLM calls
- **Fault Tolerance**: per-entity/concept try-catch with auto-retry; single page failure no longer aborts ingestion
- **JSON Parsing Robustness**: state-machine content-quote escaping + LLM repair pipeline
- **Frontmatter Wikilinks**: source references use `[[path]]` format
- **Index Generation Hang**: large wikis bypass LLM with flat index; `max_tokens` 2000→4000
- **ReferenceError `analysis`**: variable scoping fix in `ingestSource` catch block
- **Obsidian Review Compliance**: installed eslint-plugin-obsidianmd, fixed all lint issues (sentence case, API version, types)

### Next — Phase 2 (v1.5.0)
- **User Feedback Loop**: detect `frontmatter.reviewed: true` and preserve manual edits during re-ingestion
- **Multi-Source Knowledge Fusion**: LLM-powered diff-and-merge when multiple sources mention the same entity

## [1.3.0] - 2026-04-28

### Added
- **Schema Layer**: `schema/config.md` — the missing third layer from Karpathy's design. Human-editable config that governs LLM operation on the Wiki (naming conventions, page templates, classification rules)
- **Auto-Maintenance**: file watcher + periodic lint + startup check. All default OFF to avoid surprise API costs
- **Schema Selective Injection**: `getSchemaContext(task)` clips Schema to relevant sections per task, saving ~70% token overhead
- **Hierarchical Index**: LLM-generated tree-structured index grouped by type with importance ranking, flat fallback for large wikis
- **Schema Suggestion Command**: LLM analyzes Wiki health and proposes schema improvements saved to `schema/suggestions.md`

### Changed
- **i18n Completion**: Settings panel fully supports English/Chinese with `TEXTS` constant system (65+ keys)
- **Module Architecture**: extracted schema-manager + auto-maintain modules; main.ts from 2987→305 lines

## [1.2.0] - 2026-04-27

### Changed

**Modular Architecture (main.ts 2987 → 305 lines, -90%)**
- Extracted 9 focused modules: wiki-engine, query-engine, settings, texts, types, prompts, llm-client, utils, modals
- Clear separation of concerns: each module has one responsibility
- Plugin entry point now only handles lifecycle and command routing

**Settings Page Redesign**
- Replaced vague feature bullets with 3-step workflow (Ingest → Query → Maintain)
- Merged intro texts into a single paragraph with clickable Karpathy link
- First-time users can understand the plugin in 10 seconds

**Query Modal Polish**
- Increased height from 600px to 780px for better readability
- "Save to Wiki" button now uses Obsidian's accent color (purple)

### Fixed

- JSON parsing: added LLM-based repair fallback for malformed JSON (unescaped quotes, trailing commas)
- Frontmatter: ensure `---` delimiter at position 0 so Obsidian parses YAML correctly
- Removed dead code: empty `selectSourceToIngest()`, unused `streamResponse()`, unused imports
- Replaced brittle regex-based JSON extraction with robust `parseJsonResponse()`
- Replaced `require()` calls with static ES module imports in settings

---

### Added

**Conversational Query Interface**
- Refactored Query Wiki to ChatGPT-style conversational Modal (800x600px)
- Real-time streaming LLM responses with visual feedback
- Full Markdown rendering using Obsidian MarkdownRenderer
  - Supports [[wiki-links]], callouts, code blocks, Obsidian syntax
- Multi-turn conversation with follow-up questions
- Conversation history management with visual scrollable display
- Enter key shortcut (Shift+Enter for newline)
- Auto-truncation when exceeding conversation limit (Notice feedback)
- Clear history button to reset conversation

**Knowledge Extraction from Conversations**
- New "Save to Wiki" button to extract knowledge from valuable conversations
- ingestConversation() method converts dialogue to structured Wiki pages
  - Summary page with conversation topic and key points
  - Entity pages extracted from discussion
  - Concept pages with relationships
- Reuses existing Wiki generation logic for consistency

**Technical Improvements**
- Extended LLMClient interface with optional createMessageStream() method
  - Backward compatible (non-streaming fallback)
- Implemented streaming for AnthropicClient (Anthropic SDK stream API)
- Implemented streaming for OpenAIClient (OpenAI stream: true option)
- Language-aware responses (match interface language setting)
  - English: "Please answer in English."
  - Chinese: "请用中文回答。"
- Added maxConversationHistory to LLMWikiSettings (default: 10)
- New TEXTS entries: 15 strings per language (English + Chinese)
- Settings UI: "Wiki Query Configuration" section
  - Input field with validation (1-50 range)
  - Hint text with recommended value (10-15 rounds)

**User Experience**
- Immediate feedback: see responses stream in real-time
- Interactive: follow-up questions without reopening Modal
- Clean UI: rendered Markdown instead of raw text
- Knowledge capture: save valuable conversations to Wiki
- i18n: all UI text and LLM responses respect language setting

---

## [1.0.9] - 2026-04-26

### Added

**Internationalization (i18n) Support**
- Settings panel now supports English and Chinese interface
- Language switcher dropdown at top of settings panel
- Default language: English (for international users)
- All UI text (titles, descriptions, buttons, notices) localized
- Language preference persisted in plugin settings
- Real-time UI re-render when switching language

**TEXTS System**
- Complete English and Chinese translation constants
- `getText()` helper method for dynamic text retrieval
- All hardcoded text replaced with TEXTS references
- Clean separation of content and presentation

**Settings Interface**
- Added `language` field to `LLMWikiSettings` interface
- Improved user experience for non-English users
- Consistent with project's internationalization standards

---

## [1.0.0] - 2026-04-26

### Added - Karpathy Complete Implementation

**Multi-page Generation Mechanism**
- One source file generates 10+ Wiki pages (not just 1)
- Entity pages (persons, organizations, projects, locations)
- Concept pages (theories, methods, technologies, terms)
- Summary pages with bidirectional links
- Automatic contradiction detection and marking

**Structured Prompt Design**
- JSON format output for source analysis
- Entity extraction with types and summaries
- Concept extraction with related concepts
- Contradiction detection between new and existing Wiki
- Related pages identification

**Bidirectional Link Maintenance**
- Ensure [[Entity]] links point to real entity pages
- Ensure [[Concept]] links point to real concept pages
- Automatic link creation in wiki folder structure
- No broken/red links

**Wiki Folder Structure**
- `wiki/entities/` - Entity pages
- `wiki/concepts/` - Concept pages
- `wiki/sources/` - Summary pages
- `wiki/index.md` - Classified index
- `wiki/log.md` - Detailed operation log

**Index Classification**
- Organized by categories (Entities, Concepts, Sources)
- Each entry includes one-line summary
- Using Obsidian `[[links]]` syntax
- Auto-generated and updated

**Log Detail Recording**
- Records created pages (all entity/concept/summary pages)
- Records updated pages (existing related pages)
- Records discovered contradictions
- Standard format with parseable timestamps

**Lint Maintenance**
- Checks contradictions between pages
- Checks outdated claims
- Checks orphan pages (no inbound links)
- Checks missing concept/entity pages
- Checks broken bidirectional links
- Checks data gaps

### Changed

**Complete Rewrite**
- Replaced single-page generation with multi-page mechanism
- Replaced simple prompt with structured JSON prompt
- Replaced time-based index with classified index
- Replaced simple log with detailed operation log
- Added entity and concept page creation logic
- Added contradiction detection and marking
- Added related pages update mechanism

**Folder Structure**
```
wiki/
├── entities/    # New: Entity pages
├── concepts/    # New: Concept pages
├── sources/     # New: Summary pages
├── index.md     # Improved: Classified
└── log.md       # Improved: Detailed
```

### Fixed

- ✅ Multi-page generation (Karpathy requirement)
- ✅ Bidirectional links effectiveness (links point to real pages)
- ✅ Entity and concept page creation
- ✅ Existing pages update when new source arrives
- ✅ Contradiction marking
- ✅ Classified index structure
- ✅ Detailed log recording

### Authors

- **Greener-Dalii** - Complete Karpathy implementation

---

## [0.3.0] - 2026-04-26

### Added
- Folder picker for initializing Wiki from existing folders
- FuzzySuggestModal for folder selection
- Support for nested folders

---

## [0.2.0-0.2.2] - Earlier versions

See git history for details of earlier implementations.