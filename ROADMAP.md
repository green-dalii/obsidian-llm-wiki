# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** v1.26.3 PATCH SHIPPED 2026-08-14 (tag `1.26.3`, 5 PRs / 3290 tests / 97 files / +9799/-785). **v1.26.4 PATCH in design** (5 bugs: #456 split-model persistence + #451 stream-path + #449 cacheBreakpoint + #459/#460 lint prompt tag vocab + #463 extraction wire-schema required). v1.27.0 MINOR in design. v1.26.2 PATCH SHIPPED 2026-08-09. v1.26.1 PATCH SHIPPED 2026-08-08. | **Updated:** 2026-08-16

## Current Status

**v1.26.3 PATCH SHIPPED 2026-08-14.** Tag `1.26.3` published via [Release workflow](https://github.com/green-dalii/obsidian-llm-wiki/releases/tag/1.26.3). 5 PRs merged on `main` (HEAD `b14929ef` → `3fe34f6`): #447 (Issue #443 JSON output architecture, 3-tier state machine + Path 2 NoObjectGeneratedError catch + Phase B 11 caller migrations) + #448 (B1-B3 UX + B2.5 i18n + Toast i18n) + #453 (Issue #414 `repetitionPenalty` per-backend dialect) + #450 (Issue #438 `sources:` frontmatter data-loss, Finding 1 fixed in `2560ab4`) + #454 (A1 placeholder detector widening + repetitionPenalty UX hint). Test count 2992 → 3290 (+298). Obsidian Bot pre-review accepted (7 pre-existing tools/ warnings acknowledged per [[feedback_obsidian_bot_tools_cli_warnings]]).

**v1.26.2 PATCH SHIPPED 2026-08-09** Surgical fix for v1.26.1's pre-submission blind spot: the Obsidian review bot scans the whole repo `.ts` tree but local `pnpm lint` was `src/`-only, so v1.26.1 shipped a blocking `unsafe-call` Error in `tools/llm-wiki-cli/src/obsidian.ts` that local lint never saw. PR #442 fixes the Error + 8 type-safety warnings, adds `Platform.isDesktop` AST guards on the runtime-loaded `node:*` imports, and ships `pnpm lint:tools-bot` so the local blind spot stays closed. The **end-state** for the CLI Bot-blind-spot problem is the v1.27.0 [CLI repo split](#v1270-minor-design-track) — `tools/llm-wiki-cli/` is a temporary in-tree location, scheduled to move to a standalone sibling repo ([`green-dalii/obsidian-llm-wiki-cli`](https://github.com/green-dalii/obsidian-llm-wiki-cli), see [SPEC.md](https://github.com/green-dalii/obsidian-llm-wiki-cli/blob/main/SPEC.md)) where the Bot never scans it. Release skill v1.7.0 now mandates an Obsidian Bot pre-review (Step 6b.5, HARD STOP ②) — see [CHANGELOG.md v1.26.2 entry](./CHANGELOG.md#1262---2026-08-09).

**v1.26.1 PATCH SHIPPED 2026-08-08** (tag `1.26.1`). 21 PRs since v1.26.0: high-ROI bug fixes (#399 / #403 / #408 / #419 / #424 / #435 + CR-1 dedup halving + #398 silent-save), #407 Stage 0 parse-failure naming, per-step LLM timing (PR #409), 24 Dependabot alerts closed, plus H1 hardening and `--seed` / `thinking` doc corrections. See [CHANGELOG.md v1.26.1 entry](./CHANGELOG.md#1261---2026-08-08).

**v1.26.3 PATCH in development (2026-08-10).** PR #444 merged (Stage 1 of #407). PR #447 expanding to close Issue #443 properly:

- **#443** — openai-compat JSON output architecture. **Direction change 2026-08-10**: from "elegant 2-tier fallback (json_object → no-field)" to **3-tier output-mode state machine** (json_schema → json_object → text+prompt). User's LM Studio 0.4.20 E2E (2026-08-10) showed the 2-tier design fixes the 400 but leaves downstream parse failures (model emits unclosed arrays when not constrained). First-principles: `json_schema` is the strongest mode and is accepted by LM Studio / Ollama / OpenAI / Anthropic / Gemini / xAI / Qwen / Kimi — we were degrading *down* to json_object by default and probing for further demotion, which inverts the right order.

  **Phase A ships on this PATCH (no caller changes):** `OutputModeProber` (3-tier per-baseURL state, ordered promotion); `buildOutputArgs` accepts `OutputMode` and emits `Output.object` / `Output.json` / `{}`; catch block rewires to retry one tier weaker on 400 with structured-output-related rejection; new `json-prompt-prefix.ts` (the Plan A prefix moves from temporary hack to Tier 1/2 permanent companion); delete `json-object-strip-probe.ts`; debug logs preserved (`[OUTPUT-MODE-DEBUG]`). 16 callers unchanged. + simplify-round fixes (shared REJECTION_VERBS, hoisted Output.json, deleted dead `promote()`, deduplicated comment header).

  **Path 2 fix ships on this PATCH (DONE — commits `9789cbf` + `75af84f`):** DocTpoint CHANGES_REQUESTED (2026-08-10) revealed `Output.json().parseCompleteOutput` throws `NoObjectGeneratedError` on malformed text — same as `Output.object()`. With Phase A default mode=`json_schema` + all 16 callers passing `{type:'json_object'}` (no schema), `buildOutputArgs` falls through to `Output.json()`, SDK parses eagerly, throws on malformed text, **no caller catches `NoObjectGeneratedError`** → repair path dead on cloud cohort. Path 2 fix: catch `NoObjectGeneratedError` in `OpenAICompatSdkClient.createMessage`, return `err.text` so caller-side `parseJsonResponse` + greedy regex + LLM repair runs. Also fixes the misleading comment in `output-args.ts` claiming `Output.json()` "only warns" (it does throw on ai@6.0.230). 4 regression tests use the real `NoObjectGeneratedError` class.

  **Phase B ALSO ships on this PATCH (DONE — commits `f8d5b18` → `6bc4b7c`)** (user direction 2026-08-10 — was wrongly deferred to v1.27.0 earlier in the session). Adds `LLMClient.createMessageWithOutput` (optional method, backward-compat) returning `{text, output?, outputMode, finishReason, usage?}`; `src/llm-sdk/output-schemas.ts` (6 Zod schemas); `buildOutputArgs` accepts Zod via `zodSchema()`; `wrapWithAdvancedSettings` wraps the typed method (task accounting + sampling injection). The 6 low-complexity P0 callers (seed-selector / query-keywords / merge-triage / link-orphan / fix-dead-link / QueryView `evaluateWithLLM`) opt in: pass Zod schema via `response_format.schema`, prefer `result.output` over `parseJsonResponse(text)`. Per CLAUDE.md "one PR per call site" rule, each caller migration ships as a separate commit. **Query streaming path verified untouched** (answer output carries no response_format; only the JSON Suggest-Save call was migrated).

  **v1.26.3 PATCH EXPANDED SCOPE (DONE — commits `eb86588` → `37cf271`)** (user direction 2026-08-11 — reverses the prior "defer 10+ callers to v1.27.0" decision after LMStudio E2E showed Tier 2 demotion leads to model-emits-malformed-JSON → parse failure → ingest fails). 12 additional commits land 11 caller migrations + 9 Zod schemas: source-analyzer extract + extract-retry + lemma-classify; conversation-ingest extraction + save-dedup; dedup-phase; schema-manager; path-resolution; fix-runners alias-generate + tag-fix; localize-welcome-note. The expanded-scope commits all use `.passthrough()` schemas with widened types per the user's "reserve redundancy space for format-variable attributes" requirement. The 10 free-text markdown callers (entity/concept/summary page bodies, contradiction fixes, etc.) stay on `createMessage` + `cleanMarkdownResponse` — Path 2 fix (`NoObjectGeneratedError` catch) protects them. 5 new `task` labels added (`lint-dedup`, `schema-suggest`, `lint-alias`, `lint-tag-fix`, `welcome-translate`) so per-step LLM timing is no longer recorded as 'untagged'. The pre-PR scope read "defer to v1.27.0" was wrong.

  **Status:** all 22 commits (Path 2 fix + Phase B + expanded scope) committed locally on `fix/443-pilot-json-schema-path-resolution`, 3156 tests green, Gate 1 clean. **Pending user E2E on a `build:dev` handoff before push / PR update / DocTpoint review reply.**

  Design plan: [[project_v1_26_3_three_tier_output_mode]].
- **#306** — `buildCompactSlugList` injects 67K chars (~77 %) of full vault slug list into Ingest extraction prompt. DocTpoint's 2026-08-08 measurement rejected the v1.26.0 PATCH-era `localKeywordMatch` design (34 % coverage ceiling) and the "K=30 is the lever" assumption. **Plan D accepted 2026-08-09:** dual-signal ingest context — source-analyzer entity extraction + 1-hop graph diffusion, reusing the same `scorePagesByNeedles` primitive as Query's Stage 1.5b but with 1-hop diffusion (vs Query's full PPR — overkill on rich source-note signal). Estimated 80-95 % recall, 4-5K chars prompt (~5-7 % of current 67K). Awaiting DocTpoint's two measurements (entity-stage recall, 1-hop diffusion marginal gain) on his 30-notes fixture before implementation. Design plan: [[project_ingest_context_dual_signal_plan_d]].

**#91 parked** (DocTpoint self-correction 2026-08-08: 99.8 % prompt-hint compliance on tag nesting + 4 read sites are all write-carry-display, no retrieval — read-end disambiguation is the better target; new issue to be opened separately).

**v1.26.0 P0+P1 final scope** (executed 2026-08-02 → 2026-08-05; all MERGED via PRs #401 / #406 / #410 / #411):

| Bucket | Issue | Status | Note |
|---|---|---|---|
| Batch 1 dual-key bucketed dedup | #382 item 3 | ✅ MERGED (PR #401) | Plan: `~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/project_v1_26_0_batch_1_dedup_streaming.md` |
| Batch 2 cross-type dedup + retry/halving | #382 item 1 | ✅ MERGED (PR #410) | 979s → 365s e2e on 2141-page vault (retry/backoff only; halving dead code, see CR-1) |
| Batch 3 P1-1/P1-2 wire-or-delete | #382 item 4 | ✅ MERGED (PR #406) | Delete recommended; PR #406 deletes the dead-code helpers |
| Batch 4 dead-code-as-docs policy | #382 item 5 | ✅ DONE (governance) | CLAUDE.md + pre-release-gate Phase 2g |
| Batch 5 enum-as-section-value | #358 item 8 | ❌ CANCELLED (2026-08-04) | out of scope |
| Batch 6 real-wire force-disable thinking | DocTpoint #382 comment 2 | ✅ MERGED (PR #411) | 4-layer fallback; 365s → 151s on the 2141-page vault (post-fallout correction; see [[feedback_force_disable_thinking_dedup_wiring]]) |
| Batch 7 dedup parse-failure routing | DocTpoint #382 comment 1 | ✅ MERGED (PR #411) | `dedupFailures` discriminator; see [[feedback_dedup_phase_truncation_vs_empty_conflation]] |

**Full composition** (117 commits / 110 files / +10,604 / −994 since v1.25.11, 2928 tests passing) lives in [CHANGELOG.md v1.26.0 entry](./CHANGELOG.md#1260---2026-08-05) and on the merged commit history (`git log ab0ecfb..1.26.0` — released tag). Do not duplicate the commit list in this file.

**Deferred to v1.27.0+** (per user decision 2026-08-02): #317, #326.

## Process notes (process standards live in CLAUDE.md)

See [CLAUDE.md §"🛡️ Six-Gate Quality Closure"](./CLAUDE.md) for Gate definitions, [[feedback_pr_merge_workflow]] for the per-PR workflow, and [[feedback_pr_merge_credit_preservation]] for the `gh pr update-branch --rebase` rule on contributor rebases. Do not duplicate process standards in this file.

## v1.26.0 release flow (after Batches 1-7 ship)

See [CLAUDE.md §"📦 Development Workflow"](./CLAUDE.md) + [`.claude/skills/obsidian-plugin-release/SKILL.md`](/Users/greener/.claude/skills/obsidian-plugin-release/SKILL.md) for the full 8-step release flow. The pre-release-gate + doc-review parallel run is in [`.claude/skills/pre-release-gate/SKILL.md`](/Users/greener/.claude/skills/pre-release-gate/SKILL.md) + [`.claude/skills/doc-review/SKILL.md`](/Users/greener/.claude/skills/doc-review/SKILL.md). ROADMAP does not duplicate the per-step checklist — only the items that are **planning decisions** (which version, which milestone, which item lands where) live here.

## v1.26.x PATCH follow-up track

**v1.26.3 PATCH SHIPPED 2026-08-14** (canonical record in [CHANGELOG.md §1.26.3](./CHANGELOG.md#1263---2026-08-12)): 5 PRs — #447 (Issue #443, JSON-schema wire + 11 caller migrations) + #448 (B1-B3 UX + B2.5 i18n + Toast i18n) + #453 (Issue #414 `repetitionPenalty` dialect dispatch) + #450 (Issue #438 `sources:` frontmatter data-loss, Finding 1 fixed in `2560ab4`) + #454 (A1 placeholder detector widening + repetitionPenalty UX hint, gated via `core/repetition-penalty-dialect.ts`). Test count 2992 → 3290 (+298).

**v1.26.4 PATCH in design (6 items, user direction 2026-08-14, + #463 on 2026-08-16, + #474 + #473 on 2026-08-16):** each is a single-PR PATCH-scope fix; combine into one release. **Landed 2026-08-16: #456 (PR #462), #451 (PR #465), #463 (PR #476) MERGED.** #449 has PR #464 in review. **#474 fix implemented on `fix/474-three-layer-repair` branch (3 production files + 2 test files; +8 tests / 3391 total); push + PR pending user E2E handoff approval.** #473 design in progress.

| # | Title | File | LOC est. | TDD scope |
|---|---|---|---|---|
| **#456** | Split model config does not persist (per-task mode wiped on save) | `src/ui/settings.ts:67-85` (delete lines 76-78) — landed as 2-line contract comment + expanded JSDoc asserting pure-write-through invariant | ~5 prod + 30 test | (1) `commitTempSettings` preserves per-task; (2) `setFieldValue('model', …)` still cascades (UX preserved) |
| **#449** | `cacheBreakpoint` declared + set, but 0 SDK clients read it → Anthropic `cache_control: { type: 'ephemeral' }` wire-up (Direction 1, per-note caching only) | `src/llm-sdk/anthropic-sdk-client.ts` (~15 LOC); `src/llm-sdk/openai-compat-sdk-client.ts` (passthrough no-op since `@ai-sdk/openai-compatible` doesn't honor cache hint yet) | ~15 prod + 30 test | Wire-body assertion that `cache_control` is present when `cacheBreakpoint` is set; absent when not set |
| **#451** | `createMessageStream` drops all settings (temperature / top_p / seed / repetitionPenalty / enableThinking) | `src/llm-client-wrapper.ts` (Path 1 = mirror `createMessageWithOutput`) | ~30-60 prod + 50-100 test | Wire-body / stream-text test asserts injection reaches the LLM call |
| **#459 / #460** | `fillEmptyPage` lint prompt hardcodes default tag taxonomy contradicting runtime injection (silent for default vocab, breaks disjoint custom vocabularies like biochemistry domain) | `src/wiki/prompts/fixes.ts:47` (1 line: defer to system-layer Active Tag Vocabulary) | ~1 prod + 68 test (test already in PR #460) | (1) `buildSystemPrompt` carries active vocabulary on `lint` task; (2) no `FIX_PROMPTS` line enumerates ≥3 default-taxonomy values |
| **#463** | LM Studio extraction returns nothing since 1.26.3 — the extraction wire schema had no top-level `required` array, so `strict: true` had nothing to enforce; model keys arrive mangled (`source_title_`), `normalizeBatchResponse` reports round 1 unusable | `src/llm-sdk/output-schemas.ts:184-185` (drop `.optional()` from `entities` + `concepts`; keep `.passthrough()` per DocTpoint 2026-08-16 measurement) | ~2 prod + 8 test | (1) `{}` rejected (wire `required`); (2) `{entities:[], concepts:[]}` accepted (empty-batch signal); (3) wire `required` contains entities+concepts; (4) `additionalProperties` stays `true`; (5) five non-structural fields stay out of `required` |
| **#474** | DeepSeek official API ingest fails: the provider carries no `supportsStructuredOutputs` flag → the SDK drops the schema and warns "responseFormat is not supported", leaving only the soft `{type:'json_object'}` wire constraint; deepseek-v4-flash is a reasoning model whose prose `reasoning_content` gets prepended by `prependReasoningForParse` → every `parseJsonResult` layer fails and the repair call reproduces it; `NoOutputGeneratedError` (a *sibling* of `NoObjectGeneratedError`, not a parent — both extend `AISDKError`, distinct markers) is not caught → misreported as "Failed to connect to deepseek API" | **Implemented** on `fix/474-three-layer-repair` branch — `src/core/markdown.ts:222` `prependReasoningForParse` (do not prepend prose reasoning when visible text is non-empty — Qwen3.5 JSON-in-reasoning recovery preserved); `src/llm-sdk/openai-compat-sdk-client.ts:424` (createMessage) + `:984` (createMessageWithOutput) both catch blocks add `NoOutputGeneratedError` (→ empty quiet path so caller's parseJsonResponse empty-input branch handles); `:158` `getCurrentOutputMode` pre-seeds `!supportsStructuredOutputs` providers to `json_object` (initialization, not demotion — `outputMode` reports honestly + saves 1 wasted HTTP 400 on first failure) | **Actual: +99 prod / +357 test (incl. 1 updated contract test). 3391 tests total.** | (1) prose reasoning no longer pollutes parsing; (2) `NoOutputGeneratedError` no longer misreported as a network error; (3) deepseek wire stays `json_object` + `outputMode` honest |
| **#473** | Final lint health-analysis sends the full `wiki/index.md` (608 KB) plus findings in one uncapped request → 313,754 tokens → LM Studio HTTP 400; Obsidian shows only `Lint failed: 400` with no report/fix dialog (input-side token budget missing — same "request↔model capability mismatch" governance theme as #463/#474, but a distinct fix axis) | `src/wiki/lint/llm-phases/analysis-phase.ts:118` (reads the full index into the prompt) — input-token estimate + batch/sample/truncate before overflow + descriptive pre-request error when it cannot fit | ~50-80 prod + 40-60 test | (1) input-token estimate (system + user + reserved output allowance ≤ model context); (2) bounded batching/sampling on overflow; (3) descriptive pre-request error when context is unknown or the request cannot be safely divided |

**v1.26.4 release plan:** 6 items. **MERGED 2026-08-16: #456 (PR #462), #451 (PR #465), #463 (PR #476).** #449 = PR #464 in review (DocTpoint). **#474 implemented on `fix/474-three-layer-repair` branch (push + PR pending user approval).** #473 = input-token-budget fix in design. Simplify + code-review on combined diff, release-skill v1.7.1 Step 5b.5 Bot pre-review BEFORE tag. Target ship date 2026-08-21 (7 days).

**Test count delta:** +22 (#460) + ~110-160 (#456 + #449 + #451) + 8 (#463) + 7 (#474 — Layer 1 prose-drop + Layer 2 NoOutputGeneratedError + Layer 3 mode pre-seed) + ~80-120 (#473) ≈ 3290 → ~3560-3700. **#474 actual: 7 new tests + 1 updated contract test (1 net loss on old + 7 add = +8 net... but actually +7 net since the updated test replaced +1 instead of added).**

**Remaining follow-ups (moved to v1.27.0 window):**
- **#407 Stages 1+2** — port the 8 silent-failure call sites (`path-resolution.ts:220` + `conversation-ingest.ts:337` first), one PR per blast radius.
- **#450 Finding 2** — `extractPassthroughLines` whole-class passthrough (separate commit on `fix/438-frontmatter-...`, filed as new issue to track).
- **#452** — slug-list catalog sorting (companion to #449 Direction 2 cross-note caching; gated on #449 Direction 1 shipping first).

**Bedrock Stage 2 — SSO/Profile auth (decision 2026-08-07; cancels the prior "≥3 user requests" gate).** Now scoped to **v1.27.0** via a **zero-AWS-SDK** path: hand-rolled IAM Identity Center OIDC (reusing the Codex OAuth skeleton at `src/llm-sdk/openai-codex/`) → `GetRoleCredentials` → temp IAM creds → **hand-written SigV4** → existing `bedrock-mantle` endpoint. ~+10 KB, zero new npm deps (vs the rejected PR #263's +1.2 MB). Rationale: the `bedrock-mantle` endpoint accepts AWS credentials (SigV4) per AWS docs and speaks standard OpenAI/Anthropic protocols over plain SSE — no native ConverseStream event-stream signing needed. Design plan + implementation checklist: [[project_bedrock_stage2_codex_style_sigv4]].

## v1.27.0 MINOR design track

Items NOT in v1.26.0 P0+P1 scope but in #358 design orbit (target v1.27.0 MINOR):

| Item | Issue | Note |
|---|---|---|
| **CLI repo split** — `tools/llm-wiki-cli/` → standalone sibling repo `green-dalii/obsidian-llm-wiki-cli` | (see SPEC v2.0) | 4-phase migration (Boot → Coexist → Deprecate → Demote). **Current state (2026-08-13):** sibling repo is at **v0.1.0-dev, NOT yet published to npm**; the in-tree `pnpm llm-wiki` is the **only** user-facing CLI install path until v1.27.0 ships the Coexist phase. Phase 1 (Boot) lands in v1.26.x PATCH window per [[project_v1_27_0_cli_split_planning]]; Phase 4 (Demote) at v1.28.0 keeps in-tree `tools/` as a **dev-only test harness** referencing `../../src/` — not a user-facing CLI after Demote. |
| **MinerU PDF backend** — PR #404 (`codex/mineru-online-api`, @XEurekaX) | #376 | Online PDF conversion API to bypass LLM token cost on PDF ingest. Default = existing provider path; opt-in via `pdfConversionBackend: 'mineru'` setting. New dep `fflate@0.8.3` (ZIP extractor, 0 transitive deps). Cache key = sha256(pdf) + `mineru:vlm:v1`. Safety boundaries: HTTPS only, 200MB PDF cap, 256MB archive cap, 10K entries, single `full.md` ≤10MB. **Status:** awaiting formal review (1-2 weeks per 2026-08-14 triage). Design + review checklist in [Issue #404](https://github.com/green-dalii/obsidian-llm-wiki/pull/404). |
| **Bedrock Stage 2 — SSO/Profile auth** — hand-rolled IAM Identity Center OIDC + SigV4 → `bedrock-mantle` | #425 | ~500-800 LOC + ~10KB bundle, **zero AWS SDK** (vs rejected PR #263's +1.2MB). Reuses Codex OAuth skeleton. Decision locked 2026-08-07. Design plan: [[project_bedrock_stage2_codex_style_sigv4]]. |
| Per-type registration via Settings (#328 Phase 2) | #358 item 1 | Strongly coupled to cross-type dedup; kickoff after v1.26.0 Batch D completes |
| User-extensible typed edges (frontmatter `relations:`) | #358 item 2 / #285 | Community pending |
| Bidirectional frontmatter (`derived_from` + `wiki_pages`) | #358 item 3 / #220 | source-revision awareness is the foundation |
| Identity ambiguity record | #358 item 4 / #330 §7 | Core invariant |
| Preview-Confirm gate | #358 item 6 / #330 §2 | UX cost evaluation pending discussion |
| Stable mutation interface | #358 item 7 / #330 §8 | Prerequisite for the external LLM-wiki CLI sibling project |

## v1.27.0+ research track (NOT committed)

- Computable schema (`rules.ts`) — depends on typed edges
- Query profile selector (4 modes) — depends on rules.ts
- Periodic consolidation pass — depends on ambiguity records accumulating
- Multi-vault isolation (#142) — long-term
- Explicit event type (#112) — long-term
- Scheduled ingest (#295) — conflicts with v1.26.0 external orchestration philosophy
- Obsidian Bases for index (#184) — post-PPR integration
- Slug-list prompt-share (#306) — DocTpoint self-corrected hypothesis (Pearson r = +0.008), pure perf savings, no quality fix needed
- Lint details in user README — partial completion via Advanced settings UI; full section TBD
- OS-async observation window policy — formalize SecretStorage 5-version stabilization pattern

