# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.23.2 (shipped 2026-07-05) | **Updated:** 2026-07-05

## Current Status

**v1.23.2 SHIPPED (2026-07-05, PATCH).** Five merged PRs (#234 + graph-cache invalidation + #221 + #219 + DocTpoint's #238 + #241). 1431 tests passing across 108 files. Recommended upgrade for everyone on v1.23.0+. License upgraded to Apache 2.0 + DCO. Next: v1.24.0 MINOR (PDF source ingest, source-revision awareness, hub-retirement lint wire-up).

**v1.23.1 SHIPPED (2026-07-02, PATCH).** Obsidian review bot reject hotfix: tsconfig `strictBindCallApply: true` alignment, dead function removal, lockfile regeneration for CI build verification. 1386 tests passing across 102 files.

**v1.23.0 SHIPPED (2026-07-02).** Graph Engine PPR + Vercel AI-SDK v6 migration + Sponsor section + v1.22.6 hotfix series folded in. Closes #117/#130/#137/#141/#143/#147/#157/#175/#198/#204/#215/#223.

Historical releases are summarized in [CHANGELOG](./CHANGELOG.md). The current sprint is described in **Next Milestone** below.

### v1.23.1: Obsidian Review Hotfix (2026-07-02, PATCH)

- ✅ **`tsconfig.json` — `strictBindCallApply: true`.** Aligns local TS config with Obsidian's strict-mode review environment. `.bind()` calls now infer correct types natively — no type assertions needed.
- ✅ **`src/main.ts` — deleted unused `getThinkingControlCacheKey`.** No callers; function was deprecated in the v1.23.0 AI-SDK v6 migration.
- ✅ **Lockfiles regenerated** (`pnpm-lock.yaml` + `package-lock.json`) for CI build-verification consistency.
- ✅ **pre-release-gate skill updated** — new §2f "CI Build Consistency" check.
- ✅ **Tests: 1386 passing** (+10 from v1.22.6 hotfix tests folded in during v1.23.0 merge).

### v1.23.0: Graph Engine + Vercel AI-SDK v6 (2026-07-02)

See [CHANGELOG](./CHANGELOG.md#v1.23.0) for full details. **MINOR** scope. Biggest architectural change since 1.0 — replaces 1625-LOC hand-rolled LLM client with AI-SDK v6 transport + ships Graph Engine PPR primitive over `[[wiki-link]]` graph. 1376 tests passing (+272 since v1.22.0). Bundle 1.24 → 3.17 MB (user accepted 2026-06-29). Closes #137/#141/#143/#147/#207 (provider-version regression class), #117 (Query Wiki relevance), #157 (hub detection), #175 (link distinctiveness), #198 (PPR), #204 (auto-ingest modal), #223 (LM Studio API key gate).

### v1.22.6: GPT-5 Pro variants + Auto Ingest trigger dispatch (2026-06-30)

See [CHANGELOG](./CHANGELOG.md#v1.22.6) for full details. **PATCH** scope. Folded into v1.23.0 release flow. Hotfix on v1.22.5 baseline: GPT-5 Pro variants (`gpt-5.x-pro`) route to `/v1/responses`, Auto Ingest completion path correctly wires `onAutoIngestDone` Notice (Issue #204), Auto Smart Fix completion is context-aware.

### v1.22.5: Responses API for #207 follow-up (2026-06-29)

See [CHANGELOG](./CHANGELOG.md#v1.22.5) for full details.

### v1.22.4: GPT-5.x probe + provider error UX (2026-06-27)

See [CHANGELOG](./CHANGELOG.md#v1.22.4) for full details.

### Implemented (v1.22.2) — UX improvements + tech debt (2026-06-26)

See [CHANGELOG](./CHANGELOG.md#v1.22.2) for full details.

No proactive 11th language — **contributor-driven only** (replicate PR #159 Italian pattern). Improving translation quality of existing 10 locales > adding the 11th.

**Theme:** Replace the brittle hand-rolled LLM client (v1.22.x 1625-LOC `llm-client.ts` with 30+ provider-version workarounds accumulated since v1.20.0) with Vercel AI-SDK v6, then ship the Graph Engine PPR primitive on top.

- ⭐ **P1-7 — Vercel AI-SDK v6 migration (Day 1-3 ✅ done, Day 3.5-5 ✅ done).** Replace `OpenAICompatibleClient` / `AnthropicClient` / `AnthropicCompatibleClient` (1625 LOC) with `@ai-sdk/openai@3` / `@ai-sdk/anthropic@3` / `@ai-sdk/openai-compatible@2`. New `src/llm-sdk/` (5 files, 1421 LOC) + `src/core/obsidian-fetch-bridge.ts` (326 LOC, activeDocument bridge for jsdom). Eliminates the entire class of provider-version regressions (#137 / #141 / #143 / #147 / #207 — the manual workarounds these Issues triggered). 1376 tests passing on AI-SDK branch.
  - **URL fallback** for custom baseURLs (Kimi Coding Plan `/v1` missing) — ✅ b775d63
  - **LM Studio API key gate** bypass — ✅ 4b96025, Closes #223
  - **Token-key probe-then-retry** — KISS: no regex, no error-body parsing, just `if 400 → retry with alt key`. ✅ cc3f2c2, Refs #207
  - **Coding Plan / z.ai baseURL verification** — covered by URL fallback integration tests + cross-consumer cache test. ✅
- ⭐ **#198 — Personalized PageRank over the `[[wiki-link]]` graph (P1-5/P1-6 ✅ done, P2-4 ✅ done).** Closes #117 (Query Wiki relevance), #157 (hub detection), #175 (link distinctiveness) with one primitive. Monte Carlo PPR — K short random walks per query page, O(K×L) cost independent of |V|, embarrassingly parallel. Hybrid guard: lex-match fallback when graph too small. Tier B redesigned: zero-LLM section-extractor. Three-tier pipeline (lex fast path → LLM seeds → PPR walks) shipped in P1-5. Hub-link distinctiveness scanner shipped in P1-6 (229 LOC + 15 tests). **P2-4 PPR tuning complete** (2026-06-30, on a 2142-page real vault): recommended parameters `damping=0.05, numWalks=3000, walkLength=20`. R@5 improved from 21.5% → 23.8% (+11% relative). See `src/__tests__/fixtures/wikis/sample-50page/REAL_VAULT_EVAL.md` for full tuning table. **#198 thread key finding (DocTpoint 2026-06-30):** knn baseline (bge-m3, no graph) on sample-50page = 24.1% R@5 / 36.4% R@10 — within 1-3pp of cascade (27.1% / 37.8%). Most of cascade's lift is *semantic-over-keyword*, not *graph-over-semantic*. Cascade's honest value: **embedding-grade R@k at zero embedding cost, offline, over links that exist anyway**. **P2-3 eval acceptance gate** remaining — adding knn baseline as control per @DocTpoint's #198 follow-up.
- ✅ **PR #215 — Hub-retirement crystallization signal** by @DocTpoint. Merged into AI-SDK branch on 2026-06-30. `src/core/hub-retirement.ts` (175 LOC) + 136 tests + 12 unit tests. Pure percentile-based verdict with dual absolute guards.

**Branch strategy:**
- `feat/v1.23.0-graph-engine-kickoff` — frozen at P1-6 done (merge-base `4dec289`)
- `refactor/v1.23.0-ai-sdk-migration` — 9 commits ahead of merge-base (AI-SDK + P2 improvements)
- v1.23.0 release = merge both, switch PPR LLM call sites to AI-SDK adapters, resolve doc conflicts

**Deferred to v1.23.2 PATCH (2026-07-02+):**
- **#219 — Progress Notice suppression setting.** `showProgress()` in `main.ts:414` unconditionally creates a persistent `Notice(msg, 0)`. Add `progressNotificationLevel: 'both' | 'status' | 'notice' | 'silent'` (~30 LOC + 6 locale keys). Filed by @jameses-cyber (same author as #204). Approved: deferred.
- **#221 — Query scroll-to-start setting.** `scrollToBottom()` in `query-engine.ts:802` unconditionally scrolls to bottom on every chunk; final call leaves user at end of long response. Add post-completion scroll-mode setting (~50 LOC + 6 locale keys). Filed by @jameses-cyber (same author as #204, #219). Approved: deferred. Batch with #219.

**Deferred to v1.24.0+ MINOR:**
- **#218 — PDF source ingest.** Design-track Discussion [#222](https://github.com/green-dalii/obsidian-llm-wiki/discussions/222) open for topology + path convergence. Target: `readDocument()` chokepoint in LLM client with extraction cache. Prerequisite: provider support matrix + cache invalidation strategy decided in Discussion.
- **#220 — Source-revision awareness for merge.** DocTpoint's 4-tier design (Tier 0 fingerprint + replace self-revision, Tier 1 `supersedes:` frontmatter flag, Tier 2 cross-source disagreement open question, Tier 3 review-queue UI). Tiers 0-1 tractable for v1.24.0 MINOR; Tier 3 likely v1.25.0+. Prerequisite: open Discussion thread on fingerprint function design.
- Hub-retirement lint wire-up (`core/hub-retirement.ts` → call `assessHubs` in lint path) — owned by @DocTpoint, post-#215 merge
- P2-2 cold-start settings UI (advanced users only; default parameters validated in P2-4)
- LintFixer class → module-level functions (707-LOC god class split, 1 day)

**Deferred to v1.25.0+ (research / experimental):**
- #213 configurable page categories (Discussion-only, NOT confirmed for any minor release — needs broader community/architectural discussion)
- #36 source-title-in-extraction feature (closed 2026-05 with no follow-up, low ROI vs current PPR recall)
- Cold-start vocabulary seeding (DocTpoint proposal in #198, design TBD)
- knn + cascade by-query-type complement (if required by evidence)

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

## Next Milestone: v1.24.0 MINOR (target TBD)

### Goals

TBD after v1.23.2 feedback. Architectural items deferred from v1.23.0–v1.23.2 cycle:

- **#220 — Source-revision awareness for merge** (DocTpoint's 4-tier design). Tier 0 fingerprint + replace self-revision; Tier 1 `supersedes:` frontmatter flag; Tier 2 cross-source disagreement open question; Tier 3 review-queue UI. Tiers 0-1 tractable for v1.24.0; Tier 3 likely v1.25.0+. Prerequisite: open Discussion thread on fingerprint function design.
- **#218 — PDF source ingest** (Discussion #222 topology).
- **Hub-retirement lint wire-up** — `core/hub-retirement.ts` (0 callers) → wire `assessHubs` into lint path. Owned by @DocTpoint (post-#215 merge).
- **#169 estimated-time-remaining** — velocity window + batch telemetry; needs tracking issue.
- **LintFixer → module-level functions split** — 707-LOC god class, deprioritized since v1.18.x.

### Not in v1.24.0 (Discussion-only)

- **#213 (configurable page categories)** — user instruction 2026-06-30.
- **#169 live preview of generated wiki files + sound / log-file per-task** — v1.25.0+ research scope.

### Closed during v1.23.2 (✅ shipped 2026-07-05)

- ✅ **#234 sources/ candidate contradiction** — `excludeSources: true` default in `buildPagesListForPrompt`.
- ✅ **Graph cache invalidation on ingest** — `QueryView.invalidateGraph()` + `onIngestDoneDispatch` hook.
- ✅ **#221 scroll-to-start + Variant 2 turn indicator** — `wiki/turn-indicator.ts`.
- ✅ **#219 semantic-driven notification rewrite** — `core/progress-notification.ts` + scope-aware `showProgressFor()`.
- ✅ **Section header canonicalizer (PR #241)** — bounded Levenshtein on write, by @DocTpoint.
- ✅ **Frontmatter serializer consolidation (PR #238)** — `serializeFrontmatter` single writer, by @DocTpoint.
- ✅ **License upgrade to Apache 2.0 + DCO** — NOTICE + CONTRIBUTING.
- ✅ **Streaming-preserving client wrapper** — `Object.create(client)` instead of spread.
- ✅ **Clickable retrieval label + dynamic status bar + Notice TTLs** — UX polish.

## v1.23.2 — Implemented (shipped 2026-07-05)

See [CHANGELOG](./CHANGELOG.md#v1.23.2) for full details. **PATCH** scope. Five merged PRs (#234 + graph-cache + #221 + #219 + DocTpoint's #238 + #241). 1431 tests passing across 108 files. No new user-facing settings. Recommended upgrade for everyone on v1.23.0+.

## v1.23.0 — Implemented (shipped 2026-07-02)

**Phase 5.1.5 + Core PPR modules + P1-5 (Query Wiki integration) + P1-6 (Lint) + P1-7 (AI-SDK Day 1-3 + Day 3.5-5) + P2-3 + P2-4 ALL COMPLETE.** All P1/P2 tasks finished. Eval gate: cascade R@5 27.1% (real vault) vs knn 24.1% (3pp gap) — embeddings permanently rejected per #175 + #198 follow-up. 1376 tests, 100 files.

### v1.23.0 Shipped Items

#### ✅ Phase 5.1.5 — UX Onboarding + Multi-File Ingest
- ✅ **Three-tier first-run Welcome note** (Tier A empty / Tier B existing / Tier C upgrade). D8 dynamically translated (1 EN template → user's wiki language at write time via LLM).
- ✅ **#130 Multi-File Ingest** — two-pane picker (recursive folder tree with per-file checkboxes + live ingest queue), per-file cancel, "Cancel all" for pending/running jobs.
- ✅ **IngestQueue** (pub/sub store) — single source of truth for in-session ingest lifecycle. 25 tests.
- ✅ **i18n across 10 locales** — 14 new keys per locale.

#### ✅ P0 — Blockers
- ✅ P0-1: CC0 synthetic 50-page eval fixture.
- ✅ P0-2: Eval script with lex-only vs lex-seeded-PPR vs graph-first-PPR comparison.
- ✅ P0-3: CLAUDE.md P0 table cleanup.

#### ✅ P1 — Core Graph Engine modules
- ✅ P1-1: `core/section-extractor.ts` (173 LOC).
- ✅ P1-2: `core/monte-carlo-ppr.ts` (99 LOC).
- ✅ P1-3: `core/hub-detection.ts` (134 LOC).
- ✅ P1-4: `core/ppr-cascade.ts` (213 LOC).
- ✅ P1-5: Query Wiki integration with LLM seed selection (three-tier pipeline).
- ✅ P1-6: Lint hub-link distinctiveness scanner (229 LOC + 15 tests).
- ✅ P1-7: AI-SDK v6 migration (Day 1-3 + Day 3.5-5: URL fallback, LM Studio hotfix, token-key probe).

#### ✅ P2 — UX + features + eval
- ✅ P2-1: Welcome note.
- ✅ P2-2 partial: cascade + seeds token + LLM seed retrieval improvements.
- ✅ **Real-time streaming + Ctrl+Enter + persistence** (Query Wiki).
- ✅ P2-3: Eval acceptance gate (knn baseline analysis — cascade R@5 27.1% vs knn 24.1% = 3pp gap; reinforces #175 rejection).
- ✅ P2-4: PPR parameter tuning on 2142-page real vault (damping=0.05, numWalks=3000, walkLength=20).
- ✅ **Sponsor section** in all 10 READMEs (3f4c373).
- ✅ **Hub-retirement crystallization signal** (`core/hub-retirement.ts`) by @DocTpoint.

#### ✅ AI-SDK Migration components
| Component | LOC | Notes |
|-----------|-----|-------|
| `core/obsidian-fetch-bridge.ts` | 326 | requestUrl → fetch API (4xx body preservation) |
| `llm-sdk/openai-sdk-client.ts` | 455 | AI-SDK @ai-sdk/openai v3 — auto Responses API routing for gpt-5.x |
| `llm-sdk/anthropic-sdk-client.ts` | 300 | AI-SDK @ai-sdk/anthropic v3 — baseURL for Coding Plan / z.ai / GLM-Antropic |
| `llm-sdk/openai-compat-sdk-client.ts` | 449 | 8 OpenAI-format baseURLs |
| `core/url-fallback.ts` | 395 | Kimi Coding Plan `/v1` auto-fix + cross-consumer cache |
| `llm-sdk/token-key-probe.ts` | 70 | Max_tokens / max_completion_tokens probe-then-retry (KISS) |
| `llm-sdk/create-llm-client.ts` | 151 | Async + sync shim + preload pattern |

**Old code removed**: 1625-LOC `llm-client.ts` + 8 old tests + 85-LOC `core/sse-parser.ts` + 3-tier thinking-control probe.

**Bundle size**: 1.24 MB → 3.17 MB (user accepted 2026-06-29). Obsidian manifest no size limit.

#### Eval baseline (sample-50page, reference only)
| Strategy | R@5 | R@10 | Source |
|----------|-----|------|--------|
| lex-only | 13.3% | 13.3% | sample-50page fixture |
| cascade (current pprCascade) | 25.4% | 37.8% | sample-50page fixture |
| cascade + explicit seeds | 31.0% | 40.4% | sample-50page fixture |
| **knn baseline (bge-m3)** | **24.1%** | **36.4%** | DocTpoint #198, same fixture |
| **cascade (real vault, tuned)** | **23.8%** | — | 2142-page real vault |

#### ⏸️ Deferred past v1.23.0
| # | Task | New target | Reason |
|---|------|------------|--------|
| P2-4 sample-50page tuning | — | Superseded by real vault tuning (2142-page) |
| P2-2 cold-start threshold settings | v1.24.0+ | Defaults validated by P2-4; advanced users only |
| #219 Progress Notice suppression | v1.23.2 | User-facing UX gap — same author as #204 |
| #221 Query scroll-to-start | v1.23.2 | User-facing UX gap — same author as #204 |
| #218 PDF source ingest | v1.24.0 | Discussion #222 topology + path convergence |
| #220 Source-revision awareness | v1.24.0 | Tier 0-1 tractable; architectural decision needed |

#### Eval baseline (sample-50page, for reference — not a release gate)
| Strategy | R@5 | R@10 | Source |
|----------|-----|------|--------|
| lex-only | 13.3% | 13.3% | sample-50page fixture |
| cascade (current pprCascade) | 25.4% | 37.8% | sample-50page fixture |
| cascade + explicit seeds | 31.0% | 40.4% | sample-50page fixture |
| **knn baseline (bge-m3)** | **24.1%** | **36.4%** | DocTpoint #198, same fixture |
| **cascade (real vault, tuned)** | **23.8%** | — | 2142-page real vault |

**Note**: The knn baseline (24.1% R@5) is within 3pp of cascade (27.1% R@5 per DocTpoint). This confirms cascade's value is semantic-over-keyword at zero embedding cost, not graph-over-semantic. **P2-3 acceptance gate** = verify these numbers hold under the final tuned parameters.

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
| Version | Date | Headline |
|---------|------|----------|
| 1.23.2 | 2026-07-05 | PATCH: #234/#221/#219 + DocTpoint #238/#241 + graph cache invalidation + Apache 2.0 + DCO. 1431 tests |
| 1.23.1 | 2026-07-02 | Obsidian review hotfix — strictBindCallApply alignment + dead function removal + lockfile regen |
| 1.23.0 | 2026-07-02 | Graph Engine PPR (Issue #198) + Vercel AI-SDK v6 migration + Sponsor section + v1.22.6 hotfix folded in |
| **1.22.6** | 2026-06-29 | Hotfix — #204 wire onAutoIngestDone + Auto Smart Fix trigger dispatch + #207 broaden Responses API to -pro variants |
| **1.22.5** | 2026-06-29 | Hotfix — Responses API path for reasoning model family (#207 follow-up) + provider body in Notice + withRetry on Responses path |
| **1.22.4** | 2026-06-27 | Hotfix — GPT-5.x probe-then-cache (Closes #207) + provider error UX + lint knobs centralisation |
| **1.22.3** | 2026-06-26 | Hotfix — language-agnostic log header + content-folder guard for `generation_complete` |
| **1.22.2** | 2026-06-26 | Hotfix — auto-ingest modal→Notice (#204) + log i18n + periodic lint refined |
| **1.22.1** | 2026-06-24 | Hotfix — fixDeadLink fabrication (#197) + startupCheck migration (#199) + CSS `:has()` + Query side panel (#196) + related-link corrector (#187) |
| **1.22.0** | 2026-06-23 | Schema one-click apply (#97) + dynamic tag sync + zh-Hant + ingest status bar (#189, @YounianC) |
| **1.21.1** | 2026-06-22 | Hotfix — #173 Symptom A NFC/NFD + esbuild 0.28.1 |
| **1.21.0** | 2026-06-21 | Pre-ingest gate (#164) + Schema Phase 1 (#124) + History Panel (#122) + Italian (#159) |
| **1.20.3** | 2026-06-20 | Hotfix — source-slug fingerprint (#155) + alias dedup (#154) + Stage-4 guard (#158) |
| **1.20.2** | 2026-06-19 | Anthropic fallback system-role hotfix (PR #151 by @Indexed-Apogrypha, Closes #141/#147) |
| **1.20.1** | 2026-06-18 | Anthropic prefill rejection hotfix (Closes #141/#147) |
| **1.20.0** | 2026-06-18 | Provider-first thinking control + reasoning UI (Closes #141/#134/#143) |
| **1.19.1** | 2026-06-17 | Gemini HTTP 400 hotfix (Closes #137) |
| **1.19.0** | 2026-06-16 | Ingest quality & cost hardening — advanced LLM params, quote grounding, compact slugs |
| **1.18.2** | 2026-06-12 | Custom extraction limits hard-enforced (Closes #120) + #114 tags preservation + #111 slug casing |
| **1.18.1** | 2026-06-11 | Obsidian review compliance (document ban + prefer-active-doc) |
| **1.18.0** | 2026-06-10 | Tag controlled vocabulary (Closes #85) v6/v7/v8 — chip input UX, end-to-end customTags pipeline |
| 1.17.0 | 2026-06-08 | Long-document ingestion + source attribution (Closes #90) |
| 1.16.3 | 2026-06-07 | v1.16.2 P0 hotfix completion |
| 1.16.2 | 2026-06-07 | Lint cancel + thinking token bleeding + delete empty stubs |
| 1.16.0 | 2026-06-04 | Sources normalization + Context Window + LMStudio |
| 1.15.0 | 2026-06-01 | PR #87/#88 + aliases unification |
| 1.13.0 | 2026-05-26 | ConflictResolver + 6 audited improvements |
| 1.12.0 | 2026-05-20 | Extraction rearchitected, ~80% faster |
| 1.10.0 | 2026-05-15 | Aliases + granularity expansion |
| 1.9.0 | 2026-05-10 | Pollution defense + 14-issue batch |
| 1.8.1 | 2026-05-05 | Rate limit + smart fix all + 53 tests |
| 1.0.0 | initial | First Obsidian release |
