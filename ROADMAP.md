# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.7.8 | **Updated:** 2026-05-13

---

## Current Status

### Implemented (v1.7.8) — Obsidian Bot Review Compliance

**Obsidian Community Submission Review Fixes**
- **Artifact attestations**: Added cryptographic provenance verification for release assets (main.js, styles.css) using GitHub Actions `attest-build-provenance@v1`
  - Users can verify assets were built from source repository
  - Supply chain security: prevents tampering between build and release
  - Required workflow permissions: `attestations: write`, `id-token: write`
- **API compliance**: Replaced `activeWindow.setTimeout` → `window.setTimeout` (7 locations) per Obsidian official API requirements
- **Type safety**: Added `Partial<LLMWikiSettings> | null` assertion to `loadData()` result, fixed unsafe assignment/member access warnings
- **CSS format consistency**: Expanded short hex colors to 6-digit format (#666→#666666, 4 locations) per Obsidian style guidelines
- **Code cleanup**: Removed unused `_retryError` parameter, replaced deprecated `builtin-modules` dependency with Node.js native API
- **Zero functional impact**: All fixes are code quality improvements, backward compatible, no runtime logic changes

### Implemented (v1.7.7) — Save-to-Wiki Fixes + Smart Batch Skip + Plugin ID Change

**Save-to-Wiki Quality Improvements (5 fixes)**
- **Conversation summary LLM generation**: Query Wiki saved pages now use `generateSummaryPage` prompt (same as file ingestion), proper schema context, frontmatter `updated` field, sources array populated
- **Duplicate save prompt fix**: Hash tracking (`lastOfferedQueryHash`) prevents re-evaluation of unchanged conversations, hash updated on suggestion/save
- **Progress notice guarantee**: `saveToWiki()`/`doSave()` use try-finally cleanup, progress callback wired in both paths, error handling always dismisses notice
- **Conversation save report**: `ingestConversation()` returns `IngestReport` (unified with file ingestion), Notice shows entity/concept count, full report with elapsed time/failed items/contradictions
- **Notice i18n compliance**: All Notice calls respect Interface Language (7 new texts, auto-maintain/query/settings converted), Chinese translations complete

**Smart Batch Ingestion Skip**
- **Automatic detection**: Checks `wiki/sources/${slug}.md` existence before ingestion, skips already-processed files
- **Conservative fallback**: If wiki page exists but frontmatter missing/malformed, still skip (protects user edits)
- **Optional strict verification**: Frontmatter sources array check for precise file path matching
- **Report enhancement**: Shows skipped count "跳过（已摄入）：X/Y", Toast: "跳过 X/Y 个已摄入文件，正在摄入 Z 个新文件..."

**Plugin ID Rename**
- **ID changed**: `llm-wiki` → `karpathywiki` to avoid conflict with existing plugin and follow Obsidian naming guidelines (no "obsidian" in ID)
- **Files updated**: `manifest.json`, `package.json`, README installation instructions (folder name: `karpathywiki`)
- **No functionality impact**: Identifier update only for community submission readiness

### Implemented (v1.7.6) — Related Page Parallelization + Path Fixes

**Related Page Update Parallelization**
- **Stage 4 parallel batch processing**: Related page updates now use configurable concurrency (reuses `pageGenerationConcurrency` setting), reducing update time by up to 3x
- **Promise.allSettled error isolation**: single related-page failure doesn't block the batch; per-page retry with 2s delay on failure
- **Batch-level delay control**: uses `batchDelayMs` setting between parallel batches for API rate limit protection
- **Progress tracking**: per-page progress callbacks with real-time status

**Hardcoded Wiki Path Fixes**
- **`FileSuggestModal` / `FolderSuggestModal`**: Now accept `wikiFolder` constructor parameter instead of hardcoded `'wiki'` string
- **`query-engine.ts`**: Wiki-link format instructions now use `settings.wikiFolder` dynamically instead of hardcoded `wiki/`
- **All callers updated**: `main.ts` (2 sites), `settings.ts` (1 site) now pass `wikiFolder` to modal constructors

### Implemented (v1.7.5) — TypeScript Compilation Fixes

- **20+ TypeScript errors resolved**: Fixed `SchemaTask` type mismatches, null safety issues, `Component` parameter for `MarkdownRenderer.render()`, callback signatures, and i18n type assertions across 5 files

### Implemented (v1.7.3) — Ingestion Acceleration + Schema Enhancement

**Ingestion Parallel Acceleration**
- **Single-source page generation concurrency**: Configurable 1-5 parallel pages (default 1 for safety), 3x speedup for 50+ entity sources
- **Promise.allSettled error isolation**: Single page failure doesn't block batch; per-page retry with exponential backoff
- **Batch delay control**: 100-2000ms configurable delay between batches for API rate limit protection
- **Progress tracking**: Real-time batch completion logging with success/failure counts

**Verbatim Mentions Preservation**
- Source quotes in `mentions_in_source` preserved in original language
- Optional translation in parentheses for wiki language different from source
- LLM prompt explicitly instructs verbatim preservation with translation as add-on

**Entity/Concept Relationship Enhancement**
- Entity pages now have separate "Related Entities" and "Related Concepts" sections (was "Related Content")
- Concept pages have both "Related Concepts" and "Related Entities" sections
- Analysis phase extracts `related_entities` and `related_concepts` for both entity and concept objects
- Page generation prompts updated to populate both sections

**Schema Template Optimization**
- Explicit section structure rules for entity and concept pages
- Content guidelines: verbatim mentions requirement, naming conventions, link formats
- Multi-source merge policies: sources array append, reviewed protection, NO_NEW_CONTENT signal
- Classification rules with examples
- Maintenance policies: stale thresholds, contradiction severity, orphan/missing definitions

### Implemented (v1.7.2) — Intelligent Multi-Source Merge

**Critical Fix: Multi-Source Knowledge Loss**
- **Programmatic frontmatter merge**: `sources` array now deterministically appended (not overwritten), `created` preserved, `updated` refreshed, `reviewed` protected
- **Intelligent content fusion**: LLM follows schema-defined sections to merge new source info into existing pages — no redundancy, contradictions preserved with attribution, bidirectional links maintained
- **Reviewed page protection**: minimal append-only mode for pages with `reviewed: true`
- **NO_NEW_CONTENT signal**: skip redundant updates when source adds nothing new
- **New prompts**: `mergeEntityPage`, `mergeConceptPage`, `appendToReviewedPage`
- **Schema task**: added `'merge'` type for selective schema injection during content fusion

### Implemented (v1.7.1) — Multi-Folder Watch

- **Multi-folder auto-watch**: `watchedFolders` array replaces single `watchedFolder`; "Add Folder" buttons in Settings
- **Web Clipper preset**: one-click adds `Clippings/` folder for seamless web-clip auto-ingestion
- **Semantic entity deduplication**: LLM semantic fallback when slug matching fails, handling translations, abbreviations, renamings
- **Granularity-linked iteration caps**: coarse(3 batches/10 items/20 cap) / standard(6/20/50) / fine(12/30/unlimited)
- **Ingestion Notice feedback**: Toast notifications for single-file and folder ingest
- **Actionable network errors**: after 3 retries, report specific causes (VPN/SSL/firewall/URL)
- **Entity name translation leak fix**: names preserve source language, only summaries follow wikiLanguage
- **Premature stop fix**: `newTotal === 0` (post-dedup) vs `rawTotal < batchSize`
- **settings backward compat**: old `watchedFolder` string auto-resets to `[]`

### Implemented (v1.7.0) — Quality Milestone

**Quality / Bugfixes**
- **Content truncation protection**: all page-generation `max_tokens` raised from 1500/2000 → 8000; Anthropic `stop_reason` and OpenAI `finish_reason` detection with auto-retry (2x tokens, cap 16000) in all 3 LLM clients
- **`fillEmptyPage` reliability fix**: pre-read content from lint phase passed directly (bypasses string→TFile resolution); empty-string content now handled correctly
- **Frontmatter `updated` date normalization**: `normalizeFrontmatterDates()` replaces LLM-generated dates with current date before write
- **Lint report i18n**: all hardcoded Chinese in `lintWiki()` replaced with `TEXTS` lookups; `LintReportModal` respects language setting
- **Command palette i18n**: all `addCommand` names use `TEXTS` dynamic lookup instead of hardcoded English
- **Batch ingest report**: folder ingest now collects per-file reports and shows aggregated `IngestReportModal` at end (was suppressed)
- **Entity/concept breakdown**: `IngestReport` now includes `entitiesCreated` / `conceptsCreated` counts; displayed in report modal
- **Lint fix log enrichment**: `logLintFix` now records per-item details (which page, what change, before/after), not just counts
- **Entity name preservation**: prompt now enforces keeping original source language for entity/concept names (no translation)
- **slugify improvement**: added `,()'` to punctuation filter for cleaner filenames
**Core Features**
- Multi LLM Provider support (Anthropic, OpenAI, Gemini, OpenRouter, DeepSeek, MiniMax, Kimi, GLM, Ollama, Custom, Anthropic Compatible)
- Dynamic model list fetching (real-time from API)
- Intelligent ingestion: automatic entity/concept extraction and Wiki page generation
- Bidirectional links: native Obsidian `[[wiki-links]]` syntax
- Conversational Query: ChatGPT-style dialog with streaming Markdown
- Schema layer: `schema/config.md` with selective injection per task
- Auto-maintenance: file watcher + periodic lint + startup check (all default OFF)
- Deterministic flat index: consistent Obsidian-compatible format across ingest and regeneration
- Ingestion report modal with detailed statistics
- Multi-Source Knowledge Fusion: LLM-powered merge analysis on page update
- User Feedback Loop: `reviewed: true` frontmatter protects manual edits from overwrite

**v1.6.0 — Knowledge Compounding (✅ code complete)**
- Query-to-Wiki Feedback: SuggestSaveModal on query close, 3-stage value assessment
- Semantic Dedup on Save: LLM compares conversation against existing Wiki before saving
- Contradiction State Machine: detected → review_ok → resolved (AI fix); detected → pending_fix (manual)
- Lint AI Auto-Fix: fixDeadLink, fillEmptyPage, linkOrphanPage with LintReportModal action buttons
- Stub-then-fill chaining: fixDeadLink creates stub then immediately expands with content
- Conversational Ingest: `ingestConversation()` extracts knowledge from chat history

**v1.6.1 — Quality Update (✅ released)**
- Query Wiki path normalization (wiki/ prefix stripping)
- Regenerate index: proper async + Notice feedback
- Index format: deterministic flat, removed LLM dependency
- Anthropic Compatible: CORS fix, model fetching fix
- MiniMax predefined provider
- Lint AI per-item fix buttons

**v1.6.2 — Extraction Scale Up (✅ released)**
- Iterative batch extraction: analyzeSource loops in batches of 20 entities/concepts per LLM call with already_extracted dedup, eliminating max_tokens bottleneck for long sources
- Extraction granularity setting: Fine/Standard/Coarse dropdown controls extraction thoroughness
- JSON output enforcement: Anthropic prefill technique (append assistant `{`), OpenAI native `response_format: { type: 'json_object' }`
- analyzeSource max_tokens: 4000 → 16000

**v1.6.3 — Adaptive Batch Size (✅ released)**
- Adaptive batch_size: when batch response exceeds 70% of max_tokens (16000), next batch shrinks 25% (floor: 5) to prevent output truncation

**v1.6.5 — Wiki Output Language (✅ code complete)**
- Wiki output language dropdown: 8 languages + custom input, independent of UI language
- System prompt language directive: `buildWikiLanguageDirective()` injects per-task language instruction
- All LLM-facing prompts converted to English (granularity, batch, merge, templates, labels)
- Belt-and-suspenders: language hint appended to analyzeSource user prompt for double reinforcement
- Query engine language alignment via system prompt
- Removed "artifact" entity type (too vague)
- Backward-compatible migration from `language` to `wikiLanguage`

**Quality / Engineering**
- JSON Output Mode (`response_format: json_object`) for reliable structured responses
- Network resilience: timeout + exponential backoff retry
- API throttling with fault tolerance (per-item try-catch + auto-retry)
- State-machine JSON repair + LLM fallback for malformed responses
- Full Unicode filename support
- Modular architecture (9 focused modules)
- Internationalization: English/Chinese UI
- Code quality: no `any` types, ESLint/obsidianmd compliance

---

## Quality Update Phase (current)

> Addressing existing feature defects and quality gaps. No new features.

### Completed fixes
- **Long source entity/concept under-extraction** — iterative batch extraction with dedup, granularity control, and max_tokens raised to 16000
- **Stub→fillEmptyPage chaining** — fixDeadLink `create_stub` now calls `fillEmptyPage` immediately, preventing stubs from becoming empty-page lint warnings
- **Query Wiki path normalization** — LLM-returned paths with `wiki/` prefix are now stripped automatically, fixing page content loading failures
- **Regenerate index reliability** — proper async handling, progress Notice, error feedback; was silently failing
- **Index format unification** — removed LLM-dependent hierarchical index; always uses deterministic flat format
- **Anthropic Compatible CORS** — new `AnthropicCompatibleClient` uses `requestUrl` to avoid SDK `X-Stainless-*` headers
- **Anthropic Compatible model fetching** — corrected URL, auth header, and fallback behavior
- **MiniMax provider** — added as predefined provider
- **Lint AI Auto-Fix** — per-item fix buttons in LintReportModal
- **JSON output enforcement** — provider-specific JSON modes (Anthropic prefill, OpenAI native)

### Known gaps (from Karpathy audit 2026-04-29)

| # | Gap | Severity |
|---|-----|----------|
| 1 | Lint: no stale-claim detection ("superseded by newer sources") | Medium |
| 2 | Lint: no missing-important-page detection | Medium |
| 3 | Lint: no suggested-questions output | Low |
| 4 | Lint: batch fix without per-item review (weakens human-in-the-loop) | Medium |
| 5 | Ingest: no interactive "discuss key takeaways with user" before writing | Medium |
| 6 | Query: output format limited to markdown (no tables/slides/charts) | Low |
| 7 | Schema: rules-engine based, not co-evolved LLM instruction doc | Low |
| 8 | Long source analysis: max_tokens: 4000 bottleneck limits entity/concept count | ✅ Fixed (v1.6.2) |
| 9 | Ingest performance: serial page generation for 50+ entities | ✅ Fixed (v1.7.3) |

---

## Karpathy-Aligned Planning (v1.8.x – v1.9.x)

> Based on re-reading Karpathy's [original LLM Wiki vision](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and auditing the plugin against his core principles.

### v1.8.0 — Conversational Ingest + Experience Polish

**Goal:** Transform ingest from a black box into a collaborative process.

Karpathy: *"I like to do them one at a time, and be involved myself. I like to discuss what to file, then file it."*

#### 1. Ingest Wizard
- New `IngestWizardModal` — step-by-step guided ingest
- Step 1: LLM analyzes source, presents extracted entities/concepts for user review
- Step 2: User edits/adds/removes items (checkboxes + edit)
- Step 3: LLM generates Wiki pages based on user-approved plan
- Existing `Ingest Sources` remains as quick/auto mode

**Files:** `src/ingest-wizard.ts` (new), `src/wiki-engine.ts`, `main.ts`

#### 2. Lint Per-Item Review
- Replace batch fix with per-item preview + confirm
- Show LLM fix proposal before applying
- Align with human-in-the-loop principle

#### 3. Proactive Schema Suggestions
- After ingest, check if new entity/concept types fall outside schema categories
- Suggest running "Analyze Schema" (do not auto-modify)

#### 4. Output Format Diversity
Karpathy: *"comparison tables, slide decks (Marp), charts"*
- Optimize query prompts for structured table output
- "Export as Marp" button in Query modal

---

## Long-term Vision (v2.x)

| Feature | Description |
|---------|-------------|
| **Wiki Page Version History** | Diff summaries in log.md on each update |
| **Wiki Health Dashboard** | Obsidian custom view with page growth, link density, contradiction trends |
| **Wiki Content Export** | GraphML, JSON, static site formats |
| **Agent Mode** | Full auto-maintain lifecycle, proactive suggestions |
| **Multi-modal Support** | Images, PDF, audio/video knowledge extraction |

---

## Version Timeline

| Version | Target | Key Features | Status |
|---------|--------|-------------|--------|
| **v1.4.0** | 2026-04 | Schema layer, auto-maintenance, ESLint compliance, bot review | Released |
| **v1.5.0** | 2026-04 | Multi-source fusion, user feedback loop, contradiction tracking foundation | Code complete |
| **v1.6.0** | 2026-04 | Query-to-Wiki feedback, dedup save, contradiction state machine, lint AI auto-fix | Code complete |
| **v1.6.1** | 2026-05 | Quality fixes, MiniMax provider, Anthropic Compatible CORS | Released |
| **v1.6.2** | 2026-05 | Iterative batch extraction, granularity control, JSON output enforcement | Released |
| **v1.6.3** | 2026-05 | Adaptive batch_size | Released |
| **v1.6.4** | 2026-05 | Dual-layer JSON parsing, Anthropic prompt caching, entity extraction balance, ingestion report, granularity cost labeling | Code complete |
| **v1.6.5** | 2026-05 | Wiki output language (8 languages + custom), English LLM prompts, system prompt language directive, artifact removal | Code complete |
| **v1.7.0** | 2026-05 | Content truncation protection, fillEmptyPage reliability, frontmatter normalization, lint/command i18n, batch ingest reports, entity/concept breakdown, slugify improvements | Released |
| **v1.7.1** | 2026-05 | Multi-folder watch, Web Clipper preset, semantic deduplication, granularity-linked caps, ingestion Notices, actionable errors | Committed |
| **v1.7.2** | 2026-05 | Programmatic frontmatter merge (sources append), intelligent content fusion, NO_NEW_CONTENT signal, reviewed page minimal-append | Committed |
| **v1.7.3** | 2026-05 | Ingestion acceleration (concurrent page generation), verbatim mentions, enhanced entity/concept relations, schema optimization | Released |
| **v1.7.5** | 2026-05 | TypeScript compilation fixes (20+ errors across 5 files) | Committed |
| **v1.7.6** | 2026-05 | Related page parallelization, hardcoded wiki path fixes | In progress |
| **v1.8.0** | TBD | Ingest Wizard (conversational), lint per-item review, proactive schema, output diversity | Planned |
| **v1.9.0** | TBD | Wiki Health Dashboard, page version history | Planned |
| **v2.0.0** | TBD | Agent mode + multi-modal | Concept |

---

**Last Updated:** 2026-05-09 | **Maintainer:** Greener-Dalii
