# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.22.5 → 1.22.6 (shipped 2026-06-30 — #204 + #207 -pro) → 1.23.0 (Graph Engine PPR + AI-SDK v6 migration: Phase 5.1.5 + P1-1~6 + P1-7 AI-SDK + P2-4 PPR tuning + Day 3.5 cleanup **done**; Sponsor section + P2-3 eval gate pending, target 2026-07-02) | **Updated:** 2026-06-30

## Current Status

Historical releases are summarized in [CHANGELOG](./CHANGELOG.md). The current sprint is described in **Next Milestone** below.

### v1.22.5: Responses API for #207 follow-up (2026-06-29)

See [CHANGELOG](./CHANGELOG.md#v1.22.5) for full details.

### v1.22.4: GPT-5.x probe + provider error UX (2026-06-27)

See [CHANGELOG](./CHANGELOG.md#v1.22.4) for full details.

### Implemented (v1.22.2) — UX improvements + tech debt (2026-06-26)

See [CHANGELOG](./CHANGELOG.md#v1.22.2) for full details.

No proactive 11th language — **contributor-driven only** (replicate PR #159 Italian pattern). Improving translation quality of existing 10 locales > adding the 11th.

**Theme:** Replace the brittle hand-rolled LLM client (v1.22.x 1625-LOC `llm-client.ts` with 30+ provider-version workarounds accumulated since v1.20.0) with Vercel AI-SDK v6, then ship the Graph Engine PPR primitive on top.

- ⭐ **P1-7 — Vercel AI-SDK v6 migration (Day 1-3 ✅ done, Day 3.5-5 in flight).** Replace `OpenAICompatibleClient` / `AnthropicClient` / `AnthropicCompatibleClient` (1625 LOC) with `@ai-sdk/openai@3` / `@ai-sdk/anthropic@3` / `@ai-sdk/openai-compatible@2`. New `src/llm-sdk/` (4 files, 949 LOC) + `src/core/obsidian-fetch-bridge.ts` (326 LOC, activeDocument bridge for jsdom). Eliminates the entire class of provider-version regressions (#137 / #141 / #143 / #147 / #207 — the manual workarounds these Issues triggered). 1304 tests passing on AI-SDK branch. **Remaining Day 3.5-5**: chunkToChars adapter (real character-level streaming), Coding Plan / z.ai / GLM-Anthropic baseURL verification, lint cleanup.
- ⭐ **#198 — Personalized PageRank over the `[[wiki-link]]` graph (P1-5/P1-6 ✅ done, P2-4 ✅ done).** Closes #117 (Query Wiki relevance), #157 (hub detection), #175 (link distinctiveness) with one primitive. Monte Carlo PPR — K short random walks per query page, O(K×L) cost independent of |V|, embarrassingly parallel. Hybrid guard: lex-match fallback when graph too small. Tier B redesigned: zero-LLM section-extractor. Three-tier pipeline (lex fast path → LLM seeds → PPR walks) shipped in P1-5. Hub-link distinctiveness scanner shipped in P1-6 (229 LOC + 15 tests). **P2-4 PPR tuning complete** (2026-06-30, on a 2142-page real vault): recommended parameters `damping=0.05, numWalks=3000, walkLength=20`. R@5 improved from 21.5% → 23.8% (+11% relative). See `src/__tests__/fixtures/wikis/sample-50page/REAL_VAULT_EVAL.md` for full tuning table. **#198 thread key finding (DocTpoint 2026-06-30):** knn baseline (bge-m3, no graph) on sample-50page = 24.1% R@5 / 36.4% R@10 — within 1-3pp of cascade (27.1% / 37.8%). Most of cascade's lift is *semantic-over-keyword*, not *graph-over-semantic*. Cascade's honest value: **embedding-grade R@k at zero embedding cost, offline, over links that exist anyway**. **P2-3 eval acceptance gate** remaining — adding knn baseline as control per @DocTpoint's #198 follow-up.
- ✅ **PR #215 — Hub-retirement crystallization signal** by @DocTpoint. Merged into AI-SDK branch on 2026-06-30. `src/core/hub-retirement.ts` (175 LOC) + 136 tests + 12 unit tests. Pure percentile-based verdict with dual absolute guards.

**Branch strategy:**
- `feat/v1.23.0-graph-engine-kickoff` — frozen at P1-6 done (merge-base `4dec289`)
- `refactor/v1.23.0-ai-sdk-migration` — 9 commits ahead of merge-base (AI-SDK + P2 improvements)
- v1.23.0 release = merge both, switch PPR LLM call sites to AI-SDK adapters, resolve doc conflicts

**Deferred to v1.23.1+ (none — all sponsor/PATCH scope folded into v1.23.0):**
- ~~**v1.23.1 PATCH** — Sponsor section + any v1.23.0 hotfix follow-ups~~ — Sponsor section now part of v1.23.0 release flow
- **v1.24.0+ MINOR** — #213 configurable page categories (Discussion-only, NOT confirmed for any minor release — needs broader community/architectural discussion), hub-retirement lint wire-up (`core/hub-retirement.ts` → call `assessHubs` in lint path), #36 source-title-in-extraction feature (closed 2026-05 with no follow-up, low ROI vs current PPR recall), LintFixer class → module-level functions (707-LOC god class split, 1 day)

### Implemented (v1.21.1) — 2026-06-22

See [CHANGELOG](./CHANGELOG.md#1211-2026-06-22) for full details.

### Implemented (v1.20.2) — 2026-06-19

See [CHANGELOG](./CHANGELOG.md#1202-2026-06-19) for full details.

### Implemented (v1.20.0) — 2026-06-18

See [CHANGELOG](./CHANGELOG.md#1200-2026-06-18) for full details.

### Implemented (v1.19.1) — 2026-06-17

See [CHANGELOG](./CHANGELOG.md#1191-2026-06-17) for full details.

### Implemented (v1.19.0) — 2026-06-16

See [CHANGELOG](./CHANGELOG.md#1190-2026-06-16) for full details.

### Implemented (v1.18.2)

See [CHANGELOG](./CHANGELOG.md#1182) for full details.

### Implemented (v1.18.1)

See [CHANGELOG](./CHANGELOG.md#1181) for full details.

### Implemented (v1.18.0) — 2026-06-11

See [CHANGELOG](./CHANGELOG.md#1180-2026-06-11) for full details.

### Implemented (v1.17.0) — 2026-06-08

See [CHANGELOG](./CHANGELOG.md#1170-2026-06-08) for full details.

## Next Milestone: v1.23.0 — Graph Engine (current sprint)

**Phase 5.1.5 + Core PPR modules + P1-5 (Query Wiki integration) COMPLETE.** Eval baseline: cascade R@5 25.4%, cascade+seeds R@5 31.0% (target 55% — gap is fixture-size related, tracked as P2-4). 1284 tests, 96 files.

### v1.23.0 Priority Order

#### ✅ Phase 5.1.5 — UX Onboarding + Multi-File Ingest (COMPLETE)
- ✅ **Three-tier first-run Welcome note** (Tier A empty / Tier B existing / Tier C upgrade). D8 dynamically translated (1 EN template → user's wiki language at write time via LLM). `type: welcome` frontmatter, `createWelcomeNote` toggle, `Recreate Welcome Note` command.
- ✅ **#130 Multi-File Suggest modal** — recursive folder tree, live right-pane progress, per-file cancel, "Add to queue" two-step flow. No auto-enqueue.
- ✅ **IngestQueue** (pub/sub store) — single source of truth for in-session ingest lifecycle. 25 tests.
- ✅ **i18n across 10 locales** — welcome note + modal UI + status strings (14 new keys per locale).

#### ✅ P0 — Blockers (COMPLETE)
| # | Task | Status |
|---|------|--------|
| P0-1 | CC0 synthetic 50-page eval fixture at `src/__tests__/fixtures/wikis/sample-50page/` | ✅ |
| P0-2 | Eval script: lex-only vs lex-seeded-PPR vs graph-first-PPR recall@k | ✅ |
| P0-3 | CLAUDE.md P0 table cleanup | ✅ |

#### ✅ P1 — Core Graph Engine modules (COMPLETE)
| # | Module | LOC | Status |
|---|--------|-----|--------|
| P1-1 | `core/section-extractor.ts` (Tier B — zero-LLM) | 173 | ✅ |
| P1-2 | `core/monte-carlo-ppr.ts` (Fogaras 2005 MC-PPR engine) | 99 | ✅ |
| P1-3 | `core/hub-detection.ts` (#117) — clustering retirement separate (P3-1) | 134 | ✅ |
| P1-4 | `core/ppr-cascade.ts` (hybrid guard, replaces Web Worker) | 213 | ✅ |
| P1-7 | Hybrid guard (lex fallback cascade) | — | ✅ (folded into P1-4) |

#### ✅ P1-7 — AI-SDK Migration (D1-3 done, D3.5 pending)
| Component | Status | Notes |
|-----------|--------|-------|
| `core/obsidian-fetch-bridge.ts` | ✅ done | requestUrl → fetch API (4xx body preservation) |
| `llm-sdk/openai-sdk-client.ts` | ✅ done | AI-SDK @ai-sdk/openai v3 — auto Responses API routing for gpt-5.x |
| `llm-sdk/anthropic-sdk-client.ts` | ✅ done | AI-SDK @ai-sdk/anthropic v3 — baseURL for Coding Plan / z.ai / GLM-Antropic |
| `llm-sdk/openai-compat-sdk-client.ts` | ✅ done | AI-SDK @ai-sdk/openai-compatible v1 — 8 OpenAI-format baseURLs |
| `llm-sdk/create-llm-client.ts` | ✅ done | Async + sync shim + preload pattern |
| 8 old `llm-client*.test.ts` | ✅ deleted | Replaced by `llm-sdk/*.test.ts` + retained regression cases |
| `llm-client.ts` (1625 LOC) | ✅ deleted | All hand-rolled workaround code removed |
| `core/sse-parser.ts` (85 LOC) | ✅ deleted | Replaced by AI-SDK textStream |
| 3-tier thinking-control probe | ✅ removed | AI-SDK handles internally |
| `chunkToChars` adapter (real逐字 stream) | ❌ Day 3.5 | Q1 user feedback — current is token-level, not character-level |

**Bundle size**: 1.24MB → 3.17MB (user accepted 2026-06-29). Obsidian manifest no size limit.

#### 🔄 P1 — Remaining (in progress)
| # | Module | LOC | Depends on | Status |
|---|--------|-----|------------|--------|
| P1-5 | Query Wiki integration (replace lex Tier A with PPR top-k + LLM seed selection) | — | ✅ done |
| P1-6 | Lint integration: #157 path (hub-link strip uses PPR) | 229 core + 35 report | P1-3 | ✅ done (b43e431) |
| P1-7 | **AI-SDK 引入** — replace hand-rolled OpenAICompatibleClient with `@ai-sdk/openai` v5 (closes #207 Chat Completions limitation, future-proofs against OpenAI naming/API drift) | ~2-3 day | P1-6 ✅ | 🔄 planned (v1.23.0) |

#### 🔄 P2 — Remaining (after P1-5)
| # | Task | Effort | Status |
|---|------|--------|--------|
| P2-2 | Settings: cold-start threshold exposure (min_pages / min_edges) — advanced users only, deferred to v1.24.0+ (default values validated by P2-4 real-vault eval, no opt-in needed in v1.23.0) | 0.5 day | ⏸️ deferred |
| P2-3 | Eval report acceptance gate (vs fixture target) — includes knn baseline as control per @DocTpoint's #198 follow-up | 0.5 day | ❌ not started |
| P2-4 | PPR parameter tuning: damping=0.05, numWalks=3000, walkLength=20 (real vault eval 2026-06-30) | 1 day | ✅ done — see REAL_VAULT_EVAL.md |
| P2-4 | PPR parameter tuning (damping/numWalks/thresholds) for sample-50page | 1 day | ❌ not started |

#### 🔄 P2-3 — Eval baseline (sample-50page, 2026-06-28)
| Strategy | R@5 | R@10 | Target@5 |
|----------|-----|------|----------|
| lex-only | 13.3% | 13.3% | ≥ 30% (below) |
| cascade (current pprCascade) | 25.4% | 37.8% | ≥ 55% (below) |
| cascade + explicit seeds | **31.0%** | **40.4%** | ≥ 55% (below) |

**Findings**: PPR graph walk improves recall by +12% R@5 over lex. Adding explicit seeds (LLM-augmented path) adds another +5.6%. All below target because the 53-page fixture is small (max top-5 coverage = 5/11 expected for "heart failure"). Eval script: `npx tsx src/__tests__/fixtures/wikis/sample-50page/eval-cascade.ts`.

#### Deferred P1 — Cleanup (from v1.18.x, lower ROI)
| # | Item | Effort | Status |
|---|------|--------|--------|
| D1 | page-factory resolvePagePath LLM fallback + merge + append tests | 1 day | Deferred |
| D2 | LintFixer class split (707-line god class → 6 module functions) | 1 day | Deferred |

#### Deferred P2 — Test infrastructure (high mock complexity)
| # | Item | Effort | Reason |
|---|------|--------|--------|
| T1 | wiki-engine ingestSource full-path integration tests | 2-3 days | Requires Obsidian App + 5 submodule mocks |
| T2 | query-engine core flow tests (Layer 1/2/3) | 1-2 days | Requires Modal + MarkdownRenderer + DOM mocks |

#### Deferred P3 — Backlog
| # | Item | Effort |
|---|------|--------|
| B1 | LintFixer class → module-level functions | 1 day |
| B2 | ~~Restore true streaming for 3rd-party providers~~ — **DONE (v1.23.0 P2, commit 2e51e23 + AI-SDK v6 migration 6be9258; `result.textStream` real逐块 streaming now in all 3 llm-sdk clients)** | — |
| B3 | Missing Concept Pages tracker | 2 days |

#### Explicitly deferred to v1.24.0+
| # | Project | Source | Target |
|---|---------|--------|--------|
| P3-1 | Hub retirement (clustering coefficient) | #117 (v2) | v1.24.0 (@DocTpoint owns) |
| P3-2 | Per-operation model selection | #208 | v1.24.0 |
| P3-3 | Link distinctiveness as standalone module | #157 v2 | v1.24.0+ |
| P3-4 | **Embeddings rejected** (2026-06-28 decision: not v1.25.0, not ever — graph + cascade sufficient; reaffirmed 2026-06-30 after DocTpoint knn baseline: cascade R@5 27.1% vs knn 24.1% = only 3pp gap, not worth provider matrix) | #175 | REJECTED |
| P3-5 | Tier D (agentic with tool calls) | ROADMAP | v1.25.0+ |
| #185 | Source-note alias propagation (@DocTpoint) | — | v1.24.0+ |
| #184 | Obsidian Bases index management (@alfred1137) | — | v1.24.0+ |
| #130 | In-place batch ingest queue — **DONE (Phase 5.1.5)** | — | ✅ |
| #182 | Obsidian Keychain (security) | — | v1.24.0+ |

#### Explicitly deferred to v1.25.0+ (research / experimental)
| # | Item | Notes |
|---|------|-------|
| — | #112 Event marker/type | Domain modeling |
| — | #168 Auto granularity | Independent heuristic |
| — | #91 Nested tags | Depends on #85 in-the-wild feedback |
| — | Tier D (agentic loop) | Function-calling support matrix |
| — | **knn + cascade by-query-type complement** (DocTpoint #198 follow-up, 2026-06-30) | Observed pattern: knn wins on conceptual synonyms, cascade wins on proper-noun/structural queries. Architectural decision: NOT opt-in embedding (rejected per #175, ROI too low for 9-provider matrix). If pursued, would need a per-query classifier + dual retrieval; deferred pending more user reports. |

#### Evaluated & Rejected
| Proposal | Source | Reason |
|----------|--------|--------|
| Hexagonal Architecture refactoring | Audit 1 | Over-engineering for Obsidian plugin |
| Vector search (Ollama embeddings) | Audit 1 | <1% of users have Ollama |
| Embeddings as opt-in enrichment (#175) | 2026-06-28 | Link graph + cascade sufficient for all PPR use cases |
| Hash-bucket dedup optimization | Audit 1 | No user-reported perf issue |
| page-factory try/catch completion | Audit 2 | Exceptions bubble to centralized handler by design |
| API URL validation | Audit 1 | requestUrl already validates |
| #36 Source title in extraction (feature request) | 2026-05-21 | CLOSED with no follow-up; proposes `alwaysIncludeSourceTitle` setting; low ROI vs current PPR cascade (PPR already recovers source pages via outgoing-link structure) |

#### Out of scope
- #142 Multiple wikis — workaround: wikiFolder switch
- Lint perf — hash-bucket dedup prefilter

### v1.23.0 Cold-start thresholds (from @GioiaZheng, consensus #198 Q3)

Conservative cascade — will tune with P0-1 fixture:

- `min_pages = 30`
- `min_edges = 30` OR `edges/pages >= 1.0`
- `seed_degree >= 1` (per-seed guard, not just global)
- `largest_weak_component / pages > 50%` (graph not fragmented)

Fallback arm selection:

1. `pages < 30` OR `edges < pages` OR `seed_degree == 0` → pure lex/title match
2. `seed_degree >= 1` AND graph has neighbors → lex-seeded MC-PPR
3. All global guards passed → graph-first MC-PPR

## Version Timeline

**Current focus: v1.23.0** (Graph Engine + AI-SDK v6). Full per-version history lives in [CHANGELOG.md](./CHANGELOG.md).

| Version | Date | Headline |
|---------|------|----------|
| 1.22.6 | 2026-06-30 | #204 Auto Ingest modal fix + #207 -pro routing fix |
| 1.22.5 | 2026-06-29 | Responses API path for reasoning model family (#207) + provider body in Notice |
| 1.22.4 | 2026-06-27 | GPT-5.x probe-then-cache (Closes #207) + provider error UX |
| 1.22.0 | 2026-06-23 | Schema one-click apply (#97) + dynamic tag sync + zh-Hant + ingest status bar |
| 1.21.0 | 2026-06-21 | Pre-ingest gate (#164) + Schema Phase 1 (#124) + History Panel (#122) + Italian |
| 1.20.0 | 2026-06-18 | Provider-first thinking control + reasoning UI (Closes #141/#134/#143) |
| 1.19.0 | 2026-06-16 | Ingest quality & cost hardening — advanced LLM params, quote grounding, compact slugs |
| 1.18.0 | 2026-06-10 | Tag controlled vocabulary (Closes #85) v6/v7/v8 |
| 1.17.0 | 2026-06-08 | Long-document ingestion + source attribution (Closes #90) |
| 1.16.0 | 2026-06-04 | Sources normalization + Context Window + LMStudio |
| 1.13.0 | 2026-05-26 | ConflictResolver + 6 audited improvements |
| 1.12.0 | 2026-05-20 | Extraction rearchitected, ~80% faster |
| 1.9.0 | 2026-05-10 | Pollution defense + 14-issue batch |
| 1.0.0 | initial | First Obsidian release |

