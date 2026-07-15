# LLM Wiki Plugin Project Development Standards

**Last Updated:** 2026-07-15

---

## Current Phase: v1.25.0 PLANNING (2026-07-15, post-pivot) — cache-only PDF; PR2 redo + PR3 + PR4 next; v1.24.1 PATCH RELEASED 2026-07-14

**v1.25.0 scope decision (2026-07-15, user-confirmed post-pivot):**

Cache-only architecture replaces the previously-planned sidecar (`<vault>/<basename>.pdf.md`) approach.

- ✅ **PR2 redo (1-1.5 days)** — delete `pdf-ingest-orchestrator.ts`; refactor `wiki-engine.ingestPdfSource` to feed `convertPdfToMarkdown` result into `analyzeSource` via `contentOverride`; extend `PdfConversionCache` with `purgeExpired/enforceSizeLimit/prepareBatchIngest` (100MB / 1000-entry / 10MB-single caps + LRU-by-mtime eviction); add `converterVersion` to cache key; delete 5 dead i18n keys across 10 locales.
- ✅ **PR3 (1 day)** — settings: `writePdfMarkdownToVault` Advanced toggle (default false); `forcePdfSupport` toggle for BOTH `custom` AND `anthropic-compatible` (default false, manual opt-in); CHANGELOG; ROADMAP sync.
  - Settings types + DEFAULT_SETTINGS + advanced-settings toggle UI + advancedSettingsMode reset
  - 4 i18n keys × 10 locales for both PDF toggles
  - sidecar write via direct vault.create/modify (no createOrUpdateFile cascade)
  - normalizePath for cross-platform sidecar paths
  - 3 new tests: default no-sidecar, write creates sidecar, write updates existing
  - Code-review findings applied: simplified ingestion `ingestPdfSource` comment; used `normalizePath`; avoided `createOrUpdateFile` for sidecar to prevent auto-watch cascades.
- ⏳ **PR4 (optional, by AkaSakana)** — Kimi Files API provider dispatch + error regex classifiers + transient-retry extension. If AkaSakana ships as follow-up PR after v1.25.0 lands, we merge after review. If schedule slips, we port ourselves (1-day).
- ⏳ **Final** — `pnpm build:dev` + HARD STOP + user e2e + push decision.

