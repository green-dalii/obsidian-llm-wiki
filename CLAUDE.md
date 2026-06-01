# LLM Wiki Plugin Project Development Standards

**Last Updated:** 2026-06-01

---

## Current Phase: v1.13.0 — Quality & Infrastructure

### Completed (v1.13.0)
- ✅ **Cross-type duplicate prevention (#54)**: `resolvePagePath()` checks opposite folder (entities ↔ concepts) when same-type matching fails. Cross-type collisions merge content into existing page instead of silently losing information. Contributed by @dmarchevsky.
- ✅ **Source analysis false abort fix (#61)**: First batch gate changed from `||` to `&&`. Only aborts when BOTH entities and concepts are absent. Contributed by @Indexed-Apogrypha (Matthew Harper).
- ✅ **NormalizeBatchResponse pure function**: Centralized ~8 scattered `|| []` fallbacks into `BatchValidity`-typed normalization. Fixes hidden TypeError for non-array truthy LLM output.
- ✅ **Aliases seeding**: `EntityInfo`/`ConceptInfo.aliases?` — extraction pre-generates alias seeds for page generation and multi-round dedup.
- ✅ **Multi-round extraction context**: Injects already-extracted names+aliases into later round prompts, eliminating LLM internal-state dependency.
- ✅ **Prompt task 0 rewritten**: Separated field round restrictions from content requirements.
- ✅ **Alias self-pointing dedup**: `filterRedundantAliases` skips aliases equal to the page's own filename.
- ✅ **Three-No Principle structured**: Actionable evaluation procedures (call-site audit, data flow trace, breaking-change matrix).
- ✅ **CI uses npm for build**: Matches Obsidian verification exactly — Build verification passes.
- ✅ **Think token stripping (Issue #64)**: `cleanMarkdownResponse` strips `<think>`/`<thinking>` blocks. Enables reasoning model support (DeepSeek-R1, QwQ).
- ✅ **LM Studio compatibility (Issue #65)**: `response_format: json_object` removed from OpenAI-compatible client. Prompt + prefilled `{` is sufficient.
- ✅ **Sources link constraint (Issue #63)**: `UNIVERSAL_LINK_CONSTRAINTS` injected into 3 previously-unprotected prompts (`generateSummaryPage`, `appendToReviewedPage`, `updateRelatedPage`).
- ✅ **ConflictResolver pure layer**: `src/core/conflict-resolver.ts` — zero-side-effect conflict detection, 7 unit tests.
- ✅ **Mock infrastructure**: `createMockContext` for core engine testing without Obsidian runtime.
- ✅ **firstBatchData type narrowing**: `Partial<SourceAnalysis>` → `NormalizedBatch`.
- ✅ **Constants centralization**: 16 token budget constants, 8 notice duration constants, retry params, `MAX_PAGE_CONTENT_CHARS`, `WIKI_SUBFOLDERS` activated.
- ✅ **loadRelevantPages content truncation**: Capped at `MAX_PAGE_CONTENT_CHARS` (~3000 tokens) per page.
- ✅ **appendAliases + buildPagesListForPrompt tests**: 8 test cases for page-factory core paths.
- ✅ **198 tests** across 6 test files (+25 since v1.12.4).

### Completed (v1.12.0)
- ✅ **Extraction prompt rearchitected**: Full page list removed from prompt. Extraction speed is now independent of wiki size. ~80% faster for typical files.
- ✅ **Dynamic batch limits + convergence detection**: Short content finishes in 1–2 batches. Long content gets enough batches. Low-yield batches terminate early.
- ✅ **Short-content auto-downgrade**: Sources <20K chars cap maxTotalItems proportionally, preventing "hard digging".
- ✅ **Deterministic related_pages matching**: `matchExtractedToExisting()` uses slug + alias matching — zero LLM cost, more reliable.
- ✅ **esbuild upgraded**: 0.17.3 → 0.28.0 (dev-server vulnerability fixed).
- ✅ **Production build suppresses console.debug**: `console.debug = function() {}` banner.
- ✅ **Granularity ≤ notation**: 8 languages synchronized with consistent numbers.
- ✅ **Extraction and lint progress improvements**: batch counts and cumulative results displayed.
- ✅ **What's New section in all READMEs**: Localized in 8 languages with proper TOC anchors.
- ✅ **Test coverage**: 140 tests across 3 test files (+27 since v1.11.0).
- ✅ **ROADMAP P2/P3 items addressed**: build:dev script, esbuild upgrade, Good First Issue tagging.

### P0 — In Progress

| Item | Source | Effort |
|------|--------|--------|
| Wiki-engine full-path tests (ingestSource, mock 6+ LLM calls) | Three independent audit consensus | 1 day |
| query-engine core tests | Audit consensus | 1 day |

### P1 — Planned

| Item | Source | Effort |
|------|--------|--------|
| page-factory resolvePagePath LLM fallback + merge + append tests | ROADMAP | 1 day |
| runLintWiki phase extraction (762 → 6 × ~130 lines) | ROADMAP | half day |

### P2 — Backlog

| Item | Effort |
|------|--------|
| Good First Issue tagging | 10min |

### Completed (v1.12.0)

### Evaluated & Rejected (v1.12.0)

| Proposal | Source | Reason |
|----------|--------|--------|
| Hexagonal Architecture refactoring | Audit 1 | Over-engineering for Obsidian plugin; mock alone enables testing |
| Vector search (Ollama embeddings) | Audit 1 | Requires Ollama + embedding model; <1% of users have this |
| Hash-bucket dedup optimization | Audit 1 | No user-reported perf issue; solve when it hurts |
| page-factory try/catch completion | Audit 2 | Exceptions bubble to wiki-engine's centralized error handler by design |
| API URL validation | Audit 1 | Obsidian's requestUrl already validates; self-phishing impossible |

### Completed (v1.11.0)
- ✅ **Issue #42 — llmReady gating**: New users must complete Provider → API Key → Fetch Models → Test Connection before core features unlock.
- ✅ **Issue #43 — Cancel ingestion mid-run**: `AbortController` with checkpoints at batch boundaries. Status bar item (clickable) + command palette (`Cancel current ingestion`). Folder loop breaks on cancel. Immediate Notice feedback.
- ✅ **Issue #44 — Ribbon icon + ingest current file**: `addRibbonIcon('sticker')` + command `Ingest current file`. Uses `getActiveFile()` to skip file picker. 8-language i18n.
- ✅ **Issue #41 — 529 "Overloaded" not retried**: Error messages embed HTTP status codes. All retry regex patterns include `overload` keyword. All 3 client classes covered.
- ✅ **Issue #37 — Double-nested wiki-links**: Three-layer defense (prompt + post-processing + integrity check). Lint auto-fix for historical damage. `updateRelatedPage` returns `boolean`.
- ✅ **Issue #40 — Opposite-directory stubs**: Slug-equivalence matching in both LLM and deterministic stub safety nets.
- ✅ **Issue #34 — Extraction prompt rewrite**: Graph-centric ("wiki-link test"). Bibliographic references excluded. Entity Recognition Guide updated.
- ✅ **Issue #39 — `mentions_in_source` filtering**: `truncateMentions()` caps at 500 chars. 3 replacement points in page-factory.ts.
- ✅ **ROADMAP P1 — PageFactory refactoring**: 8 methods → 4 generic (563→424 lines, -25%). Public API unchanged.
- ✅ **ROADMAP P1 — LLM client retry extraction**: Shared `withRetry<T>` helper (-67 lines in llm-client.ts).
- ✅ **ROADMAP P1 — `createMessageStream` language cleanup**: Removed unused `language` parameter from interface and 3 implementations.
- ✅ **ROADMAP P2 — All items completed**: Supplemental tests (+15, 113 total), mentions truncation, slugify log reduction, Chinese comment cleanup.
- ✅ **ROADMAP P2 — #38 Anthropic prompt caching evaluated & rejected**: System prompts too small for cache threshold. User message caching via `cacheBreakpoint` already handles main savings.

### Completed (v1.10.2)
- ✅ **Custom granularity per-type limits fix**: Three inconsistencies fixed — `source-analyzer.ts` enforces per-type caps, `getGranularityInstruction()` injects concrete numbers, `getGranularityFixLimits()` reads user settings. +6 unit tests.

### Completed (v1.10.1)
- ✅ **Issue #32 — Slug normalization in resolvePagePath**: Fast path 2 checks title + aliases via normalized slug comparison. +4 unit tests.

### Completed (v1.10.0)
- ✅ **Issue #30/#31 — Aliases + Granularity expansion**: Minimal/Custom options, UX improvements, i18n across 8 languages.

### P3 — Nice-to-have
- #36 — Source title in frontmatter: needs clarification from issue author
- #38 — Anthropic prompt caching: evaluated & rejected (system prompts too small for cache threshold; `cacheBreakpoint` already handles main savings)

### Test Coverage
- **113 unit tests** via vitest across 2 test files
- CI-ready: `pnpm lint && pnpm test && pnpm build && npx tsc --noEmit`

---

## 📁 Project Structure

```
src/
├── main.ts                         # Plugin entry point
├── types.ts                        # Shared types + EngineContext
├── utils.ts                        # Utilities (slugify, parseJson, etc.)
├── texts.ts                        # i18n texts (barrel, 8 languages)
├── llm-client.ts                   # LLM clients
├── wiki/                           # Wiki engine
│   ├── wiki-engine.ts              # Orchestrator
│   ├── query-engine.ts             # Conversational query
│   ├── source-analyzer.ts          # Iterative batch extraction
│   ├── page-factory.ts             # Entity/concept CRUD + merge
│   ├── conversation-ingest.ts      # Chat → wiki knowledge
│   ├── lint-fixes.ts               # Fix logic
│   ├── lint-controller.ts          # Lint orchestration
│   ├── lint/                       # Lint sub-modules
│   ├── contradictions.ts           # Contradiction detection
│   ├── system-prompts.ts           # Language directive + labels
│   └── prompts/                    # LLM prompt templates
├── schema/                         # Schema co-evolution
├── ui/
│   ├── settings.ts                 # Settings panel
│   └── modals.ts                   # Lint/Ingest/Query modals
└── __tests__/                      # Unit tests (vitest, 121 tests)
```

---

## 🛡️ Three-No Principle

Every change must satisfy all three before being considered complete.
**Automated gates catch syntax/type/test errors; manual review catches logic
and architectural errors that no linter can see.**

### 1. No Side Effects — required structured review

**Goal**: The change does not alter behavior outside its intended scope.

#### 1a. Call-site Audit
Run `grep -rn "<functionName>" src/` to list every call-site. For each:
- [ ] **Arguments**: check if any caller depends on old return value / side effect
- [ ] **Return value**: check if any caller would break with new return shape
- [ ] **Error handling**: check if try/catch or `.catch()` paths still make sense

#### 1b. Data Flow Trace
For each modified function, trace:
- [ ] **Inputs**: Where does each parameter value originate? (user input / setting / file / LLM / computed)
- [ ] **Outputs**: Where does each return value / mutated state go? (file write / UI / downstream function / cache)
- [ ] **Side effects**: Does the function mutate external state? (file system, Obsidian API, global vars, DOM)
- [ ] **IO points**: Mark every `await this.ctx.*`, `app.*`, `document.*`, `localStorage.*`

#### 1c. State Mutation Analysis
- [ ] If the function is async: can it run concurrently with itself or another function touching the same state?
- [ ] If the function writes files: does it overwrite or append? Is the path deterministic?
- [ ] If the function reads settings: does it handle missing/new fields gracefully?

#### 1d. Error Propagation Check
- [ ] New error paths: are they caught by all callers?
- [ ] Changed error types: do existing catch blocks still match?
- [ ] Silent failures: are there any paths that swallow errors without logging?

**Deliverable**: A 3-5 sentence side-effect assessment, e.g.:
> "Modified `resolvePagePath` is called from 2 private methods in PageFactory.
> The new `collision` return field is consumed by `createOrUpdatePage` and
> `IngestReportModal` only. No other module touches this path. The function
> still writes aliases via `appendAliases` (same side effect as before); no
> new IO introduced."

### 2. No Breaking Changes — required structured review

**Goal**: Existing users do not need to reconfigure or migrate data.

| Dimension | Check | Method | Pass Criteria |
|-----------|-------|--------|---------------|
| **API Signature** | Function params / return type changed? | `git diff` + `grep` | All call-sites updated; no new required params without defaults |
| **Settings Schema** | `data.json` fields added/removed? | Check `types.ts` + `settings.ts` | New fields have defaults in constructor; removed fields are gracefully ignored |
| **File Format** | Frontmatter / output / index format changed? | Check generation templates | Old files load without error; new format is backward-compatible |
| **Default Behavior** | Any default value changed? | Check constructor / config init | Old behavior is preserved unless explicitly opted in |
| **Command/Setting IDs** | Any command palette ID or setting key renamed? | `grep` for IDs/keys | IDs unchanged; if changed, old IDs still map |
| **Obsidian API** | Minimum Obsidian version requirement changed? | `manifest.json` | `minAppVersion` >= current; no new Obsidian-exclusive APIs |

**Deliverable**: A breaking-change verdict: "None detected" or a specific migration plan.

### 3. No Test Errors or Warnings — automated gates

```bash
pnpm lint          # ESLint: must produce 0 errors, 0 warnings
pnpm test          # Vitest: all pass, 0 failures
npx tsc --noEmit   # TypeScript: 0 errors
pnpm build         # esbuild: clean exit
```

If any gate fails: fix the root cause, do NOT add `@ts-ignore` or `eslint-disable`
to silence it. Re-run all four gates after each fix.

### ⚠️ Anti-patterns that bypass these checks

- "The tests pass, so it's fine" → Tests only cover what you thought to test
- "It's just a one-line change" → One-line changes are the most dangerous
- "I'll add tests later" → Tests must accompany the change, not follow it
- "The PR review will catch it" → The reviewer has less context than you

## ⚠️ Git Safety Protocol

- **NEVER commit or push without explicit user permission.** Non-negotiable.

## 📦 Development Workflow

1. `pnpm lint && pnpm test && npx tsc --noEmit && pnpm build` — all four must pass (Three-No Principle)
2. Update relevant docs and memory
3. Present change summary for user review
4. Commit locally after user approval (do NOT push directly to main)
5. When ready to push: create a feature branch, push the branch, create a PR, merge via GitHub UI
6. Main branch is protected — direct pushes are rejected

```bash
# Push workflow (main is protected)
git checkout -b feat/short-description
git push origin feat/short-description
gh pr create --title "feat: description" --body "## Summary\n...\n\n## Test plan\n- [x] ..." --base main
gh pr merge <PR#> --merge --delete-branch
git checkout main && git pull origin main
```

## Tag & Release workflow

**Use `/obsidian-plugin-release` skill for complete release preparation.**

Tags are pushed AFTER the PR is merged to main:
```bash
# Ensure you're on the latest main with the merged commit
git checkout main && git pull origin main
git tag -a X.Y.Z -m "X.Y.Z"
git push origin X.Y.Z
# GitHub Actions creates the draft release automatically
```

**Before version bump commit**, verify ALL items in skill's Pre-Release Checklist:
- All 8 READMEs' "What's New" section REPLACED (not appended)
- TOC links match actual heading text exactly
- CHANGELOG.md entry added
- Lockfiles regenerated (pnpm + npm official registry)

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

- **UI**: 8 languages, 269+ fields
- **Wiki output**: 8 languages + custom input
- **Code**: English only, minimal comments

## 📋 Git Commit Standards

English, conventional commits. `feat:` `fix:` `docs:` `refactor:` `test:` `chore:`

## ✅ Pre-Commit Checklist

- `pnpm lint` (0 errors), `pnpm test` (all pass), `pnpm build` (clean), `npx tsc --noEmit` (0 errors)
- `pnpm lint` (0 errors), `pnpm test` (all pass), `pnpm build` (clean), `tsc --noEmit` (0 errors)

---

## ⚠️ Development Protocol: Plan First, Then Execute

**Before starting any significant change** (refactoring, new modules, prompt modification, architectural decisions, or anything touching core engine files):

1. **Present your plan** — explain what, why, and how
2. **Wait for explicit user approval** before writing code or committing
3. **For multi-phase work**: pause and report after each phase

**Exceptions** (no prior approval needed): trivial one-line fixes, running lint/test/build, reading files, documenting existing code.

**Why**: The user is the domain expert on product vision. The AI has tooling capability but lacks product context. Propose, don't dispose.

---

**Maintainer:** Greener-Dalii | **Repository:** green-dalii/obsidian-llm-wiki
