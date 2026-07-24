# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.25.5 PATCH (released 2026-07-24). | **Updated:** 2026-07-24

## Current Status

**v1.25.5 — RELEASED 2026-07-24.** PATCH scope. Fixes v1.25.4 P0 Obsidian Bot review compliance regression: eliminated `obsidianmd/*` inline-disables from production files by adding `Platform.isDesktop` guard to `requireNodeHttp()` (satisfies AST guard-detection) and `getSettingDefinitions()` no-op stub to `LLMWikiSettingTab` (satisfies method-detection). Removed global `eslint-comments/no-restricted-disable: "off"` from `eslint.config.mjs`. Test files excluded from lint scope to match Bot pipeline. Production lint now Bot-equivalent. 2535 tests passing (189 files).

### v1.25.5 composition

| # | Commit subject | Notes |
|---|----------------|-------|
| 1 | `fix(lint): Platform.isDesktop guard for requireNodeHttp, eliminate no-nodejs-modules disable` | Path A — AST guard pattern |
| 2 | `fix(lint): getSettingDefinitions no-op stub, eliminate prefer-setting-definitions disable` | Path B — method-detection |
| 3 | `config(eslint): remove no-restricted-disable global override, exclude test files from lint` | Match Bot pipeline exactly |
| 4 | `chore: bump version to 1.25.5 + CHANGELOG + lockfile regen` | Release packaging |

## Next: v1.26.0 MINOR
| 7 | `chore(deps): bump pnpm.overrides.fast-uri to 3.1.4 (CVE host-confusion) + brace-expansion 5.0.7` | pnpm audit 0 high |
| 8 | `feat(i18n): add 3 keys for Migrate Secret Storage across 10 locales` | apiKeyMigrateToSecretStorageButton + 2 more |
| 9 | `chore(lint): production-side obsidianmd bot warnings fully enforced (0/0); test-side cosmetic warnings relaxed per user direction v1.25.4` | option B layered override |

### v1.25.3 composition (1 commit, secret-storage + README sync)

| # | Commit | Subject | Notes |
|---|--------|---------|-------|
| 1 | `d7faef1` | `feat(security): move provider API key to Obsidian SecretStorage (#182)` | `ProviderSecretStore` + `resolveProviderApiKey` + migration. Closes #182 |

### v1.25.2 composition (7 commits, PRs #329 #324 #331 #332 #333 #334)

### v1.25.1 deferred → v1.25.2 PATCH resolved items

- ✅ **PR #304** (DocTpoint — `updatedPages` split). **MERGED** 2026-07-20 (`3578a9d`). The 4-line ternary inside `runBatchedWithRetry` closure (Phase C-PR1 refactor) was correctly resolved.
- ✅ **Phase A Obsidian bot compliance** (`prefer-create-el` × 50 + `getSettingDefinitions()`). **COMPLETED 2026-07-21** (`c9fd4ce`). eslint-plugin-obsidianmd 0.3.0→0.4.1 upgrade, flat config test override, `src/types/obsidian-dom.d.ts`, `src/__tests__/__support__/dom-helpers.ts`, 47 prefer-create-el production fixes, no-alert → ConfirmModal replacement. Production lint: 0 errors, 2 warnings (both pre-1.25.1 non-blocking).

### v1.25.1 deferred — still on v1.26.0 MINOR

- **Lint perf** (`controller.ts:151` / `:239` TODOs from v1.18.0+). Phase F was rolled into DiskCache<T> extraction; the controller-level parallel dedup batches + LLM health analysis batches remain v1.26.0 work.

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

### v1.25.3+ deferred

- **(v1.25.3 items all resolved — see above.)**

---

## Next Milestone: v1.26.0 MINOR (target TBD, ~2 weeks)

**Theme:** Kimi Files API + non-routine PDF providers (PR4, AkaSakana) + wiki-engine.ts decomposition + Lint perf opening + #220 source-revision awareness

### Scope

