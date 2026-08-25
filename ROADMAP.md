# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Latest shipped:** v1.26.4 PATCH (2026-08-19). See [CHANGELOG.md §1.26.4](./CHANGELOG.md#1264---2026-08-19) for the canonical composition record. | **Updated:** 2026-08-22

**v1.26.5 PATCH CANCELLED 2026-08-19** — folded into v1.27.0 MINOR to amortize release-cycle overhead (per user direction).

**v1.27.0 MINOR Phase4 (CLI demote) — MERGED 2026-08-22**: PR #511 (`002da74`, closes #507) migrates `tools/llm-wiki-cli/` → `tools/dev-instrument/` (UPSTREAM DEV-ONLY INSTRUMENT, engine contributors only), eliminating 49 of ~52 Obsidian Bot errors. Two review rounds by @DocTpoint (round-2 blocking finding produced the shim-bundle smoke test now in Gate 1); legacy snapshot at `legacy/cli-v1.26.4-snapshot`. One-cycle deprecation notice ships in the v1.27.0 release notes.

## Process notes

Process standards live in [CLAUDE.md §"🛡️ Six-Gate Quality Closure"](./CLAUDE.md). Release flow lives in [`obsidian-plugin-release` skill](/Users/greener/.claude/skills/obsidian-plugin-release/SKILL.md). ROADMAP does not duplicate process standards or shipped-version details — only the **planning decisions** that have not yet shipped.

---

## v1.27.0 MINOR — remaining scope after milestone ROI reallocation

**Decision 2026-08-25:** MINOR keeps only high-value/important items; low-priority hygiene deferred to the new **`v1.27.x PATCH`** milestone; design-track umbrellas moved to research. **#425 is implemented first** per user direction.

### Remaining work (execution order)

| Order | Issue | What | Note |
|-------|-------|------|------|
| 1 | **#425** | Bedrock Stage 2 — SSO/profile auth via hand-rolled IAM Identity Center OIDC + SigV4 → bedrock-mantle | **IMPLEMENTED — PR #540 open, NOT merged** (15 commits, Gate 1 green, dual-subagent review applied). Zero AWS SDK, ~+10–15 KB; includes Stage-1 fix for the sync-factory `bedrockRegion` forwarding bug. Awaiting @dmsessions real-AWS E2E of the three isolated constants |
| 2 | **#485** | Fix Dead Links lacks "leave_it" outcome (always creates stub) | Small LLM JSON-schema enum addition |
| 3 | micro-batch | #525 scan follow-ups: codex-client `outputModeOverride` honoring, exhaustion arm, placeholder i18n | **PR #539 (DocTpoint, 2026-08-24) implements all six filed items — in review** |
| 4 | **#506** | NoOutputGeneratedError reasoning recovery + translation thinking-disable | Reliability across all typed-output paths |
| 5 | **#501** | package-lock.json missing the brace-expansion pin (npm ignores pnpm.overrides) | Release chore, audit HIGH→0 |
| 6 | **#491 + #496** | TASK_SECTIONS co-design — five default-schema sections reach ingest/generation/merge; source-page verbatim quotes rewrite | Largest item. **Slider rule:** if it would delay the tag after #425 lands, slides to v1.28.0 rather than holding the release |

Completed from the original P0/P1 batch: #493 (PR #497 wire-contract test) · #472 (PR #499 designator fix) · MinerU #404 (`769e7bb`) · #498 attribution docs · #306 stale-resolved by v1.26.4 #482.

Moved out (2026-08-25): **#469 / #468 / #467** (streaming-interface trio) and the review-thread debts (**alias-floor unification** #537×#532, **bounded type-repair fan-out** #528, **zh/ja candidate-gate measurement** #521) → `v1.27.x PATCH` · **#220 / #358 / #330** → `v1.27.0+ research`.

### Community wave 1 — 2026-08-21/22 (ALL MERGED)

8 PRs reviewed, approved and squash-merged 2026-08-22/23; all linked issues auto-closed.

| PR | Issue | What | Note |
|----|-------|------|------|
| **#513** | #512 | duplicate-merge passthrough (#356 parity) | Merged with #523 as one batch |
| **#523** | #522 | constraints pass block-form passthrough (#356 parity) | Closes the parity chain |
| **#510** | #509 | `mergeFrontmatter` unions incoming type tags | **Decision: keep union** (order-invariance; `incomingTypeTag` guards custom vocab) |
| **#520** | #519 | one ranked candidate window for dedup + dead-link prompts | Full-list fallback recall was nominal (0/18), cost real (~40K tokens × 61% candidates). Gate-4 accepted: ~2KB text/page (~5.6MB peak @2.8K pages) |
| **#521** | #514 | opt-in candidate gate (`skipMentionOnlyCandidates`, default off) | Only `de` profile measured; zh/ja thresholds unmeasured — maintainer follow-up on a Chinese vault |
| **#516** | #515 | OpenRouter Anthropic baseURL fixture fix | Test-only; GLM/z.ai rows still need account-holding verification |
| **#518** | #517 | blank-model guard in Test Connection (+11 locales) | First-time-fork CI needed run approval (`actions/runs/{id}/approve`) |
| **#508** | — | CHANGELOG upgrade note for #504 `/` entries | Rides `[Unreleased]` into v1.27.0 |

