# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

> **Status.** v1.26.3 PATCH SHIPPED 2026-08-14 (tag `1.26.3`, 5 PRs / 3290 tests). **v1.26.4 PATCH in progress** (5 bugs: #456 / #449 / #451 / #459-460 / #463). Composition: see [ROADMAP v1.26.x PATCH track](./ROADMAP.md). The v1.26.3 items below were released; remaining Unreleased entries accumulate toward v1.26.4.

### Fixed

- **Final lint analysis sent an uncapped full-wiki context, 400-ing on 49K-context local models (Issue #473, PR #491).** `runAnalysisPhase` (`src/wiki/lint/llm-phases/analysis-phase.ts`) read the **entire** `wiki/index.md` and injected it into the LLM prompt. On a 1,690-page vault that is ~152K input tokens against an LM Studio 49K context window → HTTP 400. Decision (established with the maintainer from Karpathy first principles): instead of capping the prompt or adding a token-budget estimator, **remove the LLM analysis section entirely**. The prompt asks the LLM to judge a whole wiki it only sees 8 pages of; schema-suggest keeps the LLM-advice path on the "Analyze Schema" button. This deletes the section, its 5 accumulated regressions (duplicate `## LLM 分析` heading — root cause: `report-builder.ts`'s `cleanedLLM.startsWith('##')` guard fires on empty string — leaked chain-of-thought, nested `<ul><ul>`, repeated headings, JSON parse failures), and one LLM call per lint. **A matching query-side regression surfaced:** #474 (2026-08-18) changed `prependReasoningForParse` to drop prose reasoning on non-empty visible text to protect DeepSeek-ingest parsing — but `openai-compat` `createMessageStream` (4 sites) shares that function, so Query users lost their collapsible thinking panel. Query stream paths now use `wrapReasoningContent` (reasoning stays visible); `openai-codex` (which never handled reasoning) gains the same wrap; anthropic stream switches from inline wrap to the shared helper. Net -563 LOC; Gate 1 green (3401 tests). Closes #473.

- **Startup quick-fix completion Notice was 6 lines of "everything is fine" on a healthy vault.** The three per-check detail lines (`Wiki 结构: 完整` / `Sources 归一化: 已规范` / `未完成页面：无`) are now emitted only when that check actually needed fixing; a routine morning startup shows just title + page-count summary + disable hint.

- **LM Studio extraction returns nothing since 1.26.3 — the extraction wire schema had no top-level `required` array, so `strict: true` had nothing to enforce (Issue #463, DocTpoint report 2026-08-14 + fix measurement 2026-08-16).** The model's answer is complete and correct — entities, concepts, summaries, verbatim quotes — but every top-level key arrives with a stray character appended (`source_title_`, `summary=`, phantom `", ": ""` member), so `getEntities`/`getConcepts` find nothing and the round is reported `❌ Round 1 unusable — no entities or concepts`. Root cause: `SourceAnalysisLLMSchema` (`src/llm-sdk/output-schemas.ts:181`) carries `.passthrough()` **and** marks every top-level field `.optional()`. Passed through `zodSchema()` this emits a JSON Schema with `additionalProperties: true` AND **no `required` array at all** at the top level — an object made entirely of unrelated keys is formally valid, so the constrained-decoding layer has no reason to suppress `entities_` / `", "`. (`entities.items` did have `required: ["name"]` — the top level was the hole.) **Fix:** drop `.optional()` from `entities` and `concepts` only — they now appear in the wire `required` array. `.passthrough()` stays, so the user requirement "针对一些格式内容多变的属性，必须留好冗余空间" is preserved (a model that adds `confidence` / `score` is not rejected); `source_title` / `summary` / `key_points` / `related_pages` / `contradictions` stay `.optional()` because `normalizeBatchResponse` does not consult them for batch validity (only entities + concepts do) and the runtime has explicit fallbacks (missing `source_title` → filename, missing `summary` → lemma-guarantee skip). Mirrors the existing `LemmaClassifyLLMSchema` pattern (`kind` required, extras pass through). DocTpoint measured on LM Studio / `gemma-4-26b-a4b-qat` at temperature 0 through the headless CLI: without the change `round 1 unusable` (reasoning off) / `AI_NoOutputGeneratedError` after 413 s (reasoning on); with it clean — 3 runs, 2 different notes (reasoning off), 1 run (reasoning on). One cause, two symptoms (reasoning decides which failure mode you see). **Tests (inverted per DocTpoint):** `accepts an empty object (graceful fallback)` flipped to REJECT `{}` (accepting `{}` is what removed the constraint from the wire); replaced with the signal the analyzer actually consumes — `{entities: [], concepts: []}` parses and `normalizeBatchResponse` treats it as `empty` (batch loop stops cleanly) rather than `unusable`. +8 tests net (3320 total): per-key required rejection (missing entities only / missing concepts only), AI SDK `parseCompleteOutput` path preserves the empty-signal + stray-char-acceptance contracts, wire-shape assertions (top-level `required` contains `entities` + `concepts`; `additionalProperties` remains `true`; the five non-structural fields stay out of `required`). **No behaviour change for the `.text` consumers** (source-analyzer extract/retry + conversation-ingest): both read `result.text` via `callLlm`, and `createMessageWithOutput`'s catch of `NoObjectGeneratedError` (`openai-compat-sdk-client.ts:813`) returns `err.text` — the same `parseJsonResponse` → `normalizeBatchResponse` flow, now with the wire-level key-name constraint enforcing clean keys at the source. `conversation-ingest`'s prompt already mandates "never omit the field" (empty arrays), so its contract is strengthened, not broken.

- **`openai-compat` SDK client: no-schema callers now get server-side `json_object` type hint with a runtime 400-strip fallback (Issue #443, PR #447).** The destructure list at `openai-compat-sdk-client.ts:182` did not include `response_format`, so every LLM call site that asked for `{ type: 'json_object' }` got no server-side JSON constraint on openai-compat providers. The destructure now carries `response_format` end-to-end via a new `buildOutputArgs` helper (`src/llm-sdk/output-args.ts`) that translates to the AI SDK's `Output` mechanism. **Elegant fallback (supersedes the Option 1 in `e053cef`):** the no-schema case now emits `Output.json()` — the SDK encodes it as `response_format: { type: 'json_object' }` on the wire for **every** openai-compat provider. The 6 cloud providers (deepseek / openrouter / kimi / glm / gemini / minimax) accept this — server-side type hint, reduces parse-failure class of issues #443 is closing. The local-server cohort (lmstudio / ollama / custom) may 400 on `json_object` (LM Studio is the measured case, DocTpoint Issue #443 comment 1, 2026-08-09, 29 ms — `'response_format.type' must be 'json_schema' or 'text'`). A runtime 400-strip probe (`src/llm-sdk/json-object-strip-probe.ts`) catches the 400, retries once with `output` omitted, and caches the per-baseURL strip decision — the cost is one 400 per unique baseURL, then cache hit and the wire field is silently dropped thereafter. **No provider is hardcoded** in the client: the helper emits `Output.json()` for every openai-compat provider, the strip classifier is message-based (`json_object` / `response_format` field marker + rejection verb), and the cache decision is `per baseURL` (same gateway → same wire format). The schema arm stays wired: when a future caller supplies a `schema` on `response_format`, the helper routes through `Output.object({ schema, name })` and the SDK encodes `json_schema` on the wire when the provider's `supportsStructuredOutputs` is true (lmstudio / ollama / custom); cloud providers fall back to `json_object` with a warning. 3011 tests / 218 files (+5 vs v1.26.2's 2996, with 4 of the 5 being new fallback-scenario tests in the SDK client suite). No behaviour change for openai / anthropic / codex paths (those go through their own SDK clients). No behaviour change for the schema arm (no production caller exercises it in this PR — the per-caller migration of the 16 sites follows the CLAUDE.md "one PR per call site" rule).

- **`parseJsonResponse` parse failure at `path-resolution.ts:220` read as "no match" (Issue #407 Stage 1, PR #444, commit `1f9a185`).** The site's LLM semantic dedup call now goes through `parseJsonResult` (the union from PR #436). On `{ok: false, reason}` the function logs the reason + raw length and returns the slug path as a *named failure* rather than as an answer to the question; the `match: false` branch is reached only when the reply parsed. Counter-test pins the new branch: a well-formed `{match: false}` is *not* reported as a parse failure (otherwise the new branch would shout on every negative answer). 2996 tests / 218 files (+4 vs v1.26.2's 2992). Fallback path (`{path: slugPath}`) is preserved verbatim — what changes is *why* it was taken. Acting on the failure (retry on `empty`, surface to caller) is the same design question as `conversation-ingest.ts:337` (Issue #407 Stage 2) and stays out of this PR.

- **Path 2 fix — `NoObjectGeneratedError` was bypassing the caller-side repair path on the cloud cohort (Issue #443, PR #447, commit `9789cbf`).** DocTpoint CHANGES_REQUESTED (2026-08-10) revealed that AI SDK's `Output.json()` and `Output.object()` BOTH call `parseCompleteOutput` (`ai@6.0.230/dist/index.mjs:3899`), which throws `NoObjectGeneratedError` on malformed JSON. `NoObjectGeneratedError extends AISDKError`, NOT `APICallError` — so the 3-tier demotion chain (APICallError + 400) never caught it, and the raw text never reached caller-side `parseJsonResponse` + greedy regex + LLM repair. Users saw "Failed to connect to \<provider\> API" — a JSON-shape problem misreported as connectivity/credentials. Fix: catch `NoObjectGeneratedError` in `OpenAICompatSdkClient.createMessage` (FIRST branch of the catch block), return `err.text` verbatim (no transformation — caller repair depends on exact raw characters); defensive re-throw if `.text` is missing. The misleading comment in `output-args.ts` claiming `Output.json()` "only warns" is corrected (`75af84f`) — both Output factories throw on `ai@6.0.230`. 4 new regression tests use the real `NoObjectGeneratedError` class.

- **`repetitionPenalty` user setting was a silent no-op on every shipped provider (Issue #414, fix in this PATCH).** Since the v1.23.0 AI SDK migration dropped the pre-AI-SDK `unsupportedFields` blocklist, the setting flowed through to wire on no path: LM Studio / Ollama / llama.cpp received the wrong spelling (`repetition_penalty` with `-ion`; llama.cpp recognizes `repeat_penalty` per DocTpoint #414 type-error test on gemma-4-12b); Kimi / OpenRouter / vLLM saw the field placed under `providerOptions.openaiCompatible` while the AI SDK's openai-compat passthrough at `@ai-sdk/openai-compatible@2.0.62/dist/index.mjs:525-540` reads `providerOptions[this.providerOptionsName]` (the provider id) — the key mismatch meant the lookup missed for every provider; Anthropic received the field but its Messages API has no `repetition_penalty` (only `temperature` / `top_p` / `top_k`); DeepSeek / OpenAI / OpenAI Codex / Ollama (OpenAI-compat) / Gemini / MiniMax / GLM / Bedrock-OpenAI do not list the field at all. **Per-provider dialect dispatch in `OpenAICompatSdkClient.buildProviderOptions` (`src/llm-sdk/openai-compat-sdk-client.ts:1055-1197`):** `lmstudio` / `ollama` → wire `repeat_penalty` (no `-ion`); `kimi` / `openrouter` / `custom` → wire `repetition_penalty` (snake_case, OpenAI-spec); `deepseek` / `gemini` / `minimax` / `glm` / `bedrock-openai` / unknown → field dropped silently (the `bedrock-openai` default is conservative — the bedrock-mantle endpoint is OpenAI-compat but the underlying AWS Bedrock models' openai-compat layer is not documented to forward `repetition_penalty`; revert to "drop" if user reports land that the layer does accept it). The return key flips from `{ openaiCompatible: openaiOpts }` to `{ [this.provider]: openaiOpts }` so the SDK's per-id-key passthrough delivers the field — this is the same mechanism AI SDK uses for `reasoningEffort`, which is unaffected (it travels the zod-whitelist path, `@ai-sdk/openai-compatible/dist/index.mjs:531-541`, NOT the passthrough). The Anthropic client now drops the field entirely (`src/llm-sdk/anthropic-sdk-client.ts:181-184` removed) instead of placing an unrecognized key on the wire — matches the 10-locale i18n text *"cloud providers will silently ignore it"*. The OpenAI / OpenAI Codex path is unchanged (OpenAI Responses model zod strips the field per `:329-339`; Codex has no plumbing). **No 400-strip retry** for `repetitionPenalty`: the setting is user-opt-in (not a plugin default), so a backend rejection should surface to the user rather than be silently swallowed (dead-code-as-docs policy + half-life rule — add the retry only if a pattern of "users frequently 400 because they set repetitionPenalty" emerges). The dialect helper is computed once per client lifetime (constructor-hoisted `private readonly repetitionPenaltyWireField`, mirroring `supportsStructuredOutputs`); the dispatch table itself is a `Readonly<Record>` for self-documentation. One-line `console.debug` (`[REPETITION-PENALTY-EMIT]` mirrors `[REASONING-STRIP-DEBUG]` and includes `baseURL=` for cross-`custom`-provider disambiguation) so users with developer-mode debugging can verify the wire contract on their backend. Dialect helper exported as module-level `repetitionPenaltyWireField(provider)` (`src/llm-sdk/openai-compat-sdk-client.ts:84-86`) for direct unit-test coverage independent of client setup. **Known limitation:** `wrapWithAdvancedSettings` (`src/llm-client-wrapper.ts`) uses `Object.create(client)` to inherit `createMessageStream` without settings injection — `repetitionPenalty` (and all other settings) is silently dropped on the stream path (Query Wiki, streaming UI). Tracked as [#451](https://github.com/green-dalii/obsidian-llm-wiki/issues/451) for v1.27.0; this fix lands only on the non-stream path. 3212 tests / 230 files (+3 vs v1.26.2's 2992, +3 are the new dialect dispatch tests; existing tests updated where they pinned the legacy `openaiCompatible` key — 2 in `openai-compat-sdk-client.test.ts` now assert per-id-key shape). Closes #414.

- **Frontmatter writer dropped `sources:` block-style entries on every constraints pass (Issue #438, PR #450, commit `2560ab4`).** `enforceFrontmatterConstraints` (`src/core/frontmatter.ts:640-650`) reads the original `sources:` key via `parseFrontmatter().sources` before tearing the lines apart, then writes the preserved list back into the new frontmatter on a length-gated `length > 0` check at `:693`. The bug: `parseFrontmatter`'s `ARRAY_FIELDS` normalization (`src/core/frontmatter.ts:93-94`) coerces the empty string `''` (what a bare `sources:` header is read as) into a one-element array `['']`, the length check passes, and `serializeFrontmatter:437` writes `sources:\n  - ""` — i.e. the bug re-emits the corrupted shape rather than recovering from it. **Finding 1 fix:** filter empty/whitespace entries at the source, mirroring the `aliases` branch at `:452`. So the recovery population (a bare `sources:` header — the fingerprint of a page that already went through the broken constraints pass) re-emits no `sources` key at all, not `sources:\n  - ""`. 6-arm regression test pins: (A) bare `sources:` → no key emitted, (B) two valid entries preserved, (C) mixed `- ""` + valid entry → valid entry alone, (D) bare `sources:` as last frontmatter key → no `- ""`, (F) whitespace-only `- "   "` filtered. **Finding 2 (whole-class):** `enforceFrontmatterConstraints:640` discards every `- ` line regardless of which key it owns; `tags` / `aliases` survive because they are collected explicitly, `sources` now survives via the parse detour. Any other block-style canonical array field (next one would be #438 C) loses its header and entries to the same defect. The fix shape is to route the passthrough half through `extractPassthroughLines` (`src/core/frontmatter.ts:240`); tracked as a new follow-up issue for v1.27.0. **Cosmetic follow-on (pre-existing, surfaced by DocTpoint's measurement):** `serializeFrontmatter` emits passthrough lines before `sources`/`tags`/`aliases`, so the first lint after this fix moves `generation_complete` from last to fourth position on every page with frontmatter — correct output, but it is a one-time vault-wide frontmatter churn that re-ingest / fillEmpty / merge-duplicates will repeat (constraints pass is not idempotent — each pass adds one blank line before the body via `content.substring(fmEnd + 5)` not stripping the leading `\n`). Release notes flag this so users know to expect it. Closes #438.

- **`repetitionPenalty` UX hint names a setting that never reached the wire on 5 of 15 provider IDs (PR #454, gated via `core/repetition-penalty-dialect.ts`).** Issue #443 follow-up after user E2E on qwen3.5-9b surfaced a 2-axis defect: (1) the placeholder detector at `src/core/json.ts:153` only matched `{"": ""}` and missed the empty-object / empty-array variants `{"": {}}` / `{"": []}` that some models emit in place of an empty object; (2) `buildRepetitionPenaltyHint` fired on every provider regardless of whether `repetitionPenalty` reached the wire, so users on Anthropic / DeepSeek / Gemini / MiniMax / GLM got a tail message saying "reduce or clear this setting" for a setting their backend had silently dropped. **Fix A (placeholder detector):** single-pass conjunction at `json.ts:181` accepts any object whose keys are all `''` AND whose values are all empty (`null` / `[]` / `{}` / `""`); `entries.length > 0` keeps the legitimate `{}` allowance intact. `isEmptyJsonValue` hoisted to module scope. Stale "≤1 field" docstring sentence dropped. **Fix B (hint gate):** `buildRepetitionPenaltyHint` now checks `repetitionPenaltyWireField(provider) === null` and returns `''` on the 5 dropping IDs (anthropic / openai / openai-codex / deepseek / gemini / minimax / glm / bedrock-anthropic / bedrock-openai / anthropic-compatible). The hint fires on the 5 wire-supporting IDs (`lmstudio` / `ollama` / `kimi` / `openrouter` / `custom`) and on `bedrock-openai` (which uses the same openai-compat path with the same id). 63 tests pass across the 4 touched files; a regression test pins `wiki-engine-repetition-penalty-hint.test.ts` at the throw site so a future refactor reading the wrong settings field is caught. Closes #443 follow-up.

- **5 UX defects on the maintainer's vault E2E (PR #448, `fix/ux-b1-b2-b3-provider-statusbar-dedup`).** B1: Fetch Models classified auth failures (HTTP 401/403) as `Network`, so users with expired keys saw a misleading "Failed to connect" notice — reclassified to `Auth` with a dedicated error path. B2: status-bar cancel label duplicated because the raw PDF-stage segments were passed verbatim into the cancel-line builder — fixed by emitting only the structured segments. B3: lint dedup cross-type filter was not surfacing rejected-pair count in the diagnostic comment (`_B3 anti-regression comment correction_`). B2.5: full status-bar i18n (10 locales) so cancel/progress strings no longer carry hardcoded English tails. Toast: 5 lint / ingest Toast strings localized (ingest start, batch check, lint findings, etc.).

- **DeepSeek-v4-flash (and other reasoning-model cloud providers) failed with a misleading "Failed to connect to deepseek API" when the model produced zero output (Issue #474, three-layer fix).** Three distinct failure modes collapsed into one user-visible symptom — `parseJsonResponse` rejecting every parse layer. **Layer 1 — prose-reasoning pollution:** `prependReasoningForParse` (`src/core/markdown.ts:222`) always prepended `reasoning_content` before the visible text. When reasoning is prose (deepseek-v4-flash narrative thinking) AND visible text is JSON, the parse target became prose + JSON; `parseJsonResponse`'s prefix-`{` filler, balanced-JSON finder, and greedy regex all walked into the prose first. Fix: when reasoning has no `<think>` wrapper AND visible text is non-empty, drop the reasoning. The Qwen3.5 JSON-in-reasoning case (text='' + reasoning=JSON) is preserved (still prepends), the R1 / o-series `<think>`-wrapped case is preserved (still wraps). Visible text becomes the canonical output. **Layer 2 — `NoOutputGeneratedError` misclassification:** AI SDK's step-retry exhaustion path (`ai@6.0.230/dist/index.mjs:5146, 7077, 7232, 7933`) throws `NoOutputGeneratedError` (sibling of `NoObjectGeneratedError`, both extend `AISDKError`, markers `AI_NoOutputGeneratedError` vs `AI_NoObjectGeneratedError`) when the model emits zero content across all retries. The existing catch only checked `NoObjectGeneratedError.isInstance(err)`; the sibling class slipped through and was mapped by `mapAiSdkError` to "Failed to connect to deepseek API" — a budget-exhaustion problem misreported as a connectivity error. Fix: catch `NoOutputGeneratedError` in both `createMessage` (`openai-compat-sdk-client.ts:424`) and `createMessageWithOutput` (`:984`); return `''` / empty shape so the caller's `parseJsonResponse` empty-input path (`silentOnEmpty: true` / `EmptyResponseError`) handles it. `finishReason: 'stop'` is the right semantic (the SDK's step retries exhausted, not a transport failure). No demotion chain is triggered (different error class than `APICallError`). **Layer 3 — `outputMode` reporting honesty:** `OutputModeProber` defaulted to `json_schema` for every provider, but `OpenAICompatSdkClient` was constructed with `supportsStructuredOutputs: false` for 5 cloud openai-compat providers (`deepseek` / `kimi` / `glm` / `minimax` / `openrouter` — `types.ts:922/946/958/934/910`). The SDK encodes `json_object` on the wire for them regardless, silently dropping any caller-supplied schema. The mode reported back to callers was `json_schema` (dishonest — wire was `json_object`). New private helper `getCurrentOutputMode(model)` (`openai-compat-sdk-client.ts:158`) pre-seeds the cache to `json_object` on the first call when `!supportsStructuredOutputs` — initialization, not demotion. `outputMode` now reports the wire shape the SDK actually emits. Side benefit: the wasted `json_schema → json_object` demotion cycle on first 400 is skipped (1 HTTP call saved per first failure for these providers). No callers read `outputMode` (`grep '\.outputMode\b' src/` = 0 — the 6 Phase B migrations go through `callLlm` which extracts `.text`; `fix-dead-link.ts:166` reads `.output`). `lmstudio` / `ollama` / `custom` paths unchanged (they have `supportsStructuredOutputs: true`). **Combined scope:** +8 tests (3 in `markdown-prepend-reasoning.test.ts` for L1, 4 for L2 + 3 for L3 in `openai-compat-sdk-client.test.ts`); 1 existing test updated (the old "prepends raw reasoning before non-empty text using blank-line separator" pinned the contract L1 deliberately changes). 3391 tests / 234 files. Closes #474.

- **The extraction prompt's slug catalog was re-sorted per note, so a prompt cache had nothing to reuse (Issue #452, PR #483).** The catalog is the first block of the `analyzeSource` prompt and ~91% of its characters, so it is the span a cache can keep. Every cache in play — Anthropic, OpenAI, llama.cpp's KV reuse — is a *prefix* cache: it keeps the longest common leading span and recomputes everything after the first divergence. `buildCompactSlugList` (`src/wiki/source-analyzer.ts:18`) rebuilt and re-sorted the list on every call, so the pages the previous note created sorted into the **middle** and the reusable span ended there. Measured on LM Studio (`gemma-4-26b-a4b-qat`, 2844 slugs, 24.5 K prompt tokens, `max_tokens=1`): **23.5 s of prefill per note against 4.39 s** when new slugs are appended instead. **Fix:** a folder/batch ingest now carries a `RunSlugCatalog` on its `BatchRequirementsContext` — a sorted snapshot taken at run start plus the pages that appear during the run, appended in first-seen order so an earlier append never shifts a later one. `buildRunScopedSlugList` (`src/wiki/source-analyzer.ts:52`) diffs the current vault against that catalog per call and appends only what is new. Single-file ingests pass no catalog and get the freshly sorted list exactly as before. **Two consequences, both deliberate:** a page deleted mid-run stays in the catalog until the run ends (dropping it would reintroduce the mid-list divergence, and stale targets are resolved downstream by `PageFactory.resolvePagePath`), and re-ingesting a source that lives inside the wiki folder still excludes its own slug per call, which shifts that one line — sources outside the wiki folder, the normal case, were never in the catalog. **Scope:** this makes the block prefix-stable *within* a run; it is not cross-run caching, which is #449 Direction 2. Tests pin the prefix invariant across three notes, the byte-identical block when a note creates nothing, the deletion case, self-exclusion, and that the no-catalog path still sorts. Closes #452.

### Added

- **`LLMClient.createMessageWithOutput` typed-output variant (Issue #443, PR #447 Phase B).** Optional method on the LLMClient interface returning `{text, output?, outputMode, finishReason, usage?}`. `output` is populated when the AI SDK's `Output.object({schema, name})` (Tier 0 json_schema on the wire) parses successfully; `undefined` for Tier 1 (json_object) / Tier 2 (text_prompt) successes — the caller falls back to `parseJsonResponse(text)`. Backward-compatible: existing callers keep `createMessage` returning `Promise<string>`; Anthropic / OpenAI / Codex clients do NOT implement the new method (the interface marks it optional). The `wrapWithAdvancedSettings` seam now wraps `createMessageWithOutput` too — task accounting + temperature/top_p/seed advanced-settings injection apply identically to Phase B callers (without this, a typed call would record under 'untagged' with no sampling override).

- **`src/llm-sdk/output-schemas.ts` — 6 Zod schemas for the P0 caller migrations (Issue #443, PR #447 Phase B).** `SeedSelectorSchema` `{seeds: string[]}` / `QueryKeywordsSchema` `{keywords: string[]}` / `MergeTriageSchema` `{strategy, items?, reason?}` / `LinkOrphanSchema` `{related_pages?}` / `FixDeadLinkSchema` `{action?, correct_link?, stub_title?, stub_type?}` / `QueryViewValueSchema` `{valuable?, reason?}`. Zod is the single source of truth: the same schema drives the Tier 0 wire shape (`buildOutputArgs` adapts via `zodSchema()`, `response_format.schema` widened to `Record<string, unknown> | z.ZodType`) AND validates the Tier 1/2 `parseJsonResponse` fallback via `z.infer`. Schemas are intentionally permissive — capture the post-cast shape callers already used, so no behavior change for callers that gracefully handle missing fields.

- **6 P0 caller schema migrations (Issue #443, PR #447 Phase B, one commit per call site per CLAUDE.md "one PR per call site").** seed-selector (`b6148cb`) / query-keywords (`15be8e2`) / merge-triage (`997ed38`) / link-orphan (`ce9d64d`) / fix-dead-link (`b9c0bc8`) / QueryView `evaluateWithLLM` (`6bc4b7c`). Each caller passes its Zod schema via `response_format.schema`, prefers `result.output` on Tier 0 success, falls back to `parseJsonResponse(text)` on Tier 1/2 — all guarded by `if (client.createMessageWithOutput)` so legacy mock clients / Anthropic / OpenAI / Codex paths are byte-identical to pre-migration. **Query streaming path verified untouched:** QueryView's answer output (`createMessageStream` / non-stream fallbacks) carries no `response_format` and was not migrated — only the JSON `evaluateWithLLM` (Suggest Save) call was. Remaining 10+ callers (source-analyzer × 3, conversation-ingest × 3, dedup-phase, schema-manager, path-resolution, fix-runners × 2) defer to v1.27.0 — same rationale, but the schema library is now established so that work is purely mechanical.

- **v1.26.3 PATCH expanded scope — 11 additional caller schema migrations + Welcome translation (Issue #443, PR #447).** User E2E on LM Studio (gemma-4-12b, 2026-08-10) showed the 3-tier state machine cannot help any caller that doesn't ship a real schema on `response_format` — LM Studio rejects `json_object` (`'response_format.type' must be 'json_schema' or 'text'`), the chain demotes to Tier 2 (text_prompt), the model emits malformed JSON, parse fails, ingest fails. Reverses the v1.27.0 deferral decision (memory [[project_v1_26_3_three_tier_output_mode]]). 12 commits: schema infra (`eb86588`) + source-analyzer extract + extract-retry (`266d641`) / lemma-classify (`8da1fd8`) / conversation-ingest extraction + save-dedup (`7531868`, `6e1bf4a`) / dedup-phase (`d84f02d`) / schema-manager (`eddf8b4`) / path-resolution (`4de4f89`) / fix-runners alias + tag (`7c8a3c3`, `016cfc4`) / localize-welcome-note (`37cf271`). All schemas use `.passthrough()` so an LLM that emits an extra field (`confidence`, `score`) doesn't fail validation; type fields widened to `z.string()` so model can emit `'region'`/`'topic'`/`'other'` without rejection. The 10 free-text markdown callers (entity/concept/summary page bodies, contradiction fixes, alias lists, etc.) stay on `createMessage` + `cleanMarkdownResponse` — schema-wrapping a long markdown body is overhead, not benefit. Path 2 fix protects them via `NoObjectGeneratedError` catch. `task` labels added (`lint-dedup`, `schema-suggest`, `lint-alias`, `lint-tag-fix`, `welcome-translate`) so per-step LLM timing is no longer recorded as 'untagged'. 3156 tests / 227 files (+33 vs the Phase B landing).

## [1.25.12] - 2026-08-01

> **Note.** The work that was originally planned as `v1.25.12 PATCH` (CLI UX
> for the headless ingest CLI, shipped via PR #389 + the parent commits
> merged as PR #387 and #389) was, on review, reclassified as MINOR scope —
> the headless CLI is a user-visible new tool (`pnpm llm-wiki`, the `ingest`
> subcommand, a fresh flag surface). It ships with **v1.26.0 MINOR** rather
> than as a standalone patch; the patch slot stays unused. See the v1.26.0
> entry below for the substantive notes.

## [1.26.2] - 2026-08-09

A surgical PATCH that closes the pre-submission blind spot exposed by the v1.26.1 Obsidian Bot pre-review. The bot scans the **whole repo `.ts` tree** while local `pnpm lint` only scans `src/` — and v1.26.1 shipped a blocking `no-unsafe-call` Error in `tools/llm-wiki-cli/src/obsidian.ts` that local lint never saw. **No behaviour change, no new settings, no migration.** The headline: the CLI's `obsidian.ts:117` `await import()` chain is now type-safe AND exempt from `obsidianmd/no-nodejs-modules`, and a `pnpm lint:tools-bot` script closes the local blind spot so the next release doesn't need a Bot trip to surface what local lint should have caught.

### Fixed

- **CLI `obsidian.ts:117` blocking `unsafe-call` Error (`#442`).** `await import(<dynamic-arg>)` left `request` as `any`, cascading 6 `unsafe-*` warnings and triggering `no-unsafe-call` → Error. Split into two literal `await import('node:https')` / `await import('node:http')` branches with explicit `typeof import('node:http').request` annotation — Error + the entire unsafe-* cascade disappear in one stroke.
- **`obsidian.ts:158` `requestUrl().json` contract (`#442`).** `JSON.parse(text) as unknown` + try/catch that re-throws with the status context, matching Obsidian host's behaviour on bad JSON.
- **`main.ts:443` `loadSettings` `JSON.parse` argument type (`#442`).** Now typed as `Partial<LLMWikiSettings> | null` to match `applySettingsMigrations`' declared parameter; eliminates `no-unsafe-argument`.
- **`main.ts:647` `globalThis.crypto.subtle` → `crypto.subtle` (`#442`).** Node 18+ exposes `crypto` as a global; the explicit `globalThis.` prefix was tripping `obsidianmd/no-global-this` (no-disable rule).
- **`vault.ts:291` redundant `as Record<string, unknown> | null` removed (`#442`).** `parseFrontmatter` already returns a `FrontmatterData | null` whose index signature is compatible — Bot flagged as no-op assertion.
- **`node-globals.ts:28` `(...args: any[])` → `(...args: unknown[])` (`#442`).** `Console` constructor accepts `unknown[]`; eliminates a Bot-flagged bare `any` and the `Unexpected any` warning.

### Added

- **Local `tools/` blind-spot closure: `pnpm lint:tools-bot` (`#442`).** New `eslint.tools-bot.config.mjs` (obsidianmd recommended ruleset scoped to `tools/**`, type context from `tools/llm-wiki-cli/tsconfig.json`, Node globals declared) and a matching `package.json` script (`|| true`, informational — never gates CI). Developers now see the Bot's view of the CLI tree locally instead of discovering it post-submission.
- **`Platform.isDesktop` AST guards on the three runtime-loaded `node:*` imports (`#442`).** `obsidian.ts:requestUrl()` and `node-globals.ts:plainConsole()` each carry a function-start `if (!Platform.isDesktop) throw new Error(...)`. The CLI's own Platform shim hardcodes `isDesktop: true`, so the guards never throw at runtime — they declare the desktop-only invariant the `obsidianmd/no-nodejs-modules` rule requires (verified against the rule source; bare dynamic imports are **not** exempt, contrary to the assumption baked into PR #418/#433's patterns). Mirrors `src/llm-sdk/openai-codex/loopback-flow.ts:156-160`.

### Notes for release engineering

- **Release skill v1.7.0 now mandates an Obsidian Bot pre-review (Step 6b.5, HARD STOP ②) between tag and publish.** This is the gate that should have caught v1.26.1's pre-publish — making it explicit instead of relying on the maintainer remembering to submit. See [[feedback_obsidianmd_no_nodejs_guard_detection]] for the rule-detection mechanism.
- **All 7 remaining `tools/` warnings are accepted-structural** (static `node:fs/path/fs-promises/util` imports, `.obsidian` literal, `console.log` output interface, `globalThis` shim). Dynamic form would break the 14 parser-contract tests that pin `parseCliOptions` as sync. The honest long-term fix is the **CLI split into a separate repo** ([[project_v1_27_0_cli_split_planning]]).

## [1.26.3] - 2026-08-12

A surgical PATCH that closes five UX blind spots the maintainer discovered while validating the v1.26.1 / v1.26.2 release on the production vault. None of these touch the LLM pipeline (PR #447's v1.26.3 PATCH owns that work — Phase A 3-tier state machine, Path 2 fix, Phase B 11 caller migrations, per-model placeholder demotion, pushed 2026-08-12, awaiting DocTpoint re-review); this entry covers the settings/lint/UI bugs the maintainer surfaced during the same E2E round and shipped on a separate branch (`fix/ux-b1-b2-b3-provider-statusbar-dedup`): Fetch-Models error classification (B1), status-bar cancel affordance (B2), lint dedup cross-type filter (B3), full status-bar progress i18n (B2.5), and the remaining hardcoded-English Toasts.

### Fixed

- **Settings: Fetch Models misclassified auth/endpoint/server failures as "Network" (`B1`).** `fetchOneUrl` in `model-section.ts` silently returned `[]` on non-2xx and the outer catch rewrote every error to the status-less `All URL candidates failed` — `classifyFetchError`'s regexes (`\b(401|403)\b` / `\b(404|405|...)\b` / `\b5\d\d\b`) had nothing to match, so every auth/wrong-URL/server failure surfaced as `fetchErrorNetwork`. Verified across all 7 cloud providers (OpenAI / Anthropic / DeepSeek / Kimi / MiniMax / GLM all return 401 for invalid keys; LM Studio / Ollama have no auth). `fetchOneUrl` now throws `HTTP {status}: {body-snippet}` on non-2xx; `fetchModelsWithFallback` tracks `lastHttpError` across all candidates and re-throws it; the outer catch passes the original error through unchanged. The classifier's existing regexes now hit on the first try.
  **DocTpoint CR follow-up (2026-08-12):** two unknown-case regressions the original fix introduced were closed — a 2xx with an empty/absent `data` array is now a valid `[]` return (the `HTTP 200` throw had no classifier branch → misreported Network), a true network failure is tracked as `lastNetworkError` and re-thrown as Network (previously it collapsed into `[]` → `empty model list` → the misleading `fetchErrorEmpty` for a disconnected user), and `classifyFetchError` now matches the leading `^HTTP (\d+)` BEFORE the keyword regexes so a 5xx whose body contains `unauthorized` is Server, not Auth.
- **Settings: every locale's `fetchErrorNetwork` now mentions the API Key as a fallback hint (B1).** True network failures (DNS / connection refused / timeout) still fall through to `fetchErrorNetwork` and cannot be disambiguated from auth by status alone; the fallback message now suggests checking the Key alongside network settings. 10 locales updated (`en`, `zh`, `zh-Hant`, `ja`, `ko`, `de`, `fr`, `es`, `pt`, `it`, `ru`) with an i18n-parity test that asserts every locale's message matches a Key-mention regex.
- **UI: status-bar update path dropped the "click to cancel" label (B2).** `setStatusBarUpdateCallback` in `command-registry.ts` called `setText(text)` directly with the raw progress text, dropping the always-visible base label for the entire duration of long ingest/lint batches. Users saw `Analyzing batch 2/3 (0 entities, 5 concepts so far)...` with no indication the bar was clickable to abort. The click handler itself was already wired (line 156) — only the affordance text was missing. New `composeStatusBarUpdate` helper in `src/core/status-bar.ts` selects the active label (ingest > lint, mutex in practice) and appends it as a stage segment via `buildIngestStatusBarText`, restoring the docblock contract. The callback now hides the bar (returns null) when neither is running, instead of leaving stale text on screen.
  **DocTpoint CR follow-up (2026-08-12):** the PDF emitter (`ingestPdfSource`'s `setPdfStage`) passed an already-composed `buildIngestStatusBarText` string — which already ended in the base label — into `updateStatusBar`, so `composeStatusBarUpdate` appended the label a second time on every PDF stage (`My Note.pdf · Reading PDF… · Ingesting… · Ingesting…`). `setPdfStage` now emits raw segments (`[filename, stage].join(' · ')`) so label composition happens in exactly one place.
- **Lint dedup: cross-type pair filter (B3).** The dedup candidate generator emitted entity↔source and concept↔source pairs that shared a wiki subfolder bucket (`tp:` / `ic:` / `lh:`), polluting the LLM verify batch with nonsense questions. Per the #358 complementary memory model, a source mentioning an entity by name is NOT a duplicate of the entity — they live in different cognitive registers. Per the maintainer's 2026-08-12 direction, the dedup now considers only: entity↔entity, concept↔concept, entity↔concept, source↔source. Forbidden: entity↔source and concept↔source (in any order). New `pageTypeOf(path)` helper infers page type from `WIKI_SUBFOLDERS` segments; new `isCrossTypePairAllowed` guard rejects forbidden pairs at `addCandidate` injection time using canonicalized `smaller|larger` string keys.
  **DocTpoint CR follow-up (2026-08-12):** two B3 refinements — the anti-regression comment now states the true root cause (the canonical key `concept|entity` MUST be present in `ALLOWED_PAIR_KEYS`; the `a < b` comparison was never the miss — it produces an identical key either way, so a future editor must not 'simplify' it), and the rejected-pair count is surfaced via `hooks.onCrossTypeRejected` in the dedup-phase candidate debug line so the filter's effect is measurable.
- **Status-bar progress text fully localized (B2.5).** 16 hardcoded English status-bar strings in `wiki-engine.ts` / `conversation-ingest.ts` / `source-analyzer.ts` (e.g. `Analyzing batch 1/3...`, `[7/10] Concept: <name>`) produced mixed-language bars on non-English vaults. 18 new i18n keys (status-bar stage + `Entity`/`Concept` type labels) across 10 locales; every `onProgress` string now flows through `getText()`. 22 i18n-parity tests pin the placeholder contract (`{current}` `{total}` `{filename}` etc.) so a translator dropping a placeholder fails loudly.
- **Remaining hardcoded English Toasts localized (B2.5 follow-up).** User E2E found `Ingesting: <file>` Toasts still English while the status bar was fully localized. Full sweep of every `new Notice()` / `showProgressFor()` call site found exactly three hardcoded strings — `Ingesting: {filename}` (single-file manual ingest), `Checking for already-ingested files...` (batch pre-scan), and `<N> findings` (auto-lint completion). 3 new i18n keys + 10 locales; `lintFindingsSummary` is a full phrase (`{total} findings`) so each locale can order/pluralize freely. 22 i18n-parity tests.

- **`repetitionPenalty` user setting was a silent no-op on every shipped provider (Issue #414, PR #453).** Since the v1.23.0 AI SDK migration dropped the pre-AI-SDK `unsupportedFields` blocklist, the setting flowed through to wire on no path: LM Studio / Ollama / llama.cpp received the wrong spelling (`repetition_penalty` with `-ion`; llama.cpp recognizes `repeat_penalty` per DocTpoint #414 type-error test on gemma-4-12b); Kimi / OpenRouter / vLLM saw the field placed under `providerOptions.openaiCompatible` while the AI SDK's openai-compat passthrough at `@ai-sdk/openai-compatible@2.0.62/dist/index.mjs:525-540` reads `providerOptions[this.providerOptionsName]` (the provider id) — the key mismatch meant the lookup missed for every provider; Anthropic received the field but its Messages API has no `repetition_penalty` (only `temperature` / `top_p` / `top_k`); DeepSeek / OpenAI / OpenAI Codex / Ollama (OpenAI-compat) / Gemini / MiniMax / GLM / Bedrock-OpenAI do not list the field at all. **Per-provider dialect dispatch in `OpenAICompatSdkClient.buildProviderOptions`:** `lmstudio` / `ollama` → wire `repeat_penalty` (no `-ion`); `kimi` / `openrouter` / `custom` → wire `repetition_penalty` (snake_case, OpenAI-spec); `deepseek` / `gemini` / `minimax` / `glm` / `bedrock-openai` / unknown → field dropped silently. The return key flips from `{ openaiCompatible: openaiOpts }` to `{ [this.provider]: openaiOpts }` so the SDK's per-id-key passthrough delivers the field. The Anthropic client drops the field entirely instead of placing an unrecognized key on the wire — matches the 10-locale i18n text *"cloud providers will silently ignore it"*. OpenAI / Codex unchanged. The dialect table + `repetitionPenaltyWireField(provider)` helper lives in `src/core/repetition-penalty-dialect.ts` (re-exported from `openai-compat-sdk-client.ts` for test parity; placed in core to avoid a circular `core↔llm-sdk` import — see [[project_v1_26_3_pr454]]). **No 400-strip retry** for `repetitionPenalty`: the setting is user-opt-in (not a plugin default), so a backend rejection should surface to the user rather than be silently swallowed (dead-code-as-docs policy + half-life rule). One-line `console.debug` (`[REPETITION-PENALTY-EMIT]`, mirrors `[REASONING-STRIP-DEBUG]`) so users with developer-mode debugging can verify the wire contract on their backend. **Known limitation:** `wrapWithAdvancedSettings` (`src/llm-client-wrapper.ts`) uses `Object.create(client)` to inherit `createMessageStream` without settings injection — `repetitionPenalty` (and all other settings) is silently dropped on the stream path (Query Wiki, streaming UI). Tracked as [#451](https://github.com/green-dalii/obsidian-llm-wiki/issues/451) for v1.27.0; this fix lands only on the non-stream path. Closes #414. 3212 tests / 230 files (+3 are the new dialect dispatch tests).

- **Frontmatter writer silently emptied the `sources:` field on re-ingest (Issue #438, PR #450).** `enforceFrontmatterConstraints` ran AFTER `preserveExistingSources` was already merged, so the final write dropped any pre-existing `sources` value that didn't satisfy the new constraint — silently. **DocTpoint Finding 1 fix (commit `2560ab4`):** filter empty-string entries from `preservedSources` before merging, so a bare `sources:` header (no values) no longer re-emits as `sources:\n  - ""`. **Finding 2 (whole-class passthrough via `extractPassthroughLines`)** tracked as a follow-up PR — same PR series, separate commit. Per-vault impact: 321 affected pages in the maintainer's vault. CHANGELOG-side note: previously this regression was hidden by the v1.25.11 frontmatter-writer audit (which validated YAML shape, not value preservation); the fix lives at the writer-merge layer.

- **Placeholder detector missed `{"": {}}` / `{"": []}` empty-object/array variants (Issue #443 follow-up, PR #454).** The grammar-constrained JSON-repair gate (`isPlaceholderObject` in `src/core/json.ts`) only caught `{"": ""}` (empty string under the empty key). User E2E on LM Studio / qwen3.5-9b (2026-08-13) showed the model emits an empty OBJECT or ARRAY under the empty key when the grammar token is pluralised — both bypassed the existing gate and returned the broken JSON to the caller, triggering the source-analyzer's empty-result path. The detector now uses a single-pass `Object.entries(...).every(isEmptyJsonValue)` over all keys (not just the first), so empty object/array/string/number/null variants are caught uniformly. The throw-wiring test in `wiki-engine-repetition-penalty-hint.test.ts` confirms the placeholder gate still routes failures to the "Source analysis failed" path with the localized repetitionPenalty hint attached (gated by `core/repetition-penalty-dialect.ts` so providers that never put `repetitionPenalty` on the wire don't get a misleading hint — see the #414 entry above).

- **RepetitionPenalty UX hint on `Source analysis failed` (PR #454).** User feedback 2026-08-13 (LM Studio / gemma-4-12b / qwen3.5-9b): when a custom `repetitionPenalty` value silently broke grammar-constrained extraction (qwen3.5-9b), the user-facing error was a generic `Source analysis failed` with no mention of the setting. New `buildRepetitionPenaltyHint(language, value, provider)` helper appends a localized hint to the throw site (`wiki-engine.ts:905-908`) ONLY when (a) the user opted into a custom value AND (b) the active provider actually puts the field on the wire (`repetitionPenaltyWireField(provider) !== null`). Hint suppressed on anthropic/deepseek/gemini/minimax/glm — never put the field on the wire, so a "reduce or clear" hint would be misinformation. Settings description extended in 10 locales (the existing `repetitionPenaltyDesc` i18n text already warned about silent-drop on cloud providers — the new failure-path hint is a complementary UX surface for the wire-supporting subset).

### Notes for release engineering

- **Five PRs land in this PATCH.** **#447** (LLM pipeline, 39 commits, Phase A 3-tier + Path 2 + Phase B 11 caller migrations + per-model placeholder demotion) + **#448** (UX fixes, 10 commits, B1-B3 + B2.5 + Toast i18n) + **#453** (Issue #414 dialect, 4 commits: client + wire-shape tests + Anthropic drop + 400-strip documentation) + **#450** (Issue #438 sources-loss, 1 commit for Finding 1; Finding 2 follows separately) + **#454** (placeholder detector widening + repetitionPenalty UX, 4 commits: detector + UX + simplify/code-review cleanup + provider gate). #450 + #454 still awaiting DocTpoint re-review at tag time; release is held until both clear.
- **No settings-schema change, no migration, no key rename.** **21 new i18n keys** (18 B2.5 status-bar + 3 Toast) added across all 10 locales + the `fetchErrorNetwork` value change + 1 `repetitionPenaltyErrorHint` key + the existing `repetitionPenaltyDesc` extension. i18n-parity guards (bidirectional + placeholder-drift + non-empty) pin all new content; existing fetch-flow regression guards pin the HTTP-status re-throw behaviour; new dialect-dispatch tests pin the per-id-key passthrough at the wire boundary; new `wiki-engine-repetition-penalty-hint.test.ts` pins the throw-site wiring.
- **Test count growth.** v1.26.2 → v1.26.3: **2992 → 3305 tests** (+313 / +12 net files after 5 PRs land). Per-PR deltas: #447 +135 / #448 +58 / #453 +3 / #450 +4 / #454 +5. Composition and full regression-guard list in [ROADMAP v1.26.3 PATCH track](./ROADMAP.md).
- **CLI repo split is now live in v1.27.0 scope (see [ROADMAP §v1.27.0](./ROADMAP.md#v1270-minor-design-track)).** The in-tree `tools/llm-wiki-cli/` remains the canonical CLI source until v1.27.0 ships; the README §Headless CLI was rewritten to point at the published `karpathywiki-cli` npm package + the standalone sibling repo [`green-dalii/obsidian-llm-wiki-cli`](https://github.com/green-dalii/obsidian-llm-wiki-cli). No code change; only user-facing docs.

## [1.26.1] - 2026-08-08

### Added

- **`parseJsonResult` discriminated union for LLM JSON parse outcomes (Issue #407 Stage 0, PR #436, commit `ad02b0e`).** No behaviour change; the union gives the failure a name: `{ok: true, value}` / `{ok: false, reason: 'empty' | 'malformed' | 'exception'}`, so a parse failure can no longer be read as a negative answer, and under the union `parsed?.field || fallback` stops compiling at a call site that ignores the distinction. Every current call site keeps the old `parseJsonResponse` and is untouched — identity shown over 776 input combinations across return value, thrown error, and the full console call sequence including `debug`. Call-site migration follows in Stages 1+2 as one PR per site, starting with the two highest-blast sites, `path-resolution.ts:220` and `conversation-ingest.ts:337`.

- **Per-step LLM timing ledger (PR #409, eucher).** Each `createMessage` call now carries a `task` label naming the pipeline step; a process-global ledger (`src/core/llm-task-usage.ts`) accumulates call count + wall-millis per label at the single seam every call passes through (`wrapWithAdvancedSettings`). Callers snapshot before the work and diff after — deliberate, since a reset would be wrong the moment two ingests overlap. A phase as large as page generation (one interval covering path resolution, dedup call, page writes, merge routing) now decomposes into per-step timings, so a slow ingest says *which* step to look at. The ledger is cumulative for the process; an unlabelled call lands in `'untagged'` rather than being dropped, so the table never under-reports the run it exists to explain.

### Fixed

- **Duplicate `sources:` frontmatter key on stub-created concept pages (Issue #399, PR #405, commit `4c43cdfb`).** v1.25.11 regression in `appendSourceSlugToFrontmatter`; produced two top-level `sources:` keys (invalid YAML) on post-stub ingests, breaking Obsidian Properties render. Two-sided fix in `buildStubContent` + `appendSourceSlugToFrontmatter`. Corpus: 321 affected pages in @borthwick's vault. 5 new unit tests + 3 parser-shape guards (real `yaml` package assertion that `sources` is `string[]`).
- **CLI: per-run bundle isolation prevents concurrent-run corruption (PR #408, commit `7f864f1`).** Two concurrent `ingest --help` runs raced esbuild's in-place bundle write (14 of 60 failed with `SyntaxError: Unexpected end of input` on `main` 2a42241). Fix: per-process bundle name + `process.kill(pid, 0)` liveness sweep at startup + post-import `rm` (Node keeps loaded module + inline sourcemap). 20 of 20 clean after fix. No config / API / env-var change.
- **Dedup-phase in-scan concurrency halving was inert (CR-1, post-v1.26.0 code review).** `consecutiveThrottleChunks` + `HALVE_AFTER_CONSECUTIVE_CHUNKS` were declared inside the chunk-iteration for-loop body in `src/wiki/lint/llm-phases/dedup-phase.ts`, so the counter reset to 0 at every chunk and could never reach the halving threshold of 2. Result: the v1.26.0 Batch 2 attribution "979s→365s e2e gain on the 2141-page vault came from force-disable + halving + 500ms backoff" was wrong on the halving factor — only the retry/backoff mechanism delivered the gain; halving was dead code in practice. Fix: hoist the two declarations above the loop (alongside `currentConcurrency`) so the counter accumulates across chunks. New regression-guard test in `src/__tests__/wiki/lint/llm-phases/dedup-phase.test.ts` ("runDedupPhase — in-scan concurrency halving (CR-1 regression guard)") with 4-pair caseVariant fixture + `systemPrompt.length = 7000+` to force chunkSize=1 + `pageGenerationConcurrency = 2` + per-prompt mock (1st call → '', 2nd → valid JSON). Asserts the `"temporarily reducing in-scan concurrency 2 → 1"` warn line fires. Attribution correction: see [[feedback_dedup_phase_halving_dead_code]] + [[feedback_force_disable_thinking_openai_compat_noop]] for the full 979s→365s→151s chain.
- **Six reasoning-budget-sensitive `TOKENS_*` caps raised to 3000 (Issue #403, PR #429).** Short-JSON output call sites (`{strategy, path}`, `{keywords: []}`, `{kind: "entity"}`) were sized for non-reasoning models; on reasoning-capable models the deliberation is billed against the same `max_tokens` budget as the answer, so the cap was burned before content. DocTpoint measurement on `gemma-4-12b / LM Studio / 2.4 KB source × 45 calls`: 14 truncated, 13 of those empty; `complementaryAppend` was 3/3 = 100% miss at its 600 cap. Bumped to 3000 uniformly: `TOKENS_DEDUP_RESOLUTION` 1000 → 3000, `TOKENS_MERGE_TRIAGE` 2000 → 3000, `TOKENS_COMPLEMENTARY_APPEND` 600 → 3000 (the three #403 primary sites), plus three same-pattern sites surfaced by the post-#403 audit pass: `TOKENS_LINT_ALIAS_BATCH` 500 → 3000, `TOKENS_LINT_ORPHAN_FIX` 800 → 3000, `TOKENS_QUERY_KEYWORDS` 1000 → 3000. ~50–80% reasoning headroom while keeping the cap well below the call's context window. Per-call reasoning-aware multiplier is deferred to v1.27.0's per-call `thinkingPolicy` enum (scope item 6).
- **CHANGELOG v1.26.0 entry: `thinking` / `chat_template_kwargs` never reached the wire correction (Issue #420, PR #420).** Replaced the "SDK's `filter()` silently drops them" framing with the actual mechanism verified by DocTpoint: the SDK's `filter()` at `@ai-sdk/openai-compatible@2.0.62/dist/index.mjs:531-540` is a **passthrough** for undeclared keys (copies them verbatim), but it reads from `providerOptions[<provider id>]` (e.g. `lmstudio` / `deepseek`) while `buildProviderOptions` returns them under the hardcoded `openaiCompatible` key, which no shipped provider id matches — the fields were **misaddressed**, not filtered. `reasoningEffort: 'none'` is the only verified-working disable (it IS declared in the schema and emits as `reasoning_effort: 'none'` on the wire at `:541`).
- **CHANGELOG + ROADMAP: Bedrock Stage 2 (SSO/Profile auth) planning entry recorded (Issue #425, PR #426).** Cancels the prior "≥3 user requests" gate. Implementation window v1.26.x PATCH / v1.27.0 via a zero-AWS-SDK path: hand-rolled IAM Identity Center OIDC (reusing the Codex OAuth skeleton) → `GetRoleCredentials` → temp IAM creds → hand-written SigV4 signer → existing `bedrock-mantle` endpoint. ~+10 KB bundle, zero new npm deps (vs the rejected PR #263's +1.2 MB). Issue #425 milestone: v1.27.0+ research. PR #263 author notified with the new decision ([comment 5218259440](https://github.com/green-dalii/obsidian-llm-wiki/pull/263#issuecomment-5218259440)).
- **`--seed` is no longer documented as honoured by every local server (Issue #423, PR #434, commit `8826710`).** Docs-only. Three sites promised strict seed honouring: the flag table in `tools/llm-wiki-cli/README.md`, the `--help` text in `tools/llm-wiki-cli/src/main.ts`, and the `samplingSeed` doc comment in `src/types.ts`. Measured on LM Studio / `google/gemma-4-12b` (MLX, 4bit) the field is accepted and type-validated (`seed: "abc"` answers HTTP 400 naming `llm.prediction.seed`) and then ignored: five requests at `seed: 42`, `temperature: 1.0` returned five distinct outputs, as did five requests with no seed at all — only `temperature: 0` returned a single output. Nothing in the exchange tells the caller the run is not reproducible, which is what made the sentence costly rather than merely optimistic. The `openai` / Anthropic / Codex exceptions are accurate and stay verbatim.
- **A page keeps its own H1 through an LLM body rewrite (Issue #419, PR #422, commit `cddd460`; hardened for Issue #435, PR #437, commit `8eb3948`).** `reassertH1` restored the title with `rewrite.replace(current, previous)`, wrong twice over: the replacement string processes `$` escapes, so a title the function exists to keep verbatim was mutated (`# Kosten $$500 und $& im Titel` came back as `# Kosten $500 und # Kosten im Titel`), and `replace` substitutes the first occurrence anywhere in the body rather than the matched line, so a preceding line quoting the title took the restore while the real H1 kept the model's version. Both are repaired by splicing at `exec().index`. #435 then removed the remaining assumption behind that match — **H1 re-assertion hardened against frontmatter and code-fence comment lines**: `findH1` walks the lines once and skips a `---` block in frontmatter position (further down it is a thematic break) and any fenced block, closed by its own opening marker. The read side is the mass-mutation case the file-name approach was rejected for in #419 — a `# ` shell comment inside a bash example could be adopted as the page's previous title and mint a title for a page that never had one. The same repair applies to `mergeDuplicatePages`, which adopts `parsed.body` as the merged body. 2 + 6 tests; the thematic-break test pins the boundary rather than fixing it.
- **`yaml` declared in `devDependencies` (Issue #424, PR #431, commit `64601ee`).** Clean-install regression: `yaml@2.8.3` was only transitive via vite peer in vitest → eslint-plugin-obsidianmd → yaml-eslint-parser, so pnpm's strict isolation kept it nested under `vite/node_modules/yaml`. The `append-source-slug.test.ts` import (`import { parse as parseYaml } from 'yaml'`) failed to collect on a fresh `pnpm install` from `main`. Two things had hidden the regression: `release.yml` uses `npm install --legacy-peer-deps` (flat layout hoists), and the release workflow runs `npm run build` only — no test step, so a file that fails to collect never turns CI red. Fix: declare `^2.4.2` in `devDependencies`; lockfile regenerated per `pre-release-gate` §2f.2.
- **Query wiki: silent-success defect on Save (Issue #398, PR #432, commit `e2071af`).** User clicks "Save to Wiki" on a conversation; the notice said "Conversation saved to Wiki!" but no file was written. Three notices flashed: "Checking for existing knowledge" → "Konversation im Wiki gespeichert!" → "0 entities, 0 concepts, 0 pages" (or "0实体, 0概念, 0页" in zh-CN locale). Root cause: `src/wiki/conversation-ingest.ts:78-93` returns early with `success: true`, `createdPages: []`, `entitiesCreated: 0`, `conceptsCreated: 0`, `errorMessage: 'Knowledge already exists in Wiki'` when `checkDedup` returns `status: 'fully_redundant'` — but `QueryView.saveToWiki` displayed an unconditional "saved!" notice without surfacing `report.errorMessage`. Silent-success defect (UI lied about what actually happened). Two-layer fix: (a) UX layer — `noticeTail` conditional append when `report.errorMessage` is set; i18n key `querySaveAlreadyExists` added to all 10 locales. (b) Diagnostic layer — `console.debug` for the dedup verdict + `console.warn` when save is skipped, so the user can inspect DevTools to see the LLM's actual verdict. 3 regression tests pin the silent-success contract.

### Issue state (administrative)

Issue tracker had drifted from the v1.26.0 merge history (no `Closes #N` in PRs #401 / #406 / #410 / #411 commit messages, so auto-close-on-merge never fired). Closed administratively on 2026-08-07:

- **#382** [v1.26.0 hardening] — all 5 P0+P1 batches shipped in v1.26.0 via PRs #401 / #406 / #410 / #411.
- **#328** [schema layer rethink] — Phase 1 closed by PR #331 (2026-07-22). Phase 2/3 deferred to v1.27.0+.
- **#402** [providerOptions stripped] — `response_format` closed by `ca4a24d` (2026-07-29); `repetitionPenalty` split to #414.
- **#399** — see Fixed section above.

### Security

- **24 Dependabot alerts closed via transitive devDep upgrade (Dependabot batch 2026-08-08).** All 24 alerts were in **transitive devDependencies** only — production runtime (`@ai-sdk/*`, `openai`, `anthropic`, etc.) was untouched. Bumped 4 root devDeps so the 4 vulnerable transitives resolve to safe versions:
  - `fast-uri` `3.1.4` → **`3.1.5`** (added as direct devDep so pnpm hoists it; override updated) — closes 3 alerts (#1, #30, #31)
  - `undici` `7.27.2` → **`8.10.0`** via `jsdom@^30.0.1` — closes **16 alerts** (#5-#11, #18-#27)
  - `postcss` `8.5.15` → **`8.5.26`** via `vite@^8.2.1` (vitest peer re-resolved) — closes 3 alerts (#12, #34, #35)
  - `vite` `8.0.13` → **`8.2.1`** via direct devDep — closes 2 alerts (#3, #4)
  - Plus `ajv@^8.20.0` added to devDeps (pulls the safe `fast-uri`)
  - Plus `eslint-plugin-obsidianmd@^0.4.1` + `vitest@^4.1.10` range-widened to latest

  All 24 alerts now have `first_patched_version ≤ installed version` per Dependabot's metadata; GitHub auto-closes on next lockfile re-scan post-merge. Zero runtime impact (`fast-uri`/`undici`/`postcss`/`vite` never appear in `main.js` — verified by `grep -c` against the built bundle, 0 hits each). Gate 1 green on the new lockfile: lint 0/0, tsc 0, 2980 tests passing (217 files), build clean, css-lint 0 violations.

  **Known CI-only carry-over:** npm-audit (registry-local advisory DB) flags an additional `brace-expansion@1.1.16` / `2.1.2` transitive reachability through `eslint-plugin-import` / `eslint-plugin-n` / `eslint-plugin-react` / `eslint-plugin-json-schema-validator`. GitHub Dependabot does NOT flag these (no open alert for `brace-expansion`). The npm `overrides` field syntax to cascade (`eslint-plugin-import > brace-expansion: 5.0.9`) is incompatible with pnpm's `parseCatalogProtocol` (`bareSpecifier.startsWith is not a function`) — flat overrides work in both, but flat overrides do not cascade into grand-children transitive deps on npm's side. pnpm's hoisting deduplicates everything to a single `5.0.9` via flat override. Resolving the npm-side carry-over requires either (a) migrating CI to pnpm, (b) using pnpm-only overrides via `pnpm.overrides` (subtly different field), or (c) replacing `eslint-plugin-import` / `eslint-plugin-n` / `eslint-plugin-react` with non-vulnerable alternatives. **Out of scope for v1.26.1** — the runtime bundle is unaffected, Dependabot considers it resolved.

### Tracked in v1.26.x PATCH (no fix yet)

- **#407** — `parseJsonResponse` parse failures indistinguishable from negative answers at 7-12 sites (high-blast: `path-resolution.ts:220` + `conversation-ingest.ts:337`). Stage 0 shipped as PR #436 (see *Added* above); the call sites still read a failure as a negative answer until Stages 1+2 port them, one PR per site.
- **#414** — `repetitionPenalty` setting inert (split from #402). DocTpoint's per-backend measurement 2026-08-07 on LM Studio / gemma-4-12b confirmed: `repetition_penalty` is silently discarded on this backend; the correct spelling is `repeat_penalty` (llama.cpp style) for LM Studio / llama.cpp and `repetition_penalty` for vLLM / OpenRouter. Path = per-backend spelling transform. **Gap**: DeepSeek / Kimi / GLM / Ollama / vLLM unmeasured.

### Planned — Bedrock Stage 2 (SSO/Profile auth, 2026-08-07 decision)

**Scope.** Adds AWS SSO / Profile login to the existing `bedrock-anthropic` / `bedrock-openai` providers via a **zero-AWS-SDK** path (cancels the prior "≥3 user requests" gate). Mechanism: hand-rolled IAM Identity Center OIDC device-code flow (reusing the Codex OAuth skeleton at `src/llm-sdk/openai-codex/`) → `GetRoleCredentials` → temp IAM creds → hand-written SigV4 signer → existing `bedrock-mantle` endpoint (`bedrockMantleMessagesUrl` / `bedrockMantleChatCompletionsUrl`). ~+10 KB bundle, zero new npm deps.

**Why this replaces the rejected PR #263 approach.** #263 shipped `@ai-sdk/amazon-bedrock` + `@aws-sdk/credential-providers` for the same feature at **+1.2 MB** (bearer users pay it too — esbuild single-file CJS cannot lazy-load). The `bedrock-mantle` endpoint accepts AWS credentials (SigV4) per AWS docs and speaks standard OpenAI/Anthropic protocols over plain SSE — so SSO needs only the OIDC login flow + a hand-writable SigV4 signer (~300 LOC, `crypto.subtle`, AWS test vectors). No AWS SDK required.

**Design record:** `~/.claude/.../memory/project_bedrock_stage2_codex_style_sigv4.md` (implementation checklist). Target window: v1.26.x PATCH or v1.27.0.

## [1.26.0] - 2026-08-05

MINOR. Anchored at [#358](https://github.com/green-dalii/obsidian-llm-wiki/issues/358) (complementary memory model). User-visible surface from this release: the headless ingest CLI, #383 boundary follow-up, dual-key bucketed dedup, cross-type dedup candidate expansion, dedup threshold advanced tunables, real wire-level force-disable thinking (4-layer fallback), parse-failure routing into `dedupFailures`, dead-code-as-docs governance, Russian i18n, and three DocTpoint PRs (`#357` source-lemma, `#386` vault-wide link retarget, `#388` `created:` provenance). The complementary-memory design items (per-type registration, typed edges, bidirectional frontmatter, identity ambiguity, Preview-Confirm, stable mutation interface) are scoped but not implemented in this release — they remain v1.26.x follow-on work and are tracked in `docs/v1.26.0-design.md` plus the issues listed there.

> **Composition.** 115 commits on top of v1.25.11, 110 files changed, +10,604 / −994 LOC, **2928 tests / 213 files passing**. The Batches 1-4 P0+P1 hardening was added on top of the originally-shipped CLI surface; v1.26.0 is the first MINOR in the project that carries P0+P1 hardening into the same tag.

### Added

- **Headless ingest CLI is now discoverable (PR #372 + #387).** The engine under `tools/llm-wiki-cli/` previously shipped with no `bin`, no pnpm script, and no mention in any README — a fresh clone could not find it. Exposes it as `llm-wiki` (bin) plus `pnpm llm-wiki` (script) and sets the executable bit on `run-llm-wiki.mjs` so `npm install` produces `node_modules/.bin/llm-wiki`. The tool is named `llm-wiki` rather than `wiki-ingest` so it can grow beyond ingest into a general wiki-management CLI (lint, query, mutation) without a later rename. Note: pnpm 10 does not link the root package's bin to `node_modules/.bin/`, so the pnpm-user entry point is `pnpm llm-wiki` (not `pnpm exec llm-wiki`); npm users see `./node_modules/.bin/llm-wiki`.
- **🛠️ Tools H2 section in all 10 READMEs.** One paragraph pointing at the CLI's flag reference, environment requirements, and shim caveats — links out to `tools/llm-wiki-cli/README.md` (absolute GitHub URL so the readme-links test stays green).
- **Source-slug deterministic merge (PR #357, DocTpoint).** Replaces the LLM-only merge judgement with a deterministic "source-slug = page-lemma" path so a re-ingest of the source that produced a page cannot fail to merge that page into its own subject on the second pass.
- **Real wire-level force-disable thinking, 4-layer fallback (PR #411, Batch 6).** Prior versions shipped `thinking.type = 'disabled'` as a wire disable, but they never reached the request body. The AI SDK's `openaiCompatibleLanguageModelChatOptions` zod schema (`@ai-sdk/openai-compatible@2.0.62/dist/index.mjs:322-344`) does not declare `thinking` / `chat_template_kwargs` — on its own that would not have stopped them, because the `filter()` at `:531-540` is the passthrough for undeclared keys: it copies them into the body verbatim and skips only the keys the schema already handles. It reads them from `providerOptions[<provider id>]` (`lmstudio` / `deepseek` / …), while `buildProviderOptions` returns them under the hardcoded `openaiCompatible` key, which no shipped provider id matches — so the fields were misaddressed, not filtered. Layer 1: `reasoningEffort: 'none'` is declared in the schema and the SDK emits it as `reasoning_effort: 'none'` on the wire (`:541`) — the only verified-working disable. Layer 2: co-emit `thinking: { type: 'disabled' }` + `chat_template_kwargs.enable_thinking = false` for the Anthropic path (uses a different field that the Anthropic SDK accepts). Layer 3: on HTTP 400 mentioning `reasoning_effort` / `thinking` / `chat_template`, retry once with `reasoningEffort` stripped. Per-baseURL cache prevents infinite loops. Layer 4: "**Do not reason step by step**" line in the dedup prompt. **User-facing impact on a 2141-page vault**: wall-time 979s → 365s (Batch 2 retry only) → **151s after Layers 1-3 went live** (−85% vs baseline, −59% vs Batch 2). Per-call `thinkingPolicy` (the JSON-repair path at `source-analyzer.ts:417` always allows reasoning — DocTpoint measurement showed disabling it produces structurally valid JSON with wrong content) is deferred to v1.26.x PATCH.
- **Dual-key bucketed dedup, Batch 1 rev 2 (PR #401).** `partitionPagesMultiBucket` partitions pages into `tp-prefix` (title-prefix) + `lh-link-hash` (link-hash) buckets before the O(n²) `generateDuplicateCandidates` scan. Bucket boundary emits `checkCancelled()` so the user can interrupt mid-scan. Pure refactor on legacy vaults (≥95% recall on synthetic N=200 pages vs 80-90% on the previous single-bucket baseline); memory peak O(N² candidates) → O(B² per bucket).
- **Cross-type dedup candidate expansion, Batch 2 (PR #410).** `generateDuplicateCandidates` now surfaces candidates across entity / concept / file types when the shared-link signal crosses type boundaries, and the dedup phase ships an inline empty-response retry + backoff + concurrency halving on transient burst load (LLMs that return 200 + 0-byte body under burst). User-facing impact: 2141-page vault dedup 979s → 365s after retry/backoff live. Threshold inputs (see Changed) are user-tunable. The companion `lintDedupIncludeSources` toggle (per-source-file dedup scope filter) relocates to the bottom Advanced settings panel — it was originally misplaced in the LLM Advanced section.
- **Russian i18n, full UI + wiki-output + README (PR #397).** 667 new keys in `src/texts/ru.ts`; full `docs/README_RU.md` translation; 11-way language switcher across all READMEs; system-prompt section labels for wiki output. 10→11 locales. i18n-parity test enforces bidirectional coverage.
- **Vault-wide link retarget for `mergeDuplicates` (#386, PR #392, DocTpoint).** `merge-duplicates.ts` previously retargeted links only inside the surviving page's body; links from sibling pages pointing at either the surviving page or the deleted page now also get rewritten vault-wide and across every alias form before the delete commits. Closes #386.
- **Frontmatter `created:` provenance (#388, PR #396, DocTpoint).** `create-page.ts` and `fill-empty-page.ts` now take `created:` from the caller (`new Date().toISOString()`); never read from the LLM-generated content. Closes #388 — the previous shape could echo an LLM-hallucinated old date into freshly-created pages.
- **Dead-code-as-docs governance (Batch 4, policy only — no functional change).** CLAUDE.md §"Dead-code-as-docs policy" + `pre-release-gate` Phase 2g audit. Exported helpers with zero production importers now have a one-release half-life: either wire into production before the next MINOR or delete before the next MINOR. Two prior instances on record (v1.25.10 PATCH `lint-analysis-cache.ts` + `lint-smart-skip.ts` shipped as dead code and survived until v1.26.0 Batch 3 deletion; v1.25.0 PDF cache-only helpers followed the same pattern). Two is a pattern; three would be a culture. P1-1/P1-2 from v1.25.10 PATCH #367 deleted as part of this governance (PR #406).

### Changed

- **`--thinking on|off` → `--thinking-mode data-json | plugin-off | server-default`.** The old flag was a two-state surface that hid the three outcomes the plugin can actually produce: leave `data.json` alone, force-disable reasoning, or defer to the server's preset. `on` looked like "enable reasoning" but actually meant "defer to server default" — a footgun. The new flag makes all three states explicit. The legacy `--thinking` throws a deprecation error pointing at the new flag and the v1.27.0 removal target; it does NOT silently translate, so a `--thinking on` typo can't keep working long after the deprecation is forgotten.
- **`--max-rounds` → `--round-base`.** The old name was actively misleading: it set the granularity's `maxBatchesBase` field, not a ceiling. The actual ceiling is `min(base * 3, ceil(source_chars / 2000) + 2)`, so `--round-base 6` allows up to 18 rounds, and on a short source the length term wins regardless. Renaming to `--round-base` describes what the flag actually sets. The internal `GRANULARITY_CONFIG.maxBatchesBase` field is unchanged (engine contract, not CLI surface). Legacy `--max-rounds` throws a deprecation error.
- **Picker exclusion rule centralised (PR #389 follow-up to #383).** `FileSuggestModal`, `FolderSuggestModal`, and `MultiFileSuggestModal` previously each open-coded the wiki + configDir filter. They now share a single `isExcludedFromSourcePicker` primitive in `src/core/folder-scope.ts`. The original `FolderSuggestModal` also held the same unanchored-prefix leak class `folder-scope.ts` was created to eliminate (`.obsidian-backup/` next to `.obsidian/`) — closed as part of the centralisation.
- **Dedup threshold constants extracted + user-tunable (PR #395, Batch 2 surface area).** `LINT_DEDUP_JACCARD_LINK_THRESHOLD`, `LINT_DEDUP_JACCARD_BODY_GATE`, `LINT_DEDUP_BIGRAM_THRESHOLD` extracted from `src/wiki/lint/duplicate-detection.ts` to `src/constants.ts` (Lint Performance Knobs block). `generateDuplicateCandidates` now accepts a `DuplicateDetectionThresholds` options-object; defaults preserve legacy behavior. Three user-settable inputs in **Settings → LLM Configuration → Advanced → Custom** ("Duplicate detection thresholds" subsection): shared-link duplicate threshold, body-similarity floor, title/alias similarity threshold. Leave blank = constant default. **Tier-1 cutoff (`LINT_DEDUP_BIGRAM_TIER1_CUTOFF = 0.6`) is NOT user-settable** — controls LLM budget allocation; user-tunable would let users silently flood or drop LLM candidates. New bottom "Advanced settings" panel (separate from the LLM Advanced section) hosts the three threshold inputs + `lintDedupIncludeSources`.

### Fixed

- **FolderSuggestModal leaked the wiki folder itself as a pickable source/watched folder (#383 PR #384 follow-up, PR #389).** `isInFolderScope(folder, wikiFolder, false)` is false for the folder itself (a folder is not a descendant of itself); without an explicit identity check, the wiki folder re-entered the folder picker after PR #384 landed. New `isAtOrInFolderScope` primitive in `src/core/folder-scope.ts` makes the "folder itself OR anything inside it" semantics a single tested rule.
- **Three of PR #384's per-site regression tests pinned nothing (#383 PR #384 follow-up, PR #389).** The `delete-empty-stubs`, `merge-duplicates` (deleted — see below), and `auto-maintain` tests rebuilt the filter expression inside the test file and asserted against the copy — reverting the source line left them green. Rewritten as real production-function tests: `deleteEmptyStubs` (5 cases: leak direction + substantive content + reviewed:true + protected paths + deleteFile throw), `normalizeSourcesInFolder` (3 cases: leak direction + clean file + read throw). The `merge-duplicates` site is intentionally NOT covered by this release — #386 (assigned to DocTpoint) replaces that filter and owns its own coverage.
- **`auto-maintain.ts` Phase 2 extracted to a module function (`normalizeSourcesInFolder` in `src/core/sources-normalizer.ts`).** Previously inline in `runStartupCheck`, which sleeps 3 seconds and depends on the wikiEngine/plugin surfaces — neither is testable from the startup surface. The new module function mirrors the Phase 3 shape (`findIncompletePages`) so every startup phase follows the same module-function pattern.
- **Dedup-phase parse-failures were silently merged with legitimate-empty results (Batch 7, PR #411).** `dedup-phase.ts` collapsed `null` (parse-fail / truncated) and `{"duplicates": []}` (LLM said "no duplicates") into the same `[]` outcome; neither was routed to `dedupFailures`. Fix: structured `type: 'parse-failure'` discriminator on each `dedupFailures` entry; `isRateLimitFailure` predicate now accepts a structured item and bails early on `type: 'parse-failure'`. Both `detectRateLimitFailures` and the dedup-phase consumer now pass the full item (CR-3 wiring fix — the structured branch was previously unreachable in production because consumers passed `f.reason` string only; a regression test in `rate-limit.test.ts` pins the discriminator through `detectRateLimitFailures`).
- **Two-marker (verb + field) classifier for reasoning-field 400 errors (Batch 6 CR-2).** Prior single-substring classifier included the bare word `thinking`, which collides with model names (`kimi-k2-thinking`, `qwen3-235b-a22b-thinking-2507`, `glm-4.6-thinking`). Any 400 on these models — bad model name, context-length exceeded, max_tokens mismatch — was misclassified as a reasoning-field rejection, permanently marked the baseURL as "strip" (silently disabling force-disable-thinking for the rest of the session), AND consumed the 400 so the token-key fallback never fired. Two-marker classifier (rejection verb + field marker) rejects all four false positives while still catching real rejections.

### Performance

- **Lint dedup-phase empty-response retry (Batch 2).** Inline retry on `null` LLM response with 500ms attempt-2 backoff; concurrency-halving on consecutive throttled chunks. **Deferred**: the concurrency-halving counter (`HALVE_AFTER_CONSECUTIVE_CHUNKS = 2`) was scoped inside the per-batch `for` loop body and never reached the threshold — see v1.26.x PATCH CR-1 for the location-only fix. The 979s→365s e2e on the 2141-page vault came from retry/backoff only; the (dormant) halving contributed zero. The 151s additional gain over Batch 2 came from Layers 1-3 of the Batch 6 fallback going live (see Added).
- **`Map<string, true>` → `Set<string>` on `ReasoningStripProber.cache` (PR #411 simplify).** Removed the dead `=== true` check on every read and the dead `invalidate(baseUrl?)` overload (zero production callers — only tests used it).

### Tests

- **2928 tests / 213 files passing.** +13 net since v1.25.11:
  - +7 `__tests__/tools/llm-wiki-cli/main.test.ts` (parseCliOptions base contract + boundary-catch USAGE contract, dispatchCli shapes, `--thinking-mode` enum + legacy deprecation + ambiguity, `--round-base` + legacy deprecation, numeric validation (safe-integer, empty-value rejection, `=`-form negatives), boolean plumbing incl. `--extract-only` ⇒ `--dry-run`, applyOverrides (prototype-key guard, single-field patches), resolveApiKey OS guidance, applyThinkingMode, parseNumber)
  - +3 `__tests__/root/constants.test.ts` (new threshold constants)
  - +11 `__tests__/root/i18n-parity.test.ts` (Russian locale wiring + 11-way README switcher)
  - +11 `__tests__/wiki/lint/duplicate-detection.test.ts` (threshold override tests)
  - +3 `__tests__/wiki/lint/llm-phases/dedup-phase.test.ts` (classifyTiers threshold tests)
  - +3 `__tests__/llm-sdk/reasoning-strip-probe.test.ts` (two-marker classifier + Set conversion)
  - +1 `__tests__/llm-sdk/openai-compat-request-body.test.ts` (wire-body regression: `reasoning_effort: 'none'` IS on the body, not just on the `providerOptions` argument handed to the SDK)
  - +3 `__tests__/core/rate-limit.test.ts` (CR-3 wiring + structured-form + discriminator)
  - +4 `__tests__/types/settings.test.ts` (new threshold settings defaults)
  - +1 `__tests__/wiki/lint/fill-empty-page-created.test.ts` (#388 regression guard: `created:` from caller, not content)
  - +1 `__tests__/wiki/lint/merge-duplicates-link-retarget.test.ts` (#386 regression guard)
  - +2 `__tests__/core/folder-scope.test.ts` (PR #389 new primitives `isAtOrInFolderScope` + `isExcludedFromSourcePicker`)
  - +1 `__tests__/core/source-lemma.test.ts` (PR #357 source-slug deterministic merge)
  - +2 `__tests__/wiki/source-analyzer-thinking.test.ts` (Batch 6 per-call thinkingPolicy regression guard: repair callback does NOT pass `enableThinking: false`)
  - +1 `__tests__/wiki/source-analyzer-lemma-guarantee.test.ts` (PR #357 invariant)
  - −2 net deletions (removed 2 stale `lint-analysis-cache.test.ts` + `lint-smart-skip.test.ts` from PR #406 dead-code cleanup; replaced 1 stale `duplicate-detection.test.ts` shadow file from the lint sub-package)

### Internal

- Subcommand dispatch via `dispatchCli(argv)` returning a tagged union `{ kind: 'tool-help' | 'ingest' | 'unknown' }`. Adding a future `lint` or `query` subcommand is one `case` and the compiler will refuse to forget it. Flag-shaped first arguments (e.g. forgetting `ingest`) surface a hint rather than getting swallowed.
- Numeric validation collapsed into a single `parseNumber(raw, flag, predicate)` helper driven by a spec table in `parseCliOptions()`, so errors surface from the parser (with the ingest USAGE block attached) instead of mid-run. A single boundary catch appends `INGEST_USAGE` to every escaping error, detecting by a stable marker substring (the exact `run-llm-wiki.mjs ingest` path) rather than matching on message text.
- `--help` is now a pure marker (`options.help: boolean`) instead of calling `process.exit(0)` inside the parser, so `parseCliOptions` is testable. The `runIngest` runner handles the actual printing.
- Code-review hardening (8 angles, subagents, both CLI and #383 follow-up): prototype-key guard on the settings-derived granularity path in `applyOverrides`, empty/whitespace numeric rejection (`Number('')` coerced to 0 — `--max-tokens-per-call ""` silently meant "no cap"), `--model` trim, `Number.isSafeInteger` for integer flags, `-h` alias at the ingest subcommand, `--vault` ENOENT → friendly message, deprecation throws before required-flag checks, folder-scope centralisation closing the same unanchored-prefix leak class on the configDir half. All backward-compatible.
- Root `tsconfig.json` gains `exclude: ["src/__tests__/tools/**"]` because the CLI test files import `tools/` source via relative paths and root tsc would otherwise follow those imports into `@types/node@16` territory (`parseArgs` was added in Node 18.3+). vitest still finds them via its own include glob.
- `src/core/folder-scope.ts` adds two new primitives alongside `isInFolderScope`: `isAtOrInFolderScope(path, folder, isRoot)` (true for the folder itself OR any descendant — fixes the #383 picker leak in one rule) and `isExcludedFromSourcePicker(path, wikiFolder, configDir)` (the centralised picker rule used by all three pickers).
- `src/core/source-lemma.ts` exposes `isSourceOwnPageLemma` + `selectSourceLemma` (PR #357 source-slug = page-lemma deterministic merge); `src/core/sources-normalizer.ts` exposes `normalizeSourcesInFolder` (PR #389 module-function pattern).
- `src/llm-sdk/reasoning-strip-probe.ts` (Batch 6, PR #411) — `ReasoningStripProber` per-baseURL cache + `isReasoningFieldError` two-marker classifier (mirrors `isPdfRelatedLlmError` design in `src/wiki/wiki-engine.ts:587-608`).
- `src/wiki/lint/duplicate-detection.ts` adds `DuplicateDetectionThresholds` options-object + per-call `tier1Cutoff` parameter on `classifyTiers` (PR #395 + PR #410 thread-through).
- `src/ui/settings-sections/advanced-settings-section.ts` is the new bottom Advanced settings panel (PR #395); hosts the 3 dedup threshold inputs + `lintDedupIncludeSources`. Separate from the LLM Advanced section (which retains `temperature`, `repetitionPenalty`, `forcePdfSupport`).
- `src/ui/settings-sections/shared-inputs.ts` adds `renderNumberInput` (consolidated from prior `renderNumericInput` + `renderDedupThresholdInput`); regression test in `settings-section-helpers.test.ts`.
- `src/constants.ts` gains 5 new constants: `LINT_DEDUP_BUCKET_COUNT`, `LINT_DEDUP_BUCKET_PREFIX_LEN`, `LINT_DEDUP_JACCARD_LINK_THRESHOLD`, `LINT_DEDUP_JACCARD_BODY_GATE`, `LINT_DEDUP_BIGRAM_THRESHOLD`. `LINT_DEDUP_BIGRAM_TIER1_CUTOFF` (Batch 2) — constant-only, intentionally NOT exposed to Settings.
- `package.json` `bin` field exposes `llm-wiki`; `scripts.llm-wiki` mirrors `node tools/llm-wiki-cli/run-llm-wiki.mjs`.
- `tools/llm-wiki-cli/tsconfig.json` (PR #372) — separate tsconfig for the CLI with `@types/node@22`; root tsconfig excludes `src/__tests__/tools/**` to keep the `parseArgs` import below `node_modules/@types/node@16` from poisoning root tsc.
- `versions.json` gains `1.26.0: 1.11.4` entry.

## [1.25.11] - 2026-07-31

### Fixed

- **Freshly generated entity/concept pages silently lost the `sources:` provenance field (#365).** The `enforceFrontmatterConstraints` call at `create-page.ts:293` runs before `createOrUpdateFile`; it rewrites the frontmatter from a fixed allowlist (`type`, `created`, `updated`, `tags`, `aliases`, `reviewed`) and strips every other field — including `sources:`. So the generated page landed in the vault with `type: entity`, `created: …`, `tags: …` and *zero* `sources:` entries, even though the LLM had correctly included them in its output. The root cause was the gap between `enforceFrontmatterConstraints` (allowlist-based, strips unknowns) and `mergeFrontmatter` (union-based, merges `sources`); the two helpers were never designed to be chained. Fix: splice a `mergeFrontmatter(content, 'sources/<slug>')` call AFTER the constraints pass but BEFORE the vault write, so the `sources:` entry re-punctures the allowlist it was just stripped from — byte-shape identical to the `merge-page.ts:93` path. A structural frontmatter-fence guard (`expect(…).toBe(2)`) prevents a double-`---` regression class (wrapping a pre-delimited `serializeFrontmatter` output in another pair of `---` fences).

- **Relative cross-file links in README files break in Obsidian's community plugin browser (#375).** When a `](docs/README_CN.md)` markdown anchor resolves correctly on GitHub, the marketplace render strips relative paths, so users lose navigation between locales and to the companion PDF-OCR / MODEL guides. Rewrote every cross-file URL in all 10 README files (EN + 9 locales) to the absolute form `https://github.com/green-dalii/obsidian-llm-wiki/blob/main/…`. (Image refs `![…](…)` are exempted — Obsidian renders them correctly inline.) A new `src/__tests__/root/readme-links.test.ts` (12 cases) pins the contract: 10 files × no relative cross-file link + 1 switcher-count parity + 1 canonical-prefix check.

- **4× frontmatter re-parse on every freshly generated page (simplify follow-up, F2).** The initial #365 fix called `mergeFrontmatter` for the source-stamp, but `mergeFrontmatter` internally runs `parseFrontmatter` + `extractBody` + `extractPassthroughLines` + `serializeFrontmatter` — 4× regex passes over the content. `enforceFrontmatterConstraints` (called ~60 lines earlier) had already produced a canonical YAML block; the work was duplicated. Replaced with a local `appendSourceSlugToFrontmatter` helper that uses substring slicing + `split('\n')` + `join('\n')` — single linear scan, no re-serialization. Output byte-shape is bit-identical to `mergeFrontmatter`'s (same `[[sources/<slug>]]` wikilink form, same Set dedup contract from `frontmatter.ts:484-490`). On a 200-page vault ingest this saves ~200 redundant YAML parses+serializes.

- **Dead `lintStatus*` i18n keys retained after rename (simplify follow-up, F5).** The diff renamed active call sites from `lintStatusReading` / `lintStatusDuplicates` / `lintStatusScanningLinks` to `lintStagePrep` / `lintStageDedup` / `lintStageProgrammatic`; the old keys remained defined in all 10 locales with their old string values. Deleted 30 dead entries (3 keys × 10 locales).

- **Dead `fitIndicatorToContainer` alias export (simplify follow-up, F6).** `src/wiki/turn-indicator.ts:312` re-exported `fitIndicatorToContainer = updateIndicatorTranslation` "to preserve older callers" — but zero callers existed anywhere in `src/`. Dead exports mislead future contributors.

### Added

- **Fine-grained pipeline stage hints in the bottom-right status bar (#169).** The v3 plan moved fine-grained progress (e.g. "Generating summary", "Detecting duplicates", "Reading PDF") from Notice popups to the status bar. The always-visible cancel base label (e.g. "Ingesting… (click to cancel)") stays put — stage labels are ADD-only emission sandwiched between the page name and the base label. Coverage: 7 ingest stages (analyze / summary / entity / concept / retry / save / index), 3 PDF stages (reading / converting / sidecar), 5 lint SCAN stages (prep / programmatic / analyzing / dedup / contradiction). Lint fix-all is unchanged (already dual-channel via `makeMirroredNotice`). 15 new i18n keys across all 10 locales (EN + 9 i18n). NOT ETA per user constraint.

- **EN README banner — official Obsidian authority signal + privacy positioning.** Replaced the generic tagline with a two-line banner surfacing the verified Obsidian Community Plugins "Health Excellent" + "Review Passed" badges ("Obsidian Review Perfect Score") plus a privacy line ("Local-first • No backend • GDPR-Friendly") aimed at EU users concerned about data sovereignty. Synced to all 9 locale READMEs.

- **Comparison table deduplication (12 → 8 rows).** Merged the "Delivery form / Setup effort / Install path" cluster into one row, the "Architecture complexity / Embeddings required" cluster into one row, and the "Retrieval algorithm / Query pipeline" cluster into one row. Same info, more scannable. Synced to all 9 locale READMEs.

- **Star CTA in Quick Start + MinerU online conversion in Ecosystem.** Single-line star reminder at the end of Quick Start (mirrors the AFFiNE/Dify pattern of surfacing the ask at this scroll depth). MinerU online conversion (`mineru.net/OpenSourceTools/Extractor`) added as the FIRST item in the Ecosystem section of all 10 READMEs, with links to the official online service, the self-host GitHub repo, and Issue #376 for future native integration. Synced to all 9 locale READMEs.

- **PDF-OCR-GUIDE.md — MinerU section rewritten with three fixes.** Online service URL corrected from `mineru.net/` root to `mineru.net/OpenSourceTools/Extractor`. Workflow language no longer tells users to drop converted `.md` files into the plugin's auto-generated `sources/` output directory (confirmed via code search in `src/constants.ts:20`, `src/wiki/conversation-ingest.ts:196` that `sources/` is the plugin's output subdirectory, NOT a user input folder). Added a privacy-sensitive self-host path linking to the MinerU GitHub repo and a "Native integration roadmap" note pointing at Issue #376 (reopened as future-consideration).

### Internal

- `src/core/ingest-stages.ts` — new module holding `STAGE_KEYS` (canonical ordered list of all 15 stage key names, `as const` tuple) and the derived `StageKey` union type. Production callers resolve stage labels through the standard `getText()` access pattern.
- `buildIngestStatusBarText` gained an optional 4th `stage` parameter sandwiched between filename and base label. Absent / empty / whitespace = omitted (backward-compatible).
- `appendSourceSlugToFrontmatter` (create-page.ts private helper) handles the source-stamp splice without going through `mergeFrontmatter`'s 4× re-parse path. Original `mergeFrontmatter` unchanged for `merge-page.ts` callers (which need the `updated:` reset + full re-serialization).
- `src/wiki/lint/llm-phases/analysis-phase.ts:140` migrated from `lintStatusAnalyzing` to `lintStageAnalyzing` — closes the v3 plan coverage gap (analysis was the only lint phase still using the old generic key).
- 3 test files added (`src/__tests__/core/ingest-stages.test.ts`, `src/__tests__/core/status-bar.test.ts`, `src/__tests__/root/readme-links.test.ts`).
- 4 agent-driven simplify follow-up (`e02a33d`) audited the entire v1.25.11 PATCH diff with 5 parallel sub-agents (4× simplify angle + 1× code-review max-effort). F1 (indicator `position: relative`) and F7 (false ResizeObserver comment claim) reverted after user e2e showed the `position: relative` change broke indicator layout — needs deeper investigation before retry.

## [1.25.10] - 2026-07-29

### Fixed

- **Mentions section stopped silently truncating pages with empty citation targets (#363).** When the auto-provenance builder wrote a `MentionWithProvenance.source_path: ''` straight through `formatMentionsSection`, the output was `[[|]]`. `BULLET_RE` required a non-empty wikilink target, so the line failed to parse, `computeReingestMentions` returned `preserveRaw`, and the page never accumulated another quote — silently, on every subsequent re-ingest. Measured on a 417-note corpus (9272 writes): 119 frozen pages, 104 of the 144 unparseable lines were empty backlinks. Two coordinated fixes:
  1. `formatMentionsSection` now routes both the quote-bullet branch and the conversation-mode branch through a single `renderCitation(leftPath)` helper. An empty `source_path` emits the bullet without a trailing `— [[…]]` link (the quote is still emitted; the next merge fills the attribution back in from the source being ingested).
  2. `BULLET_RE` in `mentions-parser.ts` makes the citation segment optional and accepts an empty target. Both the legacy `[[|]]` shape already in vaults and the new citation-less shape parse with `source_path: ''`, which `computeReingestMentions` fills from `defaultSourcePath`. The two halves are one fix, not two: shipping only the formatter half would have traded one unparseable shape for another.

  Thanks to **@DocTpoint** for PR #371, whose `renderCitation` single-render-gate design replaces the data-layer `m.source_path || sourcePath` fallback (commit `dedec51`). The render-layer fix preserves the empty value, so a later re-merge can fill it from the real source — strictly more correct than silently rewriting the attribution of an empty-sourcePath mention to the current source's path. Round-trip interlock tests pin the formatter ↔ parser contract so neither half can ship alone again.

- **Ingest-a-folder stopped pulling in sibling files that share a name prefix (#364).** The bare `path.startsWith(folder.path)` leaked three cases: a sibling folder sharing a name prefix (`Notizen` also matched `Notizen-temp/x.md`), a file sitting beside the folder (`Notizen.md` also matched `Notizen`), and the folder itself. New `src/core/folder-scope.ts` exposes `folderScopePrefix(folderPath, isRoot)` and `isInFolderScope(filePath, folderPath, isRoot)` — the helper enforces a trailing-slash boundary and treats the vault root as a wildcard ancestor (root's `path` is `/`, so every path matches). Mutation-tested in 11 cases including `Notizen.md` beside the folder. Thanks to **@DocTpoint** for PR #370.

- **Frontmatter re-touch no longer strips unknown top-level fields (#356).** A previous fix's call to `mergeFrontmatter` accidentally dropped fields the plugin did not author (e.g. `redirect_to:`, custom user fields). Now `extractPassthroughLines` + `replaceOrInsertYamlListField` + `CANONICAL_FRONTMATTER_KEYS` separate the plugin's keys from the user's, and the user's are re-emitted verbatim on every re-touch.

- **Merge triage can no longer drop a page's own primary source on a `skip` judgement (#312 part 2).** A new `isSourceOwnPageLemma({ pageName, pageAliases, sourceBasename, sourceContext })` predicate compares the source basename + curated aliases against the page's basename + `aliases:` frontmatter, in slug comparison form. When the source IS the page's own subject, a `triage.strategy === 'skip'` is overridden to `'merge'` (deliberately narrow: only `skip` is overridden, `complementary` already writes the new facts). `SourceContext` is optional everywhere — lint pipeline callers pass nothing and see no change. A separate route now stamps `contradictedBy:` frontmatter when `strategy === 'contradictory'` (DocTpoint §4), without disturbing the body-rewrite path.

### Performance

- **Lint fix-runners batched by `pageGenerationConcurrency` (#367 P0-1).** The five fix-runners (`runAliasCompletion`, `runDeadLinkFixes`, `runEmptyPageFixes`, `runOrphanFixes`, `runDuplicateMergeFixes`, `runRetagViolations`) now slice their input into batches of `pageGenerationConcurrency` and resolve each batch through `Promise.allSettled` so a single failure never poisons the rest. `concurrency = 1` (the v1.25.9 default) preserves prior behaviour; users who raise it to 4-8 in Settings see wall-clock drop roughly by `(n / concurrency)` on a 2000-page vault. A one-line batch-start log per runner (`[Alias] / [DeadLink] / [EmptyPage] / [Orphan] / [DuplicateMerge] / [Retag] Starting … N items, concurrency=K, batches=M`) makes the parallelism visible in DevTools.

- **Lint analysis cache + smart-skip controllers (#367 P1-1 + P1-2 helpers, not yet wired).** Two new pure helpers, `LintAnalysisCache` (content-hash-keyed store, 1024-entry LRU) and `lint-smart-skip` (`aliasPhaseVerdict` / `dedupPhaseVerdict` / `llmVerdict`), ship as dead code in this release. The controller wire is deferred to v1.26.0 MINOR — the existing `length > 0` guards already provide the equivalent skip semantics, and shipping the helpers without a wiring site means we have a single, focused review surface when the controller lands.

### Changed

- **Slug comparison keys use a Turkish-aware case fold when the vault opts in (#366 phase 1).** A new `slugKeys(name, aliases, { turkishFold })` returns the comparison-key set used by the merge path. With `turkishFold: true`, `İ`/`Ş`/`Ğ`/`Ü`/`Ö`/`Ç` are folded via a single regex + map pass before slugifying — `[[İsim]]` and `[[isim]]` collapse to the same key in Turkish vaults, but file-name outputs stay byte-identical (`computeSlug` is unchanged; the fold is comparison-only). Pure and allocation-cheap; one regex + one `.toLowerCase()`, no chained `.replace`. The companion `migrateOldSlugs` opt-in command is deferred to v1.26.0+ — user opt-in shape needs design discussion.

- **Alias hardening floor lowered from 3 to 2 chars (`MIN_ALIAS_LENGTH = 2`).** Single-character aliases (`a`, `x`, `i`) are still dropped because they collide with shorthand tokens across the entire vault. Two-char aliases are real-world: `ML`, `HD`, `CD`, `AI`, `UI`, `OS`, `DB` for technical vaults, and rejecting them at the floor would be over-aggressive. The constant lives in `src/constants.ts`, not in Settings — see the comment for the rationale.

- **Custom tag vocabulary clarified as a hint, not an enforcement gate (#368).** The plugin's tag lists are LLM guidance; the LLM may pick tags outside the list when the content calls for it (or pick nothing). Schema docs and the Settings UI hint now spell this out in user language. Root cause is a docs / semantic mismatch, not an enforcement bug — `schemaHasTagVocab` defensive check (removed in v1.25.2 PATCH) was the closest thing to an enforcement gate, and it has been gone for two versions.

### Documentation

- 10 READMEs (EN + 9 i18n) — vocabulary bullet rewritten in user-perspective form across the v1.25.x baseline.
- Schema `config.md` — clarification that the custom tag vocabulary is LLM guidance only.

## Tests

- 2713 tests passing (202 files). +91 net since v1.25.9:
  - +11 `folder-scope.test.ts` (prefix derivation + 7 predicate cases, including `Notizen.md` beside the folder)
  - +6 `mentions-formatter-roundtrip.test.ts` (`#363 — empty and absent citations` describe block, including round-trip interlock tests that fail under a formatter-only or parser-only ship)
  - +84 lint fix-runner concurrency tests (5 fix-runners × per-batch-path)
  - −10 net deletions: removed 4 `ingest-folder-boundary` tests and replaced 3 `dedec51` data-layer-fallback tests that were co-dependent on the now-removed behaviour
  - +0 (alias / slug / Turkish / contradicted-marker / frontmatter-strip / merge-route / lint-cache / lint-skip tests were carried over from existing v1.25.x baseline)

---

## [1.25.9] - 2026-07-25

### Changed

- **Re-publish of v1.25.8 PATCH Hotfix.** During the v1.25.8 release flow the GitHub release record was inadvertently deleted while Obsidian's automated community plugin review bot was mid-review, causing the bot to fail the v1.25.8 submission (review is one-shot and cannot be re-triggered for an already-attempted version). v1.25.9 carries the **exact same code as v1.25.8** (no functional changes) and is the version Obsidian's bot will now review on resubmission. See the [v1.25.8 release notes](https://github.com/green-dalii/obsidian-llm-wiki/releases/tag/1.25.8) for the full description.

### Fixed

- `versions.json` had a trailing comma after the last entry (`"0.2.0": "0.15.0",` at line 108), which makes the file invalid JSON per RFC 8259. Strict JSON parsers (Node V24, Python's `json`) reject it; tolerant parsers (older Node) silently accept. The comma was introduced in commit `c572c27` (`chore: bump version to 1.25.8`) — the same release flow that triggered the v1.25.8 Obsidian review failure. Removed the trailing comma.

---

## [1.25.8] - 2026-07-25

### Fixed

- **Test Connection / Language Save / hide() now all flush SecretStorage, not only hide() (v1.25.7 PATCH regression).** When a user switched from Deepseek to MiniMax or OpenRouter via the Settings tab, Fetch Models and Test Connection worked (v1.25.7 PATCH added a `pendingKey` tier to `resolveProviderApiKey` for those flows), but Lint/Query/Ingest failed with 401 "Please carry the API secret key in the 'Authorization' field". Root cause: `commitTempSettings()` wiped the in-memory `tempSettings.apiKey` buffer without flushing to Obsidian SecretStorage — only `hide()` (tab close) did. Test Connection / Language Save / other non-hide() commit paths left SecretStorage holding the **previous provider's key**. The singleton `this.llmClient` rebuilt by `initializeLLMClient()` read the stale key, so subsequent business calls sent the wrong Authorization header.

### Changed

- `commitTempSettings()` now internally calls `flushApiKey()` before wiping + spreading to `plugin.settings`. Returns `boolean`: `false` on SecretStorage IO failure so the caller skips `saveSettings()` (typed key survives for retry, v1.25.4 #339 invariant). Two non-hide() callers (test-connection-section success path, language-section Save button) consume the return the same way.
- Flush-failure branch in test-connection-section: also rolls back `applySettings(oldSettings)` and **persists** it — `testLLMConnection` fires a fire-and-forget `void this.saveSettings()` that captures the typed apiKey as a plaintext reference. Without the explicit overwrite, the pending `saveData()` would persist the typed key into `data.json`, violating the v1.25.3 #182 "no plaintext in data.json" invariant.

## Tests

- 2572 tests passing (193 files). +7 tests and −58 net LOC since v1.25.7: 6 new tests in `settings-commit-flush-api-key.test.ts` exercise the real `LLMWikiSettingTab.commitTempSettings` / `flushApiKey` methods via prototypal construction (no function-mirror — see project [[feedback-tdd-standard]]). 1 mock signature update in `settings-codex-sections.test.ts`.

---

## [1.25.7] - 2026-07-25

### Fixed

- **API key self-restore when switching LLM providers (regression since v1.25.3 #182).** When a user changed the Provider dropdown in Settings, any key typed into the API Key input was silently overwritten on every `tab.display()` re-render with the stale SecretStorage value left over from the previously-active provider. Fetch Models and Test Connection used the same stale key. Two independent fixes:
  1. New `resolveInitialApiKey(tempSettings, secretStorage)` helper in `provider-api-key-resolver.ts` is called from `provider-section.ts` to paint the API Key input — precedence is `tempSettings.apiKey` (in-memory buffer) > SecretStorage > `''`. The previous `load() ?? tempSettings.apiKey` never fell back because SecretStorage always has the last-flushed key (never null), so the user's pending edit was clobbered on every re-render.
  2. `resolveProviderApiKey` gained an optional `pendingKey?: string` 3rd parameter — when non-empty, it wins over both SecretStorage and `settings.apiKey`. Threaded through `testLLMConnection(pendingApiKey?)`, `createLLMClient(settings, ..., secretStorage?, pendingApiKey?)`, `createLLMClientFromSettings{,Sync}(settings, pendingApiKey?)`, and the 2 Settings-UI call sites (`model-section.ts` for Fetch Models, `test-connection-section.ts` for Test Connection). Codex Provider remains fully isolated (separate `karpathywiki-openai-codex` SecretStorage slot; `isCodex` UI branch never renders the regular API Key input).
  **Single-secretId design preserved:** switching providers still overwrites the same `karpathywiki-provider-api-key` slot on tab close (no per-provider slots); the fix honors the in-memory typed key until then. 11 new tests (8 `resolveProviderApiKey` precedence cases + 7 `resolveInitialApiKey` cases + 2 end-to-end integration assertions).

### Performance

- **Dedup prompt cache-stable layout (PR #344 by @DocTpoint).** Two coordinated changes: (1) `resolveEntityDedup` prompt: invariant `{{existing_pages}}` list rendered FIRST, per-call candidate block LAST — local KV prefix cache now reuses the shared prefix across consecutive calls (cold 54s → repeat 1.2s on Gemma-4-26B MoE LM Studio, 520-630 tok/s prefill). (2) `getExistingWikiPages` exposes `ctime`; same-type list sorted by `ctime ascending` so newly-created pages join the rendered list at the end, keeping byte-identical prefix stability for prefix cache invalidation. Recall-neutral by construction (same candidate set, same matching criteria, only ordered differently); decision-neutrality pinned by smoke fixtures.
- **Slim semantic dedup prompt (PR #345 by @DocTpoint).** Two coordinated changes: (1) `buildSystemPrompt('full')` → `buildSystemPrompt('index')` in the dedup call (Wiki Structure only, ~0.7K chars instead of ~7.7K — saves ~2,500 prompt tokens per call). (2) New `selectDedupCandidates(name, summary, sameTypePages)` pure function ranks same-type list with the existing zero-token `localKeywordMatch` and keeps top `DEDUP_CANDIDATE_TOP_K = 30` candidates. Field measurement on 2805-page German medical vault: prompt tokens 660K → 372K = **−44%**. 8 recall fixtures pin 100% recall over both lexical and fallback branches (incl. CJK translation and acronym cases) — recall gate's contract: "raise K or widen fallback, never lower the bar".

### Tests

- 2566 tests passing (192 files). +19 tests since v1.25.6: 3 dedup-prompt-order fixtures (layout + ctime ordering), 9 dedup-candidate-selection fixtures (4 lexical, 4 fallback, 1 token-collapse proof), and 7 API-key switching regression tests (`resolveInitialApiKey` precedence + `resolveProviderApiKey` `pendingKey` precedence).

---

## [1.25.3] - 2026-07-23

### Security

- **Provider API key moved to Obsidian SecretStorage (Issue #182).** API keys no longer live in plain text in `data.json` — the OS keychain (macOS Keychain / Windows Credential Manager / Linux Secret Service) is now the authoritative store. Backward-compatible: existing keys are auto-migrated on first v1.25.3 load; migration failure (locked keychain) retries on restart without data loss.

### Maintenance

- **SecretStorage-backed `ProviderSecretStore` (`src/llm-sdk/provider-secret-store.ts`).** Mirrors the Codex OAuth `CodexCredentialStore` interface; single `secretId` (`karpathywiki-provider-api-key`) shared across all API-key providers. One-time migration marker (`_migrated_v1_25_3_secret_storage`) ensures idempotency.
- **`resolveProviderApiKey` helper (`src/llm-sdk/provider-api-key-resolver.ts`).** Reads SecretStorage first, falls back to `settings.apiKey` for legacy data; try/catch guards against locked keychain at load time. Wired into 7+ call sites (loadSettings, initializeLLMClient, testLLMConnection, fetchModels, provider-section UI, etc.) without drift.
- **Quick Start README updated (EN + 9 i18n).** Steps 3 (Ingest) and 4 (Query wiki) now document both ⌨️ keyboard shortcuts and 🖱️ ribbon toolbar icons, matching the desktop UX. Core commands table and command-palette image added.

### Tests

- 2529 tests passing (188 files). +14 tests since v1.25.2.
- New tests cover: `ProviderSecretStore` load/save/clear/hasKey (78 lines), `resolveProviderApiKey` fallback chain (54 lines), migration idempotency and failure scenarios.

## [1.25.6] - 2026-07-24

### Fixed

- **Bot review `@typescript-eslint/no-unsafe-*` warnings (14) in `loopback-flow.ts`** — non-blocking but bot-enforced. Root cause: `require('node:http')` returns `any` per `@types/node`, propagating through every downstream caller and triggering `no-unsafe-call` / `no-unsafe-assignment` / `no-unsafe-member-access` / `no-unsafe-argument`. v1.25.5's `const http: T = require(...)` type annotation did not satisfy the linter — it inspects expression return types, not annotations. Replaced bare `require()` with the typed Node API `module.createRequire(__filename)` invoked via dynamic `import('node:module')`, eliminating `any` propagation. Bundle-shape test updated to assert `import("node:module")` + `createRequire` instead of the now-absent `require("node:http")` string.
- **`tsconfig.json` types: ["node"]`** added so `createRequire` / `__filename` / `import('node:module')` resolve to `@types/node` declarations.

## [1.25.5] - 2026-07-24

### Fixed

- **Obsidian Bot review compliance — production-side lint now Bot-equivalent (v1.25.4 P0 regression).** Two production files that used `eslint-disable-next-line obsidianmd/*` were rejected by Bot's `no-restricted-disable` hard barrier:
  - `src/llm-sdk/openai-codex/loopback-flow.ts:150` — added `if (!Platform.isDesktop) throw ...` guard at the function start so `obsidianmd/no-nodejs-modules` AST guard-detection pattern recognizes the Node HTTP require as legitimately desktop-only, eliminating the need for any `obsidianmd/*` disable.
  - `src/ui/settings.ts:47-50` — added `getSettingDefinitions()` no-op stub so `obsidianmd/settings-tab/prefer-setting-definitions` recognizes the method exists. Full declarative schema migration deferred to `minAppVersion >= 1.13.0` (Schema Phase 2/3).
  - `eslint.config.mjs` refactored: removed global `eslint-comments/no-restricted-disable: "off"` that was masking the problem locally; test files excluded from lint scope to match Bot's pipeline (Bot inspects only `main.js`). Production files now fully enforce the `obsidianmd/recommended` ruleset that Bot uses.

### Tests

- 2535 tests passing (189 files). No new tests — regression prevented by lint rule changes, not test additions.

## [1.25.4] - 2026-07-24

### Fixed

- **Windows 10 SecretStorage regression (Issue #339).** v1.25.3's two-phase SecretStorage migration could leave both `data.json.apiKey` and OS-keychain entry empty when `setSecret()` failed on a locked Windows Credential Manager. Split the migration into phase 1 (stash + no plaintext wipe) and phase 2 (clear plaintext only after IO success); `flushApiKey()` in the Settings tab now returns a boolean and `hide()` skips `commitTempSettings()` when the SecretStorage write throws, so the user-typed key survives a failed save for retry. Added a "Migrate Secret Storage" command that reads the live key out of SecretStorage and writes it back to `settings.apiKey` as a manual recovery path for the (rare) case where both stores end up empty. Reported and diagnosed by @55charasol5-Charades.

### Security

- **`fast-uri` pinned to 3.1.4 (>= 3.1.4 patches host-confusion via backslash authority delimiter).** `pnpm.overrides` updated; `pnpm audit` reports 0 high vulnerabilities. Co-bumped `brace-expansion` to 5.0.7 to clear the chained ReDoS advisory.

### Maintenance

- **`ProviderSecretStorageError` typed exception (`src/llm-sdk/provider-secret-store.ts`).** All OS keychain platform failures surface as one typed error class; callers can `instanceof`-check without parsing vendor-specific OS messages. `load()` swallows `getSecret` throws and returns `null` (resolver already has a fallback), `save()`/`clear()` rethrow (silent-skip would lose the user-typed key).
- **`flushApiKey()` contract is now `boolean`.** `PluginSettingTab.hide()` consults the return value before calling `commitTempSettings()`. This is the single fragile seam in v1.25.3 — `#339`'s failure mode would have re-appeared whenever a user pasted a key on Win10 and closed the tab.
- **Migration marker `_migrated_v1_25_3_secret_storage` honoured across v1.25.4.** v1.25.3 users with stored SecretStorage entries see no behaviour change; legacy plaintext (left over from v1.25.2 and earlier) migrates on next load with the new phase-1-only-then-phase-2 ordering.

### Tests

- 2535 tests passing (189 files). +6 tests since v1.25.3.
- New tests cover: `flushApiKey()` boolean contract + `hide()` skip-on-failure (3 regression tests for the original failure mode), `ProviderSecretStore` throw-on-demand (`save`/`load`/`clear`), phase 1 stash leaves plaintext untouched + phase 2 clears only after IO success (settings-migrations).

## [1.25.2] - 2026-07-23

### Fixed

- **Tag vocabulary dual-source eliminated (Issue #328 Phase 1).** Active tag enum now injected at runtime by `buildSystemPrompt` — no longer baked into schema body. Legacy vaults sanitized in-memory by `stripLegacyBakedTagEnum()` (idempotent, line-fingerprint based, no on-disk rewrite). Phase 2 (folder registration) and Phase 3 (multi-wiki) remain targeted for v1.26.0 MINOR.
- **Related-link corrector sees folder prefixes (#307 / #324).** The post-write corrector now receives the same folder context as the page generator, fixing the case where it could miss the very prefix it was meant to repair. Thanks @DocTpoint for the diagnosis.
- **Page templates no longer close on a bare `---` (#310 / #329).** Entity/concept page template Markdown no longer triggers Obsidian's editor close-on-`---` shortcut.
- **Halving retry for truncated responses (#305).** Truncated LLM responses are now routed into the existing halving retry path instead of treated as parse failures.
- **Dead-link slug normalization (#308).** Post-write dead-link checker now matches targets against slug-normalized titles and aliases. Closing #308.
- **Pre-write split for created vs updated pages (#290 / #304).** Race between ingest and lint no longer drops or duplicates files that appear in both the new-page and update sets.

### Changed

- **Codex OAuth provider finalized.** PR #273 plus follow-up restoration PR #323 (author credits) + PR #325 (merge). Desktop callback on `127.0.0.1:1455`; mobile device-code login. Tokens stored in Obsidian SecretStorage only.

### Maintenance

- **ESLint 0.4.1 Route A.** `eslint-plugin-obsidianmd` upgraded `0.3.0 → 0.4.1`; production `prefer-create-el × 47` and `prefer-active-doc × 5` resolved; `Window.confirm` replaced with `ConfirmModal` API; flat-config override for test directory.
- **Dead code removed.** `schema-context.ts` (and its 213 LOC of dead tests) deleted — legacy pre-Phase-1 injection helper, superseded by the runtime injection pattern (PR #334).

### Tests

- 2515 tests passing (186 files). +241 tests since v1.25.1.
- New tests cover:
  - Phase-1 contract tests (7 new, 5 retired)
  - `stripLegacyBakedTagEnum` idempotency and edge-case tests
  - Retag dedup tests (PRX / PRX-A2 migration verification)
  - 15 dead-code tests removed alongside `schema-context.ts`


- Added mocked coverage for PKCE and JWT parsing, SecretStorage persistence, browser callback and device-code login, cancellation/timeouts, refresh single-flight and retry boundaries, Codex request normalization/streaming, provider factory/readiness/migration, authentication controls, sign-out recovery, and parity across all 10 locales. No real credentials are used in automated tests.

## [1.25.1] - 2026-07-20

**Theme:** Eight silent-loss bug fixes on the Related-page + Lint + ingest paths, three big-file splits (`wiki-engine.ts` 1799 → 1619 with 657 LOC of pure helpers extracted into `engine-internals/`, `settings.ts` 1439 → 370 with 8 section modules totaling 1183 LOC, `main.ts` 1304 → 300 via mixin pattern), one build-verification root cause (lockfile drift), DiskCache<T> extraction with bounded growth. 2274 tests passing. Recommended upgrade for everyone on v1.25.0.

### Added

- **DiskCache<T> abstraction (`src/core/disk-cache.ts`).** Generic TTL + size-bounded file cache extracted from `PdfConversionCache` so future caches can reuse the eviction + housekeeping discipline (100 MB total / 1000 entries / 10 MB single-entry caps + LRU-by-mtime eviction + `prepareBatchIngest()` wired into `runBatchIngest()`). New test suite (`src/__tests__/core/disk-cache.test.ts`) covers TTL purge, size-cap eviction, batch prepare, and graceful IO failure handling.
- **Section-header-canonicalizer module (`src/core/section-header-canonicalizer.ts`).** Houses `classifyHeader`, `preserveExistingSections`, `canonicalizeSectionHeaders`, and the Levenshtein-based `snapHeaderToCanonical` helpers. `preserveExistingSections` now takes a 4-arg signature `(existingBody, rewrite, canonicalLabels, mentionsLabel)` and strips the Mentions section from BOTH sides before the diff, so an LLM that hallucinates a Mentions block back into a rewrite no longer collides with programmatic injection. 3 new + 60 expanded tests.
- **LM Studio ingest without API key (PR #272, closes the 5f993e6 commit).** Local-only LM Studio (`http://localhost:1234/v1`) now ingests without a placeholder key. Non-LM-Studio providers still require an explicit API key (unchanged).
- **local-no-key-provider helper (`src/core/local-no-key-provider.ts`).** Centralizes the "endpoint is local → key may be omitted" decision so future local-only providers can opt in by config rather than code changes.

### Changed

- **Big-file splits (Phase C, ~PR #309 / #311 / #313).** Three of the project's largest files were broken into focused modules:
  - `src/wiki/wiki-engine.ts` 1799 → 1619 LOC (runBatchedWithRetry + 4 helpers extracted into `engine-internals/` totaling 657 LOC; the heavy `ingestSource` / `ingestPdfSource` orchestration stayed put). Page-batch-runner extracted as a generic helper (4 new tests + 314 LOC of new tests covering dedup sequencing, retry-on-timeout, and progress notification).
  - `src/ui/settings.ts` 1439 → 357 LOC, with 8 section renderers in `src/ui/settings-sections/{language,status,provider,model,advanced,test-connection,wiki-config,auto-maintain}-section.ts`. Settings tab now composes a renderer for each section.
  - `src/main.ts` 1304 → 300 LOC, with 6 `main-commands/` modules (command-registry, connection-commands, ingest-commands, pdf-cache-commands, query-lint-commands, schema-commands) wired together via the existing `registerCommand` API. Mixin pattern (PR #313): `Object.assign(prototype)` + interface merge preserves the `plugin.method()` test surface; cross-mixin refs use `?:` + `!`; circular dep resolved via `core/create-plugin-llm-client.ts`.
- **`related-page` no longer persists raw LLM output (PR #288, closes #287).** The Related-page path now mirrors the merge path through `canonicalizeSectionHeaders` → `correctRelatedLinkPrefixes` → `preserveExistingSections`. Pre-fix: only the canonicalizer ran, and the post-processed body was discarded — so re-ingest could silently destroy Mentions content if the LLM didn't re-emit it.
- **AI-SDK runtime deps pinned (no caret).** `@ai-sdk/anthropic 3.0.98`, `@ai-sdk/openai 3.0.86`, `@ai-sdk/openai-compatible 2.0.62`, `ai 6.0.230` — all exact-pinned in `package.json` so future `pnpm install` doesn't float the resolved version. `pnpm-lock.yaml` and `package-lock.json` are now regenerated from a single `node_modules` snapshot to keep local build and Obsidian's CI build byte-identical.
- **Node 24 + AI-SDK patches pinned via `.nvmrc` + `.npmrc` (PR #301).** Project declares Node 24 as the supported development runtime (matches Obsidian CI), keeps the AI-SDK patches via `pnpm.overrides` for `fast-uri` / `brace-expansion`, and centralizes registry / strict-peer-deps behavior in a project-local `.npmrc`.
- **`DiskCache<T>` ledger optimization (`src/core/disk-cache.ts`).** Cache-key listing no longer walks the directory twice on the hot path (one `readdirSync` + sorted-mtime eviction).

### Fixed

- **Silent Mentions loss on Related re-ingest (PR #288, closes #287).** When a Related page was re-ingested, the post-canonicalize / post-link-correction body was discarded — only `cleanMarkdownResponse(updatedBody)` reached `preserveExistingSections`. If the LLM's rewrite didn't re-emit the Mentions section, accumulated per-source Mentions were silently destroyed. The fix threads the post-processed body all the way through, mirroring merge-page.
- **Schema sections dropped by LLM rewrites (PR #302, closes #292).** Pre-fix, when the LLM rewrote a merge / related body and omitted a canonical section that already existed on the page (e.g. `## Related Entities` rewritten away), the section was lost from the on-disk file. `preserveExistingSections` now restores any canonical section that carried content before the rewrite and is wholly absent from it. Falls inside a single helper shared across merge + related paths. New tests cover the 3-section-strip / 1-section-strip / no-strip / already-present cases.
- **Legacy Mentions pages unparseable on first re-ingest (PR #303, closes #289).** Pre-#244 grouped Mentions bodies (one group per source, with `<mention>...</mention>` wrapped quotes) were silently discarded by `parsed.mentions_in_source` — meaning any legacy page that had never been re-ingested post-#244 had its accumulated Mentions ignored until manual intervention. New `LEGACY_GROUP_RE` + `LEGACY_QUOTE_RE` + `BULLET_RE` detect the legacy shape and parse it into structured Mentions on first re-ingest. 3 new regression tests pin the contract.
- **Stuck "Ingesting: <basename>" Notice on throw.** Both `selectSourceToIngest` and `ingestActiveFile` `.catch` blocks now call `this.dismissProgress()` after showing the error Notice. Pre-fix: a throw from network / vault IO / unexpected path left the progress Notice on screen until the next successful ingest.
- **LM Studio failed ingest with placeholder key (PR #272).** LM Studio rejects any API key but the pre-fix gate required one. Local-no-key-provider gate now lists `lmstudio` (and a manual override for any user-declared `localOnly` provider) so the provider can come up without a key.
- **"Other LLM client bugs"-class false positives in the PDF error classifier (`isPdfRelatedLlmError` follow-up #3).** The initial implementation substring-matched on `'pdf'` alone; transient 413 size-limit errors and Rust-serde schema rejects ("unknown variant `file`") were being misreported as "provider doesn't support PDF". Tightened to require BOTH a rejection verb AND a PDF/media marker. 6 new regression tests pin the contract — 2 happy-path + 4 false-positive guards.
- **Build verification root cause (PR #301, follow-up to the v1.25.0 npm-registry swap).** The v1.25.0 swap from `npmmirror` → `npmjs` was necessary but not sufficient; the real cause of inconsistent `main.js` artifacts between local and Obsidian CI was `pnpm-lock.yaml` ↔ `package-lock.json` drift. Both lockfiles are now regenerated from a single `node_modules` snapshot (no isolated-dir `--package-lock-only` race).

### Tests

- 2274 tests passing (173 files). +92 tests since v1.25.0.
- New tests cover:
  - 30+ DiskCache<T> tests (TTL purge, size-cap eviction, batch prepare, IO failure handling)
  - 60+ section-header-canonicalizer tests (preserveExistingSections 4-arg signature, Mentions strip on both sides, classifyHeader whitespace trim)
  - 314 LOC of page-batch-runner tests (dedup sequencing, retry-on-timeout, progress notification)
  - 6 PDF error classifier regression tests (happy-path + 413/5xx/null-deref/generic-invalid guards)
  - 3 LM Studio ingest tests (with / without key, default behavior preserved for non-LM-Studio)
  - 6 legacy Mentions parser tests (legacy grouped shape detected, structured shape preserved, mixed legacy+structured)

## [1.25.0] - 2026-07-18

**Theme:** Cache-only PDF Ingest (Level 1) with provider gate + content-hash cache + bounded growth; prompt centralization for the PDF transcriber; status-bar cancellation via Vercel AI SDK v6 AbortSignal; local model guidance with Apple Silicon OCR path (oMLX + Markitdown + Baidu Unlimited-OCR). 2182 tests passing (165 files). Recommended upgrade for everyone on v1.24.x.

### Added

- **PDF Ingest (Level 1).** Pick a PDF from your vault — the plugin reads it through your LLM provider's native file input (anthropic / openai / bedrock-anthropic / bedrock-openai natively; any other OpenAI/Anthropic-compatible endpoint via **Force PDF Support** in Settings → LLM Configuration → Advanced), converts it to Markdown via an OCR-style verbatim transcriber prompt with `[illegible]` / `[figure: ...]` / `[equation: ...]` anti-hallucination markers, and re-enters the regular Markdown ingest pipeline. Every existing entity / concept / alias / `[[wiki-link]]` workflow applies unchanged. The result is **content-hash cached** in `.obsidian/plugins/karpathywiki/pdf-cache/`; the cache key embeds `converterVersion` so prompt upgrades invalidate stale entries automatically.
- **Bounded cache growth.** Three-defense-layer cache housekeeping: single-entry cap (10 MB) pre-write, LRU-by-mtime eviction (100 MB total / 1000 entries) post-write, and `prepareBatchIngest()` (TTL purge + size enforce) wired into `runBatchIngest()` via `preparePdfCacheForBatchIngest()`. Cache only by default — your vault is not modified.
- **Optional vault sidecar.** Settings → Wiki Configuration → Wiki Folder → **Write PDF Markdown to Vault** writes a `<basename>.pdf.md` sidecar next to the source PDF after conversion. Off by default (cache-only). This is the only user-visible opt-in that touches the vault.
- **Universal Force PDF Support escape hatch.** Any non-native provider (custom, anthropic-compatible, ollama, lmstudio, deepseek, kimi, glm, etc.) can attempt PDF conversion when the toggle is on. The endpoint decides; failures surface as a localized `sourceRejectedPdfUnsupported` Notice guiding the user to disable the toggle or switch provider. The trust boundary is the user — your endpoint either accepts PDF or it doesn't; the toggle tells us to ask it. Switching the provider to a NATIVE one (anthropic / openai / bedrock-*) auto-resets the toggle to `false`.
- **Local PDF OCR path on Apple Silicon.** Documented end-to-end recommended setup for fully-local PDF ingestion: [oMLX](https://github.com/jundot/omlx) + Markitdown backend + Baidu Unlimited-OCR (open-sourced 2026-06-22, 3B total / 0.5B active, end-to-end OCR that solves the "slower the longer it generates" failure mode of older OCR models on long documents). Provider: **Custom OpenAI-Compatible** pointing at oMLX's local server with Force PDF Support on. PDF never leaves the machine.
- **Cancellable PDF ingest.** Clicking the status bar mid-conversion aborts the in-flight LLM call through Vercel AI SDK v6 AbortSignal in ~200 ms. Both `.catch` handlers (`selectSourceToIngest` and `ingestActiveFile`) now call `dismissProgress()` so the persistent "Ingesting: <basename>" Notice clears on throw.
- **Local model recommendations.** Dedicated `### 🦙 Local Model Recommendations (Ollama / LM Studio)` H3 in the Model Selection Guide, covering Qwen3.5 (27B / 35B-A3B / 122B-A10B), Qwen3.6 (27B with 256K+ context / 35B-A3B), Gemma 4 (E2B / E4B / 26B-A4B / 31B), with parameter-vs-quality tradeoff guidance, MLX-vs-GGUF quantization notes, and a context-strategy block. **All 10 locales.**
- **New Cloud Model Picks H3** in the Model Selection Guide, separating the cloud-vs-local sections explicitly. **All 10 locales.**
- **PDF transcriber prompt centralized.** `src/wiki/prompts/pdf.ts` houses `PDF_CONVERSION_SYSTEM_PROMPT` (rewritten as OCR-style verbatim transcriber) plus `unwrapFencedMarkdown()` cleanup helper (strips ` ```markdown ` / ` ``` ` / `<output>` wrappers that small/local models still produce despite instructions). Re-exported via the existing `src/prompts.ts` barrel — PDF was the last LLM-call site to be folded into the project's prompt barrel.
- **PDF error classifier (`isPdfRelatedLlmError`).** Routes obvious PDF-rejection errors (rejection verb + PDF/media marker) to a localized `sourceRejectedPdfUnsupported` Notice. Tightened after the initial implementation: requires BOTH a rejection verb (`reject` / `not support` / `unsupported` / `invalid` / `not allowed`) AND a PDF/media marker (`pdf` / `application/pdf` / `file part` / `mediatype`). Pre-fix classifier substring-matched on `'pdf'` alone, causing transient 413 size-limit errors and Rust-serde "unknown variant `file`" schema rejects (no `pdf` keyword) to be misreported.
- **Three-defense-layer cache filename safety.** Physical filename on disk is `sha256(logicalKey).slice(0, 16)` (Git short-hash style); the logical key retains `sha256:model:converterVersion` semantics; the converter hashes via new `hashCacheKey()` helper before `cache.get/set`. Fixes Windows `ERROR_INVALID_NAME` + POSIX unintended subpath when model contains `/` or `:`.
- **PDF cache directory auto-creation.** `PdfConversionCache.ensureCacheDir()` walks path segments before `mkdir`. Obsidian's adapter does NOT auto-create parent directories, which left cache writes silently failing in fresh vaults.

### Changed

- **Default behavior preserved.** No breaking changes since v1.0.0. Old `data.json` without the new settings fields defaults to `false`, preserving cache-only behavior. The previously-planned sidecar-by-default approach was withdrawn in favor of cache-only before v1.25.0 ships (architecture pivot documented in `project_v1.25.0_pdf_cache_only`).
- **PDF dispatch lives in `wiki-engine.ts`.** The separate `pdf-ingest-orchestrator.ts` file was deleted; `ingestPdfSource` now feeds `convertPdfToMarkdown` result into `analyzeSource` via `IngestOptions.contentOverride`, reusing the existing Markdown ingest pipeline.
- **5 dead i18n keys removed** across all 10 locales (old "PDF orchestrator" + sidecar-default language).
- **`LLMClient.createMessage` gained `abortSignal?: AbortSignal`** as an optional parameter. Existing client implementations ignore unknown params (graceful degradation); the project ships a passing thread.

### Fixed

- **ENOENT cache dir (Bug A).** Obsidian adapter doesn't auto-create parent directories. `ensureCacheDir()` walks segments before mkdir.
- **AI-SDK cause chain (Bug B).** Vercel AI SDK v6 wraps provider rejections inside `error.cause.message`. The pre-fix `isPdfRelatedLlmError` classifier inspected only `error.message` and missed the rejection phrase. `inspectCauseChain()` walks the cause chain up to 4 levels with cycle protection; classifiers consult both layers. Now also extended to detect Rust-serde schema rejects ("unknown variant `file`, expected `text`") which lack any `pdf` keyword.
- **Stuck "Ingesting: <basename>" Notice (Bug H).** When an interactive single-file ingest threw (network / vault IO / unexpected error), the persistent progress Notice stayed on screen until the next ingest. Both `.catch` blocks (`selectSourceToIngest` line 645, `ingestActiveFile` line 671) now call `this.dismissProgress()` after showing the error Notice.
- **Status bar didn't mirror Notice (Bug C).** Clicking the status bar during PDF conversion didn't update text — fixed via double-callback pattern (Notice channel + text mirror in `onProgress` closure).
- **PDF mid-flow cancel ineffective (Bug D).** Two-layered bug: setup block re-initialized on re-entry overwrote AbortController, AND `convertPdfToMarkdown` didn't thread AbortSignal to the LLM call. Fixed with idempotency guard in `wiki-engine.ingestSource` (`if (this.abortController === null)`) + abortSignal threading through `PdfConversionContext`.
- **pdf-cache never written (Bug E).** Same root cause as Bug A but in the cache write path. `ensureCacheDir()` fix covers both directions.
- **Classifier false-positive guards (PR3 follow-up #3).** 6 new tests pin the contract — 2 happy-path (route to skip) + 4 false-positive guards (413 / 5xx / null-deref / generic-invalid → re-throw).
- **Markdown wrapper contamination in PDF output.** Some local / small models (Qwen3.5-2B-MLX-4bit, Llama 3 8B Instruct, etc.) wrap their PDF-conversion response in ```markdown ... ``` fences despite the system prompt forbidding them. `unwrapFencedMarkdown()` heuristic cleaner strips BOM → outermost ` ```markdown ` → outermost ` ``` ` → `<output>` → leading "Here is the converted Markdown:" preamble. Internal ```python ... ``` blocks survive (regex is single-fence, outermost-only).

### Tests

- 2182 tests passing (165 files). +102 tests since v1.24.1.
- New tests cover:
  - 30+ PDF ingest end-to-end tests (provider gate, cache hit/miss, settings defaults, sidecar create/update, forcePdfSupport toggle, classifier, cause chain walking, status bar, cancel-mid-PDF)
  - 20 prompt invariant + unwrap helper tests (`src/__tests__/wiki/prompts/pdf.test.ts`)
  - 6 PDF error classifier regression tests (happy-path + 413/5xx/null-deref/generic-invalid guards)
  - 3 Bug D lifecycle tests (idempotency guard, AbortSignal propagation, dismiss on throw)

## [1.24.1] - 2026-07-14

**Theme:** 5-stage PPR seed-selection cascade, empty-response quiet path, cleaner entity pages, Bedrock Stage 1, LM Studio no-key ingest, page-factory split, non-lossy Mentions re-ingest. 2080 tests passing. Recommended upgrade for all v1.24.0 users.

### Added

- **5-stage PPR seed-selection cascade (PR #281).** Query Wiki now composes context through five complementary stages before generation: (1) lex fast path over entity/concept titles and aliases; (2) LLM keyword generation for synonyms, abbreviations, and token-overlap-resistant terms; (3) local substring scan of generated keywords across titles, aliases, and body snippets; (4) LLM KB fallback that re-seeds top-N candidates semantically when earlier stages are weak; (5) Personalized PageRank (Haveliwala 2002) over the `[[wiki-link]]` graph starting from the seed set. The cascade auto-truncates at the stage that returns enough signal — no fixed 5-step cost, no LLM calls when lex suffices, no precision loss when augmentation is needed. Project benchmark: PPR @5 = 27.1% vs pure knn baseline 24.1%, zero embedding opt-in.
- **Bedrock Stage 1 providers (PR #277/280).** Added `bedrock-anthropic` and `bedrock-openai` provider options routed through the AWS `bedrock-mantle.<region>.api.aws` endpoint. Region selector defaults to `us-east-1`. Zero new npm dependencies; bundle delta ~+3 KB. Stage 2/3 (bearer-only `@ai-sdk/amazon-bedrock`, SSO/profile) remain deferred pending demand.
- **99 new page-factory module tests (PR #276).** Split `src/wiki/page-factory.ts` (1252 LOC) into 10 focused modules (`aliases.ts`, `complementary-appends.ts`, `contextualize.ts`, `create-page.ts`, `index.ts`, `mentions-integration.ts`, `merge-page.ts`, `merge-triage.ts`, `path-resolution.ts`, `related-page.ts`) with dedicated unit-test files.

### Changed

- **Consolidated the two "reviewed" protection mechanisms (#244 follow-up, PR #283).** Removed the body-level HTML-comment marker (v1.24.0) that protected only a page's `## Mentions in Source` section. Protection is now driven solely by frontmatter `reviewed: true`, which already guards the whole page via the minimal-append path — Properties-panel-visible and stable under Markdown linters, unlike the hidden body marker. `injectMentionsSection` takes a `pageIsReviewed` flag (set on the reviewed-page write path) and returns the body untouched when set.
- **Tier C welcome-note recreate bypass (PR #271).** `recreateWelcomeNote` command and `ensureWelcomeNote` now accept `forceRecreate: true`, bypassing the Tier C short-circuit that previously caused a misleading German "LLM configuration" Notice when users explicitly asked to rebuild the welcome note.

### Fixed

- **Non-lossy Mentions re-ingest (#267, PR #269/272).** On a merge, `assembleFinalContent` previously re-emitted the `## Mentions in Source` section from only the new source's mentions, dropping every earlier source's accumulated mentions (regression from #244; affected `triage=skip`, `triage=complementary`, and the body-merge path). The merge now parses the existing page's mentions and unions them with the new source's (composite `(quote, source_path)` dedup key) before injecting; a fail-safe preserves a hand-edited section verbatim rather than risk dropping curated quotes.
- **Empty-response quiet path (PR #282).** `parseJsonResponse` gained `silentOnEmpty` / `throwOnEmpty` options. Lint batch callers (`source-analyzer`, `fix-runners` alias/tag paths, `merge-duplicates`) and the seed selector now suppress noisy console errors for empty LLM bodies while still propagating failures where needed. Closes #255 (Lint console errors) and #274 (Ollama Qwen3.5:9b empty body). Seed selector throws `EmptyResponseError` on empty body as defense-in-depth for #275.
- **Redundant `## Basic Information` block in entity pages (PR #283).** Five independent code paths (generation prompt, merge prompts for entity + concept, default schema, canonical schema fallback, lint section-labels hint) all declared "Basic Information" as the first entity section, causing the LLM to occasionally emit a duplicate-info block. Removed the section from all five locations; new entity pages now go frontmatter → H1 → description → related sections. Closes #258. Existing pages are not migrated.
- **LM Studio no-key ingest (PR #269/272).** `initializeLLMClient`, `llmReady`, and `testLLMConnection` now treat LM Studio like Ollama for the API-key gate, so ingestion works with an empty API key (matching Test Connection behavior).
- **Settings unified↔per-task cascade (post-#281 e2e).** Fixed three edge cases where toggling Model Scope or editing per-task model fields could leave `tempSettings` and committed `settings` out of sync, causing the UI to show stale values after save.
- **`load-pages` `.md` suffix defense (post-#281 e2e).** Normalized path handling so wiki-page paths with or without `.md` suffix resolve consistently during seed-selection context loading.
- **Streaming-chunk debug cleanup (post-#281 e2e).** Removed a stray `console.debug` in `openai-compat-sdk-client.ts` streaming path that emitted per-chunk noise during Query Wiki streaming.

### Maintenance

- 2080 tests passing (158 test files). +255 tests since v1.24.0.
- 5 new i18n keys × 10 locales for Bedrock provider labels, region selector, API-key hint, help URL, and test-connection hint.
- 7 new tests for redundant Basic Information regression (#283).

## [1.24.0] - 2026-07-10

**Theme:** Per-task model routing, custom query instructions, four monolith splits, source-note aliases, frontmatter write repair. 1825 tests passing. Recommended upgrade for everyone on v1.23.x.

### Added

- **Per-task Models (#208).** Three independent settings (`ingestModel`, `lintModel`, `queryModel`) on top of the existing `model`. Switch via *Settings → Wiki → Model Scope* dropdown: **Unified** (one model for all tasks) or **Per-Task** (independent choice per ingest / lint / query). Empty per-task field falls back to `settings.model`, so existing v1.23.x data.json continues to work bit-identically. New `core/model-resolver.ts` (`resolveModelForTask(settings, task)`) is the single decision point used by all 28 LLM call sites; `ui/settings-per-task-helpers.ts` owns the UI-scope logic (mode resolution, displayed-model computation, preserve-on-toggle). Each picker uses a sentinel `__custom__` ("Custom input…") — leaving the text input blank means "use unified model", matching the original picker behavior.
- **Test Connection multi-probe (#208).** When `usePerTaskModels === true`, the **Test Connection** button now probes each configured model sequentially (ingest → lint → query) with fail-fast — until every per-task model passes, the connection is considered unhealthy. Console logs include `[testLLMConnection] probe plan: ingest=…, lint=…, query=…` for verification.
- **Custom Query Instructions (#251, `jameses-cyber`).** Collapsible `<details>` panel inside the Query Wiki view, between the prompt and the history list. Appends user-supplied instructions to the system prompt at the three Query Wiki send sites (streaming, non-stream fallback, non-stream main). 5000-character defensive cap (centralised `CUSTOM_QUERY_INSTRUCTIONS_MAX_CHARS`). Strictly scoped to Query Wiki chat — ingest, lint, page generation, save-to-wiki evaluation, duplicate merge, and seed selection are intentionally unaffected. Persisted as `customQueryInstructions?: string` in data.json. Modes dropdown (Default / Research / Exact Facts / Commitments) + per-conversation override planned for v1.25.0+. Initial UI review used *Settings → Query Wiki*; shipped UI is the Query-local panel per user review.
- **First-query PPR warmup.** Engine-level `_cachedGraph` (`WikiEngine.getOrBuildGraph(allPaths)`) loaded once on first query, invalidates on `wikiFolder` change or `invalidatePageCaches`. First query now uses Personalized PageRank instead of falling back to lex-only on cold start. `QueryView.invalidateGraph()` delegates to the engine.
- **`fundingUrl` in manifest.** Adds `"fundingUrl": "https://ko-fi.com/greenerdalii"` to `manifest.json` per [Obsidian manifest spec](https://docs.obsidian.md/Reference/Manifest#fundingUrl). Optional field; Obsidian-side display depends on Community Plugin UI surfacing.

### Changed

- **`modals.ts` 1008-LOC split into directory (PR #257, `4b65450`).** `src/ui/modals.ts` → `src/ui/modals/` with 7 focused files. External API unchanged (barrel `index.ts` re-exports). Required after the v1.23.0 P2 modals feature set pushed the file past the 1000-LOC threshold.
- **`controller.ts` `runLintWiki` god function split into 3 phase modules (PR #248, `ef44a58`).** `src/wiki/lint/controller.ts:runLintWiki` (was a monolithic 200+ LOC function) decomposed into Phases A/B/C (`src/wiki/lint/llm-phases/analysis-phase.ts`, `src/wiki/lint/llm-phases/scoring-phase.ts`, `src/wiki/lint/llm-phases/synthesis-phase.ts`). The orchestrator now delegates: analysis → scoring → synthesis.
- **`history-modal.ts` 1579-LOC single file split into directory (PR #249, `fe273a4`).** `src/ui/history-modal.ts` → `src/ui/history-modal/` with 14 files (~250 LOC each max): `types.ts`, `render-state.ts`, `HistoryModal-class.ts`, 9 renderer modules under `src/ui/history-modal/renderers/`, and an `index.ts` re-export shim. External API (`HistoryModal` class, `TEXTS`-based `HistoryTexts`) unchanged. Zero caller-side changes required. 1610 tests passing.
- **`query-engine.ts` 1373-LOC monolith split into directory (PR #250, `3ff0cc6`).** `src/wiki/query-engine.ts` → 15 focused modules under `src/wiki/query-engine/`. `QueryView.buildWikiContext` (was 165 LOC inline) decomposes into 4 pure pipeline phases (`read-index`, `load-pages`, `assemble-context`, `seed-selector`). External API (`QueryView`, `VIEW_TYPE_QUERY`, `renderThinkingBlocksUI`) unchanged via TypeScript directory resolution. 1616 tests passing.
- **28 LLM call sites wired through `resolveModelForTask` (#208, `e96568e`).** Sourced via *Sliced change-by-change* across 11 production files: ingest (14 — `source-analyzer`, `page-factory` × 7, `conversation-ingest` × 4, `wiki-engine.createSummaryPage`, `schema-manager`, `auto-maintain` × 2), lint (9 — `analysis-phase`, `dedup-phase`, `fill-empty-page`, `fix-dead-link` × 2, `fix-runners` × 2, `link-orphan`, `merge-duplicates`, `contradictions`), query (5 — `QueryView` × 3 send sites + `save-eval`, `seed-selector`). Five `settings.model` direct reads intentionally preserved: Test Connection probe plan, 2 log metadata, console.debug, empty-model pre-flight. E2E observability: 6 `console.debug` lines show the resolved model at each major call site.
- **Source-note aliases propagation (#185, `c0f0bc0`).** Frontmatter `aliases:` from source notes now propagates into generated `sources/<slug>` page frontmatter, so downstream `[[wiki-link]]` matching and alias-aware search reach every quote. Reduces "DSA ≠ DeepSeek-Sparse-Attention" type misses on cross-language aliases.
- **Tier-1 + Tier-2 merge triage (#216, `b7bf5f0`, `DocTpoint`).** Classify-then-route duplicate-bypass decision: spurious Tier-1 candidates are skipped outright; Tier-2 runs only on the remainder. Reduces Lint merge batch size without sacrificing high-precision matches.

### Fixed

- **Frontmatter write repair (4 user-reported bugs, `1d943ea`).** `aliases:[]` no longer falsely passes the alias-deficiency lint check; duplicate aliases are collapsed on write via the new `replaceFrontmatterArrayField` helper; block-style frontmatter is preserved (no longer flattened to inline) via the new `mergeFrontmatterArrayField` helper; write failures are now logged with the offending field name. Affects Smart Fix and merge paths.
- **Empty-line / trailing-blank-line fix for `## 相关实体` / `## 相关概念` sections (PR #260, `9793efd`).** Tier-2 per-section append normalized to use a single blank-line separator; previously produced double-blank or zero-blank depending on the input.
- **`wikiFolder` change propagation (`1d943ea`, `8d5baf3`).** `saveSettings` now invalidates the QueryView graph cache and WikiEngine pagesCache when `wikiFolder` changes; `updateSettings` drops the path-keyed caches on `wikiFolder` change. Stale history migration Notice explains that pre-v1.24.0 query history keeps its old folder paths (clearing history remains the escape hatch).
- **Retrieval label human-readable + persistence (#221 follow-up, `b46f7b1` / `81813ae`).** Retrieval-label text now reads "Found N page(s)" instead of the internal cache key; label is persisted across view re-open.

### Maintenance

- 1825 tests passing (132 test files). 81 tests added during the v1.24.0 cycle.
- 5 new i18n keys × 10 locales for the per-task model pickers + Model Scope dropdown + Test Connection labels.
- 8 new i18n keys × 10 locales for the Custom Query Instructions collapsible panel.



## [1.23.2] - 2026-07-05

**Theme:** Five merged PRs — bug fixes, refactor, and UX polish. 1431 tests passing. No new user-facing settings. Recommended upgrade for everyone on v1.23.0+.

### Added

- **Semantic progress notification module (#219).** New `core/progress-notification.ts` with `decideProgressDisplay(scope, isLong, hasUserAction)`. Manual operations show Notice + status bar; background operations (watch-mode auto-ingest, periodic lint, startup QuickFixes) show status bar only. Channel selection is derived from operation semantics — no user-facing setting.
- **Query turn indicator (#221).** Right-edge vertical dots, one per conversation turn. IntersectionObserver highlights the currently visible turn; clicking a dot scrolls that turn's question to the top via `scrollIntoView({ block: 'start' })`. Hover reveals the original question text in a tooltip.
- **Retrieval label click-to-expand.** The `🔍 N page(s) · …` label below each assistant response is now clickable — clicking toggles an inline panel listing the retrieved pages (no Notice popup).
- **Section header canonicalizer (DocTpoint, PR #241).** `core/section-header-canonicalizer.ts` uses bounded Levenshtein distance to snap LLM-garbled section headers (e.g. `Erwägungen…` → `Erwähnungen in der Quelle`) back to canonical labels on write. Eliminates silent drop from Tier-B retrieval in `wikiLanguage: de` clean re-ingest runs.
- **Dynamic lint/fix status bar.** `wikiEngine.updateStatusBar()` is now wired to the real Obsidian status bar element. Fix-runners' per-file progress messages (e.g. `[3/10] fixing: file.md`) reach the status bar during manual lint, watch-mode auto-ingest, and Smart Fix All.

### Changed

- **`wrapWithAdvancedSettings` refactor.** Replaced `.bind()` + in-place mutation with composition (`Object.create(client)` + explicit `createMessage` override). Preserves prototype chain — class-based SDK clients no longer fall back to non-streaming because spread `{ ...client }` dropped `createMessageStream` from the prototype.
- **`buildPagesListForPrompt` sources-filter (#234).** Adds `{ excludeSources: true }` default option. The LLM candidate list no longer includes `wiki/sources/` pages — weaker local models no longer emit fuzzy-mismatched `[[sources/<wrong-slug>|<correct-label>]]` links that route RAG to the wrong page. `getExistingWikiPages` is unchanged for programmatic related-page matching. Constraints prompt now cross-references the candidate list explicitly.
- **Frontmatter serializer consolidation (DocTpoint, PR #238).** `mergeFrontmatter` / `enforceFrontmatterConstraints` / `mergeDuplicatePages` delegate to a single `serializeFrontmatter` writer. Behavior unchanged (YAML-equivalent), but new fields like the upcoming `supersedes:` flag (v1.24.0) only need to be threaded through one place.
- **Lint completion Notices now respect TTLs.** All `run*Fixes` completion Notices and the lintWikiFailed Notice now use `NOTICE_NORMAL` (5s) / `NOTICE_ERROR` (8s) instead of `new Notice(msg, 0)`. The schema restore-hint Notice uses `NOTICE_RATE_LIMIT` (10s). Pure progress Notices (`new Notice('', 0)`) keep their zero-timeout because they have explicit `hide()` paths.
- **License upgrade to Apache 2.0 + DCO.** Per the v1.23.1 prep PR. NOTICE file lists all 6 human code contributors alphabetically. CONTRIBUTING.md includes a License & DCO section. Existing contributions are not retroactively affected; future commits must include `Signed-off-by:`.

### Fixed

- **Live PPR graph cache invalidation on ingest.** Any ingest that touches `wiki/` now invalidates the cached PPR graph in every open Query panel — ingests in the same Obsidian session are finally visible to follow-up queries. Implementation: `QueryView.invalidateGraph()` walks `getLeavesOfType(VIEW_TYPE_QUERY)` from `main.ts.onIngestDoneDispatch`.
- **Streaming regression in v1.23.0-era wrapper.** Class-based SDK clients (`OpenAICompatSdkClient`, `AnthropicSdkClient`, `OpenAISdkClient`) were silently falling back to non-streaming because spread `{ ...client }` dropped prototype methods. Replaced with `Object.create(client)` + explicit `createMessage` override to preserve the prototype chain.

## [1.23.0] - 2026-07-02

**Theme:** Replace the brittle hand-rolled LLM client (v1.22.x 1625-LOC `llm-client.ts` with 30+ provider-version workarounds accumulated since v1.20.0) with Vercel AI-SDK v6, then ship the Graph Engine PPR primitive on top. Biggest architectural change since 1.0.

**Branch state:** `refactor/v1.23.0-ai-sdk-migration` (38 commits ahead of main, **1376 tests passing**, 3.17 MB bundle). Folds in the v1.22.6 hotfix series and P2-4 PPR tuning.

### Added

- **Vercel AI-SDK v6 migration (P1-7).** Replaced hand-rolled `OpenAICompatibleClient` / `AnthropicClient` / `AnthropicCompatibleClient` (1625 LOC) with `@ai-sdk/openai@3` / `@ai-sdk/anthropic@3` / `@ai-sdk/openai-compatible@2` / `ai@6`. New `src/llm-sdk/` (5 files, 1421 LOC: `openai-sdk-client.ts` 455 LOC, `anthropic-sdk-client.ts` 300 LOC, `openai-compat-sdk-client.ts` 449 LOC, `token-key-probe.ts` 70 LOC, `create-llm-client.ts` 151 LOC). `src/core/obsidian-fetch-bridge.ts` (326 LOC) provides activeDocument-aware fetch for jsdom. Deleted 8 old test files (2609 LOC). **Eliminates the entire class of provider-version regressions** (#137 / #141 / #143 / #147 / #207).
- **Graph Engine (Issue #198).** Personalized PageRank over `[[wiki-link]]` graph — closes #117 (Query Wiki relevance), #157 (hub detection), #175 (link distinctiveness) with one primitive. `core/monte-carlo-ppr.ts` (Fogaras 2005 MC-PPR, 99 LOC) performs K short random walks per query page at O(K×L) cost independent of |V|. `core/ppr-cascade.ts` (213 LOC) orchestrates three-tier pipeline (lex fast path → LLM seeds → PPR walks). `core/section-extractor.ts` (Tier B zero-LLM, 173 LOC). `core/hub-detection.ts` (134 LOC). `core/build-graph.ts` (wiki-link graph builder, 13 unit tests).
- **Query Wiki three-tier pipeline (P1-5).** Lex fast path → LLM seed selection (only when fast path is weak) → PPR walks. Reduces 99% of LLM seed-selection cost.
- **Hub-link distinctiveness scanner (P1-6, Issue #157 / #175).** New lint pass that flags pages whose outgoing links mostly point to low-distinctiveness hubs. 229 LOC + 15 tests. Contributed by @DocTpoint.
- **Hub-retirement crystallization signal (PR #215, @DocTpoint).** `core/hub-retirement.ts` (175 LOC + 12 unit tests + 136 LOC integration tests). Pure percentile-based verdict with dual absolute guards.
- **Unified URL fallback for custom baseURLs.** `core/url-fallback.ts` (395 LOC) auto-resolves missing `/v1` in user-entered baseURLs (Kimi Coding Plan, GLM, z.ai). Module-level static cache survives `createLLMClient` re-creation so Ingest / Lint / Query all benefit.
- **Token-key probe-then-retry (KISS, no regex).** `src/llm-sdk/token-key-probe.ts` (70 LOC) caches working `max_tokens` ↔ `max_completion_tokens` key per baseURL on first failure. Triggered by `if (statusCode === 400 && !cached) → retry`. Addresses root cause of #207 for all OpenAI-compatible gateways.
- **Real-time streaming for all providers (P2).** `result.textStream` true逐块 streaming now works in all three `llm-sdk` clients. macrotask yield between chunks forces a paint frame per chunk (no more batch-arrival UX). Resolves user Q1 feedback.
- **Welcome note (Phase 5.1.5).** Three-tier first-run Welcome note (Tier A empty / Tier B existing / Tier C upgrade). `type: welcome` frontmatter, `createWelcomeNote` toggle, `Recreate Welcome Note` command. D8 LLM dynamic translation writes the note in the user's wiki language at write time — no hardcoded i18n.
- **Multi-File Ingest (Issue #130).** Two-pane picker: left = recursive folder tree with per-file checkboxes, right = live ingest queue with status. "Add to queue" two-step flow, per-file cancel, "Cancel all" for pending/running jobs. Reuses `runBatchIngest` so the per-file loop, dedup, and report modal are shared with folder ingest. New `IngestQueue` pub/sub store is the single source of truth for in-session ingest lifecycle.
- **LM Studio API-key gate (Issue #223).** `main.ts:962` now excludes both `ollama` and `lmstudio` from API-key validation. Local providers can test connection without an API key.
- **knn baseline analysis (P2-3 eval acceptance gate).** DocTpoint ran a knn baseline (bge-m3, no graph) on the same `sample-50page` fixture per #198 follow-up: cascade R@5 27.1% vs knn 24.1% (3pp gap). Reinforces 2026-06-22 #175 rejection — embeddings permanently rejected.
- **i18n settings rewrite (10 locales).** User-first language throughout ("disable thinking") instead of implementation details ("3-tier dialect fallback chain"). 14 new keys per locale for Welcome note + Ingest modal UI.
- **Sponsor section.** Ko-fi button + 💖 Support the Project section in all 10 READMEs. https://ko-fi.com/greenerdalii.
- **P2-4 PPR tuning.** Real vault (2142 pages) tuning across 6 iterations. Recommended parameters `damping=0.05, numWalks=3000, walkLength=20` improve R@5 from 21.5% → 23.8% (+11% relative). See `src/__tests__/fixtures/wikis/sample-50page/REAL_VAULT_EVAL.md`.

### Changed

- **Provider error body now reaches Test Connection UI.** `window.fetch` re-fetch with 5s timeout captures the provider's diagnostic into the Notice. Replaces generic `status 400` with e.g. `"status 429: You exceeded your current quota"`.
- **Lint performance knobs centralised in `src/constants.ts`.** Single-file tuning instead of 4-file drift across `controller.ts` / `duplicate-detection.ts` / `preparation.ts` / `batch-limits.ts`.
- **429/5xx exponential backoff on Responses API path.** Both Chat Completions and Responses API paths now share the same `withRetry` (3 attempts, 1s/2s/4s + jitter).
- **`thinkingControlCache` deprecated.** Removed the 3-tier dialect probe; AI-SDK handles thinking internally. Cache retained on disk for backward-compat (will be removed in v1.24.0 if no use case surfaces).
- **Real-time streaming UX.** Cascade + LLM seed retrieval improvements: reduced tokens per cascade round, tightened seed-selection prompt.
- **Welcome note refactor.** Moved LLM config status from in-body text to frontmatter (hidden metadata). Local-check in Welcome note orchestrator (no LLM if config already valid).

### Fixed

- **#207 — GPT-5.x models no longer fail Test Connection with 400.** Full coverage including `-pro` variants (v1.22.5 / v1.22.6 hotfixes).
- **#204 — Auto Ingest no longer opens blocking modal.** `trigger='auto'|'manual'` field on `IngestReport` / `IngestOptions` routes auto-ingest completion to `onAutoIngestDone` (Notice) instead of `IngestReportModal`.
- **#204 — Auto Smart Fix completion is context-aware.** Same `trigger` pattern routes `AutoMaintainManager.schedulePeriodicLint` completion differently based on `autoSmartFix` setting.
- **#223 — LM Studio Test Connection no longer requires API key.** Local providers excluded from the API-key gate.
- **`generation_complete` no longer stamped onto `log.md` / `index.md` / `schema/`** (v1.22.3, carried forward). `isInWikiContentFolder()` guard restricts the stamp to `wiki/{entities,concepts,sources}/...`.
- **Real-time streaming was batched.** Fixed via macrotask yield + `result.textStream`-only consumption (not `fullStream` then `textStream`, which buffered all events).

### Tests

- **1376 tests passing** across 100 files (+272 since v1.22.0).

### Risk Register

- Bundle size 1.24 MB → 3.17 MB (user accepted 2026-06-29). Obsidian manifest has no size limit; lazy `await import()` for AI-SDK packages didn't reduce bundle (esbuild CJS inline); future ESM bundle / dynamic chunk can revisit.
- #207 close decision: user will close manually after real-world testing — separate commit `Closes #207`, not part of v1.23.0.
- #213 (configurable page categories): Discussion-only, NOT confirmed for any minor release per user instruction 2026-06-30. Requires broader community/architectural discussion.

## [1.22.6] - 2026-06-30

### Fixed
- **#204 — Auto Ingest no longer opens a blocking modal when `autoIngestNotificationLevel: notice` is set.** v1.22.2 added `onAutoIngestDone` (Notice path) but never wired it into the watch-mode auto-ingest path — every ingest completion went through `onIngestDone` which always opens `IngestReportModal`, making the "Notice (non-blocking)" UI setting a no-op. v1.22.6 adds a `trigger?: 'auto' | 'manual'` field to `IngestReport` (and `IngestOptions`) and propagates it through `WikiEngine.ingestSource` → `onDone` report. The completion callback (`LLMWikiPlugin.onIngestDoneDispatch`) routes `trigger='auto'` to `onAutoIngestDone` (Notice respecting `autoIngestNotificationLevel`) and otherwise keeps the legacy `IngestReportModal` path. Manual ingest behavior unchanged.
- **#204 follow-up — Auto Smart Fix completion is now context-aware.** The same trigger pattern is applied to `runLintWiki`: the function gains a third `trigger: 'auto' | 'manual'` parameter (default `'manual'`). Periodic auto lint (driven by `AutoMaintainManager.schedulePeriodicLint`) now passes `trigger='auto'`; manual lint commands keep the default. Completion dispatch: manual → `LintReportModal` (unchanged UX); auto + `autoSmartFix=true` → Notice + run fixAll (v1.22.2 path); auto + `autoSmartFix=false` → Notice only with History panel hint, no modal.
- **#207 follow-up — GPT-5 Pro variants (`gpt-5.x-pro`) now route correctly to `/v1/responses`.** Verified against OpenAI's official model documentation (`developers.openai.com/api/docs/models/gpt-5-pro`): "GPT-5 Pro is available in the Responses API only." v1.22.5's `RESPONSES_API_MODEL_RE` regex matched `gpt-5.x` but missed the trailing `-pro` suffix, so `gpt-5.2-pro`, `gpt-5.4-pro`, and `gpt-5.5-pro` silently went to `/v1/chat/completions` where Pro models don't exist → 404. v1.22.6 broadens the regex to `^(gpt-5\.[1-9]\d*(?:-pro)?|o1(?:-mini|-preview)?|o3(?:-mini|-pro)?|o4-mini)$`. `gpt-5-chat-latest` exclusion kept (Chat Completions by design). After upgrade, `gpt-5.x-pro` should work; if `gpt-5.x-chat-latest` variants continue to 400, paste the exact Notice text (now includes the provider body) for further diagnosis.

### Tests
- **1118 tests passing** (+14 since v1.22.5: new `src/__tests__/wiki/auto-maintain-trigger.test.ts` with 6 tests for `IngestReport.trigger` shape and `dispatchTarget` pure function; new `src/__tests__/wiki/lint/lint-trigger-dispatch.test.ts` with 4 tests for the lint completion dispatch logic; `src/__tests__/root/llm-client-responses-api.test.ts` adds 4 `-pro` model IDs to the routing `it.each` block; `src/__tests__/schema/auto-maintain.test.ts` updated to assert `trigger: 'auto'` in the ingestSource options round-trip).

## [1.22.5] - 2026-06-29

### Fixed
- **#207 follow-up — Reasoning model family (gpt-5.1+ / gpt-5.5 / o1-o4) no longer fails Test Connection with HTTP 400.** v1.22.4's `max_tokens` ↔ `max_completion_tokens` probe-then-cache fix was necessary but not sufficient — `gpt-5.1-chat-latest`, `gpt-5.5`, and the `o1` / `o3` / `o4-mini` reasoning families still failed Test Connection with 400 because the Chat Completions endpoint has compatibility issues for the reasoning model family. Per OpenAI's official GPT-5.5 migration guide ("GPT-5.5 works best in the Responses API"), v1.22.5 routes the reasoning family to `/v1/responses` with `reasoning: { effort: 'low' }`. Detection is a pure-function `isResponsesApiModel(model, baseUrl)` export, gated to `https://api.openai.com/v1` only — `gpt-5-chat-latest`, `gpt-4.1`, `gpt-3.5-turbo`, and all non-OpenAI baseUrls (Ollama, LM Studio, DeepSeek, etc.) continue on `/v1/chat/completions` unchanged. Issue #207 remains open pending real-world user testing; will be closed in a follow-up commit after confirmation.
- **Test Connection Notice now surfaces the provider's full error body, not just the status code.** Obsidian's `requestUrl` throws on 4xx (including 429) WITHOUT populating the thrown Error with the provider's response body — so even v1.22.4's `extractProviderErrorMessage()` could not see what OpenAI actually said. v1.22.5 wraps the failing request in a `window.fetch` re-fetch (5s timeout, gated to error path only) and merges the provider's body into the thrown `Error.message`, so the Notice UI now reads e.g. `"status 429: You exceeded your current quota, please check your plan and billing details"` instead of bare `"status 429"`. The raw body is also logged at `console.warn` level for DevTools spelunking. Non-OpenAI baseUrls get the same enrichment via the existing Chat Completions path.
- **429/5xx rate-limit errors now retry with exponential backoff on the Responses API path.** v1.22.4's `withRetry` (3 attempts, 1s/2s/4s + jitter) only covered the Chat Completions path. v1.22.5 wraps the new Responses API path in the same `withRetry` so transient 429 quota bumps no longer immediately fail Test Connection.

### Tests
- **1104 tests passing** (+28 since v1.22.4: new `src/__tests__/root/llm-client-responses-api.test.ts` with 28 tests covering endpoint routing, body shape, error enrichment, withRetry integration, custom baseUrl compatibility, and reasoning-family model coverage. Existing dot-naming gpt-5.x regression test (v1.22.4) updated to use `gpt-5-mini`/`gpt-5-nano` since these models continue to exercise the Chat Completions path; existing `thinking.type='disabled'` Chat Completions tests updated to use `gpt-4.1` since the reasoning family is now covered by the new test file).

## [1.22.4] - 2026-06-27

### Fixed
- **#207 — GPT-5.x models (`gpt-5.1`, `gpt-5.4-mini`, `gpt-5.5`) no longer fail Test Connection with HTTP 400.** v1.20.0's `params.model.startsWith('gpt-5-')` prefix-matching heuristic only matched the dash-suffixed OpenAI gpt-5 family (`gpt-5-mini`, `gpt-5-nano`, etc.) and silently broke for every new gpt-5.x release (which OpenAI ships with period-suffixed names like `gpt-5.4-mini`). This was a regression of the same root-cause class as #143 in v1.20.0. Replaced the brittle prefix-match with a runtime probe-then-cache mechanism: the first request uses `max_tokens`; if the backend rejects with 400 we inspect `error.param` (or "use X" / "should be X" phrasing) to derive the alternate key (`max_completion_tokens` or vice versa) and retry; the result is cached on the client instance and reused for the client's lifetime. New `MaxTokenKey` type and `detectRejectedMaxTokenKey()` exported pure function. Stream path mirrors the same pattern in `createMessageStream`. Per-client isolation ensures baseUrl changes start a fresh cache.
- **Test Connection UI now surfaces the provider's actual error message.** Previously, `requestUrl` errors were re-wrapped as `status 400: ${data.error.message}` (or just "status 400" when the response body was lost to requestUrl's 4xx-throw-without-body behavior), and the provider's actual diagnostic — e.g. "Invalid parameter: max_tokens should be max_completion_tokens" or "The model `gpt-missing` does not exist" — was never visible to the user. New `extractProviderErrorMessage()` enriches the thrown error in both `createMessage` and `createMessageStream` so Test Connection Notice text reads `status 400: <provider message>` instead of a generic HTTP wrapper. Test Connection is now self-diagnostic without needing the console.

### Changed
- **Lint performance knobs centralised in `src/constants.ts`.** Yield cadences (`LINT_YIELD_EVERY_OUTER` / `_PHASE1` / `_COMPARISON`), candidate batch sizing (`LINT_CANDIDATE_TOKEN_ESTIMATE`, `LINT_MAX_INPUT_TOKENS`, `LINT_DEDUP_BATCH_SIZE`), prep batch read (`LINT_PREP_BATCH_READ`), and source-analyzer batch sizing (`SHORT_CONTENT_THRESHOLD`, `BATCH_CHARS_PER_ITEM`) now live in one place. Previously these values were duplicated or had drifted across `controller.ts`, `duplicate-detection.ts`, `preparation.ts`, and `batch-limits.ts` — including a literal `MAX_TOKENS=16000` copy of `MAX_TOKENS_BATCH`. Tuning lint performance is now a single-file change.

### Tests
- **1076 tests passing** (+12 since v1.22.3: +8 for `detectRejectedMaxTokenKey` pure-function edge cases, +2 for OpenAICompatibleClient integration covering `mockRejectedValueOnce` path and provider message surfacing, +2 for `batch-limits.ts` constant unification).

## [1.22.3] - 2026-06-26

### Fixed
- **`generation_complete` no longer stamped onto `log.md` / `index.md` / `schema/`.** `createOrUpdateFile` previously called `markPageComplete` for **every** write, which would prepend a brand-new frontmatter block with `generation_complete: true` to files that didn't have one — visibly polluting `log.md` body on every QuickFix run. New `isInWikiContentFolder()` guard restricts the stamp to `wiki/{entities,concepts,sources}/...` only. 5 regression tests covering the path rule and custom wikiFolder.
- **Log header detection is now language-agnostic and robust.** v1.22.2 detection relied on text matches like `view operation history` and `操作历史`, which broke for German / Japanese / Korean (false-negative → re-stamped every locale with the English header) and was vulnerable to false-positives when log entry bodies naturally contained the matched phrase. Switched to a structural `<!-- llm-wiki-log-header-start -->` HTML-comment marker embedded in the header — invisible in Obsidian, never appearing in user content, works for any language.
- **Log header strings consolidated into `src/texts/<lang>.ts`.** Four localised header strings previously duplicated in `core/log-header.ts` now live alongside every other UI string, so translators and the i18n-parity test cover them automatically.

### Tests
- **1064 tests passing** (+5 since v1.22.2: 5 path-rule guard tests).

## [1.22.2] - 2026-06-26

### Fixed
- **#204 — Watch-mode auto-ingest showed a blocking modal.** `onIngestDone` always opened the `IngestReportModal` regardless of whether the ingest was triggered by the file watcher or by manual action. Split into `onIngestDone` (manual → modal) and `onAutoIngestDone` (watch-mode → configurable). New setting `autoIngestNotificationLevel` (`'notice'` default, `'modal'` available) controls watch-mode behavior.
- **Auto Smart Fix opened a blocking `FixReportModal` after completing all fixes.** Replaced with a transient Notice with a hint to the Operation History Panel. Prevents modal-over-modal when Auto Smart Fix runs during an auto-ingest batch.
- **`periodicLint`: removed "Hourly" option, added "Monthly".** Old `hourly` saves are auto-migrated to `daily` on next plugin load.
- **Dead code cleanup: two redundant `setDoneCallback` resets in `main.ts` removed.**
- **`slug.ts` console.debug noise removed.** Hot-path `console.debug('slugify input:', text, ...)` on every slug computation cleaned up.

### Added
- **`core/log-header.ts` — i18n-aware log.md header builder (10 locales).** When `log.md` is first created, its header now explains the log file and points to the Operation History Panel. Each locale (en/zh/zh-hant/ja/ko/de/fr/es/pt/it) gets its own translated header text.
- **Log header auto-migration (startup Phase 4.5).** Existing `log.md` files with the old single-line header are detected via `isOldFormatLogHeader()` and non-destructively migrated via `migrateLogHeader()` — only the header is replaced; all `## [date time]` log entries are preserved.
- **Auto Ingest Notification dropdown in settings (conditional).** New dropdown (Notice / Modal) appears under Watch Mode → "Auto Ingest" (hidden when Watch Mode is "Notify Only") with live display() toggle.

### Changed
- **Auto Ingest notification defaults to non-blocking Notice.** New setting `autoIngestNotificationLevel` defaults to `'notice'`. The IngestReportModal is only opened when the user explicitly sets this to `'modal'` or triggers a manual single-ingest or folder-ingest command.
- **Periodic Lint options refined: Off, Daily, Weekly, Monthly.** Hourly removed as it was not a realistic schedule for LLM-based lint.

### Tests
- **1054 tests passing** (+25 since v1.22.1: +5 for buildLogHeader, +6 for log-header-migration, +2 for slug-no-debug, +4 for auto-ingest-notification, +3 for auto-smart-fix-notice, +3 for settings-migrations hourly→daily, +2 for autoIngestNotificationLevel test fixtures).

## [1.22.0] - 2026-06-23

### Added
- **#97 — One-click schema apply with IDE-style diff Modal + auto-backup.** `SchemaDiffModal` class (dual-pane IDE-style diff, Apply/Cancel/Open file buttons, Regenerate hidden for v1.22). `applySchemaSuggestion()` with auto-backup to `.llm-wiki-backups/schema/` (rotation MAX_BACKUPS=3 via `core/backup-rotation.ts`). `lineDiff()` LCS algorithm in `core/diff.ts`. Lint "Update Schema" button removed from command palette — schema updates flow through Lint Modal only (single entry point).
- **Schema dynamic tag sync.** Schema vocabulary is now the single source of truth; tag vocab injected into generation prompts via `SchemaContext` + `buildSchemaSectionTemplate`. `parse-suggestion.ts` for structured LLM response parsing.
- **Traditional Chinese (zh-TW) locale.** 10th language (zh-Hant). Parity guard extended to all 10 locales (bidirectional). 8 new i18n keys per language for schema diff modal.
- **#189 — Ingest status bar shows document name + batch progress (PR by @YounianC).** Single-file ingest displays `<doc> · Ingesting... click to cancel` instead of the bare label. Folder batch ingest shows `[current/total] <doc> · Ingesting... click to cancel`. New pure-function `core/status-bar.ts` (`buildIngestStatusBarText`) composes from the existing localized `ingestionStatusBar` label — no new i18n keys, all 10 locales covered automatically. `WikiEngine` ingestion-start callback now passes the source basename (optional param, backward-compatible). `batchProgress` field in `main.ts` tracks loop position.

### Fixed
- **`merge.ts` hardcoded English section headers (#188).** Both `mergeEntityPage` and `mergeConceptPage` prompt templates used hardcoded `## Related Entities` / `## Related Concepts` / `## Basic Information` / `## Description` / `## Mentions in Source` headers, ignoring the configured `wikiLanguage`. Replaced with `{{section_*}}` placeholders so `applySectionLabels()` localizes them consistently across create and merge paths. Non-English vaults no longer get mixed-language section headers.
- **`appendAliases` block-replace regex left stale items (#186).** `page-factory.ts:70` regex `/^aliases:[\s\S]*?(?=\n\S|\n*$)/m` — the `m` flag caused `$` to match end-of-line, so the lookahead succeeded immediately and the lazy quantifier matched zero characters. Only the bare `aliases:` line was replaced; existing list items survived, producing duplicate entries on every subsequent append. Fixed with `/^aliases:[^\n]*(?:\n[ \t]+[^\n]*)*/m` which consumes continuation lines by indentation.
- **Lint: `apply-suggestion.ts` used `vault.delete()` fallback.** Simplified to direct `app.fileManager.trashFile` call — respects user's file deletion preference per Obsidian review rule `obsidianmd/prefer-file-manager-trash-file`. Test mock updated accordingly.
- **Lint: `parse-suggestion.ts` unnecessary type assertion.** `as LLMSchemaResponse` cast removed (receiver already accepts the original type).

### Tests
- **1006 tests passing** (was 948 in v1.21.1; +58: schema suite 48 tests + status-bar suite 7 tests + #186/#188 regression tests 3 tests).

## [1.21.1] - 2026-06-22

### Fixed
- **#173 Symptom A — createOrUpdateFile create-retry loop.** When `getAbstractFileByPath` returned null (e.g. macOS NFC/NFD normalization mismatch), the 3-attempt loop kept calling `vault.create` instead of first resolving via `resolveFileInVault`. Now resolves at the earliest attempt, eliminating 3× failed retry overhead. Contributed by @Indexed-Apogrypha (reporting).
- **esbuild 0.28.0 → 0.28.1.** Patches GHSA-g7r4-m6w7-qqqr (low severity, dev-only arbitrary file read on Windows).

## [1.21.0] - 2026-06-21

### Added
- **Pre-ingest requirements gate (#164).** Every source file is now validated *before* any LLM call — **non-empty**, **compatible file type**, and **unique** — and files that fail are logged and skipped instead of reaching the model. New `core/source-requirements.ts` holds an extensible, ordered `CONTENT_CHECKS` registry so future checks (e.g. prompt-injection) can be added as a single entry. Contributed by @Indexed-Apogrypha.
  - **Non-empty** (`isBlankSource`): empty, whitespace-only, and frontmatter-only notes are skipped — closing the #164 root cause where small/local models (e.g. Ollama) hallucinated entities/concepts from blank content interpolated into the extraction prompt.
  - **Compatible file type**: case-insensitive allowlist `['md', 'markdown', 'txt', 'text']`. Folder and active-file ingest now accept `.txt`/`.text` (was `.md`-only).
  - **Uniqueness** (`hashBody`): content-hash de-duplication (length-prefixed FNV-1a over the normalized body) catches duplicate content even across different file paths, plus within-batch dedup for folder **and watcher** ingests (both share one `createBatchContext()`); the hash is stamped into the source page frontmatter as `contentHash`.
- **Re-ingest confirmation prompt.** Interactive ingests (file picker / active file) prompt before re-ingesting a duplicate (new `ConfirmModal`); folder/watcher ingests auto-skip duplicates. The ingest report now lists skipped files with a localized reason (empty / unsupported type / duplicate content). New i18n keys across all 9 locales. Contributed by @Indexed-Apogrypha.
- **Operation History Panel (#122).** Pure-function `parseLogEntries` + `HistoryModal` with date grouping, search, filter, clickable page links, and insight-driven visualization. Command palette entry + settings entry.
- **Schema Coherence Phase 1 (#124).** `SchemaContext` shared parsed representation of `schema/config.md`, used by both system prompts and generation prompts. `buildSchemaSectionTemplate` extracts user-defined sections. Tag vocabulary injection into system prompt.
- **Incomplete-page cleaner (#170).** Wiki pages left in a partial state (interrupted ingest, plugin reload mid-write, LLM error) are automatically cleaned on startup via `generation_complete` frontmatter flag + QuickFixes Phase 3 self-scan. Pages without the field are treated as legacy (preserved).
- **Italian locale (#159).** 9th language added to UI and wiki output. Contributed by @FrancoTampieri.

### Fixed
- **Empty notes made small/local LLMs fabricate wiki pages (#164, CRITICAL).** Ingesting an empty / whitespace-only / frontmatter-only note no longer produces fabricated entity/concept pages (large models refused the blank input, so it never surfaced in dev). A defense-in-depth `isBlankSource` guard was also added in `source-analyzer.ts` before the extraction prompt is built. Contributed by @Indexed-Apogrypha.
- **Hardcoded Chinese error string leaked into non-Chinese UI (#172).** `wiki-engine.ts` `createOrUpdateFile` final-fallback throw now uses `getText('fileWriteFailed')` with 9-locale i18n coverage.
- **Duplicate entry in `createdPages` inflated report count (#173).** `dedupPages()` pure-function helper prevents duplicated surface-forms from inflating the ingest report "Created" listing.

### Tests
- New coverage for the gate: `core/source-requirements`, `isBlankSource`/`upsertFrontmatterField` in `core/frontmatter`, the #164 reproduction in `wiki/source-analyzer`, and a new in-memory `WikiEngine` ingest-gate harness (`wiki/wiki-engine-ingest`).
- Watcher batch-context wiring (`schema/auto-maintain`) and the `buildIngestedHashes` TTL-cache + write-invalidation paths (`wiki/wiki-engine-ingest`).
- Incomplete-page cleaner tests (`core/incomplete-page-cleaner`): `isIncomplete`, `findIncompletePages`, `cleanIncompletePages`.
- i18n error message assertion (`wiki/wiki-engine-i18n-error`).
- `dedupPages` ordering/edge-case tests (`wiki/wiki-engine-dedup`).
- **939 tests passing (was 791 in v1.20.3).** +148 tests, 67 test files.

## [1.20.3] - 2026-06-20

### Fixed
- **`mergeFrontmatter` accumulated duplicate aliases on re-ingest (PR #154).** Repeated re-ingests of the same source could grow the `aliases` array without bound — one real-world page accumulated the same alias block ~15× (86 duplicate lines). `mergeFrontmatter` now dedups `fm.aliases` parity with `enforceFrontmatterConstraints` (first occurrence wins, empty strings dropped). Contributed by @DocTpoint.
- **Source provenance pages silently overwritten when basenames collide (PR #156, closes #155).** When two source files shared a basename across folders (e.g. 11× `About this course.md` across Academy courses), `slugify(basename)` produced the same slug for both — second ingest silently overwrote the first, and every `[[sources/<slug>]]` backlink then resolved to the wrong source. Fix: every source slug is now `<basename>_<6hex FNV-1a of full path>`. Single computation point in `wiki-engine.ts`; pure `core/source-slug.ts` module. Re-ingest renames existing `sources/` pages but backlinks update in place. Contributed by @Indexed-Apogrypha.
- **`updateRelatedPage` ignored `reviewed: true` in Stage 4 (PR #158).** Re-ingesting an unrelated note could LLM-rewrite a curated `reviewed: true` page's body — the reviewed lock did not hold on the Stage-4 path, only on `createOrUpdatePage`. Fix: `updateRelatedPage` now routes `reviewed: true` pages to `appendToReviewedPage` (parity with `createOrUpdatePage`). The curated body survives verbatim. Contributed by @DocTpoint.
- **tsconfig housekeeping (PR #156 follow-up).** `lib` bumped to ES2021 (so `trimEnd` resolves cleanly under newer TS language servers); vestigial `baseUrl` dropped (no `paths` map; clears TS 6/7 deprecation warning).

### Tests
- **791 tests passing** (was 779; +12 — 9 new `source-slug` tests, 2 new `mergeFrontmatter` regression tests, 1 new `updateRelatedPage` reviewed-guard test).

## [1.20.2] - 2026-06-19

### Fixed
- **Anthropic fallback retry injected `{role: 'system'}` into messages array (PR #151).** Anthropic Messages API only accepts `user`/`assistant` roles in messages — system instructions must be a top-level field. The no-prefill retry and thinking-control fallback paths both incorrectly put `system` into `messages`, causing a second 400 that masked the real fix. Fix: all 4 Anthropic fallback paths now use `messages: [...params.messages]` with `body.system = params.system` at top level. Contributed by @Indexed-Apogrypha.
- **AnthropicClient prefill fallback did not trigger (v1.20.1 regression).** Obsidian's `requestUrl` throws on HTTP 4xx WITHOUT the response body. v1.20.1's regex-based detection always failed. Fix: detect "400 + was using prefill", cache the rejection, retry without prefill.

### Tests
- **779 tests passing** (was 775; +4 from PR #151's Anthropic API simulator tests).

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
