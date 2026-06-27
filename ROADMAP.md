# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.22.4 → 1.23.0 (PATCH released) | **Updated:** 2026-06-27

---

## Current Status

### Implemented (v1.22.4) — Hotfix: GPT-5.x probe + provider error UX (2026-06-27)

Closed two user-reported issues in v1.22.3 user testing — both PATCH scope (backward-compatible bug fixes):

- ✅ **#207 — GPT-5.x models no longer fail Test Connection with 400.** v1.20.0's `params.model.startsWith('gpt-5-')` prefix-matching heuristic only matched the dash-suffixed OpenAI gpt-5 family (`gpt-5-mini`, `gpt-5-nano`, etc.) and silently broke for every new gpt-5.x release (`gpt-5.1`, `gpt-5.4-mini`, `gpt-5.5`). This was a regression of the same root-cause class as #143 in v1.20.0. Replaced with a runtime probe-then-cache mechanism: first request uses `max_tokens`, if the backend rejects with 400 we cache the alternate key (`max_completion_tokens` or vice versa) and retry. New `MaxTokenKey` type and `detectRejectedMaxTokenKey()` exported pure function. Stream path mirrors the same pattern in `createMessageStream`.
- ✅ **Test Connection UI now surfaces the provider's actual error message.** Previously, `requestUrl` errors were re-wrapped as `status 400: ${data.error.message}` (or just "status 400" when the response body was lost to requestUrl's 4xx-throw-without-body behavior), and the provider's actual diagnostic was never visible. New `extractProviderErrorMessage()` enriches the thrown error in both `createMessage` and `createMessageStream` so Test Connection Notice text reads `status 400: <provider message>` instead of a generic HTTP wrapper.
- ✅ **Lint performance knobs centralised in `src/constants.ts`.** Yield cadences, candidate batch sizing, prep batch read, and source-analyzer batch sizing now live in one place. Previously these values were duplicated across `controller.ts`, `duplicate-detection.ts`, `preparation.ts`, and `batch-limits.ts` — including a literal `MAX_TOKENS=16000` copy of `MAX_TOKENS_BATCH`. Tuning lint performance is now a single-file change.
- ✅ **Tests: 1076 passing.** +12 since v1.22.3.

Three issues found in v1.22.2 user testing — kept in PATCH scope because all three are parity/latent-bug fixes:

- ✅ **log header detection hardened to language-agnostic structural marker.** v1.22.2's text-based detection (`view operation history` / `操作历史`) broke for German/Japanese/Korean (would re-stamp with English header on every locale that didn't have its keyword) and false-matched when log entry bodies naturally contained the keyword phrase. Switched to `<!-- llm-wiki-log-header-start -->` HTML-comment marker embedded in the header. Existing v1.22.2 log files are auto-upgraded on next startup.
- ✅ **log header strings consolidated into `src/texts/<lang>.ts`.** Four localised header strings previously duplicated in `core/log-header.ts` now live alongside every other UI string, so translators and i18n-parity tests cover them automatically.
- ✅ **`generation_complete` no longer stamped onto `log.md` / `index.md` / `schema/`.** `createOrUpdateFile` previously called `markPageComplete` for every write, which would prepend a brand-new frontmatter block (`---...generation_complete: true...---`) to files without frontmatter — visibly polluting log.md body on every QuickFix run. New `isInWikiContentFolder()` guard restricts the stamp to `wiki/{entities,concepts,sources}/...` only.
- ✅ **Tests: 1064 passing.** +5 since v1.22.2 (5 path-rule guard regression tests).

### Implemented (v1.22.2) — UX improvements + tech debt (2026-06-26)

Closed 5 items from the v1.22.1 user-testing feedback loop:

