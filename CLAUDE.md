# LLM Wiki Plugin Project Development Standards

**Last Updated:** 2026-06-30

---

## Current Phase: v1.22.6 (released 2026-06-30) → v1.23.0 (AI-SDK Migration + Graph Engine in flight)

### Completed (v1.22.6) — Hotfix: #204 + #207 follow-up (2026-06-30, **both CLOSED**)

Closed two user-reported bugs on the v1.22.5 baseline before pushing v1.23.0 (which has the AI-SDK migration in flight). Both PATCH scope (backward-compatible bug fixes). **Both issues auto-closed by `Closes #N` in the v1.22.6 release commit (2026-06-30).**

- ✅ **#204 — Auto Ingest no longer opens a blocking modal when `autoIngestNotificationLevel: notice`.** v1.22.2 added `onAutoIngestDone` (Notice path) but never wired it into the watch-mode auto-ingest path — every ingest completion went through `onIngestDone` which always opens `IngestReportModal`, making the "Notice (non-blocking)" UI setting a no-op. Added `trigger?: 'auto' | 'manual'` field to `IngestReport` and `IngestOptions`, propagated through `WikiEngine.ingestSource` → `onDone` report. Completion callback `LLMWikiPlugin.onIngestDoneDispatch` routes `trigger='auto'` to `onAutoIngestDone` (Notice respecting `autoIngestNotificationLevel`) and otherwise keeps the legacy `IngestReportModal` path. Manual ingest behavior unchanged.
- ✅ **#204 follow-up — Auto Smart Fix completion is now context-aware.** Same trigger pattern applied to `runLintWiki`: third `trigger` parameter (default `'manual'`). Periodic auto lint (`AutoMaintainManager.schedulePeriodicLint`) passes `trigger='auto'`; manual lint commands keep the default. Completion dispatch: manual → `LintReportModal` (unchanged UX); auto + `autoSmartFix=true` → Notice + run fixAll; auto + `autoSmartFix=false` → Notice only with History panel hint.
- ✅ **#207 follow-up — GPT-5 Pro variants (`gpt-5.x-pro`) now route correctly to `/v1/responses`.** Verified against `developers.openai.com/api/docs/models/gpt-5-pro`: "GPT-5 Pro is available in the Responses API only." v1.22.5's `RESPONSES_API_MODEL_RE` matched `gpt-5.x` but missed the trailing `-pro` suffix, so `gpt-5.2-pro` / `5.4-pro` / `5.5-pro` silently went to `/v1/chat/completions` where Pro models don't exist → 404. Broadened the regex to `^(gpt-5\.[1-9]\d*(?:-pro)?|o1(?:-mini|-preview)?|o3(?:-mini|-pro)?|o4-mini)$`. `gpt-5-chat-latest` exclusion kept (Chat Completions by design).
- ✅ **Tests: 1118 passing.** +14 since v1.22.5 (new `auto-maintain-trigger.test.ts` with 6 tests, new `lint-trigger-dispatch.test.ts` with 4 tests, `llm-client-responses-api.test.ts` adds 4 `-pro` model IDs, `auto-maintain.test.ts` updated for trigger field round-trip).
- ✅ **Release flow lessons captured:** v1.22.6 hotfix exposed an H2 boundary misidentification bug in 5/8 locale READMEs (line-number offset from EN applied blindly to i18n files whose WN H2 lands at different lines). 4 leftover doubled recommendation lines cleaned. New doc-review Phase 3d check + obsidian-plugin-release Step 3c per-file H2 boundary pre-check prevent regression. Recorded in `feedback_doc_h2_boundary_bulk_insert.md`.

Closed the second half of #207 — reasoning model family (gpt-5.1+ / gpt-5.5 / o1-o4) now uses OpenAI's Responses API, and the Test Connection Notice surfaces the provider's full error body (e.g. "insufficient_quota") instead of bare "status 429". #207 stays open for real-world user testing before final close.

