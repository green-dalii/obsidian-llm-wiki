# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Experimental ChatGPT Plan (Codex OAuth) provider.** Adds a provider separate from the existing, usage-billed OpenAI Platform API-key path. Desktop users can sign in through an OpenAI-hosted browser flow with a `127.0.0.1:1455` callback; desktop and mobile users can use the OpenAI device-code flow. This is third-party Codex compatibility, not an OpenAI partnership or a general ChatGPT API.
- **Secure OAuth lifecycle.** Access, refresh, and ID tokens plus account metadata are stored only through Obsidian SecretStorage. PKCE/state validation, bounded login flows, refresh-token rotation with a single retry, sign-out clearing, cancellation, and unload cleanup are included. SecretStorage raises the minimum Obsidian version to 1.11.4 while the plugin remains available on desktop and mobile.
- **Dedicated Codex Responses transport and account model synchronization.** Requests use the Codex Responses endpoint with OAuth bearer and account headers without altering the OpenAI API-key client. After sign-in the plugin synchronizes picker-visible models from the official Codex account catalog, caches only sanitized metadata, supports manual refresh, and retains a minimal fallback when the catalog is unavailable; model availability and ChatGPT plan allowance remain controlled by OpenAI.

### Tests

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
