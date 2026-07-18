# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.25.0 (RELEASED 2026-07-18) → v1.25.1 Hotfix next. | **Updated:** 2026-07-19 (post-Obsidian-audit alignment)

## Current Status

**v1.25.0 — RELEASED 2026-07-18.** MINOR scope. Cache-only PDF Ingest (Level 1). 2182 tests passing (165 files, +102 since v1.24.1).

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

### AkaSakana PR #286 (still open, transfer responsibility to PR4)

PR #286 — AkaSakana's `feat: native pdf support` branch — not merged as-is into v1.25.0. After v1.25.0 lands on main, invite AkaSakana to ship Kimi Files API + non-routine provider PDF dispatch + error regex classifiers as a follow-up PR on top of the v1.25.0 baseline. Target: **v1.26.0 MINOR**. Reply draft pending in Step 7.

---

## Next Milestone: v1.25.1 Hotfix (target ~10-11 working days, single PATCH)

**Theme:** 2026-07-19 post-release audit cleanup folded into one comprehensive PATCH. Four audit sources:

1. **Obsidian bot warnings** — `prefer-create-el` × 50 + `getSettingDefinitions` not implemented. Root cause: `eslint-plugin-obsidianmd` local 0.3.0 vs Obsidian bot 0.4.1 (version drift). **Fix**: Phase A.
2. **10 README stale TOC anchor** — Heading body was replaced in v1.25.0 release but TOC anchor string `v1240` was missed. **Fix**: Phase B1.
3. **10 README flat nav request (user)** — Add 5-item flat quick-nav (`🚀 Quick Start / ✨ Features / 🤖 Model Selection Guide / 🔒 Transparency & Compliance / ❓ FAQ`) before line 17 (ko-fi row). **Fix**: Phase B2.
4. **Build verification regression** — v1.25.0's URL rewrite (npmmirror → npmjs) was necessary but not sufficient. Dual root causes: pnpm↔npm lockfile drift + main.js hash vs git tag alignment. **Fix**: Phase E.
5. **Big-file splits (3rd-party audit, 2026-07-19)** — `wiki-engine.ts` 1799 LOC + `settings.ts` 1439 LOC. Both ROI-positive now that v1.25.0 features shipped. **Fix**: Phase C.
6. **Lint perf (9-version TODO)** — `controller.ts:151` + `:239` TODOs from v1.18.0+ unaddressed. **Fix**: Phase F.
7. **Triage fixes** — PR #288 (silent data loss, closes #287) + PR #272 (LM Studio empty-key). **Fix**: Phase D.

### 8-Phase execution order

| Phase | Scope | Days | Gate |
|-------|-------|------|------|
| **A** | Obsidian bot compliance — upgrade `eslint-plugin-obsidianmd` 0.3.0 → 0.4.1, resolve `prefer-create-el` × 50, implement `getSettingDefinitions()` declarative settings API for Obsidian 1.13.0+ Settings search | 1-2 | Gate 1 + 3 + 5 |
| **B** | 10 README rework — TOC anchors v1.24.0 → v1.25.0 + flat 5-item quick-nav (before line 17) + stale contributors audit | 2-3 | Gate 5 |
| **C** | Big-file splits — `wiki-engine.ts` 1799 → ≤1500 LOC (extract graph-cache + index-generation + log-writer, NOT ingest orchestration) + `settings.ts` 1439 → ~870 LOC (Phase 1: extract LLM Provider section) → ≤200 LOC orchestrator (Phase 2: full restructure into 5-6 sections + helpers) | 3-5 | Gate 1 + 2 + 3 |
| **D** | Triage fixes — merge PR #288 (DocTpoint `updateRelatedPage` silent data loss) + PR #272 (rkuzmin LM Studio empty-key gate) after rebase onto main | 5-6 | Gate 1 + 6 |
| **E** | Build verification root-cause — dual-direction lockfile regen per `pre-release-gate` §2f.2 v1.23.2 procedure + main.js hash ↔ git tag alignment audit | 6-7 | Gate 1 + 6 |
| **F** | Lint perf + cache abstractions — close `controller.ts:151` (Duplicate detection bottleneck) + `:239` (LLM health analysis bottleneck) TODOs via parallel batches; extract generic `DiskCache<T>` from `PdfConversionCache`; `enforceSizeLimit` ledger optimization (in-memory bytesWritten/entryCount ledger, only trigger `enforceSizeLimit` when ledger exceeds cap) | 7-8 | Gate 1 + 4 |
| **G** | Documentation sync — CHANGELOG v1.25.1 entry, ROADMAP "Implemented v1.25.1" section, CLAUDE.md `Last Updated` + `Current Phase` + plugin version drift rule, CONTRIBUTING.md project structure tree, memory file + MEMORY.md index | 9 | Gate 5 |
| **H** | Release — full 8-step `obsidian-plugin-release` skill including Step 8 Discussion announcement (PATCH but scope is broader than bug-fix; user override allowed per skill decision tree) | 10-11 | Gate 6 |

