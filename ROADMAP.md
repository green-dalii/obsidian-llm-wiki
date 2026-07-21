# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.25.1 PATCH (RELEASED 2026-07-20, includes merged PR #304) → v1.25.2 PATCH next (7 DocTpoint triage items). | **Updated:** 2026-07-20 (post-triage, pre-v1.25.2 implementation)

## Current Status

**v1.25.1 — RELEASED 2026-07-20.** PATCH scope. Eight silent-loss bug fixes on the Related-page + Lint + ingest paths, three big-file splits, one build-verification root cause (lockfile drift), DiskCache<T> extraction. 2274 tests passing (173 files, +92 since v1.25.0).

### v1.25.1 composition (11 commits, ~80 files changed)

| # | Commit | Subject | Notes |
|---|--------|---------|-------|
| 1 | `65b5d1b` | `fix(related-page): stop persisting raw LLM output on the related path (#288)` | closes #287 silent Mentions loss on re-ingest |
| 2 | `5f993e6` | `fix: allow LM Studio ingest without API key (#272)` | local-no-key-provider gate |
| 3 | `5e13ac5` | `chore(build): pin Node 24 + AI-SDK patches + project .npmrc (v1.25.1 Phase E) (#301)` | dual-direction lockfile regen + npmrc |
| 4 | `039735c` | `perf(cache): extract DiskCache<T> from PdfConversionCache + ledger optimization (Phase F) (#300)` | 100MB / 1000 / 10MB caps + LRU |
| 5 | `b23257e` | `refactor(wiki-engine): extract 4 internal modules (Phase C-PR1) (#309)` | wiki-engine.ts 1799 → 1617 LOC (4 helpers → `engine-internals/` totaling 657 LOC) |
| 6 | `1806e29` | `refactor(settings): extract 8 section renderers (Phase C-PR2) (#311)` | settings.ts 1439 → 357 LOC |
| 7 | `7f37905` | `refactor(main): split main.ts 1304→300 LOC into 6 main-commands modules (#313)` | mixin pattern (Object.assign(prototype)) |
| 8 | `8852d0a` | `fix(mentions): parse the pre-#244 grouped Mentions shape so legacy pages can heal (#289) (#303)` | DocTpoint PR — LEGACY_GROUP_RE + LEGACY_QUOTE_RE + BULLET_RE |
| 9 | `2b821d4` | `fix(ingest): preserve schema sections the LLM drops in body rewrites (#292) (#302)` | DocTpoint PR — preserveExistingSections 4-arg signature |
| 10 | `4891f3d` | `refactor(simplify): v1.25.1 PATCH post-merge cleanup (#314)` | my simplify + correctness fixes (suffix trim, Mentions strip on rewrite, lift stripMentionsSection) |

### Closed issues (v1.25.1 PATCH)

- **#287** (silent Mentions loss on Related re-ingest) — closed by PR #288 (`65b5d1b`)
- **#292** (LLM rewrite drops schema sections) — closed by PR #302 (`2b821d4`)
- **#289** (legacy Mentions unparseable on first re-ingest post-#244) — closed by PR #303 (`8852d0a`)
- **#272** (LM Studio empty-key ingest gate) — closed by commit `5f993e6`

### Six-Gate summary

| Gate | Status |
|---|---|
| Code correct (lint/tsc/test/build/css-lint) | ✅ 0/0/2274/clean/0 |
| No side effects | ✅ Pure refactor + bug fix; 14 Phase A bot warnings deferred to v1.26.x per `feedback_eslint_plugin_obsidianmd_0_4_skip` |
| No breaking changes | ✅ All new settings opt-in, all PRs additive |
| No performance regression | ✅ DiskCache ledger optimization; page-batch-runner extracted; no new LLM calls |
| Docs complete | ✅ 10 READMEs + CHANGELOG + ROADMAP + CLAUDE + CONTRIBUTING + memory |
| Release clean | ✅ Co-Authored-By trailer (no model version), i18n parity, lockfile drift fixed |

### v1.25.1 deferred items (resolved at v1.25.2 scope-lock 2026-07-20)

