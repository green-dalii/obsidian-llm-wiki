# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.25.11 PATCH (RELEASED, last tagged). v1.26.0 MINOR MERGED to main on 2026-08-02 (awaiting release notes + tag). | **Updated:** 2026-08-02

## Current Status

**v1.26.0 — MERGED to main on 2026-08-02 (awaiting release notes + tag).** MINOR release anchored at [#358](https://github.com/green-dalii/obsidian-llm-wiki/issues/358) (complementary memory model). User-visible surface: the headless ingest CLI (`pnpm llm-wiki ingest`, bin `llm-wiki` in npm) — originally planned as a v1.25.12 PATCH but reclassified as MINOR on review since the CLI is a brand-new user-visible tool with a fresh flag surface. Plus the #383 folder-boundary follow-up (identity-check regression + unanchored configDir leak + shell-test rewrites). Plus PR #357 (DocTpoint source-lemma deterministic merge) — first item of the v1.26.0 design scope.

### MinerU fork remaining work (not released)

- Rerun the schema-v2/hash/SecretStorage hardened build in Obsidian and verify the managed-artifact and credential flows against the installed local build.
- After a successful rerun, complete the full Six-Gate closure and local debug-build handoff before any tag or release action.

*Composition (10 commits on `main` since v1.25.11 PATCH, oldest → newest)*:
- `7825325` chore(tools): expose `llm-wiki` CLI via bin, scripts.ingest, and executable bit (PR #387)
- `c905ffd` Merge pull request #387 from `feat/cli-ux-v1.25.12`
- `8cef09b` docs: sync v1.25.12 CLI test count and scope after pre-merge review
- `1d12989` test(cli): close coverage gaps from code review
- `e379ff3` fix(cli): friendly `--vault` ENOENT and fire deprecations before required flags
- `ef28e56` fix(cli): accept `-h` alias at the ingest subcommand level
- `b634953` fix(cli): trim `--model` and guard integer flags against precision loss
- `aed3572` fix(cli): reject empty numeric flag values before coercion
- `ecb7862` fix(cli): harden applyOverrides against prototype-key granularity
- (PR #372 — `feat(tools): headless ingest CLI` — already on main via `feat/cli-ux-v1.25.12`'s base)
- (PR #357 — `feat(ingest): guarantee a page for the source note's own subject` — DocTpoint — already on main via v1.25.11 release window)
- `4229c5c` refactor(folder-scope): centralise picker exclusion rule, close unanchored-prefix leak
- `3892916` refactor(auto-maintain): extract Phase 2 to module function, match Phase 3 shape
- `b8b4d80` test(folder-scope-sites): rewrite 3 shell tests as real production-function coverage
- `f098886` Merge pull request #389 from `fix/v1.26.0-wiki-folder-followup`

*Stats*: 11 files changed, +481 / −143, **2863 tests passing** (213 files), +119 net since v1.25.11 PATCH (57 from CLI parser + 62 from #383 follow-up including the folder-scope centralisation).

*Why MINOR not PATCH*: the CLI ships as a fresh user-visible tool (`pnpm llm-wiki` script, npm bin, subcommand dispatch, complete flag surface) — that is the canonical SemVer trigger for MINOR, not PATCH. The planned `v1.25.12` slot stays unused; the patch slot is not retroactively filled. Version numbers need not be consecutive.

*Composition (8 commits, oldest → newest)*:
- `9289bdd` fix(page-factory): stamp sources: provenance on freshly generated pages (Closes #365 partial)
- `7588034` docs(readme): rewrite relative cross-file links as absolute https://github.com URLs (Closes #375)
- `98f180c` feat(status): fine-grained stage labels in status bar (Closes #169)
- `c191878` refactor(status): simplify cleanup of v1.25.11 PATCH (4 agents review)
- `94c4c72` docs: v1.25.11 PATCH finalization — CHANGELOG + CLAUDE + CONTRIBUTING + ROADMAP
- `a300d1d` fix(ui): restore turn indicator UX and settings infobox
- `5b18655` docs(readme): optimize EN README banner + comparison table + Ecosystem MinerU
- `e02a33d` refactor(status): simplify follow-up — 4 cleanups from 5-agent audit (F1+F7 reverted after user e2e)

*Stats*: 44 files changed, +1498 / −329, **2744 tests passing** (204 files), +31 net since v1.25.10.

*Docs polish in this PATCH*:
- EN README banner restored ("Obsidian Review Perfect Score" + "Local-first • No backend • GDPR-Friendly" privacy line); comparison table 12 → 8 rows; star CTA added.
- MinerU online conversion added as first item in Ecosystem section of all 10 READMEs.
- PDF-OCR-GUIDE.md MinerU section rewritten (URL fix + `sources/` misconception correction + privacy self-host path + Issue #376 tracking reopened).

*Simplify follow-up* (`e02a33d`): 5-agent audit (Reuse + Simplification + Efficiency + Altitude + code-review max-effort) applied 4 fixes (F2 4× frontmatter re-parse eliminated; F4 analysis-phase migrated to lintStageAnalyzing; F5 30 dead i18n entries deleted; F6 dead `fitIndicatorToContainer` alias removed). 2 indicator-related findings (F1, F7) reverted after user e2e showed `position: relative` change broke layout — deferred to v1.25.12.

*What's NOT in this PATCH (deferred)*: #168 (status label granularity in Notice popups); #357 + #372 (still HOLD per CLAUDE.md, v1.26.0 design track).

**v1.25.10 — RELEASED 2026-07-29.** Sequential PATCH on v1.25.9 carrying bug fixes only — 10-item scope locked 2026-07-28:

*Composition (16 commits, oldest → newest)*:
- `f9a680e` feat(slug): alias hardening — 3-char floor + cross-page uniqueness (later revised to 2-char floor)
- `6736b06` fix(frontmatter): preserve unknown top-level fields on re-touch (#356)
- `728f235` fix(ingest): enforce folder boundary so siblings sharing a prefix are not pulled in (#364, initial helper)
- `dedec51` fix(mentions): data-layer `m.source_path || sourcePath` fallback (#363 part 1, later superseded)
- `f3c61ab` fix(mentions): parser accepts empty-target bullets (#363 part 2)
- `83dec0e` docs(schema): clarify that custom tag vocabulary is a hint, not an enforcement gate (#368)
- `e3861b5` feat(merge): split merge / contradictory routes via frontmatter marker (DocTpoint §4)
- `ece6007` perf(lint): partial P0-1 + complete P1-1 + P1-2 helpers (Issue #367)
- `507e895` feat(slug): Turkish-aware case fold for comparison keys (Issue #366 phase 1)
- `cbac760` refactor: apply simplify+audit findings — shared frontmatter helper, key rename, single-pass fold
- `b3e0b79` refactor(slug): lower alias-hardening floor to 2 chars and centralise the constant
- `17982b7` perf(lint): batch the Empty/Orphan/Duplicate fix-runners by pageGenerationConcurrency (Issue #367 P0-1 part 2)
- `dbe9e13` perf(lint): batch runRetagViolations by pageGenerationConcurrency (Issue #367 P0-1 final)
- `76f2475` log(lint): one-line batch-start log per fix-runner so the parallelism is visible in DevTools
- `98afe42` refactor(ingest): consolidate #364 with DocTpoint's `folder-scope` helper (PR #370)
- `292d42e` refactor(mentions): consolidate #363 with DocTpoint's `renderCitation` + round-trip interlock (PR #371)

*DocTpoint consolidation (commits 15, 16)*: Two PRs from @DocTpoint (#370 for #364, #371 for #363) shipped stricter implementations than the local fixes. Both PRs adopt their `Co-authored-by: DocTpoint` trailer and the PRs are closed in favour of the merged result:
- **#364** (commit 98afe42) — DocTpoint's `src/core/folder-scope.ts` mutation-tests the third case (`Notizen.md` beside the folder) that the local helper covered only by accident. Splits prefix-derivation from the descendant predicate into two unit-testable functions.
- **#363** (commit 292d42e) — DocTpoint's `renderCitation(leftPath)` single-render-gate design fixes a side-effect the local two-commit split had: the data-layer fallback (`m.source_path || sourcePath`) silently rewrote the attribution of an empty-sourcePath mention to the current source's path. The render-layer fix preserves the empty value, so a later re-merge can fill it from the real source. Also covers the citation-less shape (`- "q"` with no `— [[...]]`) which the local regex did not, and adds a round-trip interlock test that fails under a formatter-only or parser-only ship.

*Test count*: 2713 tests passing (202 files), +91 net since v1.25.9.

**v1.25.9 — RELEASED 2026-07-25.** Re-publish PATCH:
- **PR (this release)** (self): Re-publish v1.25.8 as v1.25.9. During the v1.25.8 release flow the GitHub release record was inadvertently deleted while Obsidian's automated community plugin review bot was mid-review, causing the bot to fail the v1.25.8 submission (review is one-shot and cannot be re-triggered for an already-attempted version). v1.25.9 carries the exact same code as v1.25.8 (no functional changes) and is the version Obsidian's bot will now review on resubmission. **Also includes** a fix for `versions.json` trailing-comma JSON syntax error introduced in commit `c572c27` (1.25.8 bump). 0/0 tests affected.

**v1.25.8 — RELEASED 2026-07-25.** Hotfix PATCH scope:
- **PR #353** (self): `commitTempSettings()` now flushes Obsidian SecretStorage on every commit (not only on `hide()`). Fixes v1.25.7 PATCH regression where switching LLM Provider (e.g. Deepseek → MiniMax) made Test Connection succeed but Lint/Query/Ingest fail with 401 "Missing Authentication header". Singleton `this.llmClient` rebuilt by `initializeLLMClient()` after `commitTempSettings` was still reading SecretStorage's previous provider's key (the in-memory typed key never got flushed). Two root causes inside `commitTempSettings`: (1) only `hide()` called `flushApiKey()` — Test Connection / Language Save paths skipped it. (2) `testLLMConnection`'s fire-and-forget `void this.saveSettings()` would have persisted the typed apiKey as plaintext on flush-failure even after our rollback; added an explicit `saveSettings()` after rollback. 7 new tests (+6 commit-flush regression cases against the real `LLMWikiSettingTab.commitTempSettings` / `flushApiKey` via `Object.create(prototype)` + 1 mock signature update). **Bot 0/0 preserved.** 2572 tests / 193 files.

**2026-07-26 PATCH batch (merged between v1.25.9 and v1.25.10)** — main @ `7e22848`, 2605 tests / 195 files:
- **PR #347** DocTpoint — source-ownership merge (closes #312, #288 silent-mentions pattern)
- **PR #349** eucher — source-page tag vocabulary (stays inside closed enum)
- **PR #350** eucher — translation-hint gated on source frontmatter language
- **PR #352** eucher — silent-truncation finish-reason (closes #305 follow-on)

## Next: v1.25.10 PATCH follow-ups (post-publish, before v1.26.0 kickoff)

**Milestone:** [v1.25.10 PATCH #12](https://github.com/green-dalii/obsidian-llm-wiki/milestone/12). 4-item bug-fix-only scope locked 2026-07-29:

*Composition*:

| Issue | What | Effort |
|---|---|---|
| **#375** | README links non-functional in Obsidian community plugin browser — replace ~12 anchor links + 9 language switchers + ~10 doc/file refs in EN README + 9 locale mirrors with absolute GitHub URLs (`https://github.com/green-dalii/obsidian-llm-wiki/blob/main/...`). Heading anchors remain unchanged (GitHub GFM still generates `-why-this-plugin` etc.); only the navigation mechanism changes. i18n parity test extension for switcher URLs | ~2h |
| **#365** | `createNewPage` (`src/wiki/page-factory/create-page.ts`) does not stamp `sources:` like `merge-page.ts` does — 18/177 pages lose provenance (8/177 completely silent). Fix: call `mergeFrontmatter(..., sources/${sourceSlug})` after the link corrector, matching merge path. Add 3-5 wiring tests | ~1.5h |
| **#168** | `singleFileGranularity` + `batchGranularity` two-dropdown design (replacing auto-curve) — 38-day slip from v1.25.0 → v1.25.2 → v1.25.10. Implementation outline already in 2026-07-20 reply: `src/types.ts` + `src/ui/settings.ts` + 2 keys × 10 locales + `src/__tests__/types/settings.test.ts` | ~1h |
| **#169 ETA** | Velocity-based ETA: `(start time + items completed) / elapsed × items remaining` with rolling window over recent batches. ~2h work, status-bar surface only (NOT live preview, NOT sound) | ~2h |

**Total effort:** ~7h (one focused session).

**Out of this PATCH:** #372 (eucher CLI) — scope split needed; CLI direction accepted, but per-comment concerns from DocTpoint require responder turnaround (see separate analysis in PR review).

**Issue #356 follow-up (post-publish — MERGED 2026-07-30):** `mergeFrontmatter` passthrough fix shipped as PR #377 (now on `main @ b8ae391`). +4 tests (2713 → 2717 → 2718 then 2731 after v1.25.10 batch closes). No longer needs separate v1.25.11 PATCH slot.

**v1.25.11 PATCH scope (re-locked 2026-07-30, branch `fix/v1.25.11-patch-follow-ups` from `main @ b8ae391`):**

After Explore agent verified Phase locations and user review of the full plan, scope trimmed. **3 phases shipped, 1 deferred to next release**:

| Phase | Item | Status | Commit |
|---|---|---|---|
| **Phase 1** | #365 sources: stamp | ✅ DONE | `9289bdd` — `mergeFrontmatter(content, 'sources/<slug>')` via IIFE splice at `create-page.ts:298`. Frontmatter-fence guard added after simplify review. |
| **Phase 2** | #375 README absolute URLs | ✅ DONE | `7588034` — 10 READMEs rewritten + `readme-links.test.ts` (12 cases) |
| **Phase 3** | #169 fine-grained stage labels | ✅ DONE | `98f180c` + simplify fix `c191878` — 14 i18n keys × 10 locales; `ingest-stages.ts` + `status-bar.ts` stage field + `wiki-engine.ts` PDF closure + 4 lint phase `updateStatusBar` updates |
| **(Phase 4)** | #168 granularity | ⏸️ DEFERRED to next release — design discussion needed (a/b constants, log base, interaction with existing dropdowns) |

Total: 4 commits on `fix/v1.25.11-patch-follow-ups`, 2739 tests (+26 net since v1.25.10 PATCH).

PRs #357 (DocTpoint) + #372 (eucher) still HOLD; do NOT merge into v1.25.11.

## Next: v1.26.0 MINOR (after v1.25.10 PATCH follow-ups ship)

**Design anchor:** [#358](https://github.com/green-dalii/obsidian-llm-wiki/issues/358). Co-author @DocTpoint. Design doc in `docs/v1.26.0-design.md` (drafting after #358 receives community feedback).

**Philosophy: complementary memory model.** Source notes are episodic memory (preserve verbatim, lossy-never-intended, authorial voice). Wiki pages are semantic memory (consolidated, abstracted, graph-traversable). Neither replaces the other; the plugin exposes a complementary query surface, not maximum fidelity to source. Full rationale: #330 reply comment (2026-07-27) + CLAUDE.md §Complementary memory model invariant.

**Committed scope (8 items)**:

| Item | Anchor issue | Lands in |
|---|---|---|
| Per-type registration via Settings | #328 Phase 2 + FrancoTampieri (`engagements/`, `findings/`, `risks/`) | v1.26.0 MINOR |
| User-extensible typed edges (frontmatter `relations:` block) | #285 + DocTpoint OKF extension | v1.26.0 MINOR |
| Bidirectional frontmatter (`derived_from` on wiki, `wiki_pages` on source) | #220 + #330 §5 | v1.26.0 MINOR |
| Identity ambiguity record (minimal, scope-limited) | #330 §7 | v1.26.0 MINOR |
| #357 source-lemma deterministic merge | PR #357 (already draft, +504 LOC) | v1.26.0 MINOR |
| Preview-Confirm gate (`ingestMode: 'interactive'`, opt-in, default 'auto') | #330 §2 + Karpathy "discusses" | v1.26.0 MINOR |
| Stable mutation interface (initial API names: `getAmbiguityRecords` / `resolveAmbiguity` / `getRecentMerges` / `revisePage` — subject to design review) | #330 §8 (LLM-wiki CLI option) | v1.26.0 MINOR |
| Settings-owned enum-as-section-value (CVSS-style controlled vocab) | #328 §2 FrancoTampieri gray-zone question | v1.26.0 MINOR |

**Research track (v1.27.0+, not committed)**:

| Item | Note |
|---|---|
| Computable schema (`rules.ts`) | depends on Phase 2 typed edges landing cleanly |
| Query profile selector (4 modes: cross-reference / source-faithful / concept-only / sparse-annotation) | depends on rules.ts |
| Periodic consolidation pass + stale-claim re-ask | depends on ambiguity records accumulating at scale |
| External LLM-wiki CLI (sibling project, not in plugin) | per green-dalii's #330 reply on Obsidian CLI integration; uses the stable mutation interface above |

**Out of scope (explicit)**:
- ❌ Embedding / vector store / RAG retrieval — see [[feedback_no_rag_embedding_perf]]
- ❌ Plugin → agent framework refactor (we expose interfaces, not an agent runtime)
- ❌ Multi-vault isolation (cost > observed benefit)
- ❌ Plugin-internal scheduler for consolidation (external orchestration is the right home)

**Companion items folded into v1.25.10 PATCH**: P0-1 fix-runners parallelization, P1-1 analysis content-hash cache, P1-2 smart-skip controller (see [[project_v1.25.7_lint_perf_plan]] + [[project_v1.25.10_patch_scope]] §2). **🚫 Embedding/RAG/vector index for lint perf: 永久禁止** — see [[feedback_no_rag_embedding_perf]].

**i18n expansion to 11 languages:** add `ru` (Русский) to `WIKI_LANGUAGES` + `src/texts/ru.ts` + `docs/README_RU.md` + 11-way language switcher across all READMEs. Driven by recent RU user growth + @eucher's 3 ingest/LLM PRs (RU speaker). No new functionality beyond text strings + 11-locale parity test update. — *(status: still pending; not part of v1.25.10 PATCH; revisit at v1.26.0 kickoff or as a follow-up PATCH.)*

**Long-term roadmap items (status only):**

| Item | Issue | Status |
|---|---|---|
| MinerU Markdown parser integration | (#376, planning) | ⏳ v1.26.0+ — design track. Already documented as third-party extractor in `docs/PDF-OCR-GUIDE.md`. User explicitly recommends [MinerU online playground](https://mineru.net/OpenSourceTools/Extractor) for general users |
| Multi-wiki isolation | [#142](https://github.com/green-dalii/obsidian-llm-wiki/issues/142) | ⏳ v1.27.0+ research — technically feasible (per-vault config slices OR per-vault plugin install), no fundamental blocker; deferred for priority/scope, not capability. Workaround: separate Obsidian vault per topic with its own plugin install |
| Explicit event type | [#112](https://github.com/green-dalii/obsidian-llm-wiki/issues/112) | ⏳ v1.27.0+ research — `arc:` / `sequence:` frontmatter is the lighter alternative (DocTpoint's proposal) |
| Scheduled ingest | [#295](https://github.com/green-dalii/obsidian-llm-wiki/issues/295) | ⏳ v1.27.0+ research — conflicts with v1.26.0 "external orchestration" philosophy |
| Obsidian Bases for index | [#184](https://github.com/green-dalii/obsidian-llm-wiki/issues/184) | ⏳ v1.26.0+ — post-PPR integration; smaller scope now (one `.base` file vs full markdown-to-table) |
| Slug-list prompt-share | [#306](https://github.com/green-dalii/obsidian-llm-wiki/issues/306) | ⏳ v1.27.0+ perf opt — design in place (2-stage pipeline) but DocTpoint self-corrected hypothesis: dead-link share is **not** correlated with vault size (Pearson r = +0.008). Pure perf savings (77% → 5% prompt share), no quality fix needed |

Historic compositions (v1.25.7 and earlier) live in [CHANGELOG.md](./CHANGELOG.md) — kept brief here.

---

## Version Timeline
| Version | Date | Headline |
|---------|------|----------|
| **1.25.11 PATCH** | 2026-07-31 | Sequential PATCH on v1.25.10 carrying bug fixes only: #365 sources provenance stamp (Plan A; `appendSourceSlugToFrontmatter` helper, byte-shape identical to `merge-page.ts:93`), #375 README absolute URLs (10 READMEs × language-switcher + PDF-OCR-GUIDE refs; image refs exempted), #169 fine-grained status-bar stage hints (15 keys × 10 locales: 7 ingest + 3 PDF + 5 lint SCAN; NOT ETA). Docs polish: EN banner restored ("Obsidian Review Perfect Score" + "Local-first • No backend • GDPR-Friendly"); comparison table 12→8 rows; star CTA; MinerU online conversion in Ecosystem (Issue #376 tracking reopened). Simplify follow-up: 5-agent audit applied 4 fixes (F2 4× frontmatter re-parse eliminated; F4 analysis-phase migrated to `lintStageAnalyzing`; F5 30 dead i18n entries deleted; F6 dead `fitIndicatorToContainer` alias removed); 2 indicator-related findings (F1+F7) reverted after user e2e. 8 commits, 44 files, +1498 / −329, 2744 tests |
| **1.25.10 PATCH** | 2026-07-29 | Sequential PATCH on v1.25.9 carrying bug fixes only: #363 Mentions `[[|]]` parser + formatter (DocTpoint PR #371), #364 folder ingest boundary (DocTpoint PR #370), #356 frontmatter-strip, #366 Turkish-aware slug fold (phase 1), #367 lint-perf P0-1 fix-runner parallelisation (P1-1/P1-2 helpers ship dead-code, controller wire deferred to v1.26.0), #368 schema docs + settings UI hint, DocTpoint §4 merge/contradictory route split, alias hardening (3-char → 2-char floor). 16 commits, 78 files, +3499 / −315, 2713 tests |
| **1.26.0 MINOR** | 2026-08-02 (merged to main; awaiting tag) | User-visible: headless ingest CLI (`pnpm llm-wiki` script + npm `llm-wiki` bin, `ingest` subcommand, full flag surface — originally planned as v1.25.12 PATCH, reclassified as MINOR per SemVer because the CLI is a fresh user-visible tool with a fresh flag surface); Tools H2 section in all 10 READMEs. Internal: `--thinking` → `--thinking-mode` (3-state enum) + `--max-rounds` → `--round-base` (both throw deprecation → v1.27.0 removal); parseCliOptions + parseNumber + 57 test cases pinning the parser contract; PR #357 source-lemma deterministic merge (DocTpoint, first item of #358 design scope); PR #389 follow-up to #383 — `isAtOrInFolderScope` + `isExcludedFromSourcePicker` primitives in `src/core/folder-scope.ts` (one rule, three picker sites; closes the unanchored-prefix leak class on the configDir half), 3 shell tests rewritten as real production-function coverage, `normalizeSourcesInFolder` extracted as a module function matching Phase 3's shape. Anchored at [#358](https://github.com/green-dalii/obsidian-llm-wiki/issues/358). 11 files changed, +481 / −143, 2863 tests |
| **1.25.9** | 2026-07-25 | PATCH: Re-publish v1.25.8 to recover from a release-engineering incident where the v1.25.8 GitHub release record was inadvertently deleted while Obsidian's automated community plugin review bot was mid-review. No code changes vs v1.25.8. Also fixes `versions.json` trailing-comma JSON syntax error introduced in v1.25.8 bump commit |
| **1.25.8** | 2026-07-25 | PATCH Hotfix: `commitTempSettings()` now flushes Obsidian SecretStorage on every commit (not only `hide()`). Fixes v1.25.7 regression where provider switching made Test Connection succeed but Lint/Query/Ingest fail with 401 "Missing Authentication header". +7 tests (6 against real `LLMWikiSettingTab.commitTempSettings` via `Object.create(prototype)` + 1 mock signature update). Bot 0/0 preserved. 2572 tests / 193 files |
| **1.25.7** | 2026-07-25 | PATCH: API key switching bug fix (regression since v1.25.3 #182, PR #346) + DocTpoint dedup perf PRs #344+#345. Cache-stable prompt layout (54s→1.2s repeat) + slim dedup + top-K candidate pre-filter (660K→372K prompt tokens, −44%). 19 new tests since v1.25.6. Bot 0/0 preserved. 2566 tests / 192 files |
| **1.25.6** | 2026-07-24 | PATCH: Eliminated 14 `@typescript-eslint/no-unsafe-*` Bot warnings via `createRequire(__filename)` over bare `require('node:http')`. **Bot 0/0 first time.** 2535 tests |
| **1.25.5** | 2026-07-24 | PATCH: P0 Bot compliance (Platform.isDesktop guard + getSettingDefinitions stub + eslint.config.mjs cleanup) — pathway toward 0/0 |
| **1.25.4** | 2026-07-24 | PATCH: SecretStorage Win10 regression (#339 fix) + fast-uri CVE bump |
| **1.25.3** | 2026-07-23 | feat(security): provider API key → Obsidian SecretStorage (#182). Closes #182 |
| **1.25.2** | 2026-07-22 | Schema Phase 1 (Option A bug-fix #328) + Codex OAuth + ESLint 0.4.1 Route A |
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
| 1.21.1 | 2026-06-22 | Hotfix — #173 Symptom A NFC/NFD + esbuild 0.28.1 |
| 1.21.0 | 2026-06-21 | Pre-ingest gate (#164) + Schema Phase 1 (#124) + History Panel (#122) + Italian (#159) |
| 1.20.3 | 2026-06-20 | Hotfix — source-slug fingerprint (#155) + alias dedup (#154) + Stage-4 guard (#158) |
| 1.20.2 | 2026-06-19 | Anthropic fallback system-role hotfix (PR #151 by @Indexed-Apogrypha, Closes #141/#147) |
| 1.20.1 | 2026-06-18 | Anthropic prefill rejection hotfix (Closes #141/#147) |
| 1.20.0 | 2026-06-18 | Provider-first thinking control + reasoning UI (Closes #141/#134/#143) |
| 1.19.1 | 2026-06-17 | Gemini HTTP 400 hotfix (Closes #137) |
| 1.19.0 | 2026-06-16 | Ingest quality & cost hardening — advanced LLM params, quote grounding, compact slugs |
| 1.18.2 | 2026-06-12 | Custom extraction limits hard-enforced (Closes #120) + #114 tags preservation + #111 slug casing |
| 1.18.1 | 2026-06-11 | Obsidian review compliance (document ban + prefer-active-doc) |
| 1.18.0 | 2026-06-10 | Tag controlled vocabulary (Closes #85) v6/v7/v8 — chip input UX, end-to-end customTags pipeline |
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

> **Out of scope for v1.26.0 MINOR:** Bedrock Stage 2 (bearer-only via `@ai-sdk/amazon-bedrock@^5`) — conditional on 3+ user issues for Claude Sonnet 4 / Llama 4 on Bedrock. Bedrock Stage 3 SSO — indefinite deferral.
