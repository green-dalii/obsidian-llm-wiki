# LLM Wiki Plugin Project Development Standards

**Last Updated:** 2026-05-26

---

## Current Phase: v1.11.0 — Full Issue Resolution & UX Hardening

### Completed (v1.11.0)
- ✅ **Issue #42 — llmReady gating**: New users must complete Provider → API Key → Fetch Models → Test Connection before core features unlock. `llmReady` field in settings. Status indicator in settings panel. Existing users auto-migrated. Anthropic model list now calls real API.
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
└── __tests__/                      # Unit tests (vitest, 106 tests)
```

---

## ⚠️ Git Safety Protocol

- **NEVER commit or push without explicit user permission.** Non-negotiable.

## 📦 Development Workflow

1. `pnpm lint && pnpm test && pnpm build` pass
2. Update relevant docs and memory
3. Present change summary for user review
4. Commit only after user approval
5. Push only after user approval

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