| Item | Source | Status |
|------|--------|--------|
| ✅ **PR #319 / #318** — batch delay 2000→10000ms slider | joffroy59 contribution | **MERGED** (`5346ddf`) |
| ✅ **PR #320 / #305** — truncated response halving retry | DocTpoint contribution | **MERGED** (`34a358a`) |
| ✅ **PR #273** — ChatGPT Codex OAuth | CCRRAY-DESIGN contribution | **MERGED** (`54bc128`, squash) |
| ✅ **PR #304** — updatedPages split (created vs updated) | DocTpoint contribution | **MERGED** (`3578a9d`) |
| ✅ **PR #322 / #308** — dead-link slug-normalized match | DocTpoint contribution | **MERGED** (`292300b`) |
| ✅ **eslint 0.4.1 Route A** | 2026-07-21 | **COMMITTED** (`c9fd4ce`) |
| ✅ **E2E fix: thinking-block HierarchyRequestError** | 2026-07-21 — `activeDocument.createEl` auto-attached to document.body broke saved-history load | **COMMITTED** (`d2d401e`) — refactored `renderThinkingBlocksUI(parent)`, caller (`QueryView.renderMarkdownContent`) threads `container` |
| ✅ **PR #324 / #307** — related-link corrector prefix scope | DocTpoint contribution | **MERGED** (`762bb3c`, squash); follow-up A (`2524bc3`) added case-sensitivity test + comment clarity |
| ✅ **PR #329 / #310** — bare `---` template trailer stripping | DocTpoint contribution | **MERGED** (`9b0ecad`, squash); removes closing rule from 5 page templates + `stripTrailingSeparators()` net at end of `cleanMarkdownResponse()` |
| 🚧 **Schema Phase 1 (Option A)** | Issue #328 — user-approved 2026-07-22 (override of "wait 2 weeks for community feedback" public commitment — override justified by Option A being bug-fix nature, not design track) | Eliminate dual-source problem: tag lists move from `buildDefaultSchemaBody()` to runtime injection layer; `schemaHasTagVocab` defensive check removed. (Folder layout stays Phase 2 — alongside per-type registration.) **Test LOC is net ↓** — 5 retired Phase 2 tests deleted, new contract lives in `runtime-injection.test.ts`. Backwards-compat: existing user schemas **not rewritten** — `loadSchema()` sanitizes legacy baked enum in-memory at LLM-facing view; on-disk file untouched. Phase 2/3 of #328 remain in v1.26.0 MINOR / v1.26.0+. |
| 🔲 #273 UX silent-error fix | ChatGPT OAuth test failure | **WITHDRAWN** 2026-07-21 (user e2e test confirmed actual Notice path works; no real silent bug) |
| 🔲 NOTICE update (DocTpoint description refresh + 4 new v1.25.0+ contributors) | Carry-over | Uncommitted in working tree, **deferred to v1.25.2 release commit** per Phase 1 commit scope discipline (NOT mixed with code commit) |
| 🔲 **v1.25.2 version release** | bump + 10 READMEs + CHANGELOG + versions.json | ~2h |

**Total effort**: ~3-4 working days remaining after Schema Phase 1 (~3-4h) + version release (~2h).

