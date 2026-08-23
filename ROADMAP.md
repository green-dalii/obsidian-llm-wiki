# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Latest shipped:** v1.26.4 PATCH (2026-08-19). See [CHANGELOG.md §1.26.4](./CHANGELOG.md#1264---2026-08-19) for the canonical composition record. | **Updated:** 2026-08-22

**v1.26.5 PATCH CANCELLED 2026-08-19** — folded into v1.27.0 MINOR to amortize release-cycle overhead (per user direction).

**v1.27.0 MINOR Phase4 (CLI demote) — MERGED 2026-08-22**: PR #511 (`002da74`, closes #507) migrates `tools/llm-wiki-cli/` → `tools/dev-instrument/` (UPSTREAM DEV-ONLY INSTRUMENT, engine contributors only), eliminating 49 of ~52 Obsidian Bot errors. Two review rounds by @DocTpoint (round-2 blocking finding produced the shim-bundle smoke test now in Gate 1); legacy snapshot at `legacy/cli-v1.26.4-snapshot`. One-cycle deprecation notice ships in the v1.27.0 release notes.

## Process notes

Process standards live in [CLAUDE.md §"🛡️ Six-Gate Quality Closure"](./CLAUDE.md). Release flow lives in [`obsidian-plugin-release` skill](/Users/greener/.claude/skills/obsidian-plugin-release/SKILL.md). ROADMAP does not duplicate process standards or shipped-version details — only the **planning decisions** that have not yet shipped.

---

## v1.27.0 MINOR — P0/P1 batch (revenue-critical + cleanups)

**Folded from cancelled v1.26.5 PATCH** to ship alongside MINOR design track. PR-by-PR details in [[project_v1_27_0_minor_scope]].

### P0 (revenue-critical)

| Issue | Title | Note |
|-------|-------|------|
| **#493** | `{{batch_context}}` marker guard | PR #497 (DocTpoint, `fix/493-empty-prefix-guard`) — ship-ready fix + wire-shape test |
| **#491 + #496a** | TASK_SECTIONS doesn't pass Mentions Format / Source Page Template / Extraction Rules / Aliases / Frontmatter Rules / Linking Rules / Merge & Accumulation Rules to ingest/generation/merge | Co-design (overlap) |
| **#485** | Fix Dead Links lacks "leave it" outcome (always creates stub) | LLM JSON schema `leave_it` enum |
| **#496b** | Source-page prompt rewrite — require `Entity & Concept cross-references` (pure wikilinks, no verbatim text) instead of routing `mentions_in_source` into sources | **Rejects** @rexplx's original proposal of routing `mentions_in_source` via `injectMentionsSection` — violates source-note read-only + three-layer division of labour |
| **#496c** | `mentions_in_source: .optional()` → required + warning-on-omission (no retry to avoid fabrication) | |

### P1 (ship alongside P0)

| Issue | Title | Note |
|-------|-------|------|
| **#469** | `createMessageStream` interface needs `task` label field | |
| **#468** | Anthropic `createMessageStream` lacks cacheBreakpoint parity | Co-ship with PR #497 wire-shape test (mirror contract to streaming path) |
| **#467** | `setUnifiedModel` single setter (replaces removed commit-time cascade; refactor 3 direct-write sites) | |
| **#472** | Same-type merge without semantic guard (cross-type designator silently merges into wrong page when classification picks wrong folder) | |
| **#425** | Bedrock Stage 2 — SSO/Profile auth via hand-rolled IAM Identity Center OIDC + SigV4 | Codex-style, zero AWS SDK, ~+10 KB |
| **#306** | Compact slug list dominated prompt (2026-07-19 measurement, 67K/77%) | **Stale — resolved by v1.26.4 PATCH #482** (slug catalog removed from `source-analyzer.ts:273-280`). Close as completed-in-v1.26.4 |
| **#404** (PR) | feat: add MinerU online PDF conversion backend | @XEurekaX — merged 2026-08-22 (`769e7bb`); ships with v1.27.0 |
| **#498** (PR) | docs(notice): bring the @DocTpoint attribution line up to v1.26.4 | Ship with MINOR |

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

### Community wave 2 — 2026-08-22 (triaged 2026-08-23, awaiting review + merge go)

7 PRs by @DocTpoint + issues #527/#524; all labeled + milestoned v1.27.0 MINOR.

| PR | Issue | What | Note |
|----|-------|------|------|
| **#525** | #524 | extract defaults to text mode + repetition-loop guard + taskPolicies UI | ⚠️ Author requests PATCH (silent extraction content loss on schema-constrained local backends affects all 1.26.3+ users); maintainer leans v1.27.0 MINOR — decision open. Workaround in #524 |
| **#528** | #527 | type repair at intake (fold → one short call) | Custom-vocab gap promised at #510, delivered issue+fix together; new `type-repair` task label |
| **#526** | — | dev-instrument exit codes 0/1/2 | The follow-up set aside at PR #418; usage→stderr, skip stays 0 |
| **#529** | #258 class | `stripUnknownSections` on generation paths | Deterministic guard vs invented sections; reviewed pages bypass |
| **#530** | #366 phase 2 | NFC + Turkish fold on alias comparison keys | File-naming path untouched |
| **#531** | — | `folderBySlug` keyed on comparison slug | Completes the #484 comparison contract in that function |
| **#532** | — | `minAliasLength` setting (default 2, range 2..6) | Solves `Cr`/`CR` fold collisions without a code edit |

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