- ✅ **#204 — Auto Ingest blocking modal fixed.** New `onAutoIngestDone()` helper routes watch-mode ingest completions to a configurable Notice (default, non-blocking) instead of the IngestReportModal. `autoIngestNotificationLevel: 'notice' | 'modal'` setting (conditional UI dropdown under Watch Mode). Manual ingest always opens the modal; watch-mode respects user preference.
- ✅ **Auto Smart Fix FixReportModal → transient Notice.** Replaced the blocking fix-completion modal with a Notice that hints at the Operation History Panel. Controlled by the same notification level setting.
- ✅ **D1 — Dead code: redundant `setDoneCallback` resets removed from `main.ts`.**
- ✅ **D2 — `slug.ts:2` console.debug noise removed.**
- ✅ **D3 — `log.md` header i18n + auto-migration.** New `core/log-header.ts` pure function builds a 10-locale header explaining the log and pointing to the Operation History Panel. On startup (Phase 4.5), old single-line headers are auto-detected and non-destructively migrated — all `## [date time]` entries preserved.
- ✅ **Periodic Lint refined: Off/Daily/Weekly/Monthly.** "Hourly" removed (unrealistic for LLM lint); existing `hourly` data auto-migrated to `daily`.
- ✅ **Tests: 1054 passing.** +25 since v1.22.1.

### Next Milestone: v1.23.0 (MINOR — Graph Engine direction)

No proactive 11th language added. Two reasons:
1. **No demonstrated unmet need**: zero open issues in any non-supported language. Adding L1-speaker-population languages (Russian/Arabic/Hindi) without user demand is misallocated effort.
2. **Per-language maintenance cost is permanent**: every new UI feature must translate to N+1 languages, slowing future dev.

