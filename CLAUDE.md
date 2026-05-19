# LLM Wiki Plugin Project Development Standards

**Last Updated:** 2026-05-19

---

## Current Phase: v1.8.x — Code Quality Upgrade (B+ → A-)

**v1.8.1 released.** Technical debt repayment within 1.8.x cycle — no feature changes.

### Quality Upgrade Roadmap

**P0 — Immediate**
- Remove `analyzeMerge` dead code (page-factory.ts:536, 50 lines, zero callers)
- Extract `createLLMClient` factory (eliminates 11 duplicated lines in main.ts)
- Move `updateRelatedPage` inline prompt into PROMPTS system

**P1 — Short-term**
- Fix `getText` type safety: `keyof typeof TEXTS.en` replacing `as unknown as Record<string, string>`
- Standardize console logs to English (36 Chinese debug calls in wiki-engine.ts)
- Optimize settings slider: onChange updates only desc text, not full DOM rebuild
- Add CONTRIBUTING.md

**P2 — Medium-term**
- Split `ingestSource` into stage methods, keyword pre-filter for query, ADR docs, JSDoc interfaces

### Test Coverage
- **53 unit tests** (vitest): slugify, parseFrontmatter, detectRateLimitFailures, formatRateLimitNotice, cleanMarkdownResponse, enforceFrontmatterConstraints
- CI: `pnpm lint && pnpm test && pnpm build`

### Recently Completed
- **v1.8.1**: Rate limit detection, Smart Fix All modal, settings reorganization, dynamic badges, persistent fix notices, README command accuracy, single-value aliases crash fix, concurrency default 1→3
- **v1.8.0**: 8-language i18n (EN/ZH/JA/KO/DE/FR/ES/PT), dynamic download badge, complete badge suite

---

## 📁 Project Structure

```
src/
├── main.ts                         # Plugin entry point
├── types.ts                        # Shared types + EngineContext
├── utils.ts                        # Utilities (slugify, parseJson, etc.)
├── prompts.ts                      # LLM prompt templates (barrel)
├── texts.ts                        # i18n texts (barrel, 8 languages)
├── llm-client.ts                   # LLM clients (Anthropic, OpenAI-compatible)
├── wiki/                           # Wiki engine
│   ├── wiki-engine.ts              # Orchestrator
│   ├── query-engine.ts             # Conversational query
│   ├── source-analyzer.ts          # Iterative batch extraction
│   ├── page-factory.ts             # Entity/concept CRUD + merge
│   ├── conversation-ingest.ts      # Chat → wiki knowledge
│   ├── lint-fixes.ts               # Fix logic
│   ├── lint-controller.ts          # Lint orchestration
│   ├── lint/
│   │   ├── duplicate-detection.ts  # Candidate generation
│   │   └── fix-runners.ts          # Batch fix execution
│   ├── contradictions.ts           # Contradiction detection
│   └── system-prompts.ts           # Language directive + labels
├── schema/
│   ├── schema-manager.ts           # Schema CRUD
│   └── auto-maintain.ts            # File watcher + periodic lint
├── ui/
│   ├── settings.ts                 # Settings panel
│   └── modals.ts                   # Lint/Ingest/Query modals
└── __tests__/                      # Unit tests
```

---

## ⚠️ Git Safety Protocol

- **NEVER commit or push without explicit user permission.** Non-negotiable.
- Commit only after user says "commit" / "提交". Push only after "push" / "推送".
- Re-confirm before each commit — a prior approval does not carry forward.

## 📦 Development Workflow

1. `pnpm lint` + `pnpm build` pass (0 errors, 0 warnings)
2. Update relevant docs (README/ROADMAP/CHANGELOG) and memory
3. Present change summary for user review
4. Commit only after user approval
5. Push only after user approval

---

## 📋 Karpathy Philosophy Compliance

- **Knowledge compounds** — query results flow back into wiki
- **Human-in-the-loop** — LLM suggests, user decides
- **Three-layer architecture** — Sources (read-only) → Wiki (LLM-generated) → Schema (co-evolved)
- **Incremental accumulation** — wiki is persistent, not one-shot

## 🎯 Python Zen Design Principles

When evaluating complexity, ask:

- **Simple > Complex.** If a 3-line comment explains it, don't introduce a formal ADR. If a linear sequence is readable, don't split it into micro-methods.
- **Flat > Nested.** 300 lines of sequential code with clear stage comments is easier to follow than 6 private methods jumping back and forth.
- **Sparse > Dense.** JSDoc on every function is noise when TypeScript already defines the types. Document the connections between modules, not the signatures.
- **Practicality > Purity.** A pragmatic design decision documented in CLAUDE.md beats an unread ADR directory. A keyword filter that introduces false negatives is worse than "no filter, LLM does it."
- **Solve when it hurts.** Don't optimize for 500-page wikis with 50 pages. Don't add caching before measuring. Don't split methods until they're actually hard to debug.
- **Explicit > Implicit.** `ctx.getClient()` (function) returns the latest client after settings changes. `ctx.llmClient` (property) would return a stale snapshot. The function type IS the documentation.

## 🔑 Key Design Decisions

**Tier 1/2 duplicate detection.** Tier 1 (crossLang, abbreviation, bigram ≥ 0.6) always verified by LLM — these are high-precision signals. Tier 2 (bigram 0.4–0.6, sharedLinks ≥ 0.4) fills remaining token budget. This two-tier design ensures cross-language duplicates are caught (Tier 1) without blowing the API budget (Tier 2 acts as overflow).

**`Promise.allSettled` error isolation.** Every parallel page generation batch uses `allSettled`, not `all`. One entity failing (e.g., malformed name) does not crash the entire ingestion. Failed pages retry individually with exponential backoff. The system degrades gracefully — partial success is the norm, not an exception.

**Pollution defense at the write gate.** `createOrUpdateFile` runs a centralized regex that strips duplicated folder prefixes (`[[entities/X|entities/X]]` → `[[entities/X|X]]`) from ALL LLM-generated content before writing. This is architectural defense: validate at the single write exit rather than trusting every upstream caller to be clean.

**LLM semantic page selection over keyword search.** Query uses LLM to match user questions to wiki pages semantically — "attention mechanism" finds "Transformer" even without word overlap. This is Karpathy's core insight: the LLM understands meaning, not just tokens. Keyword pre-filtering would introduce false negatives and undermine this. When the wiki grows beyond context window limits, the correct fix is index sharding, not BM25.

---

## 🌍 Internationalization

- **UI**: 8 languages (EN/ZH/JA/KO/DE/FR/ES/PT), 269+ fields fully translated
- **Wiki output**: 8 languages independent of UI, with custom input option
- **Docs**: README in all 8 languages
- **Code**: English comments only, minimal (WHY not WHAT)

## 📋 Git Commit Standards

- **Language**: English only, conventional commits format
- **Types**: `feat:` `fix:` `docs:` `refactor:` `test:` `chore:` `perf:` `style:`
- **Example**: `fix: resolve single-value aliases crash in parseFrontmatter`

---

## 🎯 Code Quality

- No `any` — use `unknown` with type guards
- `?.` / `??` for null safety
- PascalCase classes, camelCase functions, UPPER_SNAKE_CASE constants
- `console.debug/warn/error` only (no `console.log`)
- `new Notice('', 0)` for persistent, `new Notice(msg, 8000)` for auto-dismiss

## 🔧 Obsidian Plugin Compliance

15 eslint-plugin-obsidianmd rules enforced via `pnpm lint --max-warnings=0`.
Key rules: sentence case UI text, no floating promises, no `console.log`,
no `any`, no hardcoded `.obsidian` paths, tag NO `v` prefix, use `Setting().setHeading()`.

---

## 📦 Version Management

- **Format**: `MAJOR.MINOR.PATCH` (semver)
- **Update**: `manifest.json` + `package.json` + `versions.json`
- **Tag**: NO `v` prefix → `1.8.1` ✅, `v1.8.1` ❌
- **Release**: Tag push triggers `.github/workflows/release.yml` → draft release on GitHub

## ✅ Pre-Commit Checklist

- `pnpm lint` (0 errors), `pnpm test` (all pass), `pnpm build` (clean)
- Version numbers synced across 3 files (if version bump)
- CHANGELOG/README updated (if features changed)
- Commit message English, conventional format

---

**Maintainer:** Greener-Dalii | **Repository:** [green-dalii/obsidian-llm-wiki](https://github.com/green-dalii/obsidian-llm-wiki)
