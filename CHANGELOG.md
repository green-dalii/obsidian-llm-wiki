# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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