# LLM Wiki Plugin Project Development Standards

**Last Updated:** 2026-05-26

---

## Current Phase: v1.12.0 — Test Infrastructure & Structural Refinement

Two independent audits (v1.11.0) converged on two gaps: (1) core module test vacuum, (2) structural issues in lint-controller. P0 addresses both.

### P0 — In Progress

| Item | Source | Effort |
|------|--------|--------|
| Production build strip `console.debug` (esbuild `drop`) | 审计二：213条三版未清理 | 10min |
| Mock infrastructure + `page-factory.ts` core tests | 两审计共识：~4500行核心零测试 | 1周 |
| `runLintWiki` phase extraction (835→6×~80行) | 审计二：835行，趋势增长 | 半天 |

### P1 — Planned

| Item | Source | Effort |
|------|--------|--------|
| Query local keyword filter (Layer 1 only, no vector) | 审计一：60-70%查询零API成本 | 1天 |
| Architecture diagram (Mermaid) + debug guide | 审计一：新贡献者入门 | 2小时 |

### P2 — Backlog

| Item | Effort |
|------|--------|
| Good First Issue tagging | 10min |
| esbuild upgrade (fix dev-only vulnerability) | 10min |

### Evaluated & Rejected (v1.12.0)

| Proposal | Source | Reason |
|----------|--------|--------|
| Hexagonal Architecture refactoring | 审计一 | Over-engineering for Obsidian plugin; mock alone enables testing |
| Vector search (Ollama embeddings) | 审计一 | Requires Ollama + embedding model; <1% of users have this |
| Hash-bucket dedup optimization | 审计一 | No user-reported perf issue; solve when it hurts |
| page-factory try/catch 补全 | 审计二 | Exceptions bubble to wiki-engine's centralized error handler by design |
| API URL validation | 审计一 | Obsidian's requestUrl already validates; self-phishing impossible |

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

Every change must satisfy all three before being considered complete:

1. **No Side Effects**: Changes must not affect behavior outside their intended scope. Refactored code must produce identical output. New features must not alter existing workflows.
2. **No Breaking Changes**: No API signature changes without call-site updates. No config format changes. No file format changes. Existing users must not need to reconfigure.
3. **No Test Errors or Warnings**: `pnpm lint` must produce 0 errors and 0 warnings. `pnpm test` must pass all tests (0 failures). `npx tsc --noEmit` must produce 0 errors.

Verification gates:
```
pnpm lint          # 0 errors, 0 warnings
pnpm test          # all pass, 0 failures
npx tsc --noEmit   # 0 errors
pnpm build         # clean exit
```

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

**Maintainer:** Greener-Dalii | **Repository:** green-dalii/obsidian-llm-wiki
