# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.24.0 (shipped 2026-07-10) → v1.24.1 in flight (target TBD) | **Updated:** 2026-07-10

## Current Status

**v1.24.0 — RELEASED 2026-07-10.** MINOR scope. Per-task model routing (#208), Custom Query Instructions (#251), four monolith splits (PR #248/#249/#250/#257), source-note aliases propagation (#185), frontmatter write repair (4 user-reported bugs), Tier-1+Tier-2 merge triage (#216), engine-level PPR graph warmup. 1825 tests passing. New optional settings: `ingestModel`, `lintModel`, `queryModel`, `usePerTaskModels`, `*UseCustom`, `customQueryInstructions`. New manifest field: `fundingUrl`.

**v1.24.0 release composition:**
- ✅ PR #248 — `controller.ts` `runLintWiki` god function → 3 LLM phase modules.
- ✅ PR #249 — `history-modal.ts` 1579 → 14 files.
- ✅ PR #250 — `query-engine.ts` 1373 → 15 files.
- ✅ PR #257 — `modals.ts` 1008 → 7 files + Query Wiki bug fixes (Bug A/B/B+/C) + #251 + lint schema injection + PPR graph warmup.
- ✅ PR #259 — #216 Tier-1+Tier-2 merge triage (`DocTpoint`).
- ✅ PR #260 — `## 相关实体` / `## 相关概念` empty-line fix.
- ✅ PR #261 — #185 source-note aliases propagation.
- ✅ PR #262 + #264 — #208 per-task models (UI + Test Connection + 28 call sites).
- ✅ `1d943ea` — 4 user-reported frontmatter write bugs (`aliases:[]`, dedupe, block-style, error logging).

Historical releases are summarized in [CHANGELOG](./CHANGELOG.md).

### v1.23.2 — Implemented (shipped 2026-07-05)

See [CHANGELOG](./CHANGELOG.md#v1.23.2) for full details. **PATCH** scope. Five merged PRs (#234 + graph-cache + #221 + #219 + DocTpoint's #238 + #241). 1431 tests at ship. Post-release monolith splits (#248/#249/#250) added ~90 test cases — **1616 tests across 115 files in latest main**. No new user-facing settings. Recommended upgrade for everyone on v1.23.0+.

## Next Milestone: v1.24.1 PATCH (target TBD)

### User-reported bugs awaiting triage

- **Windows: `Connection test failed: TypeError: Failed to construct 'Headers': String contains non ISO-8859-1 code point`** — user screenshot, DeepSeek + GLM + compatible interfaces all failing. Root cause likely API key input containing non-ASCII chars (Chinese IME residue / trailing whitespace / Chinese punctuation) → AI-SDK `withUserAgentSuffix` builds `Authorization: Bearer <key>` → `new Headers()` throws (latin1 default). GLM 401 "令牌已过期或验证不正确" is a real token issue (re-generate key on zhipu console). AI-SDK 5.0.53 added a Windows guard but our `provider-utils@4.0.35` (bundled by `ai@^6.0.214`) does not include the fix. Proposed (NOT yet acted on — user said deferred): Fix A — Settings apiKey input sanitization (trim + non-ASCII detection + Notice). Fix B — Map SDK `Headers` TypeError to a readable message. Fix C — Pre-set ASCII-safe `User-Agent` in our SDK clients.

## v1.24.0 — Implemented (shipped 2026-07-10)

MINOR scope. Per-task model routing + Custom Query Instructions + four monolith splits + source-note aliases + frontmatter write repair. 1825 tests passing.

See [CHANGELOG](./CHANGELOG.md#1240--2026-07-10) for full details.

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
- ~~LintFixer class → module-level functions (707-LOC god class split, 1 day)~~ — **FALSE BACKLOG ITEM** (2026-07-07): the LintFixer god class was already split in v1.19.0 into 8 module-level functions under `src/wiki/lint/` (`fix-dead-link.ts`, `fill-empty-page.ts`, `link-orphan.ts`, `merge-duplicates.ts`, `delete-empty-stubs.ts`, `fix-polluted-page.ts`, `duplicate-detection.ts`). `fix-runners.ts` (500 LOC) is the unified dispatch layer — not a god class. See [[project_v1.24.0_remaining_split_roi]] for the corrected large-file analysis.

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

## v1.24.1 PATCH — Execution Plan

GitHub milestone: https://github.com/green-dalii/obsidian-llm-wiki/milestone/6

### Execution sequence (4 fixes, ordered by ROI + dependency)

#### Fix #1 — #268 Tier C `forceRecreate` bypass (immediate, green-dalii)

**Root cause** (verified): `recreateWelcomeNote` command and `ensureWelcomeNote` short-circuit `shouldCreateWelcomeNote=false` for Tier C users (vault already has wiki pages) → `welcomeNotePath` undefined → "Willkommen-Notiz wurde nicht neu erstellt" Notice. The German error message misleadingly says "LLM configuration" but LLM is fine; the real cause is tier-based short-circuit, not LLM config.

**Fix scope** (+5 LOC, ~30 LOC test, 10 locales i18n):
- `src/core/ensure-welcome-note.ts` — `EnsureWelcomeNoteArgs` adds `forceRecreate?: boolean`; Step 3 short-circuit becomes `if (!action.shouldCreateWelcomeNote && !forceRecreate)`
- `src/schema/auto-maintain.ts` — `recreateWelcomeNote()` passes `forceRecreate: true` to `runOnboardingPhase()`
- `src/texts/<locale>.ts` — `welcomeNoteNotRecreated` text corrected (e.g., German: "Wiki-Voraussetzungen nicht erfüllt (Tier C) — siehe Tier-Diagnose.")

**Branch**: `fix/welcome-recreate-tier-c-bypass`

#### Fix #2 — `<!-- reviewed: keep -->` consolidation into frontmatter `reviewed: true` (immediate, green-dalii)

**Rationale**: Two parallel reviewed-mechanisms are redundant. `<!-- reviewed: keep -->` (PR #244) protects only Mentions section; frontmatter `reviewed: true` protects entire page. User-facing semantics unify to "frontmatter `reviewed: true` = page + Mentions section both protected". Drops one hidden Easter-egg mechanism; Obsidian Properties panel auto-surfaces the field; MD linters don't strip frontmatter.

**Fix scope** (net +5 LOC, 1 test rewrite, 10 locales migration note):
- `src/core/mentions-injector.ts` — delete `REVIEWED_KEEP_MARKER`; `InjectMentionsOptions` adds `pageIsReviewed: boolean`; early-return on `options.pageIsReviewed`
- `src/wiki/page-factory.ts` — `assembleFinalContent()` parses frontmatter and forwards `pageIsReviewed`
- `src/__tests__/core/mentions.test.ts:274-284` — marker test rewritten as `pageIsReviewed: true` test
- 10 README — Upgrading from v1.24.0 section adds 1 paragraph explaining the migration

**CHANGELOG entry**: Changed (not Added / Fixed). "Consolidated reviewed mechanisms: `<!-- reviewed: keep -->` marker removed; use frontmatter `reviewed: true` to protect the entire page (covers both body and Mentions section)."

**Branch**: `refactor/mentions-consolidate-reviewed-mechanisms`

**MUST land BEFORE #267 PR** to avoid merge conflicts (both touch `assembleFinalContent` signature).

#### Fix #3 — #267 Mentions union (DocTpoint PR incoming, our review pending)

**Root cause** (verified): `assembleFinalContent` (`src/wiki/page-factory.ts:1088-1112`) takes only `info.mentions_with_provenance` (new source's set) and calls `injectMentionsSection` which strips existing `## Mentions in Source` and re-emits from new-source-only. Affects all 3 paths: `triage=skip` (line 1018), `triage=complementary`, `body-merge` (line 1068).

**Fix shape** (DocTpoint to PR; we review):
- Place union at `assembleFinalContent` entry (NOT `mergePage` entry — would change `info` semantics for downstream readers)
- Reuse `mergeMentionsFields` from `src/core/batch-merger.ts`; upgrade dedup key to `(quote, source_path, position?)`
- Honor BOTH reviewed mechanisms (frontmatter gate at `mergePage` entry → `appendToReviewedPage`; marker gate inside `injectMentionsSection`)
- Strict round-trip test: `formatMentionsSection` ↔ new parser (`core/mentions-formatter-roundtrip.test.ts`)

**Tracked under milestone v1.24.1**. Invite comment posted.

#### Fix #4 — Bedrock provider via bedrock-mantle endpoint (immediate, green-dalii; replaces PR #263 design)

**Approach**: 3-stage plan. v1.24.1 ships **Stage 1 only** (zero new deps, ~+3 KB bundle delta). PR #263's bearer + SSO design is moved to **Stage 2 + Stage 3** (deferred).

**Stage 1 details** (this PR, ~750 LOC, mostly i18n):
- **Reuse existing compatible-client paths** with custom baseURL. `AnthropicSdkClient` and `OpenAICompatSdkClient` already support arbitrary baseURL (v1.23.0 P1.5 baseURL fallback mechanism).
- New `provider: 'bedrock-anthropic' | 'bedrock-openai'` settings + `bedrockRegion: string` (default `us-east-1`).
- Two new branches in `createLLMClientFromSettings` + `Sync`:
  ```ts
  if (provider === 'bedrock-anthropic') {
    return new AnthropicSdkClient({
      apiKey,
      baseURL: `https://bedrock-mantle.${bedrockRegion}.api.aws`,
    });
  }
  if (provider === 'bedrock-openai') {
    return new OpenAICompatSdkClient({
      apiKey,
      baseURL: `https://bedrock-mantle.${bedrockRegion}.api.aws/v1`,
      provider: 'bedrock-mantle',
    });
  }
  ```
- 5 new i18n keys × 10 locales (bedrock provider label / region selector / API key hint / help URL / test connection hint).
- Models covered (per AWS docs endpoint availability): Claude Sonnet 5 / Fable 5 / Haiku 4.5 / Opus 4.7 / 4.8 (Anthropic Messages via bedrock-mantle) + GPT-5.4 / 5.5 / GPT OSS / DeepSeek V3.1-V3.2 / Mistral Large 3 / Kimi K2 / Qwen3 / GLM 4.7-5 / Grok 4.3 / Google Gemma 3 / NVIDIA Nemotron 3 (OpenAI Chat Completions via bedrock-mantle).

**Known gap** (Stage 1 doesn't cover): Claude Sonnet 4 / 4.5 / 4.6, Claude Opus 4.1 / 4.5 / 4.6, Llama 3.x / 4.x — these are bedrock-runtime-only and require Stage 2.

**Bundle delta: ~+3 KB** (settings UI strings + factory branches; **zero new npm deps**).

**Stage 2 (deferred to v1.25.0+ MINOR, conditional on demand)**:
- Bearer-only via `@ai-sdk/amazon-bedrock@^5` (drop SSO from PR #263; drop `platform: 'node'` global flip).
- Bundle delta: ~+0.3 MB (matches dmsessions' drop-test measurement).
- Models: Sonnet 4.x + Opus 4.5-4.8 + Llama 4 family + Cohere Command R+ + Jamba + Titan embeddings.
- Trigger: 3+ user issues requesting Claude Sonnet 4 / Llama 4 on Bedrock.

**Stage 3 (indefinitely deferred)**:
- SSO / profile / IMDS via `@aws-sdk/credential-providers` chain.
- Bundle delta: +1.2 MB. Only land if 5+ users explicitly request enterprise auth.

**Branch**: `feat/bedrock-mantle-stage1`

**Files**:
- `src/types.ts` — add `bedrock-anthropic` / `bedrock-openai` to `PREDEFINED_PROVIDERS`; add `bedrockRegion?: string` to `LLMWikiSettings`
- `src/llm-sdk/create-llm-client.ts` — 2 new branches in each of async + sync factories (~16 LOC total)
- `src/ui/settings.ts` — region dropdown (14 regions) conditional on bedrock provider
- `src/texts/<locale>.ts` — 5 new keys per locale
- `src/__tests__/llm-sdk/bedrock-factory.test.ts` (NEW) — factory path tests for both new providers
- `docs/README*.md` — 1 paragraph Bedrock setup guide per locale (ABSK key generation link)
- `CHANGELOG.md` — `[1.24.1]` entry under Added

**PR #263 status**: review posted (state `COMMENTED`, body 7844 chars) proposing the 3-stage split. Awaiting dmsessions response.

**Memory**: [`project_v1.24.1_bedrock_stage1.md`](~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/project_v1.24.1_bedrock_stage1.md) — full design rationale + coverage matrix + bundle math.

### Not in v1.24.1

- **#258** (cosmetic P2 — `createNewPage` non-schema section drift) — defer
- **#255** (Lint console noise — needs user detail on which fix-runner) — defer to v1.24.2
- **Windows Headers TypeError** — withdrawn (user input error, not plugin bug)
- **#220 + #224** (Source-revision / fingerprint / 3-class contradiction) — moved to **v1.25.0 MINOR** scope; prerequisite: v1.24.1 #267 ships (✅ DocTpoint PR #269 ready) + page-factory.ts split (v1.24.2)
- **#218 PDF source ingest Tier 1** (topology A + Path 1 native LLM read) — moved to **v1.25.0 MINOR** scope; see v1.25.0 Execution Plan below

## v1.24.2 PATCH — Code Health (target TBD)

GitHub milestone: not yet created (open when v1.24.1 ships)

**Theme**: Code health PATCH addressing the most acute debt identified by 2026-07-11 third-party audit + the changes #267 / #220 are about to make against `page-factory.ts` (now 1252 LOC, the new largest god-file candidate).

### Fix #1 — `QueryView.sendMessage()` 501-line god-method split (P0, green-dalii)

**Root cause** (verified 2026-07-11): `QueryView-class.ts:412-912` is a single 501-line method (`sendMessage`) that combines: custom instructions injection + request payload build + streaming + UI state update + thinking block extraction + history append + error handling + retrieval label update. 第三方审查低估为 294 行，实测 501 行——god-method 比报告还严重。

**Fix shape** (~80 LOC net):
```
src/wiki/query-engine/
  pipeline/send-message/
    index.ts                 — orchestrator (~30 LOC)
    build-request-payload.ts — custom instructions + 检索标签注入 (~30 LOC)
    stream-and-render.ts     — 流式响应 + UI 更新 (~40 LOC)
    post-process-response.ts — thinking block + retrieval label (~30 LOC)
```

`sendMessage` 收缩为 ~50 LOC orchestrator。`pipeline/` 目录已存在（read-index / load-pages / select-seeds / assemble-context from v1.24.0 PR #250）。

**Branch**: `refactor/query-view-send-message-split`

### Fix #2 — `page-factory.ts` 1252-line split (P1, green-dalii)

**Root cause** (verified 2026-07-11): `src/wiki/page-factory.ts` is 1252 LOC and is the file that `assembleFinalContent` lives in (touched by #267 PR #269 + planned by #220 / #224). 越早拆分，越减少后续 PR 的 merge 冲突。

**Fix shape** (~50 LOC net):
```
src/wiki/page-factory/
  index.ts                — 公开 API re-export
  create-page.ts          — 新建路径
  merge-page.ts           — merge/skip/complementary/body-merge 4 triage 路径
  mentions-integration.ts — assembleFinalContent 的 Mentions 处理
  conflict-resolution.ts  — ConflictResolver 调用
  triage.ts               — 分类决策
  constants.ts            — section labels 等
```

**Branch**: `refactor/page-factory-split`

### Fix #3 — Lint 性能优化 (parallel dedup batches) (P1, green-dalii)

**Root cause** (per 3rd-party audit 2026-07-11): Lint controller 两个 TODO（"Duplicate detection is the dominant Lint bottleneck" + "LLM health analysis is the other major bottleneck"）从 v1.18.0 起挂 6 个版本未处理。真实测试 vault 已达 2142 页，影响在加速恶化。

**Fix shape** (~30 LOC + 5 测试):
- `src/wiki/lint/llm-phases/dedup-phase.ts` — `Promise.allSettled` 分批处理 dedup candidates
- 受并发上限约束（`MAX_CONCURRENT_LLM_CALLS`）
- 不破坏 `transient-retry.ts` 已有的 retry 语义

**Branch**: `perf/lint-parallel-dedup`

### Not in v1.24.2

- **#258** (cosmetic P2) — defer to v1.24.3 or v1.25.0
- **#255** (Lint console noise) — defer to v1.24.3

## v1.25.0 MINOR (target TBD)

GitHub milestone: not yet created (target: 2026-08-XX)

**Theme**: Source-revision awareness + PDF native ingest + LLM-driven memory hygiene. This is a feature MINOR, not a refactor MINOR — every item here is user-visible.

### Fix #1 — #220 + #224 Source-revision awareness (Tier 0 + Tier 1, DocTpoint-led)

**Root cause** (per Discussion #224, 2026-07-10): Wiki treats knowledge as static. Re-ingest is the user's "commit + push" decision, but the current pipeline re-litigates it ("existing content takes priority unless clearly more accurate"). Two-class design: same-source (faithfully execute) vs cross-source (conserve both with provenance).

**Prerequisites** (must land first):
1. ✅ #267 non-lossy write path (DocTpoint PR #269 ready)
2. v1.24.2 Fix #2 page-factory.ts split (reduces merge conflict surface)

**Fix shape** (~1500 LOC, 1-2 weeks):
- **Tier 0** — Deterministic same-source replace (low risk): fingerprint source (normalized body hash), compare against existing source attribution, surgically replace that source's block in place (no LLM prose regeneration). `last_modified_by_ingest:` frontmatter field.
- **Tier 1** — `supersedes:` frontmatter flag for cases detection can't see (note renamed/split).
- **Calibration fixture** for contradiction/orthogonal/corroborate detection — capability-gate per-task model routing.

**Branch**: `feat/source-revision-tier0-tier1`

### Fix #2 — #218 PDF native ingest Tier 1 (A-NGJ-led, design from Discussion #222)

**Topology** (decided in Discussion #222): **Topology A + Path 1** — plugin-native extraction via provider's own document support, **zero new dependencies**.

**Fix shape** (~600 LOC):
- `src/llm-sdk/read-document.ts` — `readDocument(path)` chokepoint in LLM client interface (cross-provider)
- `src/llm-sdk/anthropic-sdk-client.ts` — wire native PDF via `messages.content` blocks with `{type: 'document', source: {type: 'base64', media_type: 'application/pdf', data: ...}}` (AI-SDK v6 Anthropic provider supports this natively)
- `src/llm-sdk/openai-compat-sdk-client.ts` — wire vision-capable models (gpt-4o+) with PDF in `image_url` content type
- `src/llm-sdk/openai-sdk-client.ts` — same as compat
- `src/llm-sdk/google-gemini-compat-client.ts` (if not already) — wire file upload (gemini specific)
- `src/core/document-extraction-cache.ts` — content-hash-keyed cache (PDF bytes → base64 + extracted text); lives at `.obsidian/plugins/karpathywiki/pdf-cache/`
- `src/core/source-analyzer.ts` — accept `.pdf` extension in addition to `.md`/`.markdown`; route via `readDocument()`
- Settings: `pdfProvider?: 'native-llm' | 'reject'` (default: 'native-llm'); `pdfMaxPages?: number` (default 50); `pdfCacheTtlDays?: number` (default 30)
- 9 i18n keys × 10 locales (pdfSourceLabel, pdfUnsupportedNotice, pdfExtractionFailedNotice, pdfCacheHitNotice, etc.)
- Graceful rejection: scanned/image-only PDFs → clear Notice with provider error message
- Unsupported providers (DeepSeek / GLM / Ollama / LMStudio) → Notice "Your provider does not support PDF; please pre-convert to Markdown"

**Provider support matrix** (Tier 1):
| Provider | Status | Mechanism |
|---|---|---|
| Anthropic (Claude 3.5+ / Sonnet 4+) | ✅ | Native document content block (base64 PDF) |
| OpenAI official (gpt-4o+) | ✅ | `image_url` content type with PDF mime |
| OpenAI-compatible (Gemini via OpenAI compat) | ⚠️ Conditional | Gemini supports PDF via file upload, but compat layer requires custom routing |
| Bedrock (Stage 2 — v1.25.0+ after Stage 1 ships) | ✅ | Converse API supports PDF document block |
| DeepSeek / GLM / Ollama / LMStudio | ❌ Notice | Reject with clear error |
| Custom baseURL | ⚠️ Probe | Try with probe-then-fallback (reuse TokenKeyProber pattern) |

**Branch**: `feat/pdf-source-ingest`

### Fix #3 — CI file-line-count warning (non-blocking, v1.25.0 research scope)

Per 3rd-party audit 2026-07-11: CI script that warns (non-fail) when single file > 800 LOC. Catches the "should split now" signal earlier.

**Fix shape** (~50 LOC):
- `scripts/check-file-size.mjs` — grep `src/**/*.ts` for line count; warn at 800, fail at 1500 (configurable)
- Wire into `pnpm lint` as non-blocking step

**Branch**: `chore/ci-file-size-warning`

### Not in v1.25.0

- **Bedrock Stage 2** (bearer-only via `@ai-sdk/amazon-bedrock@^5`, +0.3 MB) — conditional on 3+ user issues asking for Claude Sonnet 4 / Llama 4 on Bedrock. Tracked but not scheduled.
- **Bedrock Stage 3 SSO** (+1.2 MB) — indefinite deferral; only land if 5+ users explicitly request enterprise AWS auth.
- **#258** (cosmetic P2) — defer to v1.25.1 PATCH
- **#255** (Lint console noise) — defer to v1.25.1 PATCH

### Closed milestones (already shipped)

v1.23.0 / v1.23.1 / v1.23.2 / v1.24.0 — all closed on GitHub.

---

### Deprecated (kept for archaeology, see CHANGELOG for details)

This section replaces the obsolete "Stage 2 Bug B+B+ / Stage 3 Bug A / Stage 4 #251" in-flight tracking that belonged to the v1.24.0 P2 cycle (shipped 2026-07-10).

- **#220 — Source-revision awareness for merge** (DocTpoint's 4-tier design). Tier 0 fingerprint + replace self-updates; Tier 1 `supersedes:` frontmatter flag; Tier 2 cross-source disagreement open question; Tier 3 review-queue UI. Tiers 0-1 tractable for v1.24.0; Tier 3 likely v1.25.0+. Prerequisite: open Discussion thread on fingerprint function design.
- **#218 — PDF source ingest** (Discussion #222 topology).
- **Hub-retirement lint wire-up** — `core/hub-retirement.ts` (0 callers) → wire `assessHubs` into lint path. Owned by @DocTpoint (post-#215 merge).
- **#169 estimated-time-remaining** — velocity window + batch telemetry; needs tracking issue.
- **i18n altitude fixes** — `history-message.ts` / `QueryView-class.ts` 硬编码 '👤 You' / '🤖 Wiki'；`retrieval-label.ts` 硬编码 'page(s)'；7 处 `as unknown as Record<string, string>` 类型安全债务。Closed by `~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/project_v1.24.0_remaining_split_roi.md` P1 (0.5 day).
- **`ui/modals.ts` → `ui/modals/` split** — 7 个独立 modal classes 共存 1 文件（1008 LOC）；最简单、最快胜利的拆分。Closed by `~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/project_v1.24.0_remaining_split_roi.md` P0 (0.5 day).
- ~~LintFixer → module-level functions split~~ — **REMOVED 2026-07-07** as false backlog item (god class already split in v1.19.0).
- **#244 — Programmatic Mentions-citation writes (mentioned by @DocTpoint).** Root cause: `Mentions in Source` section is currently emitted by LLM in the page-generation prompt (`page-factory.ts:361/433/495` inject `{{mentions}}` as a few-shot example). LLM may drift on quote text, format, ordering, or — worse — copy the note-folder prefix into Related Concepts/Entities sections (Effect 2 from the bug report). Design intent (`schema-manager.ts:117-128`): Mentions is a deterministic academic-footnote structured output; should NOT depend on LLM creativity.
  - **Scope:** Promote `mentions_in_source` to a structured `mentions_with_provenance` type (`{quote, source_path, source_slug, extracted_at, position?}`); emit the section programmatically via new `core/mentions-formatter.ts`; strip the LLM-written section in `page-factory.ts` post-processing; remove `{{mentions}}` injection + section directives from `prompts/generation.ts` and `prompts/merge.ts`; support multi-source merge (dedup by verbatim quote string, sort by source-ingest timestamp); programmatic verify that each emitted quote actually appears at the claimed source position (defends against LLM fabrication in the extraction stage).
  - **Lint scanner compatibility:** Extend `lint/scanners.ts` `extractMentionsSection` + line regex to accept raw-note-path targets (`[[MyNote]]`) in addition to `wiki/sources/<slug>` paths, and to verify quote-grounding against the original source file when the link target is a note path. This heals the silent secondary damage (427 ungrounded-quote lint warnings caused by the current raw-note path).
  - **Effect 1 (DocTpoint's original proposed fix — three-site patch threading sourceSlug into `truncateMentions`):** REJECTED. Effect 1 is the schema design intent; the per-quote link should land on the verbatim original source, not the wiki-summary round-trip.
  - **Related-link corrector backstop (`correctRelatedLinkPrefixes.ts:55`):** still ship as defense-in-depth alongside this work.
  - **Track:** PR target v1.23.3 PATCH if scope stays tight; otherwise v1.24.0 MINOR alongside other sink-cleanup work.
- **#244a (linked) — Related-link corrector extension (defense-in-depth).** Extend `correctRelatedLinkPrefixes` regex at `src/core/related-link-corrector.ts:55` to recognize note-folder prefixes in Related Concepts/Entities sections and normalize them. Ship alongside #244 even if #244 alone would close Effect 2 — backstop for any future prompt leak.

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

See [CHANGELOG](./CHANGELOG.md#v1.23.2) for full details. **PATCH** scope. Five merged PRs (#234 + graph-cache + #221 + #219 + DocTpoint's #238 + #241). 1431 tests at ship. Post-release monolith splits (#248/#249/#250) added ~90 test cases — **1616 tests across 115 files in latest main**. No new user-facing settings. Recommended upgrade for everyone on v1.23.0+.

## v1.23.0 — Implemented (shipped 2026-07-02)

See [CHANGELOG](./CHANGELOG.md#v1.23.0) for full details. **MINOR** scope. Graph Engine PPR (Issue #198) + Vercel AI-SDK v6 migration + Sponsor section + v1.22.6 hotfix folded in. 1376 tests passing at ship; **1825 tests across 132 files in latest main** after subsequent v1.23.1 / v1.23.2 / v1.24.0 cycles. Eval gate: cascade R@5 27.1% (real vault) vs knn 24.1% (3pp gap) — embeddings permanently rejected per #175 + #198 follow-up.

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
| ~~D2~~ | ~~LintFixer class split (707-line god class → 6 module functions)~~ | — | **REMOVED 2026-07-07** — split already done in v1.19.0; `fix-runners.ts` (500 LOC) is the unified dispatch layer, not a god class. See `~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/project_v1.24.0_remaining_split_roi.md` for the corrected large-file analysis. |

#### Deferred P2 — Test infrastructure (high mock complexity)
| # | Item | Effort | Reason |
|---|------|--------|--------|
| T1 | wiki-engine ingestSource full-path integration tests | 2-3 days | Requires Obsidian App + 5 submodule mocks |
| T2 | query-engine core flow tests (Layer 1/2/3) | 1-2 days | Requires Modal + MarkdownRenderer + DOM mocks |

#### Deferred P3 — Backlog
| # | Item | Effort |
|---|------|--------|
| ~~B1~~ | ~~LintFixer class → module-level functions~~ — **FALSE BACKLOG ITEM** (2026-07-07, see §"Deferred to v1.24.0+ MINOR" above); v1.19.0 split into 8 module-level functions; `fix-runners.ts` (500 LOC) is the dispatch layer | — |
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
