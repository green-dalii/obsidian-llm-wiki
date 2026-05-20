# LLM Wiki Plugin Project Development Standards

**Last Updated:** 2026-05-20

---

## Current Phase: v1.10.2 — Custom Granularity Consistency Fix

### Completed (v1.10.2)
- ✅ **Custom granularity per-type limits fix**: Fixed three inconsistencies where UI presented entity/concept as separate limits but code ignored them. `source-analyzer.ts` now enforces per-type caps instead of merging into a single total. `getGranularityInstruction()` injects concrete numbers into the LLM prompt. `getGranularityFixLimits()` reads user settings instead of hardcoded values. Added 6 unit tests (101 total).

### Completed (v1.10.1)
- ✅ **Issue #32 — Slug normalization missing in resolvePagePath**: Fast path 2 now checks both title AND aliases via normalized slug comparison (case-insensitive), catching space-vs-hyphen variants (`Metabolisches Syndrom` vs `Metabolisches-Syndrom`), alias slug variants, and case differences — all without LLM calls. Added 4 unit tests (96 total).

### Completed (v1.10.0)
- ✅ **Issue #30 — Aliases omitted in duplicate detection**: Fixed `analyzeSource()` and `resolveEntityDedup()` to include aliases in existingPagesList, preventing LLM from creating duplicate stub pages for synonym names (e.g., "CoT" vs "思维链")
- ✅ **Issue #31 — Granularity expansion**: Added Minimal granularity (5 items) + Custom option (user-defined 1-300 limits) with conditional input fields, comprehensive i18n updates across 8 languages
- ✅ **UX improvements**: All numeric inputs now enforce `type='number'` with HTML5 validation, auto-clamping to valid range with Notice feedback, CSS class-based width control (compliant with Obsidian eslint rules)
- ✅ **Extraction limits unified**: Fine 100, Standard 50, Coarse 10, Minimal 5, Custom 1-300 (predictable bounds across all granularity levels)
- ✅ **Description optimization**: Granularity descriptions across 8 languages now include selection guide ("Fine: deep analysis, Standard: daily notes, Coarse: quick overview, Minimal: batch 100+ files, Custom: specialized limits") and cost/time optimization tips

### Recently Completed (v1.9.x)
- Fixed `renderComponent` → `activeRenderComponent` memory leak in QueryModal
- Fixed `lintFixer` encapsulation (public proxy method `fixPollutedPage()`)
- Fixed `testLLMConnection` hardcoded Chinese strings → TEXTS system
- Fixed related entity/concept page generation: LLM now outputs `[[wiki-link]]` for non-existent pages (Lint can detect dead links)
- `tsc --noEmit` passes with 0 errors (tsconfig moduleResolution, skipLibCheck, include scope)

### P1 — Short-term
- PageFactory entity/concept method unification (8 pairs → generic)
- LLM client retry extraction (shared `withRetry`)
- `createMessageStream` language type consistency

### P2 — Medium-term
- `parseJsonResponse` + `mergeFrontmatter` unit tests
- `slugify` debug log reduction (8→2)
- Residual Chinese comment cleanup

### Already Evaluated (not doing)
- `getExistingWikiPages` cache bypass → Solve when it hurts
- `runLintWiki` 760-line method → Flat > Nested
- Custom YAML parser → Correct choice for Obsidian plugin constraints

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
└── __tests__/                      # Unit tests (vitest, 53 tests)
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
