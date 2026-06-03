# LLM Wiki Plugin Project Development Standards

**Last Updated:** 2026-06-02

---

## Current Phase: v1.15.0 — P1 + Selective P2 (Test Infrastructure)

### Completed (v1.15.0)
- ✅ **`parseSSEEvents` shared extraction** (Issue #207): Pure function module, 11 tests, used by both `AnthropicCompatibleClient` and `OpenAICompatibleClient`. -36 lines.
- ✅ **`AnthropicClient` truncation tests** (Issue #208): 9 new tests via `vi.mock('@anthropic-ai/sdk')`. Coverage: truncation detection, no-retry on non-max_tokens, outer withRetry, prefill brace restoration, MAX_TOKENS_BATCH cap, cacheBreakpoint passthrough.
- ✅ **`withTruncationRetry` shared helper** (Issue #211): Pure function module, 7 tests. Eliminated 3 duplicate truncation-retry blocks across LLM clients. -3 lines.
- ✅ **Issue #80 wiki init UX**: Auto-init wiki on LLM Ready + status indicator. Defensive `createFolder` in `regenerateDefaultSchema`. 8-language i18n.
- ✅ **`isWikiInitialized` DRY fix**: Extracted from `settings.ts` (2 duplicate sites → 1 method). 10 new tests cover IO check, auto-init, schema button, defensive createFolder.
- ✅ **Streaming architecture investigation**: Documented in memory + ROADMAP P3. Root cause: commit `13e5777` replaced OpenAI SDK with `requestUrl` for "CORS" (pseudo-reason — Electron actually bypasses CORS). Only Anthropic official has true streaming.
- ✅ **453 tests** across 22 test files (+53 since v1.14.0).

### Deferred to P3 (high mock complexity — current ROI insufficient)
- ⏸ wiki-engine `ingestSource` full-path tests (P2 #4 → P3 #14): requires Obsidian App + 5 submodule mocks
- ⏸ query-engine core flow tests (P2 #5 → P3 #15): requires Modal + MarkdownRenderer + DOM mocks

### Earlier Releases

Complete version history (v1.14.0 → v1.0.0) is maintained in [ROADMAP.md](ROADMAP.md). CLAUDE.md tracks only the current phase and active work items.

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

### Evaluated & Rejected

| Proposal | Source | Reason |
|----------|--------|--------|
| Hexagonal Architecture refactoring | Audit 1 | Over-engineering for Obsidian plugin; mock alone enables testing |
| Vector search (Ollama embeddings) | Audit 1 | Requires Ollama + embedding model; <1% of users have this |
| Hash-bucket dedup optimization | Audit 1 | No user-reported perf issue; solve when it hurts |
| page-factory try/catch completion | Audit 2 | Exceptions bubble to wiki-engine's centralized error handler by design |
| API URL validation | Audit 1 | Obsidian's requestUrl already validates; self-phishing impossible |

### P3 — Nice-to-have
- #36 — Source title in frontmatter: needs clarification from issue author

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

### 3. No Test Errors or Warnings — **Four automated gates (2026-06-01 upgrade)**

```bash
# Gate 1: ESLint (code style + logic rules)
pnpm lint
# Required: 0 errors, 0 warnings
# Checks: no-unused-vars, no-floating-promises, Obsidian rules, etc.

# Gate 2: TypeScript (type safety)
npx tsc --noEmit
# Required: 0 errors, 0 warnings
# Checks: type matching, interface completeness, null/undefined handling
# Critical: ESLint passing does NOT guarantee type safety, must verify separately

# Gate 3: Tests (functional validation)
pnpm test
# Required: all pass, 0 failures

# Gate 4: Build (production compilation)
pnpm build
# Required: clean exit
```

**Critical note (Phase 4 lesson):**
- **ESLint and TypeScript are complementary tools, must BOTH pass**
- ESLint does NOT check type matching (e.g., missing required interface fields)
- TypeScript does NOT check code style (e.g., no-floating-promises)
- **Single tool passing is insufficient, requires dual verification**

If any gate fails: fix the root cause, do NOT add `@ts-ignore` or `eslint-disable`
to silence it. Re-run all four gates after each fix.

### ⚠️ Anti-patterns that bypass these checks

- "The tests pass, so it's fine" → Tests only cover what you thought to test
- "It's just a one-line change" → One-line changes are the most dangerous
- "I'll add tests later" → Tests must accompany the change, not follow it
- "The PR review will catch it" → The reviewer has less context than you
- "ESLint passes, TypeScript errors are fine" → ESLint does NOT check type safety

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
9. Three-No review  → No side effects, no breaking changes, no warnings
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

**Reference**: [[feedback-tdd-standard]] for full TDD standard with examples.

## ✅ Pre-Commit Checklist

**四重Gate验证（2026-06-01升级）**：

```bash
pnpm lint           # Gate 1: ESLint - 0 errors, 0 warnings
npx tsc --noEmit    # Gate 2: TypeScript - 0 errors, 0 warnings
pnpm test           # Gate 3: Tests - all pass, 0 failures
pnpm build          # Gate 4: Build - clean exit
```

**重要**：四个命令必须**全部通过**才能提交。单一工具通过不足够（Phase 4教训）。

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
