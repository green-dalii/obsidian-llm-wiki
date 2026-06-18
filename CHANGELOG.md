# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.20.1] - 2026-06-18

### Fixed
- **AnthropicClient prefill rejection on newer Claude models (Issues #141, #147).** Claude Opus 4.8, 4.7, 4.6, Sonnet 4.6, Claude Fable 5, Claude Mythos 5, Claude Mythos Preview do not support assistant message prefilling. When `response_format=json_object` is requested, `AnthropicClient` previously added `{ role: 'assistant', content: '{' }` unconditionally — newer models return `400 "Prefilling assistant messages is not supported for this model."` Fix: detect this specific 400, cache the rejection per-client, and auto-retry without prefill. Subsequent requests to the same client skip prefill entirely. The existing brace-prefix + `parseJsonResponse` repair logic handles non-prefill responses robustly. See [Anthropic API Errors — Common Validation Errors](https://platform.claude.com/docs/en/api/errors#common-validation-errors).

### Tests
- **775 tests passing** (was 771; +4 from new `llm-client-anthropic-prefill` suite).

## [1.20.0] - 2026-06-18

### Added
- **Collapsible thinking UI in Query Wiki.** When thinking-capable models (DeepSeek, etc.) return reasoning content, it's displayed in a collapsed `💭 Thinking process` panel above the answer (ChatGPT/Claude.ai style). Fully localized in 8 languages.
- **`extractThinkingBlocks()`** pure function in `core/markdown.ts` — extracts `<think>` and `<thinking>` blocks from LLM responses.
- **`wrapReasoningContent()`** pure function — encodes reasoning_content into `<think>` tags with escaping for nested closing tags.
- **`renderThinkingBlocksUI()`** — DOM construction for collapsible thinking panel with localized labels.
- **DeepSeek `reasoning_content` extraction.** SSE parser extracts `reasoning_content` from OpenAI-format deltas. Both streaming and non-streaming paths prepend reasoning as `<think>` tags for the thinking UI.
- **`PROTECTED_FIELDS` whitelist** in `OpenAICompatibleClient` — prevents `model`, `messages`, `stream` from being stripped by `unsupportedFields` even if a 400 error mentions them.

### Changed
- **Provider-first thinking control (default `disableThinking: false`).** The plugin no longer sends any thinking-control field by default — the provider decides its own reasoning behavior. Old default was `true` (sent `thinking.type='disabled'`). Users who explicitly want to suppress thinking can enable "Disable thinking" in Custom Advanced Settings, which triggers the 3-tier dialect fallback.
- **`enableThinking` spread consistency.** All 22 LLM call sites now use `...(ctx.settings.disableThinking ? { enableThinking: false } : {})` — page-factory, contradictions, conversation-ingest were missing the spread (had comment-only placeholders).
- **`AnthropicClient` baseUrl normalization.** Constructor now strips trailing `/v1` and re-appends it, preventing double-path `/v1/v1` (fixes #141, #134).
- **`listModels()` uses `this.baseUrl`.** Anthropic `listModels()` no longer hardcodes `https://api.anthropic.com/v1/models`.
- **`isGpt5` prefix check tightened.** `startsWith('gpt-5')` → `=== 'gpt-5' || startsWith('gpt-5-')` to avoid matching future unrelated models.
- **`.includes('<think')` guard is now case-insensitive.** Uses `.toLowerCase()` to catch `<Thinking>` variants.
- **v1.20.0 migration in `loadSettings()`.** Resets `disableThinking` from `true` to `false` and `advancedSettingsMode` to `'default'` for existing users.

### Fixed
- **gpt-5 `max_completion_tokens` (Issue #143).** GPT-5 series models now use `max_completion_tokens` instead of `max_tokens`. Truncation retry also preserves the correct token key.
- **Truncation retry loses reasoning_content.** `extractText` callback now wraps retry response's `reasoning_content` via `wrapReasoningContent`.
- **Streaming path missing final render.** After `createMessageStream` returns, the full response (including `<think>` tags) is now rendered via `renderMarkdownContent` — thinking content was previously only available during non-streaming path.
- **Non-streaming fallback missing `chatTemperature`.** The fallback path when streaming fails now includes the user's configured temperature.
- **`if (fullResponse)` dropped empty responses.** Changed to `!== undefined/null` guard to handle empty-string responses.
- **Query Wiki respects `wikiFolder`.** Prompt templates and defense-in-depth normalization replace hardcoded `wiki/` paths.
- **Query Wiki auto-scroll.** Chat scrolls to bottom on open.
- **User message right-align.** User bubbles use `flex-end` alignment with accent background.

## [1.19.1] - 2026-06-17

### Fixed
- **Gemini HTTP 400 on ingestion (Issue #137).** Added a 3-tier thinking-control dialect fallback chain (anthropic → openai → none) so `OpenAICompatibleClient` auto-discovers the correct field name (`thinking.type='disabled'` vs `reasoning_effort='none'` vs none) per baseUrl. The result is cached on the client + in `data.json` so subsequent requests skip the 400 probe round-trip. Toggles the `thinkingControlCache` schema from `boolean` to dialect string (`'anthropic' | 'openai' | 'none'`); old boolean values migrate transparently on read.
- **Settings tab auto-save wiped `thinkingControlCache` on every close.** `LLMWikiSettingTab.hide()` and the explicit Save button used shallow `{ ...tempSettings }` spread that dropped `thinkingControlCache` (the form never tracks it). The freshly-cached probe result was erased on every tab close, forcing a full re-probe on the next ingestion. Fix: extract `commitTempSettings()` helper that preserves untracked probe-mutated fields; also sync probe result back into `tempSettings` on Test Connection success so auto-save catches it.
- **Generic 400-field rejection retry (temperature, repetition_penalty, etc.).** `parseUnknownFields()` extracts rejected field names from Gemini-style 400 bodies; `unsupportedFields` Set pre-strips them on subsequent requests. The `retryBodyWithStrippedFields()` helper deduplicates the strip-and-retry logic across non-stream and stream paths.
- **Stream path field-strip retry was dead code.** `createMessageStream`'s `doRequest` lacked an inner 400 catch block, so `parseUnknownFields` never ran on stream errors and `unsupportedFields` was never populated. Fixed: added the same catch+populate pattern that the non-stream path uses.
- **`[DEBUG-400]` firing on 429 quota errors.** The `window.fetch` re-fetch and `console.error` diagnostics ran unconditionally on every 4xx. Limited to 400-class errors only; 429/5xx go through standard `withRetry` backoff without the re-fetch overhead.
- **Fallback notices always in English.** `queueFallbackNotice()` hard-coded `TEXTS.en`; the 3 newly-added fallback not keys (`fallbackThinkingDialect`, `fallbackThinkingNone`, `fallbackParamStripped`) were present in all 8 locale files but never used. Fixed: `OpenAICompatibleClient` now has a `language` field wired by `createLLMClient`; `queueFallbackNotice` calls `getText(this.language, key)`.

### Changed
- **Advanced LLM Settings moved above Test Connection** in the settings panel for better workflow flow (configure params first, then test).
- **400-path diagnostic output silenced from `console.error` to `console.debug`.** The in-request dialect fallback expects one 400 per rejected tier (normal on Gemini). Only the "no fallback tier succeeded" path surfaces as a real error.

### Simplified
- **`IS_400` regex extracted** as a module-level constant; used by `isThinkingControlError`, both 400 catch paths, and stream 400 path (eliminated 3 regex copies).
- **`retryBodyWithStrippedFields`** replaces the duplicated strip-and-`JSON.stringify`-change-detect pattern with a `changed` boolean loop.
- **`applyThinkingDialectFallback`** now reuses `buildRequestBody` instead of manually reconstructing retry bodies, so the retry inherits `unsupportedFields` pre-strip (fixing a latent bug where stripped fields could leak back into the retry body).
- **`commitTempSettings()`** extracted to deduplicate settings form merge logic across `hide()` and Save button.
- **Probe success/failure cache write clarified** in `testLLMConnection` — dead `detectedDialect !== undefined` branch removed; both success and failure now write to the cache so subsequent calls skip the probe.

### Tests
- **36 test files, 744 passing** (was 728; +16 from new `llm-client-gemini-fallback` and `settings-thinkcache` suites). 0 regressions.

Closes #137

## [1.19.0] - 2026-06-16

### Added
- **Compact slug list in analyzeSource prompt (Issue #116).** New `buildCompactSlugList()` injects a sorted slug-only list of existing wiki pages into the prompt so the LLM uses exact paths when creating `[[links]]`, reducing dead-link slug mismatches caused by the verbose 40K-char index cap. Previously, only the first ~50 pages fit. Contributed by @DocTpoint.
- **Quote-grounding lint scanner (Issue #126).** New `scanQuoteGrounding()` pure function verifies that every quote under `## Mentions in Source` can be found in the linked source file. Supports both current `"quote" — [[sources/slug]]` format and historical bare quotes (scans all source files if no link is present). Tier 1 = exact substring match; Tier 2 = normalized (case-fold, punctuation stripped, whitespace collapsed). Report-only, zero token cost. Contributed by @DocTpoint.
- **Advanced LLM parameter settings (Issue #128).** Collapsible "Advanced parameter settings" section in LLM Configuration with a Default/Custom mode selector. Default mode keeps all advanced parameters hidden and "disable thinking" on — the right choice for most users. Custom mode reveals the thinking toggle, extraction temperature (range 0–2), query temperature (range 0–2), and repetition penalty (range 0–2). Only sent to the LLM when the user sets a value — cloud providers that ignore the field fall back to their own defaults. The `disableThinking` field name is preserved in `data.json` for backward compatibility; production code passes the affirmative `enableThinking` form internally.
- **Reasoning-only response detection (Issue #99).** `OpenAICompatibleClient.createMessage` now detects when the model returns an empty response with high reasoning tokens (`content == '' && finish_reason == 'length' && reasoning_tokens >= 50% of completion_tokens`) and throws an actionable error prompting the user to check the disable-thinking toggle or switch models. Also adds automatic 400 fallback: when the provider rejects `thinking.type='disabled'`, the client retries with `chat_template_kwargs: {enable_thinking: false}` (auto-fallback, no separate user toggle).
- **Status bar mirrors popup during ingest and lint (Issue #110).** All ingestion progress messages and lint checkpoints now update both the popup Notice and the Obsidian status bar simultaneously. `makeMirroredNotice.hide()` clears the status bar text. Fix-runner Notices mirror every `setMessage()` call to the status bar. Contributed by @dmarchevsky.
- **Auto Smart Fix setting (PR #109).** When enabled, lint automatically runs all Smart Fix phases after analysis completes without showing the report modal. Default: off — existing users see no behaviour change.
- **Sources normalization in write path (PR #127).** `fixPollutedSources()` is called from the centralized write chokepoint (`WikiEngine.createOrUpdateFile()`), so every generated/merged page gets a normalized `sources:` field. Contributed by @DocTpoint.

### Changed
- **Startup quick-fixes Notice simplified.** Removed heavy emoji icons and `━━━━━━━━━━━━━━━━` separators; cleaner layout with plain text prefixes. Logs now use English consistently.
- **Lint report summary now includes ungroundedQuotes and tagViolations counts.** The report header line shows all current dimensions.
- **Ungrounded quotes section in Lint report.** When scanQuoteGrounding finds issues, a new "Ungrounded quotes" section appears in the programmatic findings report.
- **lintTagViolationSection i18n completed.** Previously 7 non-English locales showed English placeholder — now fully translated (de/es/fr/ja/ko/pt/zh).
- **Language dropdown labels simplified.** Labels now use each language's native name only (e.g. `中文`, `日本語`, `Deutsch`) without English sub-labels.

### Fixed
- **Advanced settings mode dropdown did not render controls.** The `onChange` handler was missing `this.display()` (contrast with Tag Vocabulary dropdown which called it). Fixed: choosing "Custom" now properly reveals thinking toggle, temperature, and penalty inputs.
- **Misleading watchedFolders debug logs removed.** `loadSettings`/`saveSettings` no longer print `watchedFolders` content, preventing confusion when `autoWatchSources` is off.
- **Previously-merged PR #110 "click to cancel" status bar affordance.** UX fix by @dmarchevsky in PR #110: status bar now shows locale-specific "click to cancel" throughout ingest/lint/fix operations.

### Performance
- **Stage 4 no-op skip (PR #131 Tier 1).** `PageFactory.updateRelatedPage` skips the LLM call when `new_info` resolves to the `'No directly relevant information'` fallback string. Removes ~33% of Stage 4 LLM calls. Still updates frontmatter `sources` + `updated` programmatically. Contributed by @DocTpoint.

### Refactored
- **lint-controller modularization.** Extracted `phases/preparation.ts`, `phases/programmatic.ts`, `report-builder.ts`, `types.ts` from the monolithic controller. lint-controller.ts went from 1069 → 897 lines. 17 new unit tests (728 total).
- **schema-analyze moved to schema/ directory.** `src/wiki/schema-analyze.ts` → `src/schema/analyze.ts`.
- **LintContext extracted to lint/types.ts.** Breaks the latent import cycle between `fix-runners.ts` and `lint-controller.ts`; `fix-runners` now imports from `./types`.
- **lint-controller + lint-fixes moved into lint/ directory.** `src/wiki/lint/controller.ts` (was lint-controller.ts), `src/wiki/lint/fixer.ts` (was lint-fixes.ts). All internal imports updated.

## [1.18.2] - 2026-06-12

### Fixed
- **Custom extraction limits not hard-enforced (Issue #120).** When `extractionGranularity` was set to `custom`, the `customEntityLimit` / `customConceptLimit` settings were only enforced as soft prompt hints — the LLM routinely returned 12-25 items for a configured cap of 8, and all of them were written to wiki pages. Two existing mechanisms were insufficient: (1) the prompt instruction "Extract at most N…" was ignored on dense sources; (2) the convergence detector only stopped *further batches* once both types reached the cap, which never fired on the common single-batch case. Fix: after all batches are accumulated and immediately before `buildSourceAnalysis()`, slice both `accumulation.entities` and `accumulation.concepts` to the configured limits. The first N items in extraction order are preserved. The prompt instruction and convergence detector remain as complementary mechanisms (they guide the LLM and avoid unnecessary extra batches). No behavior change for `default` / `1-5` granularity modes. Closes #120.

## [1.18.1] - 2026-06-11

### Fixed
- **Obsidian Community Plugin review compliance.** Removed `document` fallback and `eslint-disable` comments referencing `obsidianmd/prefer-active-active-doc` from production code. The `activeDocument` stub is now centralized in the test setup file, keeping all production code strictly compliant with Obsidian's multi-window `activeDocument` requirement. No user-visible behavior change.

## [1.18.0] - 2026-06-11

### Added
- **User-Controlled Tag Vocabulary (Issue #85) — chip input UX + end-to-end pipeline (v6).** Wiki admins in medical, legal, R&D, and other professional domains can now define a controlled vocabulary for entity/concept frontmatter tags and the LLM actually uses it. The new "Tag Vocabulary" sub-block (embedded in Wiki Configuration — no separate heading) has a **Vocabulary Mode** dropdown:
  - **Default** — preserves the original hardcoded subtype tags (`person`/`organization`/… for entities, `theory`/`method`/… for concepts). The dropdown description now shows the concrete default list inline: `Default uses built-in tags: person, organization, project, … (entities) / theory, method, … (concepts).`
  - **Custom** — two chip inputs (Custom Entity Tags + Custom Concept Tags). Add via Enter / `,` / `;`, remove via × click or Backspace on empty input. Nested tags with `/` (e.g. `Arzneimittel/Neurologie`) are preserved. Whitespace is trimmed, empty entries filtered, duplicates (case-insensitive) are silently skipped with a brief shake animation. CJK IME composition is respected (`event.isComposing` guard). Defaults are editable baseline (not preview) — when the persisted custom CSV is empty, the chip input materializes the default vocabulary as fully-editable chips.
- **🔴 v6: End-to-end prompt injection.** New `buildActiveTagVocabularySection()` + `appendTagVocabularyToPrompt()` helpers inject the active vocabulary into ingestion (source-analyzer), page generation (page-factory × 3 sites: new page, merge, rebuild), and lint analyze (lint-controller). The LLM now knows exactly which entity/concept types are valid and stops inventing its own. Before v6, the user-defined vocabulary was only used for *post-hoc validation*; the LLM kept inventing subtype names that got silently dropped at write time.
- **🔴 v6: Preserve LLM intent on write.** `enforceFrontmatterConstraints` no longer silently drops out-of-vocab tags. It retains all LLM-emitted tags (with a `console.debug` note when the vocabulary diverges) so the user can see exactly what the model produced and can decide whether to expand their custom vocabulary. Fallback to `DEFAULT_ENTITY_TAG` / `DEFAULT_CONCEPT_TAG` only when the tags array is genuinely empty.
- **v1 → v2 migration runs on `onload()`.** New `cleanupVocabularyTags()` reads `customEntityTags` / `customConceptTags`, normalizes them via `normalizeVocabularyCsv` (trim, dedupe case-insensitively, drop empty), and writes back to `data.json` so existing users see clean chips on first reload.
- **`getActiveEntityTags` / `getActiveConceptTags` pure helpers** in `utils.ts` — the single source of truth for "which tags are valid right now". All call-sites (page-factory, lint-fixes × 2) pass `this.ctx.settings`.
- **🔴 v7: Programmatic tag audit + LLM-assisted retag.** New `scanTagViolations()` (pure function in `src/wiki/lint/scanners.ts`) walks every entity/concept/source page in the wiki at Lint time and reports any page whose `frontmatter.tags` array contains at least one value not in the active vocabulary. Zero token cost, <50ms on 2000-page vaults. The Lint Report Modal gets a new "🏷️ Retag N page(s) with LLM" button that calls `runRetagViolations()` (in `src/wiki/lint/fix-runners.ts`): the LLM is given the page's first-paragraph summary + the active vocabulary section (via `appendTagVocabularyToPrompt()` from v6), and returns a new `tags: string[]`. The runner re-validates every returned tag against the active vocabulary (defensive), and only the `tags:` line of the frontmatter is rewritten — the body is byte-identical. Source pages get a static `VALID_SOURCE_TAGS` vocabulary (paper / article / book / transcript / clippings / notes / other) — NOT user-configurable per Issue #85 v7 design decision. Smart Fix All now runs retag as Phase 5 (after duplicates / orphans / empty pages).
- **`enforceFrontmatterConstraints` source-page branch** now validates against `VALID_SOURCE_TAGS` (previously: `[]` = no validation). Page writes still succeed even with out-of-vocab tags thanks to v6's preserve-LLM-intent behavior (only a `console.debug` note when divergence is detected).
- **Default vocabulary cross-discipline optimization (v8).** Entity `location` → `place` for more natural semantics; Concept `+field`, `+phenomenon`, `+standard`, `-technology` for better distinction; Source `-document` (overlapped with article), `notes` retained. Full backward compatibility via v6 preserve-LLM-intent — removed tags survive in existing frontmatter, flagged by Lint audit for optional LLM-assisted retag.
- **Reviewed-guard (D4 design).** `enforceFrontmatterConstraints` now respects `fm.reviewed: true`: when a user has marked a page as reviewed, their tag intent (including intentionally empty `tags: []`) is preserved — the function does NOT auto-fill `tags: [other]`. Only LLM-hallucinated dates are still stripped (date fields are strictly programmatic). Aligns with existing reviewed-aware code paths (lint-fixes.ts:439, page-factory.ts:288/308, prompts/generation.ts:206-241).
- **🔴 Layer A complete: disableThinking propagation (Issue #99 v2).** The v1.16.2 three-layer defense added `disableThinking` parameter to the LLM client interface but ZERO of ~22 production `createMessage` calls passed it. This release completes the wiring: `disableThinking` is declared in `LLMWikiSettings` (default `true`), and all 22 `createMessage`/`createMessageStream` calls across 7 engine files now pass `disableThinking: settings.disableThinking`. Thinking-capable models (Gemma 4, DeepSeek-R1, QwQ) receive `thinking: { type: 'disabled' }` on every call, preventing mid-response CoT and duplicated body output at the source.
- **AnthropicClient fallback for thinking-mandatory models.** Unlike OpenAICompatibleClient which already had try/catch fallback from v1.16.2, AnthropicCompatibleClient and AnthropicClient would throw unconditionally when a provider rejects `thinking.type='disabled'` (e.g. Claude Fable 5 / Mythos 5). Both clients now wrap the request in try/catch: on 400 + `disableThinking=true` + `isThinkingControlError()`, they cache `thinkingControlSupported=false` and retry the request WITHOUT the thinking field. The redundant ~70-line duplicated request/parse/withTruncationRetry block was refactored into a shared `anthropicDoRequest` helper.

## [1.17.0] - 2026-06-08

### Added
- **Long-document ingestion now works end-to-end.** Previously, sources over ~200KB were unprocessable due to a hardcoded batch size of 15 items in custom granularity and a `max_tokens` cap that truncated large responses. The same 619KB Chinese source (史记 / Shiji) that previously failed after 3 minutes and 15 items now completes fully, extracting hundreds of entities and concepts. Key enablers:
  - Custom granularity now dynamically scales `initialBatchSize` and `maxBatchesBase` from the user's `customEntityLimit` + `customConceptLimit` (was hardcoded to 5/1, capped at 15 items). For caps of 300+300: batchSize=50, maxBatchesBase=12, up to 36 effective batches.
  - `max_tokens` now scales with batch size (base: 16K → 20K for 50-item batches; retry cap: 60K), avoiding the silent truncation that previously caused later batches to fail with malformed JSON.
  - Truncation retry: if a non-first batch's response is truncated, the system halves the batch size and retries once instead of aborting the whole ingestion.
- **Source pages inherit tags from source note frontmatter (Issue #90).** The LLM used to inject arbitrary concept names (e.g. `Alzheimer-Demenz`, `Neuroprotektion`) into source pages, polluting the user's tag vocabulary. New `extractSourceTags()` pure helper reads the source note's frontmatter tags and passes them directly to the summary-page template, falling back to LLM-derived names only when the source has no tags.
- **Default Schema documents the new contracts.** Three new sections were added to the default `wiki-folder/schema/config.md`:
  - `## Source Page Template` — mandates tag inheritance from source note, no LLM-derived tags.
  - `## Date Fields` — documents that `created`/`updated` are filled programmatically (the LLM may produce wrong dates; the system overrides them).
  - `## Mentions Format` — academic-footnote style: `- "verbatim quote (optional translation)" — [[source-path|display-name]]`.
  Existing user schema files are NOT overwritten; only `regenerateDefaultSchema()` writes the new template.
- **Lint report persistence with minute-precision timestamps.** Lint now writes the full report to `wiki-folder/log.md` before showing the modal, with a `📋 Full report saved to log.md` hint. Log entries have minute-precision timestamps (e.g. `[2026-06-08 14:35]`) so multiple Lint runs on the same day are distinguishable. The Lint Report Modal also points to the persisted log.
- **Custom granularity upper bound raised from 300 to 500** to support professional knowledge bases (legal, medical, deep research). 8-language i18n text updated accordingly.

### Changed
- **Mentions are now footnote-style with explicit source attribution.** The "Mentions in Source" section in entity/concept pages now renders each verbatim quote as `- "quote" — [[source-path|display-name]]`, replacing the previous free-form block of untraced quotes. The source link makes every quote traceable to its origin, so future page merges can never mix up which quote came from which source.
- **Setting description for custom entity/concept limit now reads "1-500"** (was "1-300") in all 8 languages to match the new hard cap.
- **Test connection no longer persists broken config on failure.** When "Test Connection" fails, the previously-saved settings are restored and a 2nd saveData() call re-persists the original. Prevents the user from accidentally saving settings that the test proved broken.

### Fixed
- **Provider settings no longer fail to propagate.** Switching Provider/API Key/Model in Settings used to fail to reach the wiki engine, so the next Ingest/Lint/Query would silently use the old provider. Root cause: `settings.ts` was replacing `plugin.settings` with a NEW object (from tempSettings spread), but the `EngineContext` passed to all submodules captured the OLD reference at construction time. Fix: `WikiEngine.updateSettings()` now keeps the EngineContext.settings reference in sync, and all settings paths (saveSettings, test connection, language switch) call it.
- **LLM-hallucinated dates in frontmatter are now stripped.** The LLM sometimes invents wrong dates (e.g. a 2025 date on a 2026-06-08 ingestion). `enforceFrontmatterConstraints` now strips LLM-generated `created`/`updated` lines and replaces them with programmatic values: `created` is preserved on merge (older value kept), `updated` is always set to today. 3 new TDD tests cover: preserves created, forces updated, adds when missing.
- **Long-source Notice no longer blocks the UI.** Was `new Notice(..., 0)` (persistent, never auto-hides). Now `NOTICE_NORMAL` (5-second auto-hide) so the user isn't stuck with a forever-visible notice.
- **Lint dedup progress "1/1/1" display bug.** The progress template was `批次 {current}/{total}` but `progressLabel` was already passed `1/1` (with the total), causing duplication. Removed the extra `/{total}` substitution.
- **Folder ingest `setDoneCallback` not restored on early return.** If `ingestCount === 0` (no new files), the method returned early without restoring the callback, so subsequent folder ingests used a wrong callback. Now restored before the early return.
- **5 audit-discovered issues** (test settings pollution on connection failure; custom-scaling edge cases; repair-call max_tokens insufficient; constant duplication; comment misleading). All resolved with explicit Gate-4 performance verification.

**Closes:** #90 — Source pages now inherit tags from the source note frontmatter instead of LLM-generated concept names.
- **Small Schema / prompt / i18n cleanups** (new `lintLogReference` i18n key in 8 languages; prompt updates for the new mentions format; pure helper extractions: `extractSourceTags`, `truncateMentions` with `sourcePath` parameter).

### Tests
- 38 new tests added (549 → 587): 7 in `batch-limits.test.ts`, 6 in `truncateMentions` block of `utils.test.ts`, 3 in `enforceFrontmatterConstraints` block, 6 in `extractSourceTags` block, 1 in `default-schema.test.ts`, plus updates across reorganized test folders. Test suite: 28 files, 587 tests, 0 regressions.

## [1.16.3] - 2026-06-07

### Fixed
- **Issue #94 (Lint cancel status bar) — regression fix**: v1.16.2 wired AbortSignal through to the fix-runners, but the LintReportModal still called `this.close()` on every fix-button click, which fired `onClose` → `endLintOperation` and hid the status bar before the user could cancel. The fix gives each fix phase its own lint-operation lifecycle (startLintOperation + endLintOperation wraps the async work) so the status bar persists across fix phases. Modal closes immediately (preserving the original UX); the user gets a top-right progress notice from the fix runner and the bottom-right status bar for cancellation.
- **Issue #94 (batch count display)**: the duplicates-check progress Notice showed "X/4" (outer round counter) instead of "1-4/16" (inner batch range matching the console log). Now shows the actual inner-batch range so console and Notice stay in sync.
- **#243 thinkingControlCache key mismatch**: extracted `getThinkingControlCacheKey()` helper so read and write paths in main.ts use the same cache key. Previously, predefined providers without a baseUrl override caused cache writes to use `''` as key while reads used the PREDEFINED baseUrl — cache would forever-miss. Also skip writes when cacheKey is empty.
- **#244 deleteEmptyStubs error handling**: now returns `{deleted, failed, errors}` instead of throwing on the first failure. Each file wrapped in try/catch so vault race conditions can't half-delete the wiki. Added `lintDeleteFailed` i18n key in 8 languages.
- **#245 thinkingControlSupported cache after fallback**: `OpenAICompatibleClient.createMessage` and `createMessageStream` now set `this.thinkingControlSupported = false` after a successful 400-fallback, so subsequent calls to the same baseUrl skip the redundant 400 round-trip.
- **#248 isThinkingControlError tightening**: now requires both an HTTP 400 status and a rejected-field/parameter keyword in the message. Was matching any error containing "thinking" — false positives on non-400 errors and on messages that mentioned thinking incidentally.
- **Batch count display in i18n strings**: replaced 3 hardcoded English progress strings (`Checking duplicates: batch i/N...`, `Fixing polluted page i/N: title → newTitle`, `🧹 Fix polluted pages (${count})`) with proper i18n keys (`lintCheckingDuplicatesProgress`, `lintFixingPolluted`, `lintModalFixPolluted`) in 8 locales.
- **de.ts trailing-comma syntax error**: 6 other language files had the same issue (trailing spaces where commas should be) — all fixed in lockstep.

### Changed
- **endLintOperation made idempotent**: safe against double-call (e.g., modal close + a new per-phase lifecycle both calling it).
- **Test rename** (#246): "omits thinking for Gemini" → "sends thinking.type=disabled for Gemini baseUrl" (assertion always asserted sent; old name misled future readers).

### Tests
- 549/549 passing. No new tests needed (changes are defensive correctness + UX).

## [1.16.2] - 2026-06-07

### Fixed
- **Issue #94 (Lint cancellation)**: `AbortSignal` now propagates through all 5 fix-runner functions (`runAliasCompletion`, `runDeadLinkFixes`, `runEmptyPageFixes`, `runOrphanFixes`, `runDuplicateMerges`) — clicking the status bar "click to cancel" during fix phases works as intended. All persistent Notices are wrapped in `try/finally` so they dismiss even on cancellation.
- **Issue #96 (Lint granularity)**: LLM analysis step in lint now respects the user's `extractionGranularity` setting via `appendGranularityToPrompt` — previously it was unconstrained.
- **Issue #99 (Thinking token bleeding)**: Three-layer defense against reasoning preamble leaking into wiki pages: (1) API-level `disableThinking` sends `thinking.type='disabled'` uniformly, with 400 fallback; (2) `parseJsonResponse` strips `<think>`/`<thinking>` before JSON extraction; (3) `cleanMarkdownResponse` discards preamble before `\n---\n` or `\n# ` structural markers. Test Connection probes and caches the result per provider.
- **Issue #86 (Frontmatter dates)**: Root cause was preamble before frontmatter (shared with #99). Fixed by the `cleanMarkdownResponse` Layer B2 preamble detection.

### Added
- **Issue #103 (Delete empty stubs)**: New "Delete empty stubs" button in the Lint report modal, alongside the existing "Expand empty pages" button. Skips pages with `reviewed: true`. No configuration needed — appears when empty stubs exist. (8-language i18n.)

### Changed
- **LLM client interface**: `disableThinking?: boolean` added to `createMessage` and `createMessageStream`. `OpenAICompatibleClient` uses `thinking.type='disabled'` uniformly (Anthropic-style). Provider 400 errors trigger automatic fallback retry without the field.

### Tests
- 549/549 passing (was 512). 37 new tests: fix-runners signal propagation, granularity prompt injection, cleanMarkdownResponse Layer B2 preamble detection (8 cases), parseJsonResponse think-block stripping (3), disableThinking provider mapping (4), createMessageStream disableThinking (3), 400 fallback (2), fixNotice cleanup (2), appendGranularityToPrompt (4).

## [1.16.1] - 2026-06-05

### Fixed
- **Issue #95 (Anthropic CORS)**: Removed `@anthropic-ai/sdk` (1.3MB) and rewrote `AnthropicClient` on Obsidian's `requestUrl`. SDK's internal `fetch` from `app://obsidian.md` origin was intermittently blocked by CORS — community-standard fix used by other LLM plugins. Prompt caching (`cache_control: ephemeral`) preserved by emitting the same JSON structure in the raw request body. Streaming is now post-hoc SSE (`parseSSEEvents`) instead of SDK's `.stream()` — consistent with all other providers.
- **PR #87 (lowercase slugs)**: `computeSlug()` now lowercases output, preventing case-variant duplicate page creation on case-sensitive filesystems. Removed redundant `.toLowerCase()` calls in `matchExtractedToExisting` and `conflict-resolver.ts:slugMatchKeys` (now centralized in `computeSlug`).
- **PR #87 (case-variant detection)**: New `caseVariant` signal in `generateDuplicateCandidates` catches pages with case-colliding titles (e.g., `Unix` vs `unix`). Wired as Tier 1 in `lint-controller.ts`.
- **PR #88 (lint false positives)**: New `bodyWordSet()` with `BODY_STOPWORDS` (45 English function words) gates sharedLinks duplicate candidates by body-text similarity (threshold ≥ 0.2). Fixes the case where 3+ pages linking to the same hub page were incorrectly flagged as duplicates despite different content. 20+ unit tests cover English + CJK edge cases.
- **PR #88 (dead links slug norm)**: `scanDeadLinks` now normalizes space→hyphen in the target basename before lookup. `[[entities/Claude Code]]` correctly matches the file `entities/Claude-Code.md`.

### Changed
- **Settings UX: drop hardcoded model fallback**: Removed `defaultModel` from all 12 `PREDEFINED_PROVIDERS` configs and the `ProviderConfig` interface. `DEFAULT_SETTINGS.model: ''` (no auto-fill on new install). Switching providers clears `model`/`availableModels`/`useCustomModel` — user must fetch models or enter manually.
- **Settings UX: friendly fetch error classification**: New `classifyFetchError()` categorizes failures into `Auth` / `Endpoint` / `Server` / `Empty` / `Network`. Each category shows a specific Notice (e.g., "Authentication failed (HTTP 401/403). Verify your API Key, or enter a Model ID below and click Test Connection to validate.") with manual-entry fallback always present. Replaces the old `Failed: HTTP 401` message.
- **Settings UX: auto-switch to dropdown on successful fetch**: After Fetch Models succeeds, the model selector automatically switches from text input to dropdown, so users see the list right away.

### Tests
- 512/512 passing (was 488). 24 new tests: 9 for `AnthropicClient` rewrite, 11 for `bodyWordSet` + duplicate detection, 2 for `scanDeadLinks` slug norm, 5 for `classifyFetchError`, 7 for `extractText` type tightening. 7 new tests for `matchExtractedToExisting` regression coverage.

## [1.16.0] - 2026-06-04

### Added
- **LM Studio provider**: New dedicated provider option (`PREDEFINED_PROVIDERS.lmstudio`). API key is optional — LM Studio runs locally but supports key-based auth. Base URL defaults to `http://localhost:1234/v1`.
- **Context Window setting**: Configurable cap on LLM output tokens to protect local models with limited context (LM Studio 8K, Ollama 4K, etc.). Dropdown options from 4K to 1M. Shown only for local/custom providers (Ollama, LM Studio, custom OpenAI/Anthropic). Sets `maxCap` on truncation retry for safety.
- **Startup quick fixes**: Low-level format repairs run automatically on plugin load: sources field normalization, wiki folder structure verification. Default ON. Detailed 10s Notice with cleanup stats + disable hint.
- **Sources field normalization (Issue #81)**: 4 new pure functions in `src/core/sources-normalizer.ts` handle 6 real-world pollution patterns reported by DocTpoint (external paths, `.md` suffixes, alias pipes, duplicates, inline arrays, empty `[[]]` links). 22 tests covering both inline and multi-line formats.
- **Lint integration**: `fixPollutedSources` runs in lint section 0.5, normalizes all wiki files before LLM-dependent phases. Reports "Sources normalized" section in lint output.
- **TDD shell test documentation**: Mandatory test quality rules added to CLAUDE.md — cover all production paths, assert content mutation (not just return values), re-scan for idempotency verification.

### Fixed
- **Issue #81**: YAML `sources:` field generated 3+ inconsistent formats (external paths, `.md`, `\|alias`) from different code paths. Root cause: `wiki-engine.ts:646` passed `file.path` to `{{source_file}}`, and `utils.ts:518` `normalizeSourcePath` only stripped `[[]]`. Fix: unified `normalizeSourcePath` with external-path remapping + full frontmatter rewrite.
- **Issue #75**: LM Studio HTTP 400 on batch 2+ — `source-analyzer.ts:113` had local shadow `MAX_TOKENS = 16000` that bypassed centralized `MAX_TOKENS_BATCH`. Replaced with `MAX_TOKENS_BATCH`. Plus new `capMaxTokens()` pure function and `maxTokensPerCall` setting to cap output explicitly.
- **Issue #76**: `TOKENS_DEDUP_RESOLUTION=300` caused "empty JSON" with thinking models where reasoning consumed the budget, then `stripThinkingTokens` removed it leaving zero JSON. Fixed: 300→1000 (insurance). Also `TOKENS_QUERY_SAVE_DEDUP: 150→300`.
- **Dead code**: Removed `TOKENS_PAGE_MERGE` and `TOKENS_RELATED_UPDATE` (zero callers). Removed `promptIncludesConstraints`.
- **Alias language**: Replaced hardcoded Chinese↔English translation rules with English-as-linker-language + "do NOT invent established technical translations" rule. 4 examples (Transformer/Vitamin B2/RoPE/Neural Network) prevent LLM outputting non-existent translations like "变换器" for Transformer.
- **withTruncationRetry retry cap**: Previously used `MAX_TOKENS_BATCH` (16000) unconditionally, causing retry HTTP 400 on local 8K models. Now respects `maxTokensPerCall` setting as `maxCap`.

### Changed
- **Settings UX redesign**: New "LLM-Wiki Status" section with inline status indicators. "LLM Provider Configuration" → "LLM Configuration". "Wiki Folder Configuration" → "Wiki Configuration". LLM Concurrency and Batch Delay moved to LLM Configuration section. Startup Quick Fixes toggle moved to first item in Auto Maintenance. Status prefix "LLM Client Status:" removed.
- **Provider dropdown i18n**: Non-Chinese languages now display English provider names (international technical convention) instead of falling back to Chinese.
- **CLAUDE.md**: TDD section evolved with mandatory test quality rules, TDD shell failure example, and debug template for "stuck counter" symptoms.

### Removed
- Dead constants: `TOKENS_PAGE_MERGE`, `TOKENS_RELATED_UPDATE`
- Dead function: `promptIncludesConstraints`
- Shadow constant: `source-analyzer.ts:113` local `MAX_TOKENS = 16000`
- Redundant "LLM Client Status:" prefix from status indicator

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

