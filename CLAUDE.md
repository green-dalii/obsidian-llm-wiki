# LLM Wiki Plugin Project Development Standards

**Last Updated:** 2026-06-29

---

## Current Phase: v1.22.5 (released) → v1.23.0 (Graph Engine direction)

### Completed (v1.22.5) — Hotfix: Responses API for #207 follow-up (2026-06-29)

Closed the second half of #207 — reasoning model family (gpt-5.1+ / gpt-5.5 / o1-o4) now uses OpenAI's Responses API, and the Test Connection Notice surfaces the provider's full error body (e.g. "insufficient_quota") instead of bare "status 429". #207 stays open for real-world user testing before final close.

- ✅ **#207 follow-up — Reasoning model family uses OpenAI Responses API.** v1.22.4's `max_tokens` ↔ `max_completion_tokens` probe was necessary but not sufficient — `gpt-5.1-chat-latest` / `gpt-5.5` / `o1` / `o3` / `o4-mini` still failed Test Connection with 400 because Chat Completions has compatibility issues for the reasoning family. Per OpenAI's official GPT-5.5 migration guide ("GPT-5.5 works best in the Responses API"), v1.22.5 routes the reasoning family to `/v1/responses` with `reasoning: { effort: 'low' }`. `gpt-5-chat-latest`, `gpt-4.1`, `gpt-3.5-turbo`, and all non-OpenAI baseUrls (Ollama, LM Studio, DeepSeek, etc.) continue on `/v1/chat/completions` unchanged. Detection is a pure-function `isResponsesApiModel(model, baseUrl)` export, gated to `https://api.openai.com/v1` only.
- ✅ **Test Connection Notice now surfaces the provider's full error body.** Obsidian's `requestUrl` throws on 4xx WITHOUT populating the Error with the provider body, so v1.22.4's `extractProviderErrorMessage()` couldn't see the actual diagnostic. v1.22.5 wraps the failing request in a `window.fetch` re-fetch (5s timeout) and merges the provider body into `Error.message` — users now see e.g. `"status 429: You exceeded your current quota, please check your plan and billing details"`. Raw body also logged at `console.warn` for DevTools investigation. Non-OpenAI baseUrls get the same enrichment via the existing Chat Completions path.
- ✅ **429/5xx now retry with exponential backoff on the Responses API path.** v1.22.4's `withRetry` (3 attempts, 1s/2s/4s + jitter) covered only the Chat Completions path. v1.22.5 wraps the new Responses API path in the same `withRetry` so transient 429 quota bumps no longer immediately fail Test Connection.
- ✅ **Tests: 1104 passing.** +28 since v1.22.4 (new `llm-client-responses-api.test.ts` with 28 tests covering endpoint routing, body shape, error enrichment, withRetry integration, custom baseUrl compatibility, and reasoning-family model coverage). Existing dot-naming gpt-5.x regression test (v1.22.4) and `thinking.type='disabled'` Chat Completions tests refactored to use `gpt-5-mini`/`gpt-5-nano`/`gpt-4.1` (the Chat Completions path models).

### Completed (v1.22.4) — Hotfix: GPT-5.x probe + provider error UX (2026-06-27)

Closed two user-reported issues in v1.22.3 user testing — both PATCH scope (backward-compatible bug fixes):

- ✅ **#207 — GPT-5.x models no longer fail Test Connection with 400.** v1.20.0's `params.model.startsWith('gpt-5-')` prefix-matching heuristic only matched the dash-suffixed OpenAI gpt-5 family (`gpt-5-mini`, `gpt-5-nano`, etc.) and silently broke for every new gpt-5.x release (`gpt-5.1`, `gpt-5.4-mini`, `gpt-5.5`). This was a regression of the same root-cause class as #143 in v1.20.0. Replaced with a runtime probe-then-cache mechanism: first request uses `max_tokens`, if the backend rejects with 400 we cache the alternate key (`max_completion_tokens` or vice versa) and retry. New `MaxTokenKey` type and `detectRejectedMaxTokenKey()` exported pure function. Stream path mirrors the same pattern in `createMessageStream`. Per-client isolation ensures baseUrl changes start a fresh cache.
- ✅ **Test Connection UI now surfaces the provider's actual error message.** Previously, `requestUrl` errors were re-wrapped as `status 400: ${data.error.message}` (or just "status 400" when the response body was lost to requestUrl's 4xx-throw-without-body behavior), and the provider's actual diagnostic was never visible. New `extractProviderErrorMessage()` enriches the thrown error in both `createMessage` and `createMessageStream` so Test Connection Notice text reads `status 400: <provider message>` instead of a generic HTTP wrapper. Test Connection is now self-diagnostic without needing the console.
- ✅ **Lint performance knobs centralised in `src/constants.ts`.** Yield cadences, candidate batch sizing, prep batch read, and source-analyzer batch sizing now live in one place. Previously these values were duplicated across `controller.ts`, `duplicate-detection.ts`, `preparation.ts`, and `batch-limits.ts` — including a literal `MAX_TOKENS=16000` copy of `MAX_TOKENS_BATCH`. Tuning lint performance is now a single-file change.
- ✅ **Tests: 1076 passing.** +12 since v1.22.3.