**Total effort**: ~12.5 working days. Test count trajectory: 2182 → ~2250.

**Why one big PATCH (not split into 1.25.1 / 1.25.2)**: All findings are v1.25.0 audit cleanup. Splitting across multiple PATCH creates 2× release overhead for what's logically one release.

**Per-version settings schema delta**: Zero new fields. `getSettingDefinitions()` is implementation-detail of existing settings. Backward-compat: existing `data.json` + `plugin.json` + `.obsidian` cache all valid. Tests: additive only.

Full design rationale per phase: [`project_v1.25.1_release.md`](~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/project_v1.25.1_release.md). Audit root-cause memory files: [`feedback_obsidianmd_plugin_version_drift.md`](~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/feedback_obsidianmd_plugin_version_drift.md) · [`feedback_build_verification_root_cause.md`](~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/feedback_build_verification_root_cause.md) · [`feedback_readme_wn_anchor_stale.md`](~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/feedback_readme_wn_anchor_stale.md).

**AkaSakana PR #286 reply draft:** Reply in Step 7 — thank for the design feedback adopted in v1.25.0 (converterVersion cache key, universal escape hatch, Kimi Files API deferred to PR4/v1.26.0). Invite AkaSakana to ship PR4 as a follow-up PR on top of v1.25.0.

---

## v1.26.0 MINOR (target TBD, ~2 weeks)

**Theme:** Kimi Files API + non-routine PDF providers (PR4, owned by AkaSakana) + wiki-engine.ts decomposition (P1 audit finding) + Lint perf opening (#99 follow-up) + #220 source-revision awareness (Tier 0/1/2).

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

**What v1.26.0 does NOT do**: Bedrock Stage 2 (bearer-only via `@ai-sdk/amazon-bedrock@^5`, +0.3 MB) — conditional on 3+ user issues asking for Claude Sonnet 4 / Llama 4 on Bedrock. Bedrock Stage 3 SSO — indefinite deferral.

**Migrated forward design rationale** (kept here for v1.26.0 reader; full design lives in CHANGELOG for v1.25.0):

- **Trust boundary (PDF universal escape hatch, 2026-07-16):** The user is the authoritative source on what their endpoint supports. `forcePdfSupport` does NOT pre-flight whitelist. The LLM endpoint decides. Rejection propagates through `wiki-engine.ingestPdfSource` → `reportSkip` → localized `sourceRejectedPdfUnsupported` Notice. Honors user intent and gives definitive truth signal.
- **Cache-only architecture (2026-07-15 pivot):** PDF cache (`.obsidian/plugins/karpathywiki/pdf-cache/{sha256}.json`) is the single source of truth. No sidecar file in vault by default (`writePdfMarkdownToVault` advanced toggle opt-in). First-principles rationale: the user-visible product is wiki pages, not intermediate markdown; the original PDF is the canonical artifact; cache in `.obsidian/` already provides persistence; less code.
## Version Timeline
| Version | Date | Headline |
|---------|------|----------|
| **1.25.0** | 2026-07-18 | MINOR: cache-only PDF Ingest (Level 1) — three-defense-layer bounded cache (100MB / 1000 / 10MB + LRU-by-mtime) + provider gate (anthropic/openai/bedrock-* native, others via `forcePdfSupport` universal escape hatch) + content-hash cache key with `converterVersion` + two new settings (`forcePdfSupport`, `writePdfMarkdownToVault`) + verbatim OCR-style PDF prompt. 2182 tests |
| **1.25.1** | 2026-07-XX (planned) | Hotfix: Obsidian bot compliance (`eslint-plugin-obsidianmd` 0.3.0 → 0.4.1 + `prefer-create-el` × 50 + `getSettingDefinitions()` declarative settings API) + 10 README TOC anchor v1.24.0 → v1.25.0 + flat 5-item quick-nav + Build verification root-cause (dual-direction lockfile regen + main.js ↔ tag alignment) + `wiki-engine.ts` 1799 → ≤1500 LOC split + `settings.ts` 1439 → ≤200 LOC split + Lint perf (controller.ts:151/:239 parallel batches) + `DiskCache<T>` extraction + PR #288 (closes #287) + PR #272. Target ~2250 tests |
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