- **PR #304** (DocTpoint — `updatedPages` split: created vs updated) — **MERGED 2026-07-20** (`3578a9d`). DocTpoint rebased onto Phase C-PR1 wiki-engine refactor's `runBatchedWithRetry<T>` closure; conflict scope reduced from 4 → 2 call sites. Closes #290. 5 tests added (2274 → 2279).
- **6 DocTpoint triage issues** (2026-07-19) — folded into v1.25.2 PATCH scope below.
- **Phase A Obsidian bot compliance** (`prefer-create-el` × 50 + `getSettingDefinitions()`). 0.4.1 lint upgrade deferred to v1.26.x (Path C status quo per `feedback_eslint_plugin_obsidianmd_0_4_skip`); root cause is 68 `eslint-comments/no-restricted-disable` errors that conflict with test-environment disable patterns. Path A (15-min override) and Path B (6d multi-PR refactor) deferred.
- **Lint perf** (`controller.ts:151` / `:239` TODOs from v1.18.0+). Phase F was rolled into DiskCache<T> extraction; the controller-level parallel dedup batches + LLM health analysis batches remain v1.26.0 work.

---

## Next Milestone: v1.25.2 PATCH (target ~5-6 working days, single PATCH)

**Theme:** Fold PR #304 (DocTpoint updatedPages split) + six DocTpoint bug reports (2026-07-19). (#168 granularity re-classified to v1.26.0 MINOR — it is a user-visible new feature, not a backward-compatible bug fix.)

### Scope (locked 2026-07-20)

| # | Item | Source | Type | Effort | Notes |
|---|------|--------|------|--------|-------|
| **1** | **PR #304 (DocTpoint — updatedPages split)** | Merged `3578a9d` (2026-07-20) | P0 bug | 0d (done) | 5 tests added; 2279 baseline. Closes #290. |
| **2** | **#305 Truncated batch responses bypass halving retry** | DocTpoint | P0 bug | 1d | OpenAI-compatible providers return HTTP 200 + `finish_reason: "length"` instead of throwing; current code drops batch silently. Fix: detect length via `parse-failure` path + reuse halving retry. |
| **3** | **#310 Page templates bare `---` polluting body** | DocTpoint | P1 bug | 0.5d | 35% pages have stray `---` in body (842 before Mentions, 127 in Related lists). Real root cause: model emits `---` as visual separator after seeing YAML frontmatter example. Fix: (a) prompt comment `# YAML frontmatter — DO NOT use --- as section separator in body`; (b) post-process cleanup in `extractBody`/`createOrUpdatePage` to strip body-level `\n---\n` dividers that don't belong. |
| **4** | **#308 findDeadLinkTarget slug mismatch** | DocTpoint | P0 bug | 0.5d | `dead-link-detector.ts:29-41` uses raw `toLowerCase()`; safety net at `lint/fix-dead-link.ts:190-196` already uses correct `slugify().toLowerCase()`. 428 broken links resolvable. |
| **5** | **#307 related-link-corrector filter too narrow** | DocTpoint | P1 bug | 0.5d | `related-link-corrector.ts:55` regex self-filters prefix it should fix. Conservative scope: accept `(entity|entities|concept|concepts|sources)`; `folderBySlug` decides correct folder. Tag-as-folder NOT touched. |
| **6** | **#312 Merge triage ignores source identity** | DocTpoint | P1 quality | 1d | `firstBatchData.summary` (source-analyzer.ts:530) is consumed for source-page generation but not forwarded to lint's `mergeAnalysis` prompt. Fix: thread source context (`sourceTitle` + `summary` + `sourcePath`) into `analysis-phase.ts` prompt. No Discussion thread needed; DocTpoint + maintainer converge on design in PR review. |

**Total effort**: ~3.5d code + 1d test + 1d docs/review = ~5-6 working days.

### v1.25.2 Deferred (explicitly NOT in scope)

- **#306 Compact slug list unbounded (77% of prompt on 2783-page vault)** — DocTpoint self-de-escalated to observation. Re-designated to v1.26.0+ as **RAG-style top-K retrieval** (reuse `core/index-search.ts:localKeywordMatch` + `wiki/query-engine/pipeline/query-keywords.ts` keyword extraction; zero new infra). Concrete: replace `buildCompactSlugList` injection with `extractKeywords(sourceNote) → localKeywordMatch(keywords, wikiPages) → top-K` (K=30). Target prompt share: 77% → ~5%.
- **#220 Source-revision awareness (Tier 1: `supersedes:` frontmatter flag)** — DocTpoint. Defer to v1.26.0 alongside #312 follow-up if needed.
- **#295 Scheduled ingest** — defer to v1.26.0+ design-track.
- **#184 Obsidian Bases index management** — defer to v1.26.0 (3-5d implementation, ROI high; needs Bases syntax finalization + plugin startup hook).
- **#142 Multi-wiki** — defer to v1.26.0+ long-term; workaround documented (multiple wiki folder presets + plugin instance copies).
- **#168 Two granularity settings (`singleFileGranularity` + `batchGranularity`)** — `@Indexed-Apogrypha` 5-week commitment; re-classified v1.25.2→v1.26.0 MINOR (2026-07-20): user-visible NEW feature (two dropdowns) ≠ backward-compatible bug fix. Types + settings UI + i18n (10 locales) + tests. ~1.5d.
- **PR #273 ChatGPT Plan Codex OAuth (CCRRAY-DESIGN)** — **NOT contaminated: mergeable against current main** (`git merge-tree --merge-base=origin/main` → clean tree, 0 conflict markers). GitHub's `CONFLICTING` flag is a **stale base pointer** (pinned to old `1806e29` = v1.25.0; current main is `3578a9d`). First-time contributor already merged main into their branch twice (co-authored `4d74ff6` + `2056b11`); PR head contains Phase C refactors in its history → rebase is mechanical. Decision pending: ask contributor to rebase+force-push (preferred, preserves authorship) vs maintainer rebase (B-lite) vs close.
- **Phase A Obsidian bot 0.4.1 lint upgrade** — defer to v1.26.x per `feedback_eslint_plugin_obsidianmd_0_4_skip`.
- **Lint perf (controller.ts:151/:239 TODOs)** — defer to v1.26.0.

Full design rationale: [`project_v1.25.1_release.md`](~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/project_v1.25.1_release.md).

### v1.25.0 composition (18 commits, 50 files changed, +4841/-66)

| # | Commit | Subject | Notes |
|---|--------|---------|-------|
| 1 | `914a81c` | `docs(roadmap): v1.25.0 PDF Level 1 plan (3 PRs, API-native, 0 new deps)` | |
| 2 | `18e515d` | `feat(pdf): PDF Level 1 core — cache + metadata parser + LLM converter` | PR1 core (pre-pivot) |
| 3 | `0abf2db` | `feat(pdf): PDF Level 1 ingest integration — orchestrator + 2 commands` | PR1 ingest integration (pre-pivot) |
| 4 | `3e9eac0` | `docs: v1.25.0 plan — cache-only PDF architecture pivot` | user-confirmed 2026-07-15 |
| 5 | `145d43b` | `feat(pdf): PR2 redo — cache-only PDF ingest (no sidecar)` | replaced orchestrator |
| 6 | `7e11b7a` | `feat(pdf): PR3 — PDF Level 1 settings + opt-in sidecar write` | |
| 7 | `cb16747` | `feat(pdf): PR3 follow-up — universal escape hatch + UX moves` | forcePdfSupport simplified to universal, writePdfMarkdownToVault moved to Wiki Configuration |
| 8 | `fd4b401` | `feat(pdf): PR3 follow-up #2 — cache filename safety + batch housekeeping + PDF error Notice` | hashCacheKey + prepareBatchIngest |
| 9 | `06e8724` | `docs(agents): sync AGENTS.md to post-PR3-follow-up-#2 state` | |
| 10 | `550d704` | `fix(pdf): PR3 follow-up #6 — ENOENT cache + AI-SDK cause chain routing` | Bug A + B |
| 11 | `63bb287` | `docs(changelog): bump test count to 2144` | |
| 12 | `56422a0` | `fix(pdf): PR3 follow-up #3 — reapply classifier tightening` | |
| 13 | `9fff9b7` | `fix(pdf): PR3 follow-up #5 — dismiss stuck "Ingesting:" Notice on ingest throw` | |
| 14 | `ff140b2` | `fix(ux): PR3 follow-up #7 — status bar + cancel during PDF ingest` | Bug C |
| 15 | `cf620e2` | `fix(pdf): PR3 follow-up #8 — PDF mid-flow cancel survives re-entry + abortSignal wired` | Bug D |
| 16 | `dd6af7d` | `fix(pdf): PR3 follow-up #9 — auto-create pdf-cache directory on set()` | Bug E |
| 17 | `cbf824d` | `refactor(prompts): PR3 follow-up #9 prompt-rewrite — centralize PDF prompt + unwrap helper` | src/wiki/prompts/pdf.ts |
| 18 | `971581c` | `docs(readme): PR3 follow-up #10 — PDF ingest + local model sections across 10 locales` | |

### Closed issues (v1.25.0 release)

- (none — v1.25.0 is feature work, not bug fixes)

### Six-Gate summary

| Gate | Status |
|---|---|
| Code correct (lint/tsc/test/build/css-lint) | ✅ 0/0/2182/clean/0 |
| No side effects | ✅ Cache-only default; settings opt-in to vault sidecar |
| No breaking changes | ✅ Settings default false; old data.json safe |
| No performance regression | ✅ Cache caps 100MB/1000/10MB; LRU; abortSignal threading ~200 ms |
| Docs complete | ✅ 10 READMEs + CHANGELOG + ROADMAP + memory file |
| Release clean | ✅ Trailer format (no model name/version), i18n parity |

---

## v1.26.0 MINOR (target TBD, ~2 weeks)

**Theme:** Kimi Files API + non-routine PDF providers (PR4, owned by AkaSakana) + wiki-engine.ts decomposition (P1 audit finding) + Lint perf opening (#99 follow-up) + #220 source-revision awareness (Tier 0/1/2) + #306 RAG-style top-K retrieval + #184 Obsidian Bases + #295 scheduled ingest + #168 granularity settings.

**Forward-looking scope (no v1.25.0 PDF Level 1 details — see CHANGELOG for shipped design rationale):**

| Item | Source | Notes |
|------|--------|-------|
| **PR4 Kimi Files API + non-routine PDF providers** | AkaSakana PR #286 transfer | Scope: Kimi Files API (upload → `file-extract` → delete), transient-retry extension for Files API endpoints, dedicated error regex classifiers. Lives in `core/kimi-document-reader.ts` + `core/pdf-error-classifier.ts`. If AkaSakana schedule slips → 1-day port by us. |
| **`wiki-engine.ts` 1799 → ≤1500 LOC decomposition** | 3rd-party audit P1 (2026-07-19) | Extract graph-cache + index-generation + log-writer (NOT ingest orchestration — that path is sensitive after v1.25.0 PDF pipeline). Prerequisite for Lint perf work. |
| **Lint performance opening (controller.ts:151 / :239)** | v1.18.0+ TODO (9 versions unaddressed) | Parallel dedup batches + LLM health analysis parallel; constrained by `MAX_CONCURRENT_LLM_CALLS`. After wiki-engine.ts decomposition. |
| **#220 Source-revision awareness (Tier 0 + Tier 1)** | DocTpoint's 4-tier design | Tier 0: fingerprint source (normalized body hash) → surgical replace self-source block (no LLM prose regeneration). Tier 1: `supersedes:` frontmatter flag. Tier 3 review-queue UI likely v1.27.0+. |
| **Generic `provider-capabilities` registry** | Altitude F4 (deferred from v1.25.1 Hotfix) | Replaces `forcePdfSupport` bool + `NATIVE_PDF_PROVIDER_IDS` constants with `getCapability(provider, cap)` lookup. |
| **Generic `HousekeepingTask` registry** | Altitude F5 (deferred from v1.25.1 Hotfix) | `interface HousekeepingTask { name, run() }`; plugin `onload` iterates registered tasks (each cache registers itself). |
| **`unwrapFencedMarkdown` generic helper** | Reuse F5 (deferred from v1.25.1 Hotfix) | Promote from `src/wiki/prompts/pdf.ts` to `src/text/unwrap-markdown-fences.ts`; reuse by Lint fix-runs + Query Wiki pre-process. |
| **#306 RAG-style top-K slug retrieval** | DocTpoint (self-de-escalated observation 2026-07-19) | Replace `buildCompactSlugList` (77% of extraction prompt on 2783-page vault) with `extractKeywords(sourceNote) → localKeywordMatch(keywords, wikiPages) → top-K injection`. **Zero new infrastructure** — reuses `src/core/index-search.ts:localKeywordMatch` + `src/wiki/query-engine/pipeline/query-keywords.ts`. Target: prompt share 77% → ~5%. Owner: DocTpoint volunteer + maintainer review. |
| **#184 Obsidian Bases wiki index** | @alfred1137 (2026-06-22) | Plugin writes `<wikiFolder>/_index.base` on `onload` + on wikiFolder change. Bases syntax: `filters: { and: ['wiki-content', 'generation_complete == true'] }`, `properties: { type: { displayName: "Type" }, tags: { displayName: "Tags" } }`, `views: [{ type: table, name: "All", order: [updated, type] }]`. **No LLM cost** — Bases queries frontmatter directly. User ROI: sort/filter/group wiki pages natively in Obsidian. Owner: maintainer (3-5d). |
| **#295 Scheduled ingest (peak-hour avoidance)** | @zxb888 (2026-07-18) | Cron-style UI + per-provider peak-window DB (DeepSeek: UTC 1-4 AM + 6-10 AM = UTC+8 9-12 PM + 2-6 PM). Reuses `auto-maintain.ts` periodic-lint infra. Design-track. |
| **#142 Multi-wiki UI** | @bobrock-git (2026-06-17) | Long-term. Current workaround: per-topic wiki folder presets + multiple plugin instances in vault copies. |
| **#168 Two granularity settings** | @Indexed-Apogrypha (2026-06-21) | Re-classified v1.25.2→v1.26.0 MINOR (2026-07-20): user-visible NEW feature. Two dropdowns `singleFileGranularity` + `batchGranularity` (Fine/Standard/Coarse/Minimal, default Standard). Types + settings UI + i18n (10 locales) + tests. ~1.5d. |
| **#312 follow-up (if needed)** | DocTpoint | v1.25.2 fixes `summary` injection into `mergeAnalysis` prompt. v1.26.0 may add Tier 1 (`supersedes:` frontmatter) per #220 for cases where source identity alone isn't enough. |

**What v1.26.0 does NOT do**: Bedrock Stage 2 (bearer-only via `@ai-sdk/amazon-bedrock@^5`, +0.3 MB) — conditional on 3+ user issues asking for Claude Sonnet 4 / Llama 4 on Bedrock. Bedrock Stage 3 SSO — indefinite deferral.

**Migrated forward design rationale** (kept here for v1.26.0 reader; full design lives in CHANGELOG for v1.25.0):

- **Trust boundary (PDF universal escape hatch, 2026-07-16):** The user is the authoritative source on what their endpoint supports. `forcePdfSupport` does NOT pre-flight whitelist. The LLM endpoint decides. Rejection propagates through `wiki-engine.ingestPdfSource` → `reportSkip` → localized `sourceRejectedPdfUnsupported` Notice. Honors user intent and gives definitive truth signal.
- **Cache-only architecture (2026-07-15 pivot):** PDF cache (`.obsidian/plugins/karpathywiki/pdf-cache/{sha256}.json`) is the single source of truth. No sidecar file in vault by default (`writePdfMarkdownToVault` advanced toggle opt-in). First-principles rationale: the user-visible product is wiki pages, not intermediate markdown; the original PDF is the canonical artifact; cache in `.obsidian/` already provides persistence; less code.
## Version Timeline
| Version | Date | Headline |
|---------|------|----------|
| **1.25.1** | 2026-07-20 | PATCH: silent Mentions loss on Related re-ingest fixed (#288 closes #287) + LLM rewrite drops schema sections prevented (#302 closes #292) + legacy pre-#244 Mentions shape healed on parse (#303 closes #289) + LM Studio no-key ingest (#272). Big-file splits: `wiki-engine.ts` 1799→1617 with 657 LOC of helpers into `engine-internals/` (Phase C-PR1), `settings.ts` 1439→357 with 1183 LOC across 8 settings-sections (Phase C-PR2), `main.ts` 1304→300 with 915 LOC across 6 main-commands via mixin pattern (Phase C-PR3). `DiskCache<T>` extracted with bounded growth + ledger optimization (Phase F). Node 24 + AI-SDK patches pinned via `.nvmrc` + `.npmrc` + dual-direction lockfile regen from single `node_modules` snapshot (Phase E). 11 commits, ~80 files, 2274 tests + PR #304 (DocTpoint updatedPages split, +5 tests → 2279 baseline, closes #290) |
| 1.25.0 | 2026-07-18 | MINOR: cache-only PDF Ingest (Level 1) — three-defense-layer bounded cache (100MB / 1000 / 10MB + LRU-by-mtime) + provider gate (anthropic/openai/bedrock-* native, others via `forcePdfSupport` universal escape hatch) + content-hash cache key with `converterVersion` + two new settings (`forcePdfSupport`, `writePdfMarkdownToVault`) + verbatim OCR-style PDF prompt. 2182 tests |
| 1.24.1 | 2026-07-14 | PATCH: 5-stage PPR cascade (#281) + parseJsonResponse quiet path (#282, closes #255/#274) + redundant Basic Information removal (#283, closes #258) + Bedrock Stage 1 (#277) + LM Studio no-key (#269) + Tier C bypass (#271) + page-factory split (#276) + non-lossy Mentions re-ingest (#267). 2080 tests |
| 1.24.0 | 2026-07-10 | MINOR: per-task models (#208) + Custom Query Instructions (#251) + 4 monolith splits (#248/#249/#250/#257) + source-note aliases (#185) + frontmatter write repair + merge triage (#216) + PPR graph warmup. 1825 tests |
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
