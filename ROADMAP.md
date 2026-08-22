# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Latest shipped:** v1.26.4 PATCH (2026-08-19). See [CHANGELOG.md §1.26.4](./CHANGELOG.md#1264---2026-08-19) for the canonical composition record. | **Updated:** 2026-08-19

**v1.26.5 PATCH CANCELLED 2026-08-19** — folded into v1.27.0 MINOR to amortize release-cycle overhead (per user direction).

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
| **#404** (PR) | feat: add MinerU online PDF conversion backend | @XEurekaX — pending Gate 1 verification |
| **#498** (PR) | docs(notice): bring the @DocTpoint attribution line up to v1.26.4 | Ship with MINOR |

### Other follow-ups

- **#407 Stages 2** — `conversation-ingest.ts:337` and remaining 7 silent-failure sites, one PR per blast radius.
- **#438 Finding 2** — `extractPassthroughLines` whole-class passthrough (separate commit on `fix/438-frontmatter-...`, filed as new issue to track).
- **#449 Direction 2** — cross-run caching (v1.26.4 PATCH shipped Direction 1 + #452; cross-run is #449 D2).
- **PR #404 follow-up backlog (post-MinerU-merge)** — items deferred from the v1.27.0 MINOR follow-up per simplify + code-review; ship in subsequent PATCH/MINOR:
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
| **CLI repo split** — `tools/llm-wiki-cli/` → standalone sibling repo `green-dalii/obsidian-llm-wiki-cli` | (see SPEC v2.0) | 4-phase migration (Boot → Coexist → Deprecate → Demote). Phase 1 (Boot) lands in v1.26.x window per [[project_v1_27_0_cli_split_planning]]; Phase 4 (Demote) at v1.28.0 keeps in-tree `tools/` as dev-only test harness |
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