Deferred: **#503** (`userIgnoreFilters`) → research track — decision recorded: `vault.getConfig` behind a narrow typed interface; blocked on pinning Obsidian's ignore-matching semantics.

Follow-ups filed from #517 adjacent findings: **#533** (`isUrlError` treats model-404 as URL fault → wasted fallback round trip), **#534** (`getModelFilter` drops every OpenRouter id containing `:` — ~79/419 models incl. all `:free` variants invisible).

### Community wave 2 + 3 — 2026-08-22/23 (ALL MERGED 2026-08-24)

10 PRs reviewed, approved and squash-merged 2026-08-24 (`65ebdbd` closes the set); linked issues #527/#536/#533/#534/#524 auto-closed. Batches: #529 → #531 → #530 → #535 → #537 → #526, then conflict-rebases (#532 slug.ts vs #530; #538/#528 CHANGELOG anchors) pushed back to fork branches per `update-branch` flow.

| PR | Issue | What | Note |
|----|-------|------|------|
| **#525** | #524 | extract defaults to text mode + repetition-loop guard + taskPolicies UI | Merged last after maintainer convergence on the global text baseline (no provider split — failure axis is model×backend, not local/cloud; opt-back = one taskPolicies entry). Max-effort scan: 0 blocking / 7 non-blocking (codex-client outputModeOverride gap is the notable one) |
| **#528** | #527 | type repair at intake (fold → one short call) | Merged after CLEAN max-effort review; follow-ups noted: unbounded repair fan-out (chunk to 2–4), buildSystemPrompt doc nuance |
| **#526** | #417s | dev-instrument exit codes 0/1/2 | Report-driven contract; usage→stderr |
| **#529** | #258 class | `stripUnknownSections` on generation paths | Reviewed pages bypass |
| **#530** | #366 p2 | NFC + Turkish fold on alias comparison keys | File-naming untouched |
| **#531** | #484 | `folderBySlug` keyed on comparison slug | `preserveCase` param removed |
| **#532** | — | `minAliasLength` setting (default 2, range 2..6) | Follow-up: route enforceFrontmatterConstraints floor through resolveMinAliasLength so all alias writers agree |
| **#537** | #536 | drop self-named aliases on create path | Same filterRedundantAliases gate as appendAliases |
| **#535** | #533 | OpenRouter model-404 no longer a URL fault | First-time fork CI run approved via API |
| **#538** | #534 | OpenRouter `:` variants visible (~79 models) | External @pttydou; colon-split consumers verified absent |

