# LLM Wiki Plugin Project Development Standards

**Last Updated:** 2026-08-08 (v1.26.1 PATCH RELEASED 2026-08-08; v1.27.0 MINOR in design. **Prior 2026-08-06**: Bot scan-scope finding documented in the Bot compliance invariant below — the review bot lints the whole repo `.ts` tree, not just `main.js`; `tools/` Node CLI carries ~56 structural warnings invisible to local lint — accepted, no re-tag, per 2026-08-06 decision.)

---

## Current Phase: v1.26.1 RELEASED (2026-08-08); v1.27.0 MINOR in design

**Forward-looking planning** lives in [ROADMAP.md](./ROADMAP.md#v1270-minor-design-track). v1.26.1 shipped 21 PRs (see [CHANGELOG.md v1.26.1 entry](./CHANGELOG.md#1261---2026-08-08)): #403 reasoning caps, CR-1 dedup halving, #419/#435 H1, #424 yaml devDep, #398 silent-save, #407 Stage 0, #423 `--seed`, #409 per-step LLM timing, #439 deps. Remaining v1.26.x follow-ups (#407 Stages 1+2, #414 `repetition_penalty`, #438 frontmatter data-loss) moved to the v1.27.0 window.

**Historic v1.26.0 composition** (117 commits / 110 files / +10,604 / −994 since v1.25.11, 2928 tests / 213 files passing, all 5 P0+P1 batches MERGED) lives in [CHANGELOG.md v1.26.0 entry](./CHANGELOG.md#1260---2026-08-05). Do not duplicate the Batch table or commit log here — this file is for **process standards + invariants**, not version history.

**v1.26.x PATCH items (post-release, pre-v1.27.0 kickoff):** see [[feedback_force_disable_thinking_openai_compat_noop]] + [[feedback_force_disable_thinking_dedup_wiring]] + [[feedback_dedup_phase_halving_dead_code]] + [[feedback_dedup_phase_truncation_vs_empty_conflation]] for the full list (CR-1 halving dead code location-only fix; per-id key correction for `thinking` / `chat_template_kwargs`; `repetition_penalty` visible defect fix via Layer-3 mechanism; LLM empty-response retry extraction to `core/llm-retry.ts`; per-call `thinkingPolicy` enum; `parseJsonShape<T>` helper; shared `BaseUrlKeyedCache<T>` primitive; DeepSeek/Kimi/GLM `reasoning_effort: 'none'` real e2e measurement).

**Per-PR discipline (LOCKED after PR #393/#396 incident 2026-08-02):** for contributor PRs that need rebase after base-branch move, use `gh pr update-branch --rebase` — NEVER locally fork + push + create a new PR. See `[[feedback_pr_merge_credit_preservation]]`. DocTpoint acknowledged + apologized on PR #393.

**Historical release compositions** (v1.24.1 / v1.25.0 / v1.25.1 / v1.25.2 / v1.25.4 / v1.25.5 / v1.25.6 / v1.25.7 / v1.25.8 / v1.25.9 / v1.25.10 / v1.25.11 / v1.26.0 closed work): see [CHANGELOG.md](./CHANGELOG.md), which is the canonical historical record. CLAUDE.md carries **process standards + current state** — not per-version composition. Full archive of PATCH work items 1-11 is in `~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/project_v1_26_x_patch_scope.md`.

### Codex OAuth provider architecture

- `openai` remains the OpenAI Platform API-key provider with separate usage billing.
- `openai-codex` is displayed as **ChatGPT Plan (Codex OAuth)** and is experimental third-party compatibility, not an OpenAI partnership or a general ChatGPT API.
- Desktop supports the OpenAI-hosted browser flow through a guarded loopback callback on `127.0.0.1:1455`; desktop and mobile support device-code login. Node `http` loading must stay behind the desktop platform guard.
- OAuth credentials must remain in Obsidian SecretStorage only. Never put tokens in settings, `data.json`, logs, Notices, documentation, test fixtures, or copied examples. Sign-out overwrites the plugin-owned secret with an empty value and clears in-memory state.
- The provider uses its dedicated Codex Responses client and synchronizes picker-visible models from the authenticated Codex `/models` catalog, with sanitized metadata caching and a minimal fallback. Do not merge it into the OpenAI API-key client, infer plan tier, promise model availability, depend on OpenCode/models.dev, or describe a fixed quota multiplier.
- OAuth lifecycle commands belong in `main-commands/codex-auth-commands.ts`; shared model selection policy belongs in `core/openai-codex-model-policy.ts`. The Codex request adapter intentionally omits client-side `max_output_tokens` because the backend does not support that request field.
- SecretStorage requires Obsidian 1.11.4, so `manifest.json`, badges, and user prerequisites must not advertise an older minimum. The plugin remains `isDesktopOnly: false` because device-code login is the mobile path.

### ⚠️ Withdrawn / non-issues (kept for archaeology)

- **Windows: `Connection test failed: TypeError: Failed to construct 'Headers'`** — withdrawn 2026-07-10 (user input error: non-ASCII chars in API key field; not a plugin/AI-SDK bug). AI-SDK 5.0.53 has a Windows guard but our `provider-utils@4.0.35` (bundled by `ai@^6.0.214`) does not include the fix; not worth patching given root cause is user-side.

---

## 🛡️ Six-Gate Quality Closure

Every change must pass all six gates before being considered complete. Gates 1-4 are developer-responsible (checked during development and in Step 2 of the release workflow). Gates 5-6 are automated by `pre-release-gate` before user approval.

| Gate | Constraint | How | Who |
|------|-----------|-----|-----|
| **1. Code correct** | `pnpm lint` 0/0 + `npx tsc --noEmit` 0/0 + `pnpm test` all pass + `pnpm build` clean + `pnpm css-lint` 0 | 5-Gate script | Developer |
| **2. No side effects** | Call-site audit + data flow trace + state mutation check + error propagation check | Structured review | Developer |
| **3. No breaking changes** | API/Schema/File format/Default behavior/Command IDs/Obsidian API all backward-compatible | Breaking-change matrix | Developer |
| **4. No performance regression** | CPU/memory/IO/network/token usage — 5-dim walkthrough, written assessment table | simplify + code-review + Gate 4 table | Developer |
| **5. Docs complete** | 10 READMEs (EN + 9 i18n) + ROADMAP + CLAUDE.md + CHANGELOG + memory all updated | pre-release-gate | Gate |
| **6. Release clean (superset of 1-5)** | Gate 1-5 all green, PLUS TOC anchors + localization + Release Notes + Contributors + git hygiene + **Gate 4 perf re-verification** | pre-release-gate | Gate |

### Gate 1: Five-Gate automated

Must all pass sequentially. If any fails, fix root cause (no `@ts-ignore` or `eslint-disable` to silence):

```bash
pnpm lint           # ESLint + Obsidian rules: 0 errors, 0 warnings
npx tsc --noEmit    # TypeScript: 0 errors (ESLint does NOT check type safety)
pnpm test           # Vitest: all pass, 0 failures
pnpm build          # esbuild: clean exit
pnpm css-lint       # CSS: 0 !important declarations in styles.css
```

**Five-gate critical note**: ESLint checks code style, TypeScript checks type safety, css-lint checks Obsidian review compliance — three complementary checks. Single tool passing is insufficient.

```bash
pnpm lint           # Gate 1: ESLint - 0 errors, 0 warnings
npx tsc --noEmit    # Gate 1: TypeScript - 0 errors, 0 warnings
pnpm test           # Gate 1: Tests - all pass, 0 failures
pnpm build          # Gate 1: Build - clean exit
pnpm css-lint       # Gate 1: CSS - 0 !important declarations
```

**Five-gate bot alignment note (2026-07-19, post-v1.25.0 audit)**: The Obsidian review bot runs a **newer** `eslint-plugin-obsidianmd` than the local lockfile pins (project 0.3.0 vs bot 0.4.1 as of 2026-07-19). Local `pnpm lint` passing does NOT guarantee bot will pass. **Mandatory before each release**:

```bash
LOCAL=$(node -p "require('./node_modules/eslint-plugin-obsidianmd/package.json').version")
LATEST=$(npm view eslint-plugin-obsidianmd version)
if [ "$LOCAL" != "$LATEST" ]; then
  echo "WARNING: eslint-plugin-obsidianmd local=$LOCAL, latest=$LATEST"
  echo "Obsidian bot will run $LATEST. Upgrade before release to surface all warnings pre-merge."
  # Upgrade + regenerate lockfiles + re-run lint to surface new warnings
  pnpm add -D "eslint-plugin-obsidianmd@$LATEST"
  rm -f pnpm-lock.yaml && pnpm install
  npm install --legacy-peer-deps --package-lock-only
  pnpm lint  # expect new warnings; triage before commit
fi
```

If `LOCAL != LATEST` at minor-bump (e.g. 0.3.x → 0.4.x), treat as Phase A pre-release task. See [`feedback_obsidianmd_plugin_version_drift.md`](~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/feedback_obsidianmd_plugin_version_drift.md).

### Gate 2: No Side Effects — structured review

For each modified function, trace:
- **Call-site audit**: `grep -rn "<fn>" src/` → check arguments, return value, error handling
- **Data flow**: inputs (origin?) → outputs (destination?) → side effects (file/API/DOM?)
- **State mutation**: concurrent safety? file overwrite vs append?
- **Error propagation**: new error paths caught by all callers?

**Deliverable**: 3-5 sentence side-effect assessment.

### Gate 3: No Breaking Changes — structured review

| Dimension | Check | Pass Criteria |
|-----------|-------|---------------|
| API Signature | `git diff` + `grep` | All call-sites updated; no new required params without defaults |
| Settings Schema | `types.ts` + `settings.ts` | New fields have defaults; removed fields ignored |
| File Format | Generation templates | Old files load without error |
| Default Behavior | Constructor / config init | Old behavior preserved unless opted in |
| Command/Setting IDs | `grep` for IDs/keys | IDs unchanged |
| Obsidian API | `manifest.json` | `minAppVersion` >= current |

**Deliverable**: "None detected" or specific migration plan.

### Gate 4: No Performance Regression — structured procedure

Performance regressions in this plugin have a user-visible cost (the Lint
phase on a 2000-page vault already runs 60+ seconds). Every change must
explicitly clear five performance dimensions **within the change scope**.

**Procedure** (do not skip):

1. **Run `simplify` skill** (3 parallel agents: Code Reuse / Code Quality / Efficiency). The Efficiency agent covers most of dimension 1-3 below.
2. **Run `code-review` skill** (max effort). Catches performance foot-guns specific to this codebase (e.g., N+1 LLM calls, N+1 vault ops).
3. **Walk through the 5 dimensions below** and produce a written assessment.
4. **If a dimension shows regression** → propose a mitigation OR escalate to user for sign-off. Do NOT silently accept regressions.
5. **If a dimension is N/A** (no code in that path) → state "N/A — no [hot path/IO/etc.] in change scope".

#### Five dimensions to evaluate

| # | Dimension | What to check | Project-specific signals |
|---|-----------|---------------|--------------------------|
| 1 | **CPU** | New O(n²) loops? Synchronous blocking in hot path? Hot loop allocating? | `O(n²) candidate generation` is the known risk — do not regress it. |
| 2 | **Memory** | Unbounded arrays / caches? Event listener leaks? Map growing without eviction? | `thinkingControlCache` (Record per baseUrl) is bounded by user count. `Map<string, PageMeta>` in `generateDuplicateCandidates` holds all pages in memory at once. |
| 3 | **IO** | Redundant file reads? N+1 vault operations? Unnecessary re-serialization? | `vault.read()` per page in loops is expensive. `vault.modify()` per page × N. Index regen on every fix call (was pre-fix). |
| 4 | **Network** | Extra LLM calls per operation? Redundant API requests? Missing cache reuse? | `OpenAICompatibleClient.createMessage` should cache 400-fallback results (Issue #245). Lint dedup batches by 100 / budget 500 — overshooting is a real risk (Issue #99 followup). |
| 5 | **Token usage** | Increased prompt size? Unnecessary context in LLM calls? Wrong model? | Ingest prompts are 1-3K tokens. Lint dedup prompt = 100 candidates × ~30 tokens = 3K per batch. Be especially alert to LLM retries (each retry consumes the full prompt again). |

**Deliverable** (mandatory in commit body or PR description):
```
## Gate 4: Performance

| Dim | Status | Notes |
|-----|--------|-------|
| CPU | ✅ / ⚠️ / N/A | ... |
| Memory | ✅ / ⚠️ / N/A | ... |
| IO | ✅ / ⚠️ / N/A | ... |
| Network | ✅ / ⚠️ / N/A | ... |
| Token | ✅ / ⚠️ / N/A | ... |
```

A bare "no regression" without the table is **not acceptable**.

#### Anti-patterns that bypass Gate 4

- "I didn't touch the slow path" — hot paths can be regressed by adjacent changes (e.g., adding an extra vault.read() inside a loop).
- "simplify didn't flag it" — simplify's Efficiency agent is a starting point, not a complete audit. The 5-dim walkthrough is mandatory.
- "Premature optimization" — true for speculative work, false when measuring the change you're about to ship.

### Gate 5 + Gate 6

Gate 6 is a **superset of Gates 1-5**: re-verifies everything is still green
*plus* release-specific hygiene. Automated by the `pre-release-gate`
skill before user approval (release Step 5c). The skill's REPORT phase
must include:

- All Gate 1 mechanical checks (lint/tsc/test/build) — re-run, do not trust cached
- All Gate 4 dimensions marked with explicit ✅ / ⚠️ / N/A based on the change scope
- Gate 5 docs verification (checklist sweep)
- Gate 6 release hygiene (TOC anchors, i18n completeness, Contributors policy, git commit format)

If any dimension regresses between commit and release time, Gate 6
**fails** even if Gate 1-4 passed at commit time.

### ⚠️ Anti-patterns

- "The tests pass, so it's fine" → Tests only cover what you thought to test
- "It's just a one-line change" → One-line changes are the most dangerous
- "I'll add tests later" → Tests must accompany the change
- "The PR review will catch it" → The reviewer has less context than you
- "ESLint passes, TypeScript errors are fine" → ESLint does NOT check type safety

### 🚫 Dead-code-as-docs policy (v1.26.0 Batch 4, 2026-08-03)

**Rule.** Dead code (exported symbols with zero production importers) has a **half-life of one release cycle**. Either wire it into the production path before the next MINOR ships, or delete it before the next MINOR ships. Do not ship dead code across two releases.

**Why this rule exists:** two instances already on the record — v1.25.10 PATCH #367 P1-1 (`lint-analysis-cache.ts`) + P1-2 (`lint-smart-skip.ts`) shipped as dead code and survived until v1.26.0 Batch 3 PR #406 deletion; v1.25.0 PDF cache-only architecture shipped some helpers without callers post-pivot. Two is a pattern. Three would be a culture.

**What "dead code" means:** exported function / class / type with **zero non-test importers in `src/`**. Test-only importers don't count as "wired". Excluded: types declared inline (vanish with sole consumer), stale tests shadowing canonical tests (separate "test hygiene" concern).

**Enforcement:**
- Per-PR review: simplify's Reuse angle + code-review max-effort flag dead code. Either fix in-scope or split into follow-up PR.
- Per-release audit: `pre-release-gate` skill Phase 2g (added 2026-08-03, Batch 4) lists files introduced since last tag with zero production importers. Findings FAIL the gate; remediation = wire or delete.
- **Hard rule for future contributors:** if you find yourself saying "let's ship it dead and wire it next release", you've already lost — file the wire-up as part of the same PR or wait.

**Related:** [[feedback-dead-code-as-docs]] (memory), `pre-release-gate` Phase 2g.

### ⚠️ Settings panel scope rule (v1.26.0 Batch 2 lesson)

The plugin has TWO settings panels:

1. **LLM Advanced section** — `src/ui/settings-sections/advanced-section.ts` (inside LLM Configuration). Gated by `advancedSettingsMode` ('default' | 'custom'). Holds: `temperature`, `repetitionPenalty`, `forcePdfSupport` ONLY.
2. **Bottom "Advanced settings" panel** — `src/ui/settings-sections/advanced-settings-section.ts`. Gated by `showAdvancedSettings`. Holds: lint dedup thresholds, `maxConversationHistory`, `writePdfMarkdownToVault`, `slugCase`, `createWelcomeNote`, `lintDedupIncludeSources`, and all per-source-file/UI/storage toggles.

**Hard rule:** when adding a setting toggle, decide FIRST which scope it belongs to (LLM sampling vs per-source-file/UI/storage behaviour). The LLM Advanced section is for `temperature`, `repetitionPenalty`, and provider-specific overrides ONLY. Everything else goes in the bottom "Advanced settings" panel.

**Migration plan deferred to v1.27.0+**: rename `advancedSettingsMode` → `advancedLlmMode` (breaking schema change); restructure Settings tab layout; add `Settings tab section header` convention. Detail in [[feedback_settings_panel_naming_collision]] (post-mortem of the Batch 2 slip where `lintDedupIncludeSources` was initially rendered in the wrong panel).

### ⚠️ LLM empty-response retry is inline in dedup-phase — must be extracted

v1.26.0 Batch 2 added empty-response retry + transient concurrency halving directly inside `runDedupPhase`. The mechanism is provider-agnostic (200 + 0-byte body under burst load — e.g., deepseek-v4-flash thinking mode) and the user-facing Notice Toast uses a reusable i18n key (`llmRetryRecoveredToast`).

**Why this is debt (not a feature):** The same retry pattern is needed by every LLM call site — `runAnalysisPhase` (confirmed affected on the 2141-page vault), `fix-runners`, `merge-duplicates`, `conversation-ingest`, `analyzeSource`, headless CLI `tools/llm-wiki-cli/`. Without extraction, every future LLM business path has to re-implement retry + backoff + concurrency halving + log + Notice (Six-Gate Gate 2 anti-pattern).

**User decision 2026-08-04** (post e2e #8, 365s wall-time on the 2141-page vault, down from 979s baseline): tech debt moves from v1.27.0 (MINOR feature window) to **v1.26.x PATCH** (item 7 in [[project_v1_26_x_patch_scope]]) so the perf infrastructure ships BEFORE the next feature batch lands in v1.27.0. Avoids "feature work interleaved with perf infrastructure" in the MINOR window. Extract on second use, not first (current inline form is ~80 LOC). Full extraction plan ([[feedback_llm_retry_extraction]]) covers `src/core/llm-retry.ts` shape (`callLlmWithRetry<T>(client, args, opts)` with `LlmRetryOptions { maxAttempts, delayMs, inScanConcurrencyFloor, onRetry, onRecovered }`).

### ⚠️ Force-disable thinking — 4-layer fallback (v1.26.0 Batch 6)

PR #410 (Batch 2) shipped `enableThinkingOverride = false` for the
dedup-phase using `thinking.type = 'disabled'` +
`chat_template_kwargs.enable_thinking = false`. **The PR body claim
"SDK-level thinking disable is safe across all 4 SDKs" was wrong on
the openai-compat path** (deepseek-v4-flash, the user's actual
backend). DocTpoint verified via fetch-interceptor (Issue #382
comment 2, 2026-08-04) that neither field reaches the wire: the
AI SDK's zod schema
(`openaiCompatibleLanguageModelChatOptions`, line 322-344 of
`@ai-sdk/openai-compatible@2.0.62/dist/index.mjs`) does not declare
them, so the SDK's `filter()` at line 531-540 deletes them before
the body is built. **The e2e 979s → 365s improvement came from the
retry/halving mechanism (commit `e2e75eb`), NOT from thinking being
disabled.**

Batch 6 corrected this with a **4-layer fallback** (no per-vendor
matching — fixed list, mirrors `[[token-key-probe.ts]]` design):

| Layer | Mechanism | Where |
|-------|-----------|-------|
| 1 (Primary) | `reasoningEffort: 'none'` (camelCase) — passes zod filter, emits as `reasoning_effort: 'none'` on wire | `openai-compat-sdk-client.ts:267`, `openai-sdk-client.ts:221` |
| 2 (Co-emit) | Same `reasoningEffort` in Anthropic SDK path — Anthropic uses `thinking: { type: 'disabled' }` (different field, zod-accepted) as its working switch | `anthropic-sdk-client.ts` |
| 3 (400-retry) | On HTTP 400 mentioning `reasoning_effort` / `thinking` / `chat_template`, retry once with reasoningEffort stripped. Per-baseURL cache prevents infinite loops. | `reasoning-strip-probe.ts` + catch block in both SDK clients |
| 4 (Prompt-level) | "**Do not reason step by step**" line in dedup prompt | `lint.ts` (Batch 2 already added this) |

**Why Layer 2 is no-op today (corrected post-merge, 2026-08-04):** the SDK has TWO independent paths into the wire body — zod schema (Path 1, reads hard-coded `"openaiCompatible"` key) and passthrough (Path 2, reads `providerOptions[this.providerOptionsName]`). `buildProviderOptions` returns under `"openaiCompatible"` while `getProvider` passes `this.provider` (e.g. `deepseek` / `kimi` / `lmstudio` / `custom` / `ollama`); none of the 15 provider ids in `types.ts` is the literal string `"openai-compatible"` — so the Layer-2 extra fields never reach the wire. Per-id key correction is item 10 in [[project_v1_26_x_patch_scope]] (depends on Layer-3 guard now in place).

**Hard rule for future contributors:** if you add a new LLM business path that wants force-disable-thinking, use `enableThinking: false` on the `createMessage` call — Layer 1 + Layer 3 + Layer 4 cover all known backends. **Never write `thinking.type` or `chat_template_kwargs` into provider options on the openai-compat path today** — they're silently dropped. Until item 10 (per-id key correction) lands in v1.26.x PATCH, Layer 1 (`reasoningEffort: 'none'`) is the only verified-working disable mechanism.

**Wire-body regression test:** `openai-compat-request-body.test.ts` asserts `reasoning_effort: 'none'` IS on the body (not just on the `providerOptions` argument handed to the SDK — that assertion was PR #410's blind spot).

**Full post-mortem + SDK line citations:** [[feedback_force_disable_thinking_openai_compat_noop]] (canonical reference; Path 1 vs Path 2 zod vs passthrough, per-SDK field shape, two-marker verb+field classifier, fetch-interceptor verification evidence).

### ⚠️ Force-disable thinking — call-site wiring (v1.26.0 PR #411 F5-A)

PR #411 review surfaced a **third attribution correction** (eucher, 2026-08-05 05:07 UTC): `dedup-phase.ts:379, 434` used the constant `enableThinkingOverride = false` as both a value (the override IS false → spread nothing) and a flag (`false ? A : {}` always picks `{}`). The result: `enableThinking: false` never entered `llmArgs`, and Layers 1-3 of this fallback were unreachable from the dedup-phase call site. Three log lines reported otherwise (debug at `:303, :431` printed `disableThinking=force …` and `disableThinking=true`; warn at `:448` printed `enableThinking_sent=true`) — all derived from the same broken ternary.

**Fix:** renamed to `FORCE_DISABLE_THINKING = true` (clearly a flag, not a value) and made the spread unconditional. Log lines now print truthful values. Regression guard in `dedup-phase.test.ts` asserts `enableThinking: false` on every call to `createMessage.mock.calls[*]`.

**E2e impact** on the 2141-page vault (deepseek-v4-flash, all other settings unchanged):

| state | wall-time | what changed |
|---|---|---|
| v1.25.x baseline | 979s | thinking mode, no retries |
| Batch 2 (PR #410) | 365s | retry/backoff live; Layers 1-3 still dead code |
| **F5-A (PR #411)** | **151s** | Layers 1-3 now live end-to-end |

**−85% vs baseline, −59% vs Batch 2.** The full [[feedback_force_disable_thinking_dedup_wiring]] post-mortem records this as the third correction in the 979s→365s→151s chain (factor 1: zod-strip per [[feedback_force_disable_thinking_openai_compat_noop]]; factor 2: halving counter never fires per [[feedback_dedup_phase_halving_dead_code]]).

### ⚠️ Per-call thinking policy — source-analyzer repair path (v1.26.0 PR #411 F5-B)

eucher's same review flagged that the `source-analyzer.ts:417` JSON-repair callback did not propagate the parent's `disableThinking` setting. **We did NOT patch this, by design**: DocTpoint's controlled measurement on LM Studio / gemma-4-12b (PR #411 review 2026-08-05 05:38 UTC) showed that disabling reasoning on the repair call produces structurally valid JSON with **wrong content** (concepts duplicated into entities; `concepts = null`; contradictions / related_pages / key_points dropped). Repair needs reasoning budget to understand broken-JSON semantics, not just string-level bracket fixing. Mirroring the parent call's flag would have introduced silent data corruption on the parse-failure retry path.

The opposite direction confirms the per-call rule: `complementaryAppend` at a 600-token cap went from 3 of 3 truncated to 0 of 3 with reasoning off (Issue #403 — thinking budget burns the short cap). Different call, different policy.

**Per-call policy:**

| call site | `disableThinking` honored? | reason |
|---|---|---|
| parent analysis (`source-analyzer.ts:386`) | yes | short-token structured extraction |
| JSON-repair (`source-analyzer.ts:417`) | **no — always allow reasoning** | needs reasoning budget to understand broken JSON |
| short-cap `complementaryAppend` | yes | thinking budget burns the cap (Issue #403) |

**Regression guard (inverted):** `source-analyzer-thinking.test.ts` asserts the repair callback does NOT pass `enableThinking: false` even when `disableThinking: true`. Without this guard, a future contributor adding a "uniformly propagate disableThinking" rule would re-introduce silent repair corruption.

**Tracked as v1.26.x PATCH** (item 6): introduce a per-call `thinkingPolicy` enum so the user can express "no reasoning for short-budget calls, full reasoning for repair". Until that ships, the asymmetry is intentional, not a bug.

### ⚠️ Obsidian Plugin Submission Rules — `document` is forbidden in production

**`document`** (the bare global) is **strictly forbidden** in production code. Obsidian is a multi-window application — `document` may refer to the wrong window. The only valid document reference is **`activeDocument`** (Obsidian's popout-window-aware wrapper).

**`obsidianmd/prefer-active-doc` is a no-disable rule** in the Obsidian Community Plugin review pipeline. You **cannot** use `// eslint-disable-next-line obsidianmd/prefer-active-doc` in any file that will be submitted for review — the review bot will reject it regardless of the comment's description.

**Test-environment differences must be solved in test setup, not production code.** If jsdom lacks `activeDocument`, stub it in `src/__tests__/__support__/setup.ts`:

```typescript
// eslint-disable-next-line obsidianmd/no-global-this
(globalThis as Record<string, unknown>).activeDocument = globalThis.document;
```

Production code then simply uses `activeDocument` directly — no fallback, no eslint-disable comments.

This rule exists because Obsidian's review ruleset is stricter than the local ESLint config. **Local `pnpm lint` passing does NOT guarantee Obsidian review will pass.**

## ⚠️ Editor Discipline — No Bulk Scripts for Code or Documents

Every change via `Read` + `Edit` — no sed/awk/python for code or document editing. (2026-06-11: a brace-matching Python script broke 3 sites that 4-Gate still passed — wrong lexical block in `query-engine.ts`, unsafe `this: any` in lint modules.)

### Document editing rules (2026-06-24 post-mortem)

- **Read before Edit — always.** Know the exact surrounding context (5+ lines before/after) before constructing `old_string`. Never assume what's there from a grep match.
- **Verify with `git diff` after every multi-file edit pass.** Check for unintended deletions — `Read` only shows the lines you asked for, not the lines your `old_string` accidentally consumed.
- **grep alone is NOT sufficient for document editing.** A grep hit tells you *where* a pattern exists, not what surrounds it. Always follow grep with Read to see the full context, then construct Edit with exact line boundaries.
- **Verify idempotency after every edit.** Check that surrounding content (especially the section that follows the insertion point) is intact — no swallowed trailing bullets, no broken headings. `git diff --stat` first, then `git diff` the file if any lines changed unexpectedly.

## ⚠️ Git Safety Protocol

- **NEVER commit or push without explicit user permission.** Non-negotiable.
- **NEVER auto-merge PRs into main without explicit user approval.** This applies even when:
  - The PR passed Gate 1 in CI
  - The PR was already cherry-picked locally
  - The fix looks "obviously correct"
  - The user said "handle it" or "do it"
- **Mandatory pre-merge workflow for every PR (added 2026-07-21):**
  1. **User explicit "merge it" / "合并"** is required before any `gh pr merge`, cherry-pick to local main, or PR-creation action.
  2. **simplify skill** must run on the PR diff (4 angles: Reuse / Simplification / Efficiency / Altitude).
  3. **code-review skill** must run on the PR diff (8 angles, max effort).
  4. Report findings as a list with `file:line + concrete issue + suggested fix`. Do NOT modify the PR — report only.
  5. Wait for user to approve before any local merge / push / PR creation action.
- **Anti-pattern (2026-07-21):** "The PR is small and looks correct, let me just cherry-pick to local main first while we discuss" → This violates the workflow. Even local cherry-pick is a destructive action that creates commits on main ahead of explicit user approval. The correct action is to **evaluate and report only**, then wait for "merge it" / "合并" / "push it" signal.

## 🔀 Git Branch Workflow (enforced since v1.20.2)

**Core principle: Never develop directly on main. Main only accepts PR merges.**

```
main (protected) ───────────────────────→ tag → release
  │
  ├── feat/xxx ── PR → review → merge
  │     ├── commit 1
  │     ├── commit 2
  │     └── commit 3
  │
  └── fix/xxx ── PR → review → merge
        └── commit 1
```

**Development flow (mandatory for every feature/fix):**

1. **Branch from main:** `git checkout -b feat/xxx` or `git checkout -b fix/xxx`
2. **Develop on the branch** — multiple commits OK, each with meaningful content
3. **Gate 1 verification:** `pnpm lint && npx tsc --noEmit && pnpm test && pnpm build && pnpm css-lint`
4. **Only after user confirmation** — push branch, create PR
5. **After PR merge** — switch back to main, pull, tag (if needed)

**Prohibited:**
- ❌ Committing directly on main (except lockfile-only changes)
- ❌ Pushing PR without user confirmation
- ❌ Mixing unrelated changes in one PR
- ❌ Fragmented commits (amend the previous commit or squash)

**When to amend vs new commit:**
- Fixing a problem in the previous commit → `git commit --amend`
- New feature / new fix → new commit
- Pre-release doc updates → can amend into the version bump commit

## 📦 Development Workflow

1. `pnpm lint && pnpm test && npx tsc --noEmit && pnpm build && pnpm css-lint` — all five must pass (Six-Gate Gate 1)

### Build modes

- `pnpm build` — **production** build (console.debug disabled, no sourcemap). Use for release.
- `pnpm build:dev` — **debug** build (inline sourcemap + console.debug preserved). Use when the user requests a local test build.
- `pnpm dev` — **watch** mode (rebuilds on file change).

When the user says "build local debug file for testing":
1. Run `pnpm build:dev` → outputs `main.js`, `manifest.json`, `styles.css`
2. Verify `main.js` ends with `//# sourceMappingURL=data:application/json;base64,...`
3. Confirm `console.debug` is NOT replaced

For full release workflow (commit + push + tag + release notes), use the `obsidian-plugin-release` skill. **Main branch is protected** — direct pushes rejected with `GH013`.

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

- **Tier 1/2 duplicate detection**: Tier 1 always verified (high-precision), Tier 2 fills token budget — see [CONTRIBUTING.md architecture section](./CONTRIBUTING.md)
- **`Promise.allSettled` error isolation**: One failure doesn't crash the batch — see CONTRIBUTING.md
- **Pollution defense at write gate**: Centralized regex catches ALL sources — see CONTRIBUTING.md
- **LLM semantic page selection**: Meaning-based matching, not keyword — see CONTRIBUTING.md
- **Per-step LLM accounting — every call carries a `task` label**: `createMessage` takes an
  optional `task`, read in one place (`wrapWithAdvancedSettings`, the seam every call passes
  through) and accumulated in `core/llm-task-usage.ts`. A call site that omits it is filed under
  `'untagged'` rather than dropped — an unlabelled call still costs time, and a table that hid it
  would under-report the run it exists to explain. So `'untagged'` is a hole in that table, not a
  default to settle for: **a new `createMessage` call site picks a label**, named for the step
  rather than the module.
- **SecretStorage / plaintext wipe ordering (Issue #339, v1.25.4 invariant)**: When migrating a value from plaintext into an external store (SecretStorage, keychain, OS credential manager), the plaintext MUST survive until the IO succeeds. The migration is two-phase: phase 1 = detect + stash plaintext on a transient field (no wipe), phase 2 = wipe plaintext ONLY after the IO write returns success. `flushApiKey`-style save helpers return `boolean` and the calling UI (`PluginSettingTab.hide()`, etc.) MUST skip the commit step on failure. Silent-skip on IO failure = "both stores empty" = user locked out, which is the exact failure mode #339 reported.
- **Schema 三层分离 (Issue #328, Phase 1 active 2026-07-22 — Option A)**: As knowledge-conservation principle (anti-drift), each layer owns its half, **never overlap, can never conflict**:
  | Layer | Owned by | What it is |
  |---|---|---|
  | **User domain knowledge** | You | `schema/config.md` — page templates, content rules, naming conventions, merge policies |
  | **Runtime parameters** | Plugin (Settings) | Tag vocabulary, folder layout, output language, page-type registration — **never written into schema file**, always injected at call time via `getSchemaContext()` |
  | **Engine facts** | Code | Model name, API key, thinking mode, `WIKI_SUBFOLDERS` — shipped with the plugin |

  **Hard rule for future contributors:** the schema file MUST NOT bake runtime parameters (tag lists, folder paths, language). It MUST remain pure user domain knowledge. Adding/expanding the runtime injection layer (`buildActiveTagVocabularySection` and future `buildActiveFolderLayoutSection`) is the only legitimate home for things the Settings panel controls. Violating this rule reintroduces the dual-source problem (Phase 1 was approved specifically to eliminate this drift class).

  Full rationale: [[feedback-schema-phase1-option-a-decision]] + Issue #328 + [[feedback-schema-template-programmatic-injection]].

- **Obsidian Bot compliance invariant (v1.25.6 hard-won, applies to ALL future code)**:
  - **Bot runs an independent `obsidianmd/recommended` ruleset.** Your local `eslint.config.mjs` cannot turn off Bot's hard barriers. Always lint as if your flat config is exactly Bot's.
  - **`obsidianmd/*` is no-disable by default.** Specifically `no-nodejs-modules`, `settings-tab/prefer-setting-definitions`, `no-global-this`, `prefer-active-doc`. The local config may try to relax these — Bot will still reject inline `eslint-disable`.
  - **`@typescript-eslint/no-unsafe-*` propagates through function boundaries.** `const x: T = require(...)` does NOT satisfy the linter — it inspects expression return types, not annotations. `any` from a `require()` pollutes every downstream caller.
  - **Standard Node.js API patterns that work**:
    - Node built-in modules: `await import('node:module')` (dynamic) inside `if (!Platform.isDesktop) throw ...` guard. Static `import` of node built-ins is unconditionally rejected.
    - Type-safe require: `module.createRequire(__filename)` (Node 15+ official API) — use this for typed `node:http` etc. instead of bare `require()`.
    - `__filename` / `__dirname` need inline `eslint-disable no-undef` (not in Bot's no-restricted-disable list — legal per-line).
  - **Test bundle-shape contracts may be obsolete.** v1.25.5's `expect(bundle).toContain('require("node:http")')` became false after `createRequire` migration. Update assertions to the new pattern (`import("node:module")` + `createRequire` present).
  - **Bot scans the whole repo `.ts` tree, not just `src/` (v1.26.0 pre-submission finding, 2026-08-06).** The pre-submission review reported ~60 Warnings on `tools/llm-wiki-cli/` (the headless Node CLI). Local `pnpm lint` = `eslint src/` and the root `tsconfig.json` (includes only `src/**`) are BOTH blind to `tools/` — so these warnings surface only from the Bot, never locally. `eslint-disable` is not an escape hatch: `obsidianmd/*` rules are no-disable, and the `console.log` warnings are a Bot-side heuristic check (not an eslint rule), so comments cannot suppress them at all.
  - **v1.26.2 fix (PR #442, 2026-08-08) closed the blind spot.** The v1.26.1 submission flagged a **blocking Error** (`no-unsafe-call` on `tools/llm-wiki-cli/src/obsidian.ts:117`, from `await import(<dynamic-arg>)` — the computed arg leaves `request` as `any`, cascading 6 `unsafe-*`). All type-safety items are now fixed (split to literal `await import()` branches + `typeof import('node:http').request` annotation, `JSON.parse(...) as ...` annotations, `globalThis.crypto.subtle` → `crypto.subtle`, redundant `as` removed, `any[]` → `unknown[]`). Remaining tools/ warnings are **accepted-structural**: static `node:fs/path/fs-promises/util` imports (dynamic form would break the 14 parser-contract sync tests), `console.log` output interface, `globalThis` shim, `.obsidian` literal. **Run `pnpm lint:tools-bot`** (v1.26.2+, informational, exits 0) during development to see the Bot's view locally instead of discovering it post-submission.
  - **`obsidianmd/no-nodejs-modules` exemption = `Platform.isDesktop` AST guard, NOT "dynamic import" (v1.26.2).** Read the rule source to confirm: static imports are unconditionally rejected; dynamic `import('node:y')` with a literal is exempt only if `isGuardedByPlatformIsDesktop()` — the canonical form is a **function-start `if (!Platform.isDesktop) throw`** (mirror `src/llm-sdk/openai-codex/loopback-flow.ts`). Never use `await import(<computed>)` to dodge — that yields `any` → `no-unsafe-call` **Error**, worse than the warning. See [[feedback_obsidianmd_no_nodejs_guard_detection]].
  - **Memory:** [[feedback_obsidian_bot_double_lint]] (the v1.25.4/5/6 three-attempt saga with full root-cause analysis) + [[feedback_obsidian_bot_tools_cli_warnings]] (the tools/ blind-spot analysis + v1.26.2 resolution).

- **Complementary memory model (v1.26.0 design anchor — #358)**:
  - Source notes are **episodic memory**: sequential, lossy-never-intended, preserves authorial voice, hesitation, retraction. They serve the query "what did the source say, verbatim?".
  - Wiki pages are **semantic memory**: consolidated, abstracted, indexed, graph-traversable. They serve the query "across many sources, what is the relation between X and Y?".
  - Neither replaces the other. Both are necessary. The plugin's design target is to expose a **complementary query surface**, not to maximise fidelity to source.
  - The framing was developed in the #330 discussion. Two analogies were tested for fit: a signal-processing analogy (time-domain ↔ frequency-domain projection, breaks on Parseval / linearity / canonical-basis axes); a neuroscience analogy (hippocampus ↔ cortex consolidation, lossy by design). The neuroscience analogy mapped better.
  - **Hard rule for future contributors:** the plugin MUST NOT attempt to make wiki pages win every query. When a user complains "the raw note beats the wiki for query X", the answer is **"that is the division of labour — the wiki serves a different query"**, not "fix the wiki to win X".
  - **Practical implications:** "self-improving over time" = periodic consolidation pass with LLM judgement on past decisions, NOT a smarter ingest path. The smallest kernel of the Karpathy cycle is Preview-Confirm gate + identity ambiguity record + stable mutation interface, NOT an agent framework refactor.
  - Full rationale: #330 reply comment + #358 tracking issue + [[project_v1_26_0_design]] (when created).

- **Architect-level contributors (v1.26.0+ design work, granted 2026-07-27, corrected 2026-07-28):** see `~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/project_architect_contributor_policy.md` for definition, role, scope, and the DocTpoint case study. Currently granted to @DocTpoint (Write role on personal repo; "no push to main" is enforced by branch protection, not by role assignment).

---

## 🌍 Internationalization

- **UI**: 10 languages, 277+ fields
- **Wiki output**: 10 languages + custom input
- **Code**: English only, minimal comments

## 📋 Git Commit Standards

English, conventional commits. `feat:` `fix:` `docs:` `refactor:` `test:` `chore:`

### Auto-close issues via commit message

Append `Closes #N` (or `Fixes #N`) at the end of the commit body so GitHub auto-closes when the commit hits the default branch. **NEVER** use `gh issue close` or the GitHub UI to close issues manually — let the commit message do it.

```bash
git commit -m "fix: batch P0 fixes

- #94: propagate AbortSignal to fix-runners
- #96: inject extractionGranularity into lint

Closes #94, #96, #99"
```

### Commit author identity + co-authorship

Canonical maintainer: `green-dalii <654534332@qq.com>` (verified against GitHub user `green-dalii`). Some older commits were authored as `Greener-Dalii` (capitalized, used by GitHub UI on merge). All NEW commits — including `--amend` and squash — MUST use the lowercase canonical form.

**Rules (canonical source: [[feedback_co_authored_by_format]], revised 2026-08-07):**

1. **Commit author** MUST be the maintainer (`git config user.name "green-dalii" && git config user.email "654534332@qq.com"`)
2. **Maintainer commits DO NOT include any `Co-Authored-By:` AI trailer.** Only `green-dalii` is recorded. AI tools are session context, not project co-authors.
3. **External contributors** (DocTpoint, eucher, borthwick, etc.) write their own `Co-Authored-By:` trailers as they see fit — we do not constrain, request, or amend their trailer choices when merging their PRs. Preserve their commit history verbatim.
4. **When merging an external PR**, never `--amend` to add maintainer AI trailer or any other maintainer attribution. The merge commit itself is authored by `green-dalii`; that's sufficient.

## 🧪 Development Quality Closure (TDD + Planning)

**Mandatory development loop for every code change** (new feature, bug fix, refactor). This is a quality closure — skipping any step is a violation.

```
1. Deep thinking    → What is the problem? Edge cases? Failure modes?
2. Plan             → Files to change, function signatures, side effects
3. Write test       → Failing test that defines expected behavior
4. Confirm RED      → Run test, verify it fails for the right reason
5. Implement        → Minimum code to make the test pass
6. Confirm GREEN    → Run test, verify it passes
7. Refactor         → Clean up; tests must still pass
8. 4-Gate verify    → lint + tsc + test + build all clean
9. Six-Gate review  → side effects + breaking + performance + doc + release
```

**When tests are required** (mandatory):
- New exported function, class, or module
- New behavior branch (any new if/else path)
- **Bug fix** — the test reproduces the bug; the fix makes the test pass
- Refactor that changes observable behavior

**When tests are optional**:
- Pure configuration, type-only changes, documentation

**Pre-existing code**: when modifying a function with zero tests, add at least one test for the changed path first.

**Why this is a closure, not a checklist**: Each step depends on the previous. Skipping "design test" leads to misaligned implementation. Skipping "confirm RED" means you don't know if the test actually catches the bug. Skipping "refactor" accumulates technical debt. Skipping "4-Gate" lets broken code reach PR.

**Real example (2026-06-02)**: When extracting `parseSSEEvents`, the initial implementation was written first (TDD violation). User caught it. Corrected flow: 11 failing tests → confirmed all fail with `parseSSEEvents is not a function` → wrote minimal implementation → tests pass → fixed unused import warning + `isolatedModules` type export → 4-Gate green.

**🔴 Real example — TDD shell failure (2026-06-02, Issue #81)**: Wrote 4 `fixPollutedSources` tests, all using inline format `sources: ["..."]`. Production code took the **multi-line** path `sources:\n  - "..."`. A regex-only diff returned `fixed=2` but content didn't actually change. User discovered at runtime: "every Notice shows the same number, no real cleanup". This is the **shell test** failure mode — tests pass but don't verify behavior.

**Mandatory test rules (effective 2026-06-02)**:
1. **Cover ALL production code paths.** If a function branches on input format (inline vs multi-line, JSON vs YAML, etc.), write tests for EACH format. Inspect the production code to find all branches.
2. **Assert content mutation, not just return values.** After calling a mutating function, assert `output !== input` AND `output` contains the expected new content. Asserting `expect(fixed).toBe(N)` is necessary but not sufficient.
3. **Re-scan assertion for idempotency tests.** After one fix, re-invoke the detector on the output. If the detector still reports "polluted", the fix didn't actually work — the test must FAIL, not silently pass.
4. **Inspect actual output during debugging.** When a test passes suspiciously (e.g. "idempotent" passes on first run with no change), run a debug script that prints the function's actual output. Don't trust GREEN without seeing it.

**Test quality principle (root, 2026-06-02)**: A test that passes but does not faithfully simulate real-world behavior, does not cover corner cases, or is written merely to "make it pass" is a **shell test** — it provides false confidence and is worse than no test at all. **High-quality tests are the prerequisite for high-quality code.** If you cannot write a test that would catch a real bug in this function, the test is not yet ready. Write the test that would have caught the production bug — not the test that makes your implementation look right.

**Debug template** for "stuck counter" / "no real change" symptoms:
```ts
// src/__tests__/_tmp/debug.test.ts (delete after debugging)
import { fixX } from '../../core/x';
it('debug', () => {
  const r = fixX(input);
  console.log('OUTPUT:', r);
});
```

**Reference**: [[feedback-tdd-standard]] for full TDD standard with examples.

## ✅ Pre-Release Checklist

Use the `obsidian-plugin-release` skill for the full workflow (Steps 1-8). Gate 1 (lint + tsc + test + build + css-lint) must all pass before any commit. Six-Gate detail: [[feedback_six_gate_framework]]. Pre-release-specific hardening (lockfile regen, CI consistency, AI-SDK drift): [[feedback_build_verification_root_cause]]. Doc review sweep: `doc-review` skill (PASS/WARN/FAIL verdict).

## ⚠️ Development Protocol: Plan First, Then Execute

**Before starting any significant change** (refactoring, new modules, prompt modification, architectural decisions, or anything touching core engine files):

1. **Present your plan** — explain what, why, and how
2. **Wait for explicit user approval** before writing code or committing
3. **For multi-phase work**: pause and report after each phase

**Exceptions** (no prior approval needed): trivial one-line fixes, running lint/test/build, reading files, documenting existing code.

**Why**: The user is the domain expert on product vision. The AI has tooling capability but lacks product context. Propose, don't dispose. Full protocol: [[feedback_development_protocol]].

## 🧪 TDD

See §"Development Quality Closure (TDD + Planning)" above. Full standard with shell-test anti-pattern + 真实 vault 原则: [[feedback_tdd_standard]].

---

## 📚 Documentation Architecture

**One fact, one place. Reference, don't copy.** When the same information appears in two files, one will drift and lie. Each file has a single responsibility:

| File | Responsibility | What belongs | What does NOT belong |
|------|---------------|--------------|---------------------|
| **CLAUDE.md** | Dev standards + current phase | Six-Gate / TDD / Git workflow / current state | Old release histories, project structure tree, full version timeline |
| **ROADMAP.md** | Planning | Next Milestone / Version Timeline (condensed) / Deferred & Backlog | Per-version detail (use CHANGELOG) |
| **CHANGELOG.md** | History (Keep a Changelog) | Per-version Added/Changed/Fixed/Removed — ancient versions are pre-aggregated, **do not re-merge** | Forward-looking plans, dev standards |
| **CONTRIBUTING.md** | Contributor guide | Project structure tree, architecture, Mermaid, dev setup | User docs, design philosophy |
| **10 READMEs (EN + 9 i18n)** | User docs | Features / Quick Start / FAQ | Implementation details, internal version numbers, What's New sections |
| **memory/** | Session-persistent lessons | [[feedback-*]] (rules) + [[project-*]] (current state) | Code references that drift (use code comments) |

**Cross-reference format:** `[section](./OTHER.md#anchor)` — keep one canonical source, link to it.

**i18n rule:** User-facing strings (settings descriptions, error messages, READMEs) = user language, not implementation language. "Close the model's reasoning output" ✅ / "Disable thinking in 3-tier dialect fallback chain" ❌. See [[feedback-d8-welcome-no-hardcoded-i18n]] + [[feedback_v1_23_0_doc_and_process_lessons]].

**CHANGELOG rule:** Already aggregated per Keep a Changelog spec. Ancient versions (v1.6.x / 0.2.x) are pre-aggregated — do NOT re-merge. "Optimization" that deletes historical version info is a regression, not improvement. Verify with `grep -c "^## \[" CHANGELOG.md` before assuming it needs work.

---

**Maintainer:** Greener-Dalii | **Repository:** green-dalii/obsidian-llm-wiki
