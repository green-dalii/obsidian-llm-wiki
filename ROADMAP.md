# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.25.9 PATCH (re-publish of 1.25.8). | **Updated:** 2026-07-27

## Current Status

**v1.25.9 — RELEASED 2026-07-25.** Re-publish PATCH:
- **PR (this release)** (self): Re-publish v1.25.8 as v1.25.9. During the v1.25.8 release flow the GitHub release record was inadvertently deleted while Obsidian's automated community plugin review bot was mid-review, causing the bot to fail the v1.25.8 submission (review is one-shot and cannot be re-triggered for an already-attempted version). v1.25.9 carries the exact same code as v1.25.8 (no functional changes) and is the version Obsidian's bot will now review on resubmission. **Also includes** a fix for `versions.json` trailing-comma JSON syntax error introduced in commit `c572c27` (1.25.8 bump). 0/0 tests affected.

**v1.25.8 — RELEASED 2026-07-25.** Hotfix PATCH scope:
- **PR #353** (self): `commitTempSettings()` now flushes Obsidian SecretStorage on every commit (not only on `hide()`). Fixes v1.25.7 PATCH regression where switching LLM Provider (e.g. Deepseek → MiniMax) made Test Connection succeed but Lint/Query/Ingest fail with 401 "Missing Authentication header". Singleton `this.llmClient` rebuilt by `initializeLLMClient()` after `commitTempSettings` was still reading SecretStorage's previous provider's key (the in-memory typed key never got flushed). Two root causes inside `commitTempSettings`: (1) only `hide()` called `flushApiKey()` — Test Connection / Language Save paths skipped it. (2) `testLLMConnection`'s fire-and-forget `void this.saveSettings()` would have persisted the typed apiKey as plaintext on flush-failure even after our rollback; added an explicit `saveSettings()` after rollback. 7 new tests (+6 commit-flush regression cases against the real `LLMWikiSettingTab.commitTempSettings` / `flushApiKey` via `Object.create(prototype)` + 1 mock signature update). **Bot 0/0 preserved.** 2572 tests / 193 files.

**2026-07-26 PATCH batch (merged between v1.25.9 and v1.25.10)** — main @ `7e22848`, 2605 tests / 195 files:
- **PR #347** DocTpoint — source-ownership merge (closes #312, #288 silent-mentions pattern)
- **PR #349** eucher — source-page tag vocabulary (stays inside closed enum)
- **PR #350** eucher — translation-hint gated on source frontmatter language
- **PR #352** eucher — silent-truncation finish-reason (closes #305 follow-on)

## Next: v1.25.10 PATCH (sequential on v1.25.9)

Theme: four-item bug-fix scope from #330 close-out + #356 frontmatter-strip. All items have measured reproduction or empirical evidence; scope is intentionally narrow to land before v1.26.0 opens the design window.

**Scope (locked 2026-07-27)**:
- **admission criterion in Task Requirements** — closes #330 §2 (rules stated twice in the same prompt; 17 citation-titled pages violated)
- **cross-type dedup candidate visibility** — closes #330 §3 (`src/wiki/page-factory/path-resolution.ts:165` filter scope); pre-condition for #328 Phase 2
- **`merge` vs `contradictory` route split** — closes #330 §4 (`src/wiki/page-factory/merge-page.ts:124` routes both into same body rewrite)
- **alias hardening** — closes #330 §3 (3-char floor + uniqueness; DocTpoint measured 0 links affected by 3-char floor, 30/31,553 by uniqueness)
- **#356 frontmatter-strip fix** — preserves unknown top-level fields on re-touch (data-loss bug, not v1.26.0 feature)

**Out of scope for v1.25.10** (moved to v1.26.0): identity ambiguity record, bidirectional frontmatter, typed edges, Preview-Confirm gate, source-lemma PR #357 (already in `feat/ingest-source-lemma` branch, ships independently).

## Next: v1.26.0 MINOR (after v1.25.10 ships)

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

**Companion items carried from v1.25.7 PATCH deferred**: P0-1 fix-runners parallelization, P1-1 analysis content-hash cache, P1-2 smart-skip controller (see [[project_v1.25.7_lint_perf_plan]]).

**i18n expansion to 11 languages:** add `ru` (Русский) to `WIKI_LANGUAGES` + `src/texts/ru.ts` + `docs/README_RU.md` + 11-way language switcher across all READMEs. Driven by recent RU user growth + @eucher's 3 ingest/LLM PRs (RU speaker). No new functionality beyond text strings + 11-locale parity test update.

Historic compositions (v1.25.7 and earlier) live in [CHANGELOG.md](./CHANGELOG.md) — kept brief here.

---

## Version Timeline
| Version | Date | Headline |
|---------|------|----------|
| **1.25.10 PATCH** | TBD (planned) | Sequential PATCH on v1.25.9 carrying bug fixes only: admission criterion, cross-type dedup visibility, merge/contradictory route split, alias hardening, #356 frontmatter-strip |
| **1.26.0 MINOR** | TBD (in design) | Complementary memory model: per-type registration, typed edges, bidirectional frontmatter, identity ambiguity record, Preview-Confirm gate, stable mutation interface. Anchored at [#358](https://github.com/green-dalii/obsidian-llm-wiki/issues/358) |
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