- ✅ **#207 follow-up — Reasoning model family uses OpenAI Responses API.** v1.22.4's `max_tokens` ↔ `max_completion_tokens` probe was necessary but not sufficient — `gpt-5.1-chat-latest` / `gpt-5.5` / `o1` / `o3` / `o4-mini` still failed Test Connection with 400 because Chat Completions has compatibility issues for the reasoning family. Per OpenAI's official GPT-5.5 migration guide ("GPT-5.5 works best in the Responses API"), v1.22.5 routes the reasoning family to `/v1/responses` with `reasoning: { effort: 'low' }`. `gpt-5-chat-latest`, `gpt-4.1`, `gpt-3.5-turbo`, and all non-OpenAI baseUrls (Ollama, LM Studio, DeepSeek, etc.) continue on `/v1/chat/completions` unchanged. Detection is a pure-function `isResponsesApiModel(model, baseUrl)` export, gated to `https://api.openai.com/v1` only.
- ✅ **Test Connection Notice now surfaces the provider's full error body.** Obsidian's `requestUrl` throws on 4xx WITHOUT populating the Error with the provider body, so v1.22.4's `extractProviderErrorMessage()` couldn't see the actual diagnostic. v1.22.5 wraps the failing request in a `window.fetch` re-fetch (5s timeout) and merges the provider body into `Error.message` — users now see e.g. `"status 429: You exceeded your current quota, please check your plan and billing details"`. Raw body also logged at `console.warn` for DevTools investigation. Non-OpenAI baseUrls get the same enrichment via the existing Chat Completions path.
- ✅ **429/5xx now retry with exponential backoff on the Responses API path.** v1.22.4's `withRetry` (3 attempts, 1s/2s/4s + jitter) covered only the Chat Completions path. v1.22.5 wraps the new Responses API path in the same `withRetry` so transient 429 quota bumps no longer immediately fail Test Connection.
- ✅ **Tests: 1104 passing.** +28 since v1.22.4 (new `llm-client-responses-api.test.ts` with 28 tests covering endpoint routing, body shape, error enrichment, withRetry integration, custom baseUrl compatibility, and reasoning-family model coverage). Existing dot-naming gpt-5.x regression test (v1.22.4) and `thinking.type='disabled'` Chat Completions tests refactored to use `gpt-5-mini`/`gpt-5-nano`/`gpt-4.1` (the Chat Completions path models).

### In Flight (v1.23.0) — Graph Engine PPR + AI-SDK v6 Migration (2026-06-30)

**Single-branch release (corrected 2026-06-30):** `refactor/v1.23.0-ai-sdk-migration` is the sole release branch. `feat/v1.23.0-graph-engine-kickoff` (frozen at `4dec289`, P1-6 done) was originally thought to need merging, but `git ls-tree` verified that 5/6 Graph Engine modules are byte-identical between branches and `ppr-cascade.ts` is a strict superset on AI-SDK branch (has P2 improvements). Since graph-engine has **0 commits after the fork**, AI-SDK branch is its strict superset — no merge needed.

**Branch relationship**: parallel fork from merge-base `4dec289`. v1.23.0 release path = merge both, with care around AI-SDK branch LLM call sites (PPR in graph-engine branch needs to switch to AI-SDK).

