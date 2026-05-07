# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.7.0 | **Updated:** 2026-05-07

---

## Current Status

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

---

## Karpathy-Aligned Planning (v1.8.x – v1.9.x)

> Based on re-reading Karpathy's [original LLM Wiki vision](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and auditing the plugin against his core principles.

### v1.8.0 — Conversational Ingest + Web Clipper

**Goal:** Transform ingest from a black box into a collaborative process, and integrate with Obsidian's native content capture.

Karpathy: *"I like to do them one at a time, and be involved myself. I like to discuss what to file, then file it."*

#### 1. Ingest Wizard
- New `IngestWizardModal` — step-by-step guided ingest
- Step 1: LLM analyzes source, presents extracted entities/concepts for user review
- Step 2: User edits/adds/removes items (checkboxes + edit)
- Step 3: LLM generates Wiki pages based on user-approved plan
- Existing `Ingest Sources` remains as quick/auto mode

**Files:** `src/ingest-wizard.ts` (new), `src/wiki-engine.ts`, `main.ts`

#### 2. Web Clipper Integration
Obsidian's official [Web Clipper](https://obsidian.md/clipper) plugin saves web content into a `Clippings/` folder by default — a natural, zero-friction content funnel for LLM Wiki. Instead of manually moving files to `sources/`, the plugin watches the Clippings folder and auto-ingests new clips.

- **Settings toggle**: "Watch Clippings folder" checkbox + customizable folder path (default: `Clippings/`)
- **Auto-ingest on new clip**: file watcher detects new `.md` files in the watched folder → triggers `ingestSource()` automatically
- **Debounce**: reuse existing auto-maintain debounce logic; batch clips arriving within 30s into a single ingest run
- **Per-clip notification**: brief Notice on ingest completion; detailed report in `log.md`
- **Defaults OFF**: avoid surprise API costs for users unaware of the feature
- **Karpathy alignment**: web clips are a primary source of real-world knowledge; auto-ingesting them keeps the Wiki growing organically without manual effort — "knowledge compounds" with zero friction

**Files:** `src/schema/auto-maintain.ts` (extend), `src/ui/settings.ts` (toggle), `src/types.ts` (settings fields), `src/texts.ts` (i18n)

#### 3. Lint Per-Item Review
- Replace batch fix with per-item preview + confirm
- Show LLM fix proposal before applying
- Align with human-in-the-loop principle

---

### v1.8.0 — Experience Polish

#### 4. Proactive Schema Suggestions
- After ingest, check if new entity/concept types fall outside schema categories
- Suggest running "Analyze Schema" (do not auto-modify)

#### 5. Output Format Diversity
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
| **v1.7.0** | 2026-05 | Quality milestone: truncation protection, fillEmptyPage fix, batch reports, i18n completion, module refactoring | Released |
| **v1.8.0** | TBD | Conversational ingest wizard, Web Clipper integration, lint per-item review | Planned |
| **v1.9.0** | TBD | Proactive schema suggestions, output diversity | Planned |
| **v2.0.0** | TBD | Agent mode + multi-modal | Concept |

---

**Last Updated:** 2026-05-07 | **Maintainer:** Greener-Dalii
