# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.20.1 | **Updated:** 2026-06-18

---

## Current Status

### Implemented (v1.20.1) — Anthropic Prefill Hotfix (2026-06-18)

- ✅ **#141/#147 — AnthropicClient prefill rejection on newer Claude models.** Claude Opus 4.8, 4.7, 4.6, Sonnet 4.6, Claude Fable 5, Claude Mythos 5, Claude Mythos Preview reject assistant prefill messages with 400. Auto-fallback to no-prefill retry with per-client caching. 4 regression tests.

### Implemented (v1.20.0) — Provider-First Thinking Control & Reasoning UI (2026-06-18)

- ✅ **Provider-first thinking control.** Default `disableThinking: false` — plugin sends no thinking-control field. Provider decides reasoning behavior. 3-tier dialect fallback when user explicitly enables "Disable thinking".
- ✅ **Collapsible thinking UI.** DeepSeek `reasoning_content` extraction → `<think>` tags → collapsible `<details>` panel in Query Wiki. Fully localized in 8 languages.
- ✅ **Anthropic baseUrl normalization (#141, #134).** Prevents `/v1/v1` double-path.
- ✅ **gpt-5 max_completion_tokens (#143).** Correct token parameter for GPT-5 series + truncation retry fix.
- ✅ **Query Wiki UX.** wikiFolder respect, auto-scroll, user message right-align.
- ✅ **10 code-review fixes.** Reasoning preservation in retry, enableThinking consistency, activeDocument guard, PROTECTED_FIELDS whitelist, wrapReasoningContent escaping, case-insensitive guard, gpt-5 prefix tightening.
- ✅ **v1.20.0 migration.** Old users automatically get `disableThinking=false` and `advancedSettingsMode='default'`.

### Implemented (v1.19.1) — Gemini HTTP 400 Hotfix (Issue #137, 2026-06-17)

- ✅ **#137 — Gemini HTTP 400 on ingestion.** Added 3-tier thinking-control dialect fallback chain (anthropic → openai → none). The OpenAI-compatible client auto-discovers the correct field name per baseUrl and caches the result in `thinkingControlCache`. Settings tab no longer wipes the cache on close. Generic 400 field-strip retry for temperature/repetition_penalty. Stream path field-strip fix (was dead code). `[DEBUG-400]` refetch limited to 400-class errors (was firing on 429 quota). Fallback notices now localized in all 8 languages (was hard-coded EN). Console diagnostic noise reduced.

### Implemented (v1.19.0) — Ingest Quality & Cost Hardening (2026-06-16)

- ✅ **#99 — Reasoning-only response detection.** `OpenAICompatibleClient` now detects when `disableThinking=true` produces an empty `content` + `finish_reason: length` response with high reasoning tokens, and throws an actionable error. Automatic 400 fallback to `chat_template_kwargs: {enable_thinking: false}` for providers that reject `thinking.type='disabled'`.
- ✅ **#116 — Compact slug list in analyzeSource prompt.** New `buildCompactSlugList()` injects a sorted slug-only list of existing wiki pages into the analyzeSource prompt so the LLM uses exact paths when creating `[[links]]`, reducing dead-link slug mismatches from the 50-page index cap. Contributed by @DocTpoint.
- ✅ **#126 — Quote-grounding lint scanner.** New `scanQuoteGrounding()` pure function verifies every quote under `## Mentions in Source` against the linked source file. Tier 1 = exact match; Tier 2 = normalized match. Supports both current and legacy bare-`quote` formats. Zero token cost. Contributed by @DocTpoint.
- ✅ **#128 — Advanced LLM parameter settings.** Default/Custom mode selector in LLM Configuration. Default hides all advanced params and keeps disable-thinking on. Custom reveals: disable thinking toggle, extraction temperature (0–2), query temperature (0–2), repetition penalty (0–2). `data.json` backward compatible — `disableThinking` field name preserved.
- ✅ **#131 Tier 1 — Skip Stage 4 LLM on no-op.** `PageFactory.updateRelatedPage` skips LLM call when `new_info` resolves to the fallback string. Removes ~33% of Stage 4 LLM calls. Contributed by @DocTpoint.
- ✅ **PR #109 — Auto Smart Fix setting.** Lint can auto-run Smart Fix All after analysis. Default `false`.
- ✅ **PR #110 — Status bar mirrors popup during ingest and lint.** All progress messages update both Notice + status bar. Contributed by @dmarchevsky.
- ✅ **PR #127 — Sources normalization in write path.** `fixPollutedSources()` called from centralized write chokepoint. Contributed by @DocTpoint.
- ✅ **Lint report enhanced.** Summary now includes ungroundedQuotes + tagViolations counts. `lintTagViolationSection` fully i18n'd in all 8 languages.
- ✅ **Advanced settings dropdown fix.** Missing `this.display()` in onChange caused empty "Custom" panel. Fixed.
- ✅ **Startup quick-fixes Notice simplified.** Removed emoji + heavy separators.
- ✅ **Internal refactoring.** lint-controller modularization (phases/report-builder), schema-analyze moved to schema/, LintContext extracted to lint/types, lint-controller + lint-fixes moved into lint/ directory.

### Implemented (v1.18.2) — Custom Extraction Limits Hard-Enforced (Issue #120)

Closes #120, a long-standing silent-overflow bug in custom extraction mode. Previously, when `extractionGranularity` was set to `custom`, the `customEntityLimit` and `customConceptLimit` settings were only enforced as soft prompt hints — the LLM routinely returned 12–25 items for a configured cap of 8, and every one of them was written to wiki pages. The existing convergence detector only stopped *further batches* once both types reached the cap, which never fired on the common single-batch case (most notes). Fix: after all batches are accumulated and immediately before `buildSourceAnalysis()`, the plugin slices both `accumulation.entities` and `accumulation.concepts` to the configured limits. The first N items in extraction order are preserved. The prompt instruction and convergence detector remain as complementary mechanisms (they guide the LLM and avoid unnecessary extra batches). No behavior change for `default` / `1-5` granularity modes. One new end-to-end test locks the behavior.

This release also includes two community contributions that landed in the same window: configurable file-name casing (Issue #111) and tags-preservation on re-ingest (Issue #114).

### Implemented (v1.18.1) — Obsidian Review Compliance Hotfix

**Obsidian Community Plugin source-code review compliance.** The v1.18.0 release was rejected during automated source-code review because production code contained `document` (the bare global DOM reference) alongside `eslint-disable` comments targeting `obsidianmd/prefer-active-doc` — both are forbidden in the Obsidian review pipeline. This hotfix removes the `document` fallback and all related `eslint-disable` comments from production code; the `activeDocument` stub is centralized in the test setup file. No user-visible behavior change.

### Implemented (v1.18.0) — User-Controlled Tag Vocabulary (Issue #85 v6 — end-to-end customTags pipeline)

Closes the long-standing #85 (P3) tag-vocabulary request. v2 ships a chip-input UX (GitHub Issue Labels style) that replaces v1's textarea CSV. Headline wins:

- **Chip input replaces the textarea CSV.** Each tag renders as a discrete chip (rounded pill + × button) inside the input area. Add via Enter / `,` / `;`; remove via × click or Backspace on empty input. Duplicate tags (case-insensitive) are silently skipped with a brief shake animation. CJK IME composition is respected (`event.isComposing` guard). Nested tags with `/` are preserved verbatim.
- **No more standalone "Tag Vocabulary" heading.** The settings sub-block is now embedded inside the Wiki Configuration section as a `setName()` row (no `.setHeading()`), making the visual hierarchy reflect the conceptual hierarchy.
- **Default-mode description enumerates the actual defaults.** When mode = Default, the dropdown description shows `Default uses built-in tags: person, organization, project, product, event, location, other (entities) / theory, method, technology, term, other (concepts).` so users know what they will get without switching modes.
- **v1 → v2 migration runs on `onload()`.** `cleanupVocabularyTags()` normalizes any pre-v2 CSV (trim, dedupe case-insensitively, drop empty entries) and writes back to `data.json` so existing users see clean chips immediately.
- **Eight-language i18n.** 8 new keys per language: `tagVocabularyInlineName/Desc`, `tagVocabularyModeDescDefault/Custom`, `chipDuplicateHint`, plus rewritten `customEntityTagsDesc` / `customConceptTagsDesc` describing chip semantics.
- **🔴 v6: End-to-end customTags pipeline (the actual fix).** Before v6, the user-defined vocabulary was only used for *post-hoc validation* — the LLM was never told about it, so it kept inventing its own subtype names that got silently dropped at write time. v6 closes the loop:
  - **Prompt injection** via new `buildActiveTagVocabularySection()` + `appendTagVocabularyToPrompt()` helpers. The active vocabulary is now injected into ingestion (source-analyzer), page generation (page-factory × 3 sites: new page, merge, rebuild), and lint analyze (lint-controller). The LLM knows exactly which entity/concept types are valid and stops inventing new ones.
  - **Preserve LLM intent on write.** `enforceFrontmatterConstraints` no longer silently drops out-of-vocab tags. It retains all LLM-emitted tags (with a `console.debug` note when the vocabulary diverges) so the user can see what the model produced and decide whether to expand their custom vocabulary. Fallback to `DEFAULT_ENTITY_TAG` / `DEFAULT_CONCEPT_TAG` only when the tags array is genuinely empty.
- **Default tags as editable baseline (v4).** When the persisted custom CSV is empty, the chip input materializes the default vocabulary as fully-editable chips (same `.llm-wiki-tag-chip` class, same × button). No "preview" / read-only distinction.
- **Two-row layout (v5).** Chips on the top row, input on its own row below — natural reading flow, no awkward left-alignment.
- **49 new tests, 0 regressions.** 16 chip input (jsdom), 7 normalize vocabulary, 7 buildActiveTagVocabularySection, 4 appendTagVocabularyToPrompt, 6 preserve-LLM-intent, plus updated legacy tests. 605 → 654 tests passing.
- **`minAppVersion` bumped 1.6.6 → 1.11.0** to use `Setting.addComponent()` (the only Obsidian API that mounts custom DOM into a Setting row). Users on Obsidian <1.11.0 must upgrade to continue using the plugin.
- **New devDep `jsdom@29.1.1`** for chip input test environment (does NOT affect production bundle).

- **🔴 v7: Programmatic tag audit + LLM-assisted retag (the closing of the loop).** Before v7, the Lint pipeline never reported pages whose frontmatter `tags` fall outside the active vocabulary — silently, out-of-vocab tags survived (v6 preserve-LLM-intent). v7 introduces a pure-function `scanTagViolations()` that runs as part of every Lint (zero token cost, <50ms on 2000-page vaults). A new "🏷️ Retag N page(s) with LLM" button in the Lint Modal calls `runRetagViolations()` which sends the page's first-paragraph summary to the LLM with `appendTagVocabularyToPrompt()` injected; the LLM returns a new `tags: string[]` constrained to the active vocabulary, the runner re-validates the response (defensive), and only the `tags:` line of the frontmatter is rewritten — the body is byte-identical to the input. Source pages get their own static `VALID_SOURCE_TAGS` vocabulary (paper / document / article / book / clippings / transcript / notes / other) — no user override per Issue #85 v7 design decision.
- **34 new tests, 0 regressions.** 2 `getActiveSourceTags` + 11 `scanTagViolations` + 5 `runRetagViolations` + 16 already in v6 chip input. 654 → 672 passing.

### Implemented (v1.17.0) — Long-Document Ingestion & Source Attribution

Major quality release addressing previously-unprocessable large sources and a class of metadata-integrity issues that caused silent data corruption. **Closes #90.** Headline wins:

- **Long-document ingestion now works.** A 619KB Chinese source (史记 / Shiji) that previously failed after 3 minutes and 15 items now completes fully, extracting hundreds of entities and concepts. Root causes addressed: (a) custom granularity was hardcoded to 15 items max regardless of caps, (b) `max_tokens` was capped below the response length needed for large batches, (c) truncation retries couldn't grow beyond 16K. Fix: dynamic `initialBatchSize` (capped at 50), `maxBatchesBase` derived from caps, `max_tokens` scales 16K→20K→60K with auto halve-and-retry on truncation.
- **Mentions carry source attribution (footnote-style).** The "Mentions in Source" section now renders each verbatim quote as `- "quote" — [[source-path|display-name]]`, replacing the previous free-form block of untraced quotes. Future page merges can never mix up which quote came from which source.
- **Source pages inherit tags from the source note frontmatter (Issue #90).** The LLM used to inject arbitrary concept names (e.g. `Alzheimer-Demenz`, `Neuroprotektion`) into source pages, polluting the user's tag vocabulary. New `extractSourceTags()` pure helper reads the source note's frontmatter and passes tags directly to the summary-page template, falling back to LLM-derived names only when the source has no tags.
- **Provider settings now sync everywhere.** Switching Provider/API Key/Model in Settings used to fail to reach the wiki engine; the next Ingest/Lint/Query would silently use the old provider. Fixed via `WikiEngine.updateSettings()` that keeps the EngineContext in sync with the live settings object (root cause: `settings.ts` was replacing `plugin.settings` with a NEW object from `tempSettings` spread, but EngineContext captured the OLD reference at construction time).
- **Dates are now programmatic, not LLM-generated.** `enforceFrontmatterConstraints` strips LLM-invented `created`/`updated` dates and replaces them: `created` preserved on merge, `updated` always set to today.
- **Lint reports persisted to log.md** with minute-precision timestamps so multiple same-day Lint runs are distinguishable. The Lint Report Modal shows a `📋 Full report saved to log.md` hint.
- **Custom granularity upper bound raised from 300 to 500** to support professional knowledge bases (legal, medical, deep research).
- **Default Schema documents the new contracts.** Three new sections in the default `wiki-folder/schema/config.md`: Source Page Template (mandates tag inheritance), Date Fields (programmatic, not LLM-generated), Mentions Format (academic-footnote style).
- **Test connection restores live settings on failure.** A failed Test Connection no longer persists broken config; previous settings are restored.
- **38 new tests added (549 → 587)**; 28 test files, 0 regressions.

---

## Next Milestone: v1.20.0 — Core Module Refactor Landing & Schema Coherence

Release focus: land the modular-structure refactor (already fully absorbed into main via incremental PRs across v1.18.0–v1.19.1), then schema coherence, graph-based features, and workflow scale-up. The old `refactor/modular-structure` branch (pre-v1.18.0 base) has 0 unique commits — its entire diff was absorbed into main across ~470 commits from v1.18.0 to v1.19.1. No batch merge needed.

### Phase 1: Post-refactor cleanup & stabilization (v1.20.0)
- Delete stale `refactor/modular-structure` branch (all content already in main).
- **LintFixer god-class decomposition to module-level functions** (6 functions, already done in main).
- **`utils.ts` god-module → `core/` modules split** (10 modules, already done in main).
- Validate that all 102 refactor-delta src files are accounted for in current `main` file layout.
- Consolidate any remaining technical debt from the manual split (file relocation, adapter exports).

### Phase 2: Schema Coherence
- **#124 — Schema Page Template truth source.** Page Template as body-structure authority; header language decoupled from `wikiLanguage`; `tagVocabularyMode` synced with schema Classification Rules. 2 PRs.
- **#131 Tier 2 — Replace Stage 4 LLM rewrite with deterministic Mentions append.** Full Stage 4 cost removal.

### Phase 3: Graph-based features & Workflow scale-up
- **#117 — Graph-based domain tag inference.** `in_degree × out_degree` hub detection; hub domain labeling via cheap LLM call; tag propagation with explainability.
- **#97 — One-click schema apply + backup.** Needs backup/restore design pass.
- **#122 — Ingestion history panel.** Start with log.md UI layer.
- **#130 — In-place batch ingest queue.** Composes with #122 and `pageGenerationConcurrency`.

### Out of scope (v1.20.0+)

- **#91 (nested tags)** — awaiting #85 in-the-wild feedback; chip input already accepts `/`.
- **#36 — Source title in frontmatter** — needs clarification from issue author.
- **P3 test infrastructure:** wiki-engine full-path integration tests; query-engine core flow tests (requires Obsidian App + Modal + DOM mocks).
- **Restore true streaming for 3rd-party providers** (requires Obsidian native streaming).
- **Missing Concept Pages tracker** (parse Lint LLM prose into structured reports).
- **Lint performance:** hash-bucket dedup prefilter; hierarchical LLM health analysis.

### v1.20.0+ Theme — Query Engine Evolution (P3 research)

Query engine is currently a "structured-context RAG" (keyword + LLM semantic selection + 3-5 page context), not pure Karpathy full-context reasoning. Four-tier improvement roadmap:
- **Tier A (low cost, no new LLM calls):** enhance index with `rel:` field; multi-hop link expansion from selected pages
- **Tier B (medium, +1 LLM call):** hierarchical summary layer — every page has 2-3 sentence pre-computed summary
- **Tier C (high, schema change):** explicit in-memory knowledge graph + graph-traversal retrieval
- **Tier D (highest):** agentic loop with multi-step tool calls (function-calling / OpenAI tools support required)

Documented in `~/.claude/projects/.../memory/project_v1.19.0_query_evolution.md`.

---

## Version Timeline

| Version | Date | Headline |
|---------|------|----------|
| **1.19.1** | 2026-06-17 | Gemini HTTP 400 hotfix (Closes #137) — 3-tier dialect fallback, settings tab cache persistence, stream field-strip fix |
| **1.19.0** | 2026-06-16 | Ingest quality & cost hardening — advanced LLM params, quote grounding, compact slugs |
| **1.18.2** | 2026-06-12 | Custom extraction limits hard-enforced (Closes #120) + #114 tags preservation + #111 slug casing |
| **1.18.1** | 2026-06-11 | Obsidian review compliance (document ban + prefer-active-doc) |
| **1.18.0** | 2026-06-10 | Tag controlled vocabulary (Closes #85) v6/v7/v8 — chip input UX, end-to-end customTags pipeline |
| **1.18.0** | 2026-06-10 | Tag controlled vocabulary (Closes #85) |
| 1.17.0 | 2026-06-08 | Long-document ingestion + source attribution (Closes #90) |
| 1.16.3 | 2026-06-07 | v1.16.2 P0 hotfix completion |
| 1.16.2 | 2026-06-07 | Lint cancel + thinking token bleeding + delete empty stubs |
| 1.16.0 | 2026-06-04 | Sources normalization + Context Window + LMStudio |
| 1.15.0 | 2026-06-01 | PR #87/#88 + aliases unification |
| 1.13.0 | 2026-05-26 | ConflictResolver + 6 audited improvements |
| 1.12.0 | 2026-05-20 | Extraction rearchitected, ~80% faster |
| 1.10.0 | 2026-05-15 | Aliases + granularity expansion |
| 1.9.0 | 2026-05-10 | Pollution defense + 14-issue batch |
| 1.8.1 | 2026-05-05 | Rate limit + smart fix all + 53 tests |
| 1.0.0 | initial | First Obsidian release |

### Earlier Versions (v1.16.2 and prior)

Full version history (v1.16.2 → v1.0.0) is preserved in [CHANGELOG.md](CHANGELOG.md). ROADMAP tracks only the current release and active work.

#### Highlights (chronological)

- **v1.16.2 — P0 Bug Fix Batch**: Lint cancel AbortSignal propagation, thinking-token bleeding three-layer defense, delete-empty-stubs.
- **v1.16.0 — Sources Normalization + Client Refinement**: Issue #81 (sources normalizer, 22 tests), Context Window setting, LMStudio provider, startup quick fixes.
- **v1.15.0 — Stability & UX Hotfix**: PR #87/#88 merged, aliases unification.
- **v1.13.0 — Quality & Infrastructure**: ConflictResolver, mock infrastructure, 6 audited improvements.
- **v1.12.0 — Production-Grade Performance**: extraction rearchitected, ~80% faster.
- **v1.10.0 — Aliases + Granularity Expansion**: 4 user-facing improvements.
- **v1.9.0 — Pollution Defense & Quality Upgrade**: 14-issue batch.
- **v1.8.1 — UX Hardening**: rate limit notice, smart fix all, settings reorg.
- **v1.7.20 — Code Quality Phase 1**: 5 deep fixes + modular splits.
- **v1.7.0 and earlier** — see CHANGELOG.md for full history.