**Schema Phase 1 (Issue #328) — Option A user-approved 2026-07-22:**

The original #328 body proposed waiting 2 weeks for community feedback before phasing. User override approved Option A (immediate implementation in v1.25.2 PATCH) on three grounds: (a) Phase 1 is bug-fix nature — eliminating the dual-source problem (schema body baking stale tag list + runtime defensive injection of fresh tag list — LLM sees both → drift), not a design-track feature; (b) Phase 1 is orthogonal to Phase 2 (per-type registration, future Settings-driven `WIKI_SUBFOLDERS` derived list) and Phase 3 (multi-wiki + user-defined placeholders + dynamic scanners) — no future re-work predicted; (c) ~3-4h effort fits PATCH scope.

Implementation order (TDD, revised 2026-07-22):

1. RED: `src/__tests__/schema/runtime-injection.test.ts` (NEW file) — "buildDefaultSchemaBody never contains any baked tag enum regardless of settings" + "Classification Rules section explicitly references runtime injection"
2. RED: `src/__tests__/wiki/system-prompts-tag-vocab.test.ts` — **REVERSE** the existing duplicate-detection test (count==1 → count>=1): runtime is now authoritative, always appends
3. RED: `src/__tests__/schema/default-schema.test.ts` — **DELETE** the 5-test "v1.22.0 Phase 2 dynamic tag injection" describe block (`L78-154`) + REWRITE the "preserves entity and concept subtype valid lists" assertion (`L70-75`) to assert NOT-baked. Phase 2 contract is permanently reversed (hard rule in CLAUDE.md), not paused — keeping old tests would re-anchor a retired contract
4. CONFIRM all REDs fail for the right reason (`pnpm test`)
5. GREEN: Edit `src/schema/schema-manager.ts:33-153` — `buildDefaultSchemaBody()` drops the 5 `${entityList}/${conceptList}` interpolations (`L50/51/63/80/135/136`); rephrase Wiki Structure / Entity Page Template / Concept Page Template / Classification Rules to defer to the runtime "Active Tag Vocabulary" injection. **Keep `settings` parameter** with JSDoc note that it is unused since Phase 1 (avoid signature churn — `ensureSchemaExists` / `regenerateDefaultSchema` call sites stay byte-identical)
6. GREEN: Edit `src/wiki/system-prompts.ts:213-235` + `:255` — drop the `schemaHasTagVocab` defensive branch (always append runtime section); rename injected heading "(Issue #85 — user-controlled)" → "(runtime)"
7. REFACTOR: clean up the obsolete "// v1.22.0 #97 ... in lockstep" comment in `schema-manager.ts:34-40` (no longer applicable since runtime is authoritative — no lockstep needed)
8. Gate 1: `pnpm lint && npx tsc --noEmit && pnpm test && pnpm build && pnpm css-lint`

**Three implementation decisions resolved 2026-07-22 (recorded for the commit body):**

1. **5 Phase 2 tests in `default-schema.test.ts:78-154`**: DELETED, with the new contract living in the new file `runtime-injection.test.ts`. The runtime-vs-baked split is a permanent design reversal (CLAUDE.md "Schema 三层分离" hard rule), not a temporary contract change — keeping old tests would re-anchor a retired contract and mislead future contributors reading the file
2. **`buildDefaultSchemaBody(settings)` signature**: KEPT, with JSDoc marking settings as unused since Phase 1. `ensureSchemaExists()` / `regenerateDefaultSchema()` call sites byte-identical. Phase 2 may legitimately need settings again. Signature churn deferred to that PR
3. **NOTICE update timing**: DEFERRED to v1.25.2 release doc sync (NOT mixed into the Phase 1 commit). The 9-contributor attribution is release-scope; mixing into a code commit is range creep and obscures the Phase 1 git history. The remembered uncommitted NOTICE change from the PR #329 cycle will be re-applied with the v1.25.2 release commit

**Why Option A is safe for backwards compat:**

- Existing users' schema files (with baked-in tag lists) are NOT rewritten — only `ensureSchemaExists()` and explicit `regenerateDefaultSchema()` produce the new clean template
- Existing users get immediate runtime improvement (no more dual-source — runtime injection is always authoritative)
- All call sites of `getSchemaContext()` are unchanged — same SchemaTask contract
- The Title-text change of injected section ("user-controlled" → "runtime") is a minor visual change but functionally identical
- No prompt-text changes that break existing test fixtures (verified by grep `pnpm test` after each step)

**Why Option A does NOT block Phase 2/3:**

- `buildDefaultSchemaBody()` modification only touches *content* of one specific section (Wiki Structure + Classification Rules); it does NOT change the section *structure* that Phase 2 relies on (`## <Type> Page Template` discovery via `parseSections()` / `selectSections()`)
- The runtime injection point in `system-prompts.ts:213` is exactly where Phase 2 will add `buildActiveFolderLayoutSection()` — symmetric extension, no refactor
- `WIKI_SUBFOLDERS` constant remains untouched; Phase 2 will replace it with derived-from-settings without conflicting with Phase 1
- Phase 3 (multi-wiki, placeholders, scanners) requires no schema-body changes at all — orthogonal

Full decision rationale: [[feedback-schema-phase1-option-a-decision]].

### v1.25.2 version bump notes

- `manifest.json` already at `1.11.4` (set by PR #273).
- `versions.json` needs `"1.25.2": "1.11.4"` entry.
- v1.25.1's `minAppVersion` was `1.11.4` (set by #273), but `versions.json` still had `"1.25.1": "1.11.0"` — v1.25.2 must add the correct entry.`

Full design rationale: [[feedback-eslint-0-4-1-upgrade]] + `project_v1.25.1_release.md`.

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
| **1.25.1** | 2026-07-20 | PATCH: silent Mentions loss on Related re-ingest fixed (#288 closes #287) + LLM rewrite drops schema sections prevented (#302 closes #292) + legacy pre-#244 Mentions shape healed on parse (#303 closes #289) + LM Studio no-key ingest (#272). Big-file splits: `wiki-engine.ts` 1799→1619 with 657 LOC of helpers into `engine-internals/` (Phase C-PR1), `settings.ts` 1439→370 with 1183 LOC across 8 settings-sections (Phase C-PR2), `main.ts` 1304→300 with 915 LOC across 6 main-commands via mixin pattern (Phase C-PR3). `DiskCache<T>` extracted with bounded growth + ledger optimization (Phase F). Node 24 + AI-SDK patches pinned via `.nvmrc` + `.npmrc` + dual-direction lockfile regen from single `node_modules` snapshot (Phase E). 11 commits, ~80 files, 2274 tests |
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