**Completed in v1.23.0 so far (across both branches):**
- ✅ **Phase 5.1.5 — UX Onboarding + Multi-File Ingest** (Welcome note + D8 LLM dynamic translation, #130 IngestQueue modal, i18n in 10 locales)
- ✅ **P0-1 / P0-2 / P0-3** — CC0 50-page eval fixture, baseline report, CLAUDE.md cleanup
- ✅ **P1-1 / P1-2 / P1-3 / P1-4** — `core/section-extractor.ts` (Tier B), `core/monte-carlo-ppr.ts` (MC-PPR), `core/hub-detection.ts`, `core/ppr-cascade.ts` (hybrid guard)
- ✅ **P1-5** — Query Wiki integration with LLM seed selection (three-tier pipeline: lex fast path → LLM seeds → PPR walks)
- ✅ **P1-6** — Lint hub-link distinctiveness scanner (229 LOC + 15 tests, closes #157/#175)
- ✅ **P1-7 (AI-SDK Day 1-3)** — Migrate to Vercel AI-SDK v6 (`@ai-sdk/openai@3`, `@ai-sdk/anthropic@3`, `@ai-sdk/openai-compatible@2`, `ai@6`). Deleted 1625-LOC `llm-client.ts` + 8 old test files. New `src/llm-sdk/` (4 files, 949 LOC) + `src/core/obsidian-fetch-bridge.ts` (326 LOC).
- ✅ **P2-2 partial** — cascade + seeds token + LLM seed retrieval improvements
- ✅ **PR #215 (open, approved)** — `core/hub-retirement.ts` (hub-retirement crystallization signal, 175 LOC + 136 LOC tests). Merge target: `feat/v1.23.0-graph-engine-kickoff` (not AI-SDK branch).
- ✅ **Real-time streaming (resolves user Q1 feedback)** — v1.23.0 P2 + AI-SDK v6 migration: `result.textStream` true逐块 streaming in all 3 llm-sdk clients (`openai-sdk-client.ts:226`, `anthropic-sdk-client.ts:160`, `openai-compat-sdk-client.ts:194`). The "Restore true streaming for 3rd-party providers" backlog item is **DONE** (commits `2e51e23` + `6be9258`) — should NOT appear in future backlog/deferred lists.

**Remaining for v1.23.0 (priority order):**
- 🔄 **P1 — chunkToChars adapter** (AI-SDK migration Day 3.5, ~2h): real character-level streaming UI (user feedback on Q1). AI-SDK `streamText` returns word-level chunks, current UI is not "true streaming" until adapter lands.
- 🔄 **P1 — AI-SDK Coding Plan / z.ai / GLM-Anthropic baseURL verification** (Day 3.5, ~1h): confirm `createAnthropic({ baseURL })` works for non-Anthropic baseURLs (Q2 from user feedback). Edge case to lock in before release.
- 🔄 **P2 — Lint disable warnings cleanup** (Day 3.5, ~1h): leftover from AI-SDK migration.
- 🔄 **P2 — PPR parameter tuning** (P2-4, ✅ done 2026-06-30 on 2142-page real vault). T3 winner: `damping=0.05, numWalks=3000, walkLength=20`. R@5 21.5% → 23.8% (+11%). See `src/__tests__/fixtures/wikis/sample-50page/REAL_VAULT_EVAL.md`.
- 🔄 **P2 — Sponsor section** (Day 5, alongside release docs): Ko-fi link in all 10 READMEs after `Explore Repo with DeepWiki` anchor. **Was previously deferred to v1.23.1; now in v1.23.0 release flow per user instruction 2026-06-30.**
- 🔄 **P2 — Eval acceptance gate** (P2-3, Day 5): formal R@5 sign-off against baseline report. **Adding knn baseline as control** per @DocTpoint's #198 follow-up (2026-06-30): bge-m3 or OpenAI text-embedding-3-small embedding baseline, run via same fixture eval script. Eval report documents `cascade vs lex` AND `cascade vs knn` so cascade's relative lift is correctly attributed (semantic-over-keyword vs graph-over-semantic).
- 🔄 **P1 — pre-release-gate + doc-review + v1.23.0 release** (Day 5, ~0.5 day): commit + push + tag + release notes.

**v1.23.0 risk register:**
- Bundle size 1.24MB → 3.17MB (user accepted 2026-06-29, monitor CDN experience)
- Lazy import `await import()` for AI-SDK packages didn't reduce bundle (esbuild CJS inline); future ESM bundle / dynamic chunk can revisit
- #207 close decision: user will close manually after real-world testing — separate commit `Closes #207`, not part of v1.23.0
- #213 (configurable page categories): **Discussion-only, NOT confirmed for any minor release** per user instruction 2026-06-30. Requires broader community/architectural discussion before any commit.

**Deferred to v1.24.0+:**
- #213 configurable page categories (Discussion-only, not committed — see "Deferred to v1.25.0+" below)
- Hub-retirement lint wire-up (`core/hub-retirement.ts` 0 callers → wire `assessHubs` into lint path) — owned by @DocTpoint
- #36 source-title-in-extraction feature (closed 2026-05 with no follow-up; proposes `alwaysIncludeSourceTitle` setting; low ROI vs current PPR cascade which already recovers source pages via outgoing-link structure)
- LintFixer class → module-level functions (707-LOC god class split, 1 day)
- knn + cascade by-query-type complement (DocTpoint #198 follow-up, 2026-06-30) — see "v1.25.0+ research" below

**Deferred to v1.25.0+ (research / experimental):**
- Cold-start vocabulary seeding (DocTpoint proposal in #198, 2026-06-23 — **NOT committed, design TBD**). If pursued: would need a per-query classifier to decide knn vs cascade arm, plus opt-in embedding provider matrix. Currently rejected on ROI grounds (cascade R@5 27.1% vs knn 24.1% = only 3pp gap, per DocTpoint's #198 eval 2026-06-30; reinforcing #175 rejection).
- #213 configurable page categories — **Discussion-only**, NOT in roadmap; requires community/architectural discussion before any planning

**Branch relationship (corrected 2026-06-30):** `refactor/v1.23.0-ai-sdk-migration` is the **sole release branch**. `feat/v1.23.0-graph-engine-kickoff` was originally thought to need merging, but `git ls-tree` verified 5/6 Graph Engine modules are byte-identical between branches and `ppr-cascade.ts` is a strict superset on AI-SDK branch. Since `feat/v1.23.0-graph-engine-kickoff` has 0 commits after the fork (merge-base `4dec289`), **AI-SDK branch is graph-engine's strict superset — no merge needed**.

**v1.23.0 release path:**
1. ✅ PR #215 (hub-retirement) — already merged into AI-SDK branch directly on 2026-06-30
2. ✅ Branch topology verified — no merge required
3. ✅ PPR/seed selection LLM call sites already on AI-SDK adapters
4. Pre-release-gate + doc-review on `refactor/v1.23.0-ai-sdk-migration` (Day 5)
5. Tag `1.23.0` on AI-SDK branch

---

## 📁 Project Structure

> This section has moved to **[CONTRIBUTING.md](./CONTRIBUTING.md#project-structure)** — it is a contributor-facing reference (your IDEs display the file tree natively) and keeping it in CLAUDE.md was creating a stale copy that drifted from reality. The CONTRIBUTING.md version is maintained alongside code changes.

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

## 📚 Documentation Architecture

**One fact, one place. Reference, don't copy.** When the same information appears in two files, one will drift and lie. Each file has a single responsibility:

| File | Responsibility | What belongs | What does NOT belong |
|------|---------------|--------------|---------------------|
| **CLAUDE.md** | Dev standards + current phase | Six-Gate / TDD / Git workflow / current state (v1.22.6 released + v1.23.0 in flight) | Old release histories, project structure tree, full version timeline |
| **ROADMAP.md** | Planning | Next Milestone / Version Timeline (condensed) / Deferred & Backlog | Per-version detail (use CHANGELOG) |
| **CHANGELOG.md** | History (Keep a Changelog) | Per-version Added/Changed/Fixed/Removed — ancient versions are pre-aggregated, **do not re-merge** | Forward-looking plans, dev standards |
| **CONTRIBUTING.md** | Contributor guide | Project structure tree, architecture, Mermaid, dev setup | User docs, design philosophy |
| **9 READMEs** | User docs | Features / Quick Start / FAQ / What's New | Implementation details, internal version numbers |
| **memory/** | Session-persistent lessons | [[feedback-*]] (rules) + [[project-*]] (current state) | Code references that drift (use code comments) |

**Cross-reference format:** `[section](./OTHER.md#anchor)` — keep one canonical source, link to it.

**i18n rule:** User-facing strings (settings descriptions, error messages, READMEs) = user language, not implementation language. "Close the model's reasoning output" ✅ / "Disable thinking in 3-tier dialect fallback chain" ❌. See [[feedback-d8-welcome-no-hardcoded-i18n]] + v1.23.0 doc lessons.

**CHANGELOG rule:** Already aggregated per Keep a Changelog spec. Ancient versions (v1.6.x / 0.2.x) are pre-aggregated — do NOT re-merge. "Optimization" that deletes historical version info is a regression, not improvement. Verify with `grep -c "^## \[" CHANGELOG.md` before assuming it needs work.

---

**Maintainer:** Greener-Dalii | **Repository:** green-dalii/obsidian-llm-wiki