Open follow-ups from review threads: alias-floor unification (#537×#532), bounded type-repair concurrency (#528), zh/ja candidate-gate measurement (#521 debt), plus from the #525 scan — codex-client `outputModeOverride` honoring (extract stays JSON-mode on that provider despite the builtin pin), source-borne loop pre-check before spending the halve-retry, exhaustion-arm test, hardcoded-EN placeholder i18n.

### Other follow-ups

- **#407 Stages 2** — `conversation-ingest.ts:337` and remaining 7 silent-failure sites, one PR per blast radius.
- **#438 Finding 2** — `extractPassthroughLines` whole-class passthrough (separate commit on `fix/438-frontmatter-...`, filed as new issue to track).
- **#449 Direction 2** — cross-run caching (v1.26.4 PATCH shipped Direction 1 + #452; cross-run is #449 D2).
- **PR #404 follow-up backlog (post-MinerU-merge)** — items deferred from the v1.27.0 MINOR follow-up per simplify + code-review; ship in subsequent PATCH/MINOR:
  - **Native backend image / Office input** — the native conversion branch is PDF-only by design (provider PDF input surface); images/Office under native are rejected as `incompatible-type`. Multi-format routing is MinerU-only. Extending native = new provider-path work (image parts per provider, capability detection); MinerU covers those formats meanwhile (switch backend).
  - **`PdfConversionContext` → `MarkdownConversionContext` rename** — interface still predates the multi-format wiring (`pdfFile` field name misleading now that MinerU accepts images/Office).
  - **Settings migrations registry** — `src/core/settings-migrations.ts` is at its inline-if-block ceiling (5 migrations, each adds a gate field + scaffolding). A `MIGRATIONS: Migration[]` registry would replace linear append with array-iteration; pair with two-phase post-IO hooks.
  - **Move MinerU SecretStorage migration into `settings-migrations.ts`** — currently inline in `src/main.ts:216-231` (the only migration bypassing the established two-phase pattern). Should mirror v1.25.3's pure-stash + `commitSettingsMigration*` orchestration.
  - **PDF branch abortController lifecycle duplication** — `src/wiki/wiki-engine.ts:900-911` has a try/catch/finally for the conversion branch that duplicates cleanup the main `ingestSource` finally already does. Hoist AbortError handling into the outer try/catch so one finally owns lifecycle.
  - **`validateRemoteUrl` dedupe** — `src/core/mineru-converter.ts:99-109` reinvents `isLocalBaseURL`'s local-host detection (security-sensitive classifier duplicated). Extract a shared `isLocalHost(hostname)` helper; both callers consume it.
  - **Test infrastructure consolidation** — `src/__tests__/core/mineru-converter.test.ts` re-mocks `SubtleCrypto` (the `__support__/setup.ts` already provides a deterministic `crypto.subtle` global); `pdf-converter.test.ts` `context()` helper duplicates `mineru-converter.test.ts`'s; `SettingMock`/`ControlMock` is re-declared in `settings-mineru-section.test.ts` and `settings-codex-sections.test.ts`. Consolidate into shared harnesses.
  - **Test the MinerU multi-format routing on real file extensions** — current unit tests use PNG/DOCX `TFile` mocks. Add an integration test (or manual E2E) for the Office + image types.
  - **i18n key rename for completion Notice** — `markdownConversionComplete` / `markdownConversionCompleteSaved` are now backend-agnostic. Re-key and re-translate if naming alignment with future HTML ingest surfaces warrants it.

---

## v1.27.0 MINOR — Design track

| Item | Issue | Note |
|------|-------|------|
| **CLI repo split** — `tools/llm-wiki-cli/` → standalone sibling repo `green-dalii/obsidian-llm-wiki-cli` | (see SPEC v2.0) | 4-phase migration (Boot → Coexist → Deprecate → Demote). Phase 1 (Boot) landed in the v1.26.x window; **Phase 4 (Demote) ships in v1.27.0 via PR #511** — in-tree CLI replaced by `tools/dev-instrument/` (UPSTREAM DEV-ONLY INSTRUMENT, engine contributors only); sibling repo remains the user-facing CLI |
| Per-type registration via Settings (#328 Phase 2) | #358 item 1 | Strongly coupled to cross-type dedup |
| User-extensible typed edges (frontmatter `relations:`) | #358 item 2 / #285 | Community pending |
| Bidirectional frontmatter (`derived_from` + `wiki_pages`) | #358 item 3 / #220 | Source-revision awareness is the foundation |
| Identity ambiguity record | #358 item 4 / #330 §7 | Core invariant |
| Preview-Confirm gate | #358 item 6 / #330 §2 | UX cost evaluation pending discussion |
| Stable mutation interface | #358 item 7 / #330 §8 | Prerequisite for external LLM-wiki CLI sibling project |
| **User-defined types** (events / risks / issues) — schema three-layer separation Phase 2 | #317 (joint design with #491 / #330 / #358) | Adds `event` page type alongside entity/concept. Schema config.md list of types becomes runtime-driven |
| **Source-revision awareness for merge** — distinguishing self-updates from cross-source conflicts | #220 | Content-layer order-invariance engineering expression. merge prompts learn the difference between "page changed because source changed" vs "page changed because a different source now affects it" |
| **External canonical pages defer** — wiki defers to existing People/Companies notes outside `wikiFolder` | #326 | Implementation layer of complementary-memory-model (#330) |

---

## v1.27.0+ research track (NOT committed)

- Computable schema (`rules.ts`) — depends on typed edges
- Query profile selector (4 modes) — depends on rules.ts
- Periodic consolidation pass — depends on ambiguity records accumulating
- Multi-vault isolation (#142) — long-term; `wikiFolder` provides folder-scope substitute
- Explicit event type (#112) — folds into user-defined types (#317)
- Scheduled ingest (#295) — conflicts with v1.26.0 external orchestration philosophy
- Obsidian Bases for index (#184) — Obsidian Bases still experimental; post-PPR integration
- OKF Bundle export (#285) — typed-edges output standard; community-pending
- 'auto' granularity mapping (#168) — needs benchmark + equation; community-pending
- PPR ≈ kNN co-occurrence (#480) — research bookmark
- Coverage measurement denominator (#479) — research bookmark
- Lint details in user README — partial via Advanced settings UI; full section TBD
- OS-async observation window policy — formalize SecretStorage 5-version stabilization pattern