### Completed (v1.22.3) — Hotfix hardening (2026-06-26)
- ✅ **log header detection hardened to language-agnostic structural marker.** Switched from text-based detection (`view operation history` / `操作历史`) to embedded `<!-- llm-wiki-log-header-start -->` HTML-comment marker. v1.22.2 log files auto-upgrade on next startup.
- ✅ **log header strings consolidated into `src/texts/<lang>.ts`.** Removed 60 lines of duplicated `HEADER_LABELS` from `core/log-header.ts`. Translators and i18n-parity tests now cover them automatically.
- ✅ **`generation_complete` no longer stamped onto `log.md` / `index.md` / `schema/`.** New `isInWikiContentFolder()` guard restricts `markPageComplete` to `wiki/{entities,concepts,sources}/...` only. 5 regression tests.
- ✅ **Tests: 1064 passing.** +5 since v1.22.2.

### Completed (v1.22.2) — UX improvements + tech debt (2026-06-26)
- ✅ **#204 — Auto Ingest blocking modal fixed.** New `onAutoIngestDone()` routes watch-mode completions to a configurable Notice (non-blocking) instead of IngestReportModal. `autoIngestNotificationLevel: 'notice' | 'modal'` setting with conditional UI dropdown.
- ✅ **Auto Smart Fix FixReportModal → transient Notice.** Replaced blocking modal with Notice hinting at Operation History Panel.
- ✅ **D1 — Dead code: redundant `setDoneCallback` resets in `main.ts` removed.**
- ✅ **D2 — `slug.ts:2` console.debug noise removed.**
- ✅ **D3 — `core/log-header.ts` i18n log.md header builder (10 locales) + startup Phase 4.5 auto-migration.**
- ✅ **Periodic Lint: removed "Hourly", added "Monthly". Old `hourly` data auto-migrated to `daily`.**
- ✅ **Tests: 1054 passing.** +25 since v1.22.1.

### Completed (v1.22.1) — P0 bug batch + UX improvement
- ✅ **#197 — `fixDeadLink` fabrication root-cause fix.** Stop calling `fillEmptyPage()` in both stub-creating branches (LLM `create_stub` + deterministic fallback). Pure-function `buildStubContent()` produces honest placeholders with `generation_complete: false` marker so #170 incomplete-cleaner recognises them. Explicit policy gate `shouldFabricateStubForUnresolvableLink()` returns false for both branches — any future PR that wants to re-introduce fabrication must edit this single greppable switch. 6 regression tests.
- ✅ **#199 — `startupCheck` silently reset to true on every restart.** v1.18.3 migration removed. Remaining migrations extracted to pure-function `applySettingsMigrations()` in `core/settings-migrations.ts` for unit testability. 5 regression tests (multi-load idempotency, new-user default, v1.20.0 migration unaffected).
- ✅ **CSS `:has()` warning fix.** `styles.css:579` `:has()` replaced with direct class selector `.modal.llm-wiki-schema-diff-modal`. JS side: `schema-diff-modal.ts` `onOpen`/`onClose` add/remove class on `modalEl` via pure helpers in `src/ui/schema-diff-modal-classes.ts` (separate file to keep tests obsidian-free).
- ✅ **`scripts/css-lint.mjs`** — multi-rule CSS lint catching `!important` + `:has()` to prevent regression. Wired into `pnpm css-lint` (Gate 1).
- ✅ **#196 — Query Wiki Modal → Copilot-style right side panel (PR #196 by @YounianC).** `QueryModal extends Modal` → `QueryView extends ItemView` (`VIEW_TYPE_QUERY`, registered via `registerView`). `query-wiki` command + new `message-circle` ribbon icon activate/reveal a right sidebar leaf (reusing an existing leaf) instead of a popup. All existing behavior preserved. Styles migrated to native `var(--…)` theme variables — fixes hardcoded colors breaking light mode.
- ✅ **#187 — Related-link `sources/` prefix re-asserted deterministically (PR #200 by @DocTpoint).** Pure-function `correctRelatedLinkPrefixes()` re-asserts the known type of each related name after generation; section-scoped so legitimate source citations in *Mentions in Source* are never rewritten. 9 regression tests including named `[truncated-existing-pages]` and `[co-created-siblings]` cases.
- ✅ **Tests: 1029 passing.** +22 since v1.22.0 (#197 ×6, #199 ×5, CSS :has ×1, #200 ×9, query-engine mock ×1).

### Completed (v1.22.0) — Schema One-Click Apply + Dynamic Tag Sync + zh-Hant + Status Bar (2026-06-23)
- ✅ **#97 — Schema one-click apply with IDE-style diff Modal + auto-backup.** `SchemaDiffModal` class (dual-pane IDE-style diff, Apply/Cancel/Open file buttons, Regenerate hidden for v1.22). `applySchemaSuggestion()` with auto-backup to `.llm-wiki-backups/schema/` (rotation MAX_BACKUPS=3 via `core/backup-rotation.ts`). `lineDiff()` LCS algorithm in `core/diff.ts`. Lint "Update Schema" button removed from command palette — schema updates flow through Lint Modal only.
- ✅ **Schema dynamic tag sync.** Schema vocabulary is now the single source of truth; tag vocab injected into generation prompts. `SchemaContext` + `buildSchemaSectionTemplate` + tag vocabulary injection.
- ✅ **Traditional Chinese (zh-TW) locale.** 10th language (zh-Hant). Parity guard extended to all 10 locales (bidirectional).
- ✅ **Ingest status bar UX (#189).** Document name + batch progress in status bar. Pure-function `core/status-bar.ts` (`buildIngestStatusBarText`). Contributed by @YounianC.
- ✅ **Lint fixes.** `apply-suggestion.ts` simplified to direct `app.fileManager.trashFile` (removed unnecessary fallback). `parse-suggestion.ts` removed unnecessary type assertion.
- ✅ **Tests: 1007 passing.** +59 tests since v1.21.1 (schema suite 48 tests + status-bar suite 7 tests + #186/#188 regression tests 3 tests + CSS :has regression test 1 test).

### Completed (v1.21.1) — Hotfix 2026-06-22
- ✅ **#173 Symptom A — createOrUpdateFile create-retry loop.** NFC/NFD path resolution before `vault.create`.
- ✅ **esbuild 0.28.0 → 0.28.1.** Low-severity dev-only patch.
- ✅ **Tests: 941 passing.** +2 tests since v1.21.0.

### Completed (v1.21.0) — Pre-Ingest Gate + Schema Phase 1 + History Panel (2026-06-21)
- ✅ **#164 — Pre-ingest requirements gate (PR #174).** Empty/whitespace/frontmatter-only notes rejected before LLM call. Extensible `CONTENT_CHECKS` registry + `hashBody` dedup + `ConfirmModal`. Contributed by @Indexed-Apogrypha.
- ✅ **#170 — Incomplete-page cleaner (PR #177).** `generation_complete` flag + startup QuickFixes Phase 3 self-scan.
- ✅ **#172 — i18n: hardcoded Chinese error string (PR #176).** `fileWriteFailed` key across 9 locales.
- ✅ **#173 — dedup createdPages (PR #176).** `dedupPages()` pure-function helper.
- ✅ **#124 — Schema Coherence Phase 1 (PR #167).** `SchemaContext` + `buildSchemaSectionTemplate` + tag vocab injection.
- ✅ **#122 — Operation History Panel (PR #171).** Pure-function log parser + `HistoryModal`.
- ✅ **#159 — Italian locale (PR #159).** 9th language. Contributed by @FrancoTampieri.
- ✅ **Tests: 939 passing.** +150 tests, 67 test files.

### Completed (v1.20.3) — Hotfix 2026-06-20
- ✅ **#155 — Source-slug fingerprint (PR #156, Closes #155).** Every source slug now `<basename>_<6hex FNV-1a of full path>`. Contributed by @Indexed-Apogrypha.
- ✅ **mergeFrontmatter alias dedup (PR #154).** `mergeFrontmatter` dedups `fm.aliases` parity with `enforceFrontmatterConstraints`. Contributed by @DocTpoint.
- ✅ **Stage-4 reviewed guard (PR #158).** `updateRelatedPage` routes `reviewed: true` pages to `appendToReviewedPage`. Contributed by @DocTpoint.
- ✅ **Tests: 791 passing.** +12 tests.

### Completed (v1.20.2 / v1.20.1 / v1.20.0) — Hotfix + Release 2026-06-18/19
- ✅ **v1.20.2 — Anthropic fallback system-role fix (#141, #147, PR #151).** All 4 retry paths keep system as top-level field. 779 tests.
- ✅ **v1.20.1 — AnthropicClient prefill rejection fix (#141, #147).** Newer Claude models reject assistant prefill. Auto-fallback + caching. 775 tests.
- ✅ **v1.20.0 — Provider-first thinking control.** Default `disableThinking: false`, 3-tier dialect fallback. Collapsible thinking UI in Query Wiki. +10 code-review fixes. 771 tests.

---

## 📁 Project Structure

```
src/
├── main.ts                         # Plugin entry point
├── types.ts                        # Shared types + EngineContext
├── constants.ts                    # Centralized constants (token budgets, notice durations)
├── prompts.ts                      # Prompt barrel (10 languages)
├── texts.ts                        # i18n texts (barrel, 10 languages)
├── llm-client.ts                   # LLM clients (Anthropic, AnthropicCompat, OpenAICompat)
├── llm-client-wrapper.ts           # Advanced settings injection wrapper
├── wiki/                           # Wiki engine
│   ├── wiki-engine.ts              # Orchestrator
│   ├── query-engine.ts             # Conversational query — QueryView (right-docked ItemView side panel), streaming + thinking UI
│   ├── source-analyzer.ts          # Iterative batch extraction
│   ├── page-factory.ts             # Entity/concept CRUD + merge
│   ├── conversation-ingest.ts      # Chat → wiki knowledge
│   ├── contradictions.ts           # Contradiction detection
│   ├── system-prompts.ts           # Language directive + labels
│   ├── lint/                       # Lint subsystem
│   │   ├── controller.ts           # Lint orchestration
│   │   ├── fix-runners.ts          # Batch fix execution helpers
│   │   ├── scanners.ts             # Scanners (dead links, orphans, aliases, quote grounding)
│   │   ├── duplicate-detection.ts  # Programmatic candidate generation
│   │   ├── report-builder.ts       # Pure-function report markdown builder
│   │   ├── types.ts                # LintContext, LintPhaseContext, findings
│   │   ├── fill-empty-page.ts      # Empty page fill logic
│   │   ├── fix-dead-link.ts        # Dead link fix logic
│   │   ├── fix-polluted-page.ts    # Polluted sources fix
│   │   ├── link-orphan.ts          # Orphan page linking
│   │   ├── merge-duplicates.ts     # Duplicate page merge
│   │   ├── delete-empty-stubs.ts   # Empty stub deletion
│   │   ├── get-existing-pages.ts   # Wiki page index reader
│   │   ├── lint-analysis-context.ts # Lint analysis context builder
│   │   ├── utils.ts                # Shared lint helpers
│   │   └── phases/
│   │       ├── preparation.ts      # Page read, link fix, sources normalize
│   │       └── programmatic.ts     # Fast programmatic scanners
│   └── prompts/                    # LLM prompt templates (ingestion, generation, merge, fixes, lint, conversation)
├── schema/                         # Schema co-evolution
│   ├── manager.ts                  # SchemaManager (read/write schema config)
│   ├── auto-maintain.ts            # File watcher, periodic lint, startup quick fixes
│   ├── analyze.ts                  # Schema-analyze with cancel wiring
│   ├── schema-context.ts           # SchemaContext (parsed representation)
│   ├── parse-suggestion.ts         # Parse LLM schema suggestion response
│   └── apply-suggestion.ts         # Apply suggestion with auto-backup
├── ui/
│   ├── settings.ts                 # Settings panel
│   ├── modals.ts                   # Lint/Ingest/Query modals
│   └── schema-diff-modal.ts        # IDE-style schema diff Modal
├── core/                           # Pure function modules (zero IO, fully testable)
│   ├── i18n.ts                     # Type-safe i18n accessor
│   ├── slug.ts                     # Slug computation + alias filtering
│   ├── json.ts                     # JSON response parsing + repair
│   ├── frontmatter.ts              # Frontmatter parse/merge/constraints
│   ├── tag-vocab.ts                # Active tag vocabulary helpers
│   ├── index-search.ts             # Index parsing + local keyword match
│   ├── rate-limit.ts               # Rate-limit detection + notice formatting
│   ├── report.ts                   # Report truncation + heading nesting
│   ├── arrays.ts                   # Array coercion + source tag extraction
│   ├── markdown.ts                 # Markdown cleanup + thinking block extraction/encoding
│   ├── sources-normalizer.ts       # Sources field normalization
│   ├── truncation-retry.ts         # Token truncation retry policy
│   ├── dead-link-detector.ts       # Dead link identification
│   ├── orphan-matcher.ts           # Orphan page matching
│   ├── prompt-builders.ts          # Prompt template builders + path normalization
│   ├── batch-limits.ts             # Adaptive batch sizing
│   ├── batch-merger.ts             # Multi-batch result merging
│   ├── convergence-detector.ts     # Early-stop on low-yield batches
│   ├── sse-parser.ts               # SSE event parser (anthropic + openai formats)
│   ├── token-cap.ts                # max_tokens cap helper
│   ├── status-bar.ts               # Ingest status bar text composition (name + batch progress)
│   ├── diff.ts                     # LCS line diff algorithm
│   ├── backup-rotation.ts          # Backup file rotation (MAX_BACKUPS=3)
│   ├── detail-renderer.ts          # Detail block rendering
│   └── conflict-resolver.ts        # Conflict detection
└── __tests__/                      # Unit tests (vitest, 1006 tests)
```

---

## 🛡️ Six-Gate Quality Closure

Every change must pass all six gates before being considered complete. Gates 1-4 are developer-responsible (checked during development and in Step 2 of the release workflow). Gates 5-6 are automated by `pre-release-gate` before user approval.

| Gate | Constraint | How | Who |
|------|-----------|-----|-----|
| **1. Code correct** | `pnpm lint` 0/0 + `npx tsc --noEmit` 0/0 + `pnpm test` all pass + `pnpm build` clean + `pnpm css-lint` 0 | 5-Gate script | Developer |
| **2. No side effects** | Call-site audit + data flow trace + state mutation check + error propagation check | Structured review | Developer |
| **3. No breaking changes** | API/Schema/File format/Default behavior/Command IDs/Obsidian API all backward-compatible | Breaking-change matrix | Developer |
| **4. No performance regression** | CPU/memory/IO/network/token usage — 5-dim walkthrough, written assessment table | simplify + code-review + Gate 4 table | Developer |
| **5. Docs complete** | 9 READMEs + ROADMAP + CLAUDE.md + CHANGELOG + memory all updated | pre-release-gate | Gate |
| **6. Release clean (superset of 1-5)** | Gate 1-5 all green, PLUS TOC anchors + localization + Release Notes + Contributors + git hygiene + **Gate 4 perf re-verification** | pre-release-gate | Gate |

### Gate 1: Five-Gate automated

Must all pass sequentially. If any fails, fix root cause (no `@ts-ignore` or `eslint-disable` to silence):

```bash
pnpm lint           # ESLint + Obsidian rules: 0 errors, 0 warnings
npx tsc --noEmit    # TypeScript: 0 errors (ESLint does NOT check type safety)
pnpm test           # Vitest: all pass, 0 failures
pnpm build          # esbuild: clean exit
pnpm css-lint       # CSS: 0 !important declarations in styles.css
```

**Five-gate critical note**: ESLint checks code style, TypeScript checks type safety, css-lint checks Obsidian review compliance — three complementary checks. Single tool passing is insufficient.

```bash
pnpm lint           # Gate 1: ESLint - 0 errors, 0 warnings
npx tsc --noEmit    # Gate 1: TypeScript - 0 errors, 0 warnings
pnpm test           # Gate 1: Tests - all pass, 0 failures
pnpm build          # Gate 1: Build - clean exit
pnpm css-lint       # Gate 1: CSS - 0 !important declarations
```

### Gate 2: No Side Effects — structured review

For each modified function, trace:
- **Call-site audit**: `grep -rn "<fn>" src/` → check arguments, return value, error handling
- **Data flow**: inputs (origin?) → outputs (destination?) → side effects (file/API/DOM?)
- **State mutation**: concurrent safety? file overwrite vs append?
- **Error propagation**: new error paths caught by all callers?

**Deliverable**: 3-5 sentence side-effect assessment.

### Gate 3: No Breaking Changes — structured review

| Dimension | Check | Pass Criteria |
|-----------|-------|---------------|
| API Signature | `git diff` + `grep` | All call-sites updated; no new required params without defaults |
| Settings Schema | `types.ts` + `settings.ts` | New fields have defaults; removed fields ignored |
| File Format | Generation templates | Old files load without error |
| Default Behavior | Constructor / config init | Old behavior preserved unless opted in |
| Command/Setting IDs | `grep` for IDs/keys | IDs unchanged |
| Obsidian API | `manifest.json` | `minAppVersion` >= current |

**Deliverable**: "None detected" or specific migration plan.

### Gate 4: No Performance Regression — structured procedure

Performance regressions in this plugin have a user-visible cost (the Lint
phase on a 2000-page vault already runs 60+ seconds). Every change must
explicitly clear five performance dimensions **within the change scope**.

**Procedure** (do not skip):

1. **Run `simplify` skill** (3 parallel agents: Code Reuse / Code Quality / Efficiency). The Efficiency agent covers most of dimension 1-3 below.
2. **Run `code-review` skill** (max effort). Catches performance foot-guns specific to this codebase (e.g., N+1 LLM calls, N+1 vault ops).
3. **Walk through the 5 dimensions below** and produce a written assessment.
4. **If a dimension shows regression** → propose a mitigation OR escalate to user for sign-off. Do NOT silently accept regressions.
5. **If a dimension is N/A** (no code in that path) → state "N/A — no [hot path/IO/etc.] in change scope".

#### Five dimensions to evaluate

| # | Dimension | What to check | Project-specific signals |
|---|-----------|---------------|--------------------------|
| 1 | **CPU** | New O(n²) loops? Synchronous blocking in hot path? Hot loop allocating? | `O(n²) candidate generation` is the known risk — do not regress it. |
| 2 | **Memory** | Unbounded arrays / caches? Event listener leaks? Map growing without eviction? | `thinkingControlCache` (Record per baseUrl) is bounded by user count. `Map<string, PageMeta>` in `generateDuplicateCandidates` holds all pages in memory at once. |
| 3 | **IO** | Redundant file reads? N+1 vault operations? Unnecessary re-serialization? | `vault.read()` per page in loops is expensive. `vault.modify()` per page × N. Index regen on every fix call (was pre-fix). |
| 4 | **Network** | Extra LLM calls per operation? Redundant API requests? Missing cache reuse? | `OpenAICompatibleClient.createMessage` should cache 400-fallback results (Issue #245). Lint dedup batches by 100 / budget 500 — overshooting is a real risk (Issue #99 followup). |
| 5 | **Token usage** | Increased prompt size? Unnecessary context in LLM calls? Wrong model? | Ingest prompts are 1-3K tokens. Lint dedup prompt = 100 candidates × ~30 tokens = 3K per batch. Be especially alert to LLM retries (each retry consumes the full prompt again). |

**Deliverable** (mandatory in commit body or PR description):
```
## Gate 4: Performance

| Dim | Status | Notes |
|-----|--------|-------|
| CPU | ✅ / ⚠️ / N/A | ... |
| Memory | ✅ / ⚠️ / N/A | ... |
| IO | ✅ / ⚠️ / N/A | ... |
| Network | ✅ / ⚠️ / N/A | ... |
| Token | ✅ / ⚠️ / N/A | ... |
```

A bare "no regression" without the table is **not acceptable**.

#### Anti-patterns that bypass Gate 4

- "I didn't touch the slow path" — hot paths can be regressed by adjacent changes (e.g., adding an extra vault.read() inside a loop).
- "simplify didn't flag it" — simplify's Efficiency agent is a starting point, not a complete audit. The 5-dim walkthrough is mandatory.
- "Premature optimization" — true for speculative work, false when measuring the change you're about to ship.

### Gate 5 + Gate 6

Gate 6 is a **superset of Gates 1-5**: re-verifies everything is still green
*plus* release-specific hygiene. Automated by the `pre-release-gate`
skill before user approval (release Step 5c). The skill's REPORT phase
must include:

- All Gate 1 mechanical checks (lint/tsc/test/build) — re-run, do not trust cached
- All Gate 4 dimensions marked with explicit ✅ / ⚠️ / N/A based on the change scope
- Gate 5 docs verification (checklist sweep)
- Gate 6 release hygiene (TOC anchors, i18n completeness, Contributors policy, git commit format)

If any dimension regresses between commit and release time, Gate 6
**fails** even if Gate 1-4 passed at commit time.

### ⚠️ Anti-patterns

- "The tests pass, so it's fine" → Tests only cover what you thought to test
- "It's just a one-line change" → One-line changes are the most dangerous
- "I'll add tests later" → Tests must accompany the change
- "The PR review will catch it" → The reviewer has less context than you
- "ESLint passes, TypeScript errors are fine" → ESLint does NOT check type safety

### ⚠️ Obsidian Plugin Submission Rules — `document` is forbidden in production

**`document`** (the bare global) is **strictly forbidden** in production code. Obsidian is a multi-window application — `document` may refer to the wrong window. The only valid document reference is **`activeDocument`** (Obsidian's popout-window-aware wrapper).

**`obsidianmd/prefer-active-doc` is a no-disable rule** in the Obsidian Community Plugin review pipeline. You **cannot** use `// eslint-disable-next-line obsidianmd/prefer-active-doc` in any file that will be submitted for review — the review bot will reject it regardless of the comment's description.

**Test-environment differences must be solved in test setup, not production code.** If jsdom lacks `activeDocument`, stub it in `src/__tests__/__support__/setup.ts`:

```typescript
// eslint-disable-next-line obsidianmd/no-global-this
(globalThis as Record<string, unknown>).activeDocument = globalThis.document;
```

Production code then simply uses `activeDocument` directly — no fallback, no eslint-disable comments.

This rule exists because Obsidian's review ruleset is stricter than the local ESLint config. **Local `pnpm lint` passing does NOT guarantee Obsidian review will pass.**

## ⚠️ Editor Discipline — No Bulk Scripts for Code or Documents

Every change via `Read` + `Edit` — no sed/awk/python for code or document editing. (2026-06-11: a brace-matching Python script broke 3 sites that 4-Gate still passed — wrong lexical block in `query-engine.ts`, unsafe `this: any` in `lint-controller.ts`.)

### Document editing rules (2026-06-24 post-mortem)

- **Read before Edit — always.** Know the exact surrounding context (5+ lines before/after) before constructing `old_string`. Never assume what's there from a grep match.
- **Verify with `git diff` after every multi-file edit pass.** Check for unintended deletions — `Read` only shows the lines you asked for, not the lines your `old_string` accidentally consumed.
- **grep alone is NOT sufficient for document editing.** A grep hit tells you *where* a pattern exists, not what surrounds it. Always follow grep with Read to see the full context, then construct Edit with exact line boundaries.
- **Verify idempotency after every edit.** Check that surrounding content (especially the section that follows the insertion point) is intact — no swallowed trailing bullets, no broken headings. `git diff --stat` first, then `git diff` the file if any lines changed unexpectedly.

## ⚠️ Git Safety Protocol

- **NEVER commit or push without explicit user permission.** Non-negotiable.

## 🔀 Git Branch Workflow (enforced since v1.20.2)

**Core principle: Never develop directly on main. Main only accepts PR merges.**

```
main (protected) ───────────────────────→ tag → release
  │
  ├── feat/xxx ── PR → review → merge
  │     ├── commit 1
  │     ├── commit 2
  │     └── commit 3
  │
  └── fix/xxx ── PR → review → merge
        └── commit 1
```

**Development flow (mandatory for every feature/fix):**

1. **Branch from main:** `git checkout -b feat/xxx` or `git checkout -b fix/xxx`
2. **Develop on the branch** — multiple commits OK, each with meaningful content
3. **Gate 1 verification:** `pnpm lint && npx tsc --noEmit && pnpm test && pnpm build && pnpm css-lint`
4. **Only after user confirmation** — push branch, create PR
5. **After PR merge** — switch back to main, pull, tag (if needed)

**Prohibited:**
- ❌ Committing directly on main (except lockfile-only changes)
- ❌ Pushing PR without user confirmation
- ❌ Mixing unrelated changes in one PR
- ❌ Fragmented commits (amend the previous commit or squash)

**When to amend vs new commit:**
- Fixing a problem in the previous commit → `git commit --amend`
- New feature / new fix → new commit
- Pre-release doc updates → can amend into the version bump commit

## 📦 Development Workflow

1. `pnpm lint && pnpm test && npx tsc --noEmit && pnpm build && pnpm css-lint` — all five must pass (Six-Gate Gate 1)

### Build modes

- `pnpm build` — **production** build (console.debug disabled, no sourcemap). Use for release.
- `pnpm build:dev` — **debug** build (inline sourcemap + console.debug preserved). Use when the user requests a local test build.
- `pnpm dev` — **watch** mode (rebuilds on file change).

When the user says "build local debug file for testing":
1. Run `pnpm build:dev` → outputs `main.js`, `manifest.json`, `styles.css`
2. Verify `main.js` ends with `//# sourceMappingURL=data:application/json;base64,...`
3. Confirm `console.debug` is NOT replaced

For full release workflow (commit + push + tag + release notes), use the `obsidian-plugin-release` skill. **Main branch is protected** — direct pushes rejected with `GH013`.

---

## 📋 Karpathy Philosophy Compliance

- **Knowledge compounds** — query results flow back into wiki
- **Human-in-the-loop** — LLM suggests, user decides
- **Three-layer architecture** — Sources → Wiki → Schema
- **Incremental accumulation** — wiki is persistent, not one-shot

## 🎯 Python Zen Design Principles

- **Simple > Complex** — comment not framework
- **Flat > Nested** — linear code beats micro-methods
- **Solve when it hurts** — don't optimize before measuring
- **Explicit > Implicit** — function types ARE documentation

## 🔑 Key Design Decisions

- **Tier 1/2 duplicate detection**: Tier 1 always verified (high-precision), Tier 2 fills token budget
- **`Promise.allSettled` error isolation**: One failure doesn't crash the batch
- **Pollution defense at write gate**: Centralized regex catches ALL sources
- **LLM semantic page selection**: Meaning-based matching, not keyword

---

## 🌍 Internationalization

- **UI**: 10 languages, 277+ fields
- **Wiki output**: 10 languages + custom input
- **Code**: English only, minimal comments

## 📋 Git Commit Standards

English, conventional commits. `feat:` `fix:` `docs:` `refactor:` `test:` `chore:`

### Auto-close issues via commit message

When a commit resolves tracked Issues, append `Closes #N` (or `Fixes #N` / `Resolves #N`) at the end of the commit body. This triggers GitHub to auto-close the issue when the commit hits the default branch.

```bash
git commit -m "fix: batch P0 fixes

- #94: propagate AbortSignal to fix-runners
- #96: inject extractionGranularity into lint

Closes #94, #96, #99"
```

**NEVER** use `gh issue close` or the GitHub UI to close issues manually — let the commit message do it. This keeps the git history → issue link intact and avoids premature closure before the code reaches default branch.

## 🧪 Development Quality Closure (TDD + Planning)

**Mandatory development loop for every code change** (new feature, bug fix, refactor). This is a quality closure — skipping any step is a violation.

```
1. Deep thinking    → What is the problem? Edge cases? Failure modes?
2. Plan             → Files to change, function signatures, side effects
3. Write test       → Failing test that defines expected behavior
4. Confirm RED      → Run test, verify it fails for the right reason
5. Implement        → Minimum code to make the test pass
6. Confirm GREEN    → Run test, verify it passes
7. Refactor         → Clean up; tests must still pass
8. 4-Gate verify    → lint + tsc + test + build all clean
9. Six-Gate review  → side effects + breaking + performance + doc + release
```

**When tests are required** (mandatory):
- New exported function, class, or module
- New behavior branch (any new if/else path)
- **Bug fix** — the test reproduces the bug; the fix makes the test pass
- Refactor that changes observable behavior

**When tests are optional**:
- Pure configuration, type-only changes, documentation

**Pre-existing code**: when modifying a function with zero tests, add at least one test for the changed path first.

**Why this is a closure, not a checklist**: Each step depends on the previous. Skipping "design test" leads to misaligned implementation. Skipping "confirm RED" means you don't know if the test actually catches the bug. Skipping "refactor" accumulates technical debt. Skipping "4-Gate" lets broken code reach PR.

**Real example (2026-06-02)**: When extracting `parseSSEEvents`, the initial implementation was written first (TDD violation). User caught it. Corrected flow: 11 failing tests → confirmed all fail with `parseSSEEvents is not a function` → wrote minimal implementation → tests pass → fixed unused import warning + `isolatedModules` type export → 4-Gate green.

**🔴 Real example — TDD shell failure (2026-06-02, Issue #81)**: Wrote 4 `fixPollutedSources` tests, all using inline format `sources: ["..."]`. Production code took the **multi-line** path `sources:\n  - "..."`. A regex-only diff returned `fixed=2` but content didn't actually change. User discovered at runtime: "every Notice shows the same number, no real cleanup". This is the **shell test** failure mode — tests pass but don't verify behavior.

**Mandatory test rules (effective 2026-06-02)**:
1. **Cover ALL production code paths.** If a function branches on input format (inline vs multi-line, JSON vs YAML, etc.), write tests for EACH format. Inspect the production code to find all branches.
2. **Assert content mutation, not just return values.** After calling a mutating function, assert `output !== input` AND `output` contains the expected new content. Asserting `expect(fixed).toBe(N)` is necessary but not sufficient.
3. **Re-scan assertion for idempotency tests.** After one fix, re-invoke the detector on the output. If the detector still reports "polluted", the fix didn't actually work — the test must FAIL, not silently pass.
4. **Inspect actual output during debugging.** When a test passes suspiciously (e.g. "idempotent" passes on first run with no change), run a debug script that prints the function's actual output. Don't trust GREEN without seeing it.

**Test quality principle (root, 2026-06-02)**: A test that passes but does not faithfully simulate real-world behavior, does not cover corner cases, or is written merely to "make it pass" is a **shell test** — it provides false confidence and is worse than no test at all. **High-quality tests are the prerequisite for high-quality code.** If you cannot write a test that would catch a real bug in this function, the test is not yet ready. Write the test that would have caught the production bug — not the test that makes your implementation look right.

**Debug template** for "stuck counter" / "no real change" symptoms:
```ts
// src/__tests__/_tmp/debug.test.ts (delete after debugging)
import { fixX } from '../../core/x';
it('debug', () => {
  const r = fixX(input);
  console.log('OUTPUT:', r);
});
```

**Reference**: [[feedback-tdd-standard]] for full TDD standard with examples.

## ✅ Pre-Release Checklist

Use the `obsidian-plugin-release` skill for the full workflow (Steps 1-8). Gate 1 (lint + tsc + test + build + css-lint) must all pass before any commit.

---

## ⚠️ Development Protocol: Plan First, Then Execute

**Before starting any significant change** (refactoring, new modules, prompt modification, architectural decisions, or anything touching core engine files):

1. **Present your plan** — explain what, why, and how
2. **Wait for explicit user approval** before writing code or committing
3. **For multi-phase work**: pause and report after each phase

**Exceptions** (no prior approval needed): trivial one-line fixes, running lint/test/build, reading files, documenting existing code.

**Why**: The user is the domain expert on product vision. The AI has tooling capability but lacks product context. Propose, don't dispose.

## 🧪 TDD: Write Tests First

For any new function or behavior change: write a failing test first, then write the implementation, then refactor. When modifying untested core code, add at least one test for the path you're changing. See TDD Standard above.

---

**Maintainer:** Greener-Dalii | **Repository:** green-dalii/obsidian-llm-wiki