**AkaSakana PR #286 feedback adopted (2026-07-15):**
- ✅ Cache key includes `converterVersion` so prompt upgrades invalidate stale entries.
- ✅ `forcePdfSupport` kept for BOTH `custom` and `anthropic-compatible`, default `false` (manual opt-in, NOT opt-out — many compatible endpoints don't reliably support PDF). (2026-07-15 user correction.)
- ⏳ Kimi Files API (PR4, optional contribution): upload → extract → delete, error regex classifiers, transient-retry extension. AkaSakana owns the contribution; we transfer responsibility to TA via PR #286 reply.

Full composition + execution plan: [ROADMAP.md](./ROADMAP.md)

**v1.24.1 PATCH release composition (2026-07-13/14 merge window):**
- ✅ Phase 1 (#271): Fix #1 #268 Tier C forceRecreate bypass
- ✅ Phase 2 (#276): page-factory.ts 1297-LOC god-class split (10 modules + 99 tests)
- ✅ Phase 3 (#277/280): Bedrock Stage 1 via bedrock-mantle (~+3 KB, zero new npm deps)
- ✅ Phase 4 (#269): #272 LM Studio no-key ingest fix
- ✅ Phase 5 (#281): 5-stage PPR seed-selection pipeline (lex → LLM keywords → local scan → LLM KB fallback → PPR) + post-e2e noise/correctness fixes. 1825 → 2060 tests.
- ✅ Phase 5.5 (#282): parseJsonResponse empty-body quiet path (`silentOnEmpty` + `throwOnEmpty`). Closes #255 + #274. 2060 → 2073 tests (+13).
- ✅ Phase 6 (#283): #258 entities-page redundant `## 基本信息` body block fix at the prompt + schema + lint layer. Closes #258. 2073 → 2080 tests (+7).

**Issues closed in v1.24.1:**
- #255 — Lint console errors (CLOSED via #282)
- #258 — entities-page `## 基本信息` drift (CLOSED via #283)
- #274 — Ollama Qwen3.5:9b no-key empty body (CLOSED via #282)
- #275 — deepseek seed-selector empty body (CLOSED via `Closes #275` in v1.24.1 release commit; e2e PASSED on deepseek-v4-flash)

**v1.24.2 PATCH open issues (next cycle):**
- #255 follow-up — none
- #275 streaming-mode port (`selectSeedsWithLLM` to streaming + parse first stop chunk) — Fix #0 candidate

Full composition + execution plan: [ROADMAP.md](./ROADMAP.md)

### Withdrawn / non-issues (kept for archaeology)

- **Windows: `Connection test failed: TypeError: Failed to construct 'Headers'`** — withdrawn 2026-07-10 (user input error: non-ASCII chars in API key field; not a plugin/AI-SDK bug). AI-SDK 5.0.53 has a Windows guard but our `provider-utils@4.0.35` (bundled by `ai@^6.0.214`) does not include the fix; not worth patching given root cause is user-side.

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
| **5. Docs complete** | 10 READMEs (EN + 9 i18n) + ROADMAP + CLAUDE.md + CHANGELOG + memory all updated | pre-release-gate | Gate |
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

Every change via `Read` + `Edit` — no sed/awk/python for code or document editing. (2026-06-11: a brace-matching Python script broke 3 sites that 4-Gate still passed — wrong lexical block in `query-engine.ts`, unsafe `this: any` in lint modules.)

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

### Commit author identity + co-authorship

The Claude Code sandbox uses a placeholder git identity (`Claude Code <claude@anthropic.com>`) that **must not** be the commit author on this project. Every commit attributed to "Claude Code" inflates the GitHub contributor graph with a non-human identity and obscures the actual maintainer trail.

**Canonical maintainer identity (verified against GitHub user `green-dalii`):**

```
name:  green-dalii
email: 654534332@qq.com
```

Some older commits on `main` were authored as `Greener-Dalii` (capitalized, used by the GitHub UI on merge operations). All NEW commits — including `--amend` and squash operations — MUST use the lowercase canonical form `green-dalii`. Do not retroactively rewrite history unless the user explicitly asks.

**Rules (added 2026-07-06 after manual test feedback):**

1. **Commit author** MUST be the maintainer:
   ```bash
   git -c user.name="green-dalii" -c user.email="654534332@qq.com" commit --amend --no-edit
   ```
   Or set it once per session before any commits:
   ```bash
   git config user.name "green-dalii"
   git config user.email "654534332@qq.com"
   ```
2. **Every commit MUST list the maintainer as `Co-authored-by`** (in addition to the AI model):
   ```
   Co-authored-by: green-dalii <654534332@qq.com>
   Co-authored-by: Claude Code <noreply@anthropic.com>
   ```
   **Format rule**: the AI `Co-authored-by` line MUST be exactly `Claude Code <noreply@anthropic.com>`. Do **NOT** include the specific model name (e.g. `Opus 4.8`), version number, or context-window size (e.g. `1M context`) — these are ad copy that pollutes git history and goes stale when the model is upgraded. (2026-07-15 rule.)
3. **NEVER** amend/squash a commit in a way that drops the `Co-authored-by: green-dalii` trailer — re-add it after every `git commit --amend`.
4. The `Co-Authored-By` line must NOT be wrapped in a code block or in any way obfuscated — GitHub reads it as a literal trailer.
5. When the session ends or you notice a missing co-author on any recent commit, **stop and fix it before continuing** — do not let the oversight propagate to the PR.

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
| **10 READMEs (EN + 9 i18n)** | User docs | Features / Quick Start / FAQ / What's New | Implementation details, internal version numbers |
| **memory/** | Session-persistent lessons | [[feedback-*]] (rules) + [[project-*]] (current state) | Code references that drift (use code comments) |

**Cross-reference format:** `[section](./OTHER.md#anchor)` — keep one canonical source, link to it.

**i18n rule:** User-facing strings (settings descriptions, error messages, READMEs) = user language, not implementation language. "Close the model's reasoning output" ✅ / "Disable thinking in 3-tier dialect fallback chain" ❌. See [[feedback-d8-welcome-no-hardcoded-i18n]] + v1.23.0 doc lessons.

**CHANGELOG rule:** Already aggregated per Keep a Changelog spec. Ancient versions (v1.6.x / 0.2.x) are pre-aggregated — do NOT re-merge. "Optimization" that deletes historical version info is a regression, not improvement. Verify with `grep -c "^## \[" CHANGELOG.md` before assuming it needs work.

---

**Maintainer:** Greener-Dalii | **Repository:** green-dalii/obsidian-llm-wiki