Future 11th language: **contributor-driven only** (replicate PR #159 Italian pattern). If a native speaker files a PR for Vietnamese/Indonesian/Polish/Turkish/Czech/Swedish/etc., review + merge. RTL languages (Arabic/Hebrew) need a separate feature for layout direction — defer to v1.24+ as standalone work.

**Priority inversion:** improving translation quality of existing 10 locales (professional native review) **>** adding the 11th.

### Next Milestone: v1.23.0 (MINOR — Graph Engine direction)

- ⭐ **#198 — Personalized PageRank (PPR) over the `[[wiki-link]]` graph.** Closes #117 (Query Wiki relevance), #157 (hub detection), #175 (link distinctiveness) with one primitive. Monte Carlo PPR (Fogaras 2005) — K short random walks per query page, O(K×L) cost independent of |V|, embarrassingly parallel, Web Worker compatible. Hybrid guard: lex-match fallback when graph too small (min_pages / min_edges threshold). Tier B redesigned: zero-LLM section-extractor (parse `## Description` / `## Definition` at query time, ~30 LOC). Clustering retirement deferred to v1.24.0.

### In Progress — v1.22.0 P2 (Feature batch — after P1 lands)

- ⭐ **#185 — Propagate source-note frontmatter `aliases:` to generated wiki pages** (@DocTpoint). Source-note curated aliases are the highest-value signal for inflected languages (de/fr/es/pt/it) where one concept has many grammatical forms. Plan: extend `source-analyzer.ts` to extract source `aliases:`; `appendAliases` (post-#186 fix) appends them; opt-in via settings flag. Effort: 1 day.
- ⭐ **#184 — Obsidian Bases for wiki index management** (@alfred1137). Replace LLM-rewritten `wiki/index.md` with a `.base` file querying frontmatter (`wiki-content`, `generation_complete`, `type`). Eliminates token waste + LLM drift on the index. `BasesView` API integration for re-feeding context to LLM. Opt-in / backward-compat. Effort: 2-3 days.

### Implemented (v1.21.1) — #173 Symptom A Hotfix (2026-06-22)

Three open PRs from the 2026-06-19/20 triage, scoped for a single hotfix release (all parity/latent-bug fixes, zero new behavior for existing users):

- ✅ **PR #154 — mergeFrontmatter alias dedup** (@DocTpoint). `mergeFrontmatter` now dedups `fm.aliases` parity with `enforceFrontmatterConstraints` — closes a latent "aliases accumulated ~15× in long-lived vaults" bug. 2 regression tests; +5/-1 LOC in `core/frontmatter.ts`. No breaking changes.
- ✅ **PR #156 — Source-page slug fingerprint** (@Indexed-Apogrypha). Every source slug now `<basename>_<6hex FNV-1a of full path>` — fixes Issue #155 (silent overwrite when two source files share a basename across folders). Single-computation point in `wiki-engine.ts` + pure `core/source-slug.ts` module + 9 unit tests + live e2e. Breaking only for re-ingest: existing source pages rename but backlinks update.
- ✅ **PR #158 — Stage-4 reviewed guard** (@DocTpoint). `updateRelatedPage` now respects `reviewed: true` and routes to `appendToReviewedPage` (same as `createOrUpdatePage`). Closes a latent bug where re-ingesting an unrelated source would LLM-rewrite a curated `reviewed: true` page's body. 1 regression test using `NO_NEW_CONTENT` LLM response to prove "curated body survives"; +9/-0 LOC in `page-factory.ts`.

**Hotfix rationale:** all 3 fixes are parity/latent-bug — they restore behavior that *should* have been there from the start. Single hotfix keeps change log coherent.

### In Progress — v1.21.0 Schema Coherence Phase 1 (local branch `feat/v1.21.0-schema-coherence-phase1`)

Address Issue #124 (hardcoded page section structure) via `SchemaContext` + `buildSchemaSectionTemplate`. Also fixes Issue #97's prerequisite: schema as single source of truth before one-click apply can deliver value. Schema Phase 2 (generation.ts wired to schema template + custom section names) and Phase 3 (#97 auto-backup) follow.

### Implemented (v1.20.2) — Anthropic Fallback System-Role Hotfix (2026-06-19)

- ✅ **#141/#147 — Anthropic fallback retry system-role fix.** PR #151 by @Indexed-Apogrypha: all 4 Anthropic fallback paths now keep system as top-level field (not in messages array). +4 regression tests with Anthropic API simulator.

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

## Next Milestone: v1.22.1 — PATCH hotfix (review warnings + remaining P1 bugs)

### v1.22.1 Scope
- **CSS `:has()` warning fix** (Obsidian review warning: broad selector invalidation → perf cost; CSS selector replaced with direct class selector on `modalEl` + `contentEl`)
- **`scripts/css-lint.mjs`** — multi-rule CSS lint (catches `!important` + `:has()` to prevent regression)
- **#197 — fixDeadLink 制造 stub** (`fix-dead-link.ts` deterministic fallback + LLM `create_stub` both fabricate AI-expanded pages for honest forward-refs; reintroduces the #164 hallucination class; should leave dead link or flag instead of creating)
- **#187 — Related-link `sources/` prefix** (`page-factory.ts:206,215` filter-by-type truncates related entities when vault > 50 pages)

Stays local until user-in-the-wild signals other P0 issues for a single release.

---

## Next Milestone: v1.23.0 — Graph Engine (MINOR feature)

### Direction (under public discussion — see tracking Issue)

A single graph-native engine (`core/graph-engine.ts`) powered by **Personalized PageRank** (Haveliwala 2002) over the existing `[[wiki-link]]` graph. One primitive, many consumers — closes #117, #157, #175 simultaneously:

| Consumer | Existing Issue | PPR-derived metric |
|----------|----------------|-------------------|
| Hub detection | #117 | `inDegree + PageRank` + retirement via local clustering coefficient (@DocTpoint 2026-06-23) |
| Link distinctiveness | #157 | `shared-link(P,T) / PageRank(T)` (replaces embedding cosine) |
| Query retrieval (Tier A) | (replaces ROADMAP §Query Engine Evolution Tier A) | PPR seeded at query page → top-k by score |
| Dead-link hub check | #197 | "Is the target a retiring/mature hub?" signal |
| Multi-hop traversal | (replaces Tier C) | PPR multi-seed iteration |

### Tier B (summary) — REDESIGNED

Original Tier B: per-query LLM call to generate summary.
**Revised**: zero LLM cost — extract `## Description` / `## Definition` section from the existing page body at query time (`core/section-extractor.ts`, ~30 lines, no frontmatter pollution, no migration needed for old wikis).

### Tier D (agentic) — Deferred to v1.25.0+

Requires LLM function-calling support across all providers (Anthropic ✅, OpenAI ✅, Gemini ✅, Ollama partial, others unstable). Out of scope until provider matrix stabilizes.

### v1.23.0 Scope (provisional, depends on Issue discussion outcome)
- `core/ppr.ts` — pure PPR engine (~80 LOC, O(V+E·iter), pure JS, zero deps)
- `core/section-extractor.ts` — markdown section extractor (~30 LOC)
- `core/hub-detection.ts` — degree + clustering retirement (~50 LOC)
- `core/link-distinctiveness.ts` — shared-link ratio (~40 LOC)
- `wiki/query-engine.ts` — replace lex match with PPR top-k retrieval
- Lint integration: use PPR signals in hub-link strip (#157 path)
- Estimated: ~200 LOC core, ~30 LOC query integration, 30+ tests

### Deferred to v1.24.0+ (lower ROI, lower coupling)
- #185 source-note alias propagation (independent feature, opt-in flag, 1 day)
- #184 Obsidian Bases index management (schema path, 2-3 days)
- #130 in-place batch ingest queue (depends on #184)
- #182 Obsidian Keychain (security hardening, independent)

### Deferred to v1.25.0+ (research / experimental)
- #112 Event marker/type (domain modeling)
- #168 Auto granularity (independent heuristic)
- #91 Nested tags (depends on #85 in-the-wild feedback)
- ROADMAP Tier D — agentic loop (function-calling support matrix)
- ROADMAP Tier B (original) — **superseded by `section-extractor` design above**
- ROADMAP Tier C (original) — **superseded by PPR multi-seed (no separate in-memory graph needed)**

### Out of scope
- #36 Source title in frontmatter — needs clarification from issue author
- #142 Multiple wikis — long-term, workaround: wikiFolder switch
- P3 test infrastructure — wiki-engine + query-engine full-path integration tests
- Restore true streaming for 3rd-party providers
- Lint performance — hash-bucket dedup prefilter, hierarchical health analysis

### v1.20.0+ Theme — Query Engine Evolution (REVISED 2026-06-23)

~~Query engine is currently a "structured-context RAG"...~~ **DEPRECATED.**

**New direction** (see v1.23.0 Graph Engine above): the [[wiki-link]] graph + PPR replaces the heuristic tier ladder. Tier A = PPR retrieval. Tier B = section-extractor (zero LLM). Tier C = PPR multi-seed. Tier D = agentic (v1.25.0+).

Documented in `~/.claude/projects/.../memory/project_v1.23.0_graph_engine.md`.

---

## Version Timeline

| Version | Date | Headline |
|---------|------|----------|
| **1.22.4** | 2026-06-27 | Hotfix — GPT-5.x probe-then-cache (Closes #207) + provider error UX + lint knobs centralisation |
| **1.22.3** | 2026-06-26 | Hotfix — language-agnostic log header + content-folder guard for `generation_complete` |
| **1.22.2** | 2026-06-26 | Hotfix — auto-ingest modal→Notice (#204) + log i18n + periodic lint refined |
| **1.22.1** | 2026-06-24 | Hotfix — fixDeadLink fabrication (#197) + startupCheck migration (#199) + CSS `:has()` + Query side panel (#196) + related-link corrector (#187) |
| **1.22.0** | 2026-06-23 | Schema one-click apply (#97) + dynamic tag sync + zh-Hant + ingest status bar (#189, @YounianC) |
| **1.21.1** | 2026-06-22 | Hotfix — #173 Symptom A NFC/NFD + esbuild 0.28.1 |
| **1.21.0** | 2026-06-21 | Pre-ingest gate (#164) + Schema Phase 1 (#124) + History Panel (#122) + Italian (#159) |
| **1.20.3** | 2026-06-20 | Hotfix — source-slug fingerprint (#155) + alias dedup (#154) + Stage-4 guard (#158) |
| **1.20.2** | 2026-06-19 | Anthropic fallback system-role hotfix (PR #151 by @Indexed-Apogrypha, Closes #141/#147) |
| **1.20.1** | 2026-06-18 | Anthropic prefill rejection hotfix (Closes #141/#147) |
| **1.20.0** | 2026-06-18 | Provider-first thinking control + reasoning UI (Closes #141/#134/#143) |
| **1.19.1** | 2026-06-17 | Gemini HTTP 400 hotfix (Closes #137) |
| **1.19.0** | 2026-06-16 | Ingest quality & cost hardening — advanced LLM params, quote grounding, compact slugs |
| **1.18.2** | 2026-06-12 | Custom extraction limits hard-enforced (Closes #120) + #114 tags preservation + #111 slug casing |
| **1.18.1** | 2026-06-11 | Obsidian review compliance (document ban + prefer-active-doc) |
| **1.18.0** | 2026-06-10 | Tag controlled vocabulary (Closes #85) v6/v7/v8 — chip input UX, end-to-end customTags pipeline |
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
