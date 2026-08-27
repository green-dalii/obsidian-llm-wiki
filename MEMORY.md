# LLM Wiki Plugin — Project Memory

> **Audience:** anyone landing on this repo (collaborators, reviewers, future
> maintainers). Not a Claude session log — that lives in
> `~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/`.
> This file is the **persistent, external, single-source-of-truth** for the
> project's invariants, process, and current state.

---

## Current state (2026-08-27)

**Latest shipped:** **v1.27.0 MINOR** — 36 commits, 181 files, +11197/-3158 LOC,
**3677 tests passing**. Highlights: Bedrock SSO/IAM (#425 / PR #540),
MinerU multi-format ingest (#404), source-page verbatim quotes (#496),
Fix Dead Links leave-it (#485), ingest candidate gate (#514), per-step
taskPolicies UI (#525/#490), composite-key LLM probe caches (#551/#552/#553),
release chore `npm audit HIGH→0` (#501).

**Next:** v1.27.x PATCH slot carries deferred items (alias-floor unification
#537×#532, bounded type-repair fan-out #528, zh/ja candidate-gate measurement
#521, #407 Stage 2 silent-failure sites, #542/#543 follow-ups). ROADMAP.md
"v1.27.x PATCH" milestone is the live tracker.

---

## Process invariants (non-negotiable)

### Six-Gate Quality Closure
Every release ships through six gates before merge:

| Gate | Constraint |
|------|-----------|
| 1. Code correct | `pnpm lint` 0/0 + `npx tsc --noEmit` 0 + `pnpm build` clean + `pnpm test` all pass + `pnpm css-lint` 0 |
| 2. No side effects | Call-site audit + data flow + state mutation + error propagation |
| 3. No breaking | API schema, settings, file format, command IDs, Obsidian API |
| 4. No perf regression | 5-dim written assessment (CPU/Memory/IO/Network/Token) |
| 5. Docs complete | 10 READMEs + ROADMAP + CLAUDE.md + CHANGELOG + memory |
| 6. Release clean | superset 1-5 + TOC + i18n + Release Notes + Contributors + git hygiene |

`pnpm gate:1` is the composite alias for Gate 1 — runs all five in the
**mandatory order build → test** (test reads `main.js` for esbuild bundle
shape; reversed order fails ENOENT on fresh clone).

### Git workflow (enforced since v1.20.2)

```
main (protected, GH013) ────► tag → release
  ├── feat/xxx ── PR → review → admin squash merge → delete branch
  └── fix/xxx  ── PR → review → admin squash merge → delete branch
```

**Per-fix E2E handoff (post-#456 incident, 2026-08-14):**
1. Branch from main
2. RED test → GREEN fix → 4-Gate green
3. Local commit (no push yet)
4. `pnpm build:dev` → verify artifacts (`tail -1 main.js` ends with sourcemap;
   `console.debug` preserved; 3 output files exist)
5. **Report to user** — root cause + file:line + diff + test delta + 6-Gate table
6. **Wait for explicit "可以 push" / "push it" / "ship it"** before `git push` + `gh pr create`
7. **Wait for explicit "merge it" / "合并"** before `gh pr merge`

### Mandatory merge sequence (added 2026-08-18)

```
gh pr review <N> --body "<file>"   # MANDATORY: formal review event lands on PR
gh pr merge <N> --admin --squash --delete-branch   # ONLY after "merge it"
```

`gh pr review --approve` MUST be posted BEFORE `gh pr merge`. `--admin`
bypasses the requirement rule, not the review event rule — two separate
audit surfaces. If `--approve` was skipped, post `gh pr comment <N> --body-file
<audit-note>` patching the audit trail only.

### Bot double-lint invariant

- Local `pnpm lint` = `eslint src/` only. **Obsidian review Bot scans the
  whole repo `.ts` tree** including `tools/`.
- The v1.26.1 release shipped a blocking `unsafe-call` Error in
  `tools/llm-wiki-cli/src/obsidian.ts` that local lint never saw.
- `pnpm lint:tools-bot` (v1.26.2+) is the local pre-check — read its
  output, don't just check exit code. New warnings on touched code MUST
  be fixed before submission; pre-existing structural warnings on
  `tools/legacy/cli-v1.26.4-snapshot` are accepted.

### Lockfile rule

- **Never** use `mktemp -d` for npm `--package-lock-only` (v1.23.2 lesson:
  re-resolves from registry and drifts from pnpm).
- **Always** `rm -f pnpm-lock.yaml && pnpm install && npm install
  --legacy-peer-deps --package-lock-only` in the project directory. The
  project pins `pnpm@10.14.0` and uses flat `pnpm.overrides` — npm `overrides`
  has different semantics, so `package.json` declares BOTH keys with the
  same flat values to keep both lockfiles aligned.

### Issue close keyword

PR commit body MUST use `Closes #N` (or `Fixes #N` / `Resolves #N`) — NOT
`Refs #N` / `See #N` / `Related to #N`. GitHub does NOT honor the latter for
auto-close. Squash-merge must preserve the keyword in the squash commit
body. Verified 2026-08-07: the v1.26.0 MINOR batch had 5 state-drift issues
because PRs #401/#406/#410/#411 used non-closing keywords.

---

## Key design decisions (canonical references)

| Decision | Pointer |
|----------|---------|
| **Schema 三层分离** (Issue #328 Phase 1) — `schema/config.md` owns user domain knowledge, settings panel injects runtime params at call time, engine ships facts in code. Adding user params to schema file = dual-source drift. | ROADMAP §"Schema 三层分离"; CLAUDE.md §"Schema 三层分离" |
| **Complementary memory model** (Issue #358) — wiki pages serve *different* queries than raw notes; do NOT try to make wiki win every query. "Self-improving" = periodic consolidation pass with LLM judgement on past decisions, NOT a smarter ingest path. | CLAUDE.md §"Complementary memory model"; ROADMAP §v1.27.0 MINOR Design track |
| **Codex OAuth discipline** — credentials in Obsidian SecretStorage ONLY, never in `data.json` / logs / Notices / docs / test fixtures. Sign-out overwrites secret with empty value + clears in-memory state. SecretStorage requires Obsidian 1.11.4 — `manifest.json`/badges MUST NOT advertise older minimum. | CLAUDE.md §"Codex OAuth provider architecture" |
| **Bedrock SSO/IAM** (v1.27.0 #425) — three auth modes (API key / SSO / IAM), zero AWS SDK, hand-rolled IAM Identity Center OIDC + SigV4, secrets in `karpathywiki-bedrock-sso` / `karpathywiki-bedrock-iam` SecretStorage only. Three isolated constants (`BEDROCK_MANTLE_SIGNING_SERVICE='bedrock'`, content-sha256 switch, portal-host bearer scheme) are the only dials a real-AWS E2E would need. | CHANGELOG §1.27.0 — Bedrock Stage 2 |
| **Force-disable thinking** (v1.26.0 Batch 6 + PR #411) — Layer 1 `reasoningEffort: 'none'` + Layer 3 400-strip retry via `reasoning-strip-probe.ts` + Layer 4 prompt-level "do not reason step by step". Never write `thinking.type` or `chat_template_kwargs` into provider options — AI SDK zod silently drops them. | CLAUDE.md §"Force-disable thinking"; [[feedback_force_disable_thinking_openai_compat_noop]] |
| **Dead-code-as-docs policy** (v1.26.0 Batch 4) — exported symbols with zero production importers have a **half-life of one release cycle**. Wire or delete before next MINOR ships. `pre-release-gate` Phase 2g enforces. | CLAUDE.md §"Dead-code-as-docs policy"; [[feedback_dead_code_as_docs]] |
| **Settings panel scope rule** (v1.26.0 Batch 2 lesson) — `advanced-section.ts` = LLM sampling + provider overrides ONLY. Bottom `advanced-settings-section.ts` = dedup thresholds + per-source toggles + storage flags. New toggle? Decide FIRST which scope. | CLAUDE.md §"Settings panel scope rule"; [[feedback_settings_panel_naming_collision]] |
| **Architect-level contributors** (v1.26.0+) — currently @DocTpoint with Write role on personal repo; "no push to main" enforced by branch protection, not role. | [[project_architect_contributor_policy]] |

---

## Architectural invariants (write-once)

- **`document` is forbidden in production code** — Obsidian is multi-window,
  `document` may refer to wrong window. Use `activeDocument`. Bot
  `prefer-active-doc` is no-disable. (v1.25.x incident)
- **No `ts-ignore` / `eslint-disable` to silence failures** — fix the root cause
  instead. (v1.20.x rule)
- **LLM calls carry an explicit `task` label** — a call site that omits it
  files under `'untagged'` (a hole in the per-step accounting table), not dropped.
  New `createMessage` call site picks a label named for the step.
- **Per-step `taskPolicies` baseline is `extract`/`extract-retry` in text mode**
  (v1.27.0 #525) — the wire shape every user had before 1.26.3 for the one
  long-output step. Short judgement calls keep the prober's default.
- **Cache bounded growth (every cache)** — hard caps + LRU eviction. No
  unbounded `Set`/`Map`. `thinkingControlCache` bounded by user count;
  `getExistingWikiPages` retained text bounded by 2KB/page.

---

## Lessons learned (from session memory)

Distilled from 75 session-level feedback entries. Full text in
`~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/`.

### GitHub hygiene

- **Issue state can drift from merge history.** A PR that fixes Issue N
  but uses `Refs #N` / `See #N` / no link in its commit message → GitHub
  does NOT auto-close on merge. Verify with `gh issue view N --json state`
  before declaring an issue "solved". 5 such state-drift issues found on
  2026-08-07 in v1.26.0 alone; remediation is `gh issue close N --comment
  "Closed by PR #XXX (merged ...)"`. (`feedback_issue_tracker_state_vs_merge_history`)
- **`gh release delete` is irreversible.** v1.25.8 incident: deleted the
  published release body. Recovery required re-publishing from a local
  `/tmp/release-body-*.md` backup. Rule: edit in place with
  `gh release edit <tag> --notes-file --draft=false`, never delete. Always
  verify `tagName + isDraft + body` before editing. (`feedback_gh_release_edit_delete_safety`)

### External communication

- **Never append `🤖 Generated with Claude Code` (or any AI marker) to
  GitHub replies, release notes, or Discussions.** Violates
  `obsidian-plugin-release` skill; an AI marker breaks voice consistency
  and reads as spam. If posted, fix via REST PATCH on the comment body.
  (`feedback_no_ai_marker_in_reply`)
- **Public content (Issues, PRs, Release Notes) must NOT include
  `[[feedback_*]]` / `[[project_*]]` memory pointers.** Those are session-private
  wiki-link notation that does NOT render in GitHub markdown and is
  unreadable by other developers. Reference public docs (CLAUDE.md /
  CHANGELOG.md / SPEC.md) instead. (`feedback_public_content_no_internal_pointers`)
- **GitHub comments: no hard single-`\n` linebreaks between sentences**
  — they render as `<br>` which is jarring. Use `\n\n` for proper
  paragraph spacing. (`feedback_github_comment_no_hard_linebreaks`)

### Provider / config reality check

- **Don't doubt existing LLM providers based on name unfamiliarity.**
  v1.18.2 incident: called MiniMax a typo; user proved it ships in production
  with a real `baseUrl` (`api.minimaxi.com`). Always verify by baseUrl +
  live response, never by name recognition. (`feedback_dont_doubt_existing_providers`)

### Build / release mechanics

- **Lockfile regeneration: never `npm install --package-lock-only` in an
  isolated directory.** v1.23.2 incident: AI-SDK patch versions silently
  drifted the npm lockfile while pnpm stayed clean. Correct sequence:
  (1) `rm -f pnpm-lock.yaml && pnpm install`,
  (2) `npm install --legacy-peer-deps --package-lock-only` in the
  project dir (where `node_modules` already exists), (3) commit both
  lockfiles in the same release commit. (`feedback_lockfile_regeneration_procedure`)
- **Post-compaction re-hydration.** After every context compaction,
  re-read CLAUDE.md → CHANGELOG.md → ROADMAP.md → `git log --oneline -20` →
  open Issues/PRs before continuing any non-trivial change. Compaction
  erases decisions that look obvious only with full context. (`feedback_post_compact_rehydration`)

### GitHub heuristics & review-event surfaces

- **`Refs #N` semantic can auto-close issues on doc-only PRs.** 2026-07-14:
  PR #278 (doc-only CLAUDE.md/ROADMAP.md) body said "to close #255" and
  GitHub's heuristic closed #255 even though the PR had zero runtime change.
  Use "tracked by" / "see" / "blocked by" in doc PR body text. Verify
  issue state right after merge; `gh issue reopen N` if unexpectedly closed.
  (`feedback_github_refs_heuristic_close`)
- **Local lint is blind to whole-repo issues.** `pnpm lint` = `eslint src/`
  only; Obsidian review Bot scans the entire repo `.ts` tree including
  `tools/`. v1.26.1 shipped a blocking `unsafe-call` Error in
  `tools/llm-wiki-cli/src/obsidian.ts` that local lint never saw. Run
  `pnpm lint:tools-bot` before every release. (`feedback_obsidian_bot_tools_cli_warnings`)

### CLI surface (post-PR #511 demote)

- **`pnpm llm-wiki` script no longer exists.** PR #511 (v1.27.0) demoted
  `tools/llm-wiki-cli/` → `tools/dev-instrument/` (dev-only measurement
  instrument, NOT a user CLI). The `package.json` `bin` field was removed.
  **User-facing CLI now lives in the sibling repo
  [`green-dalii/obsidian-llm-wiki-cli`](https://github.com/green-dalii/obsidian-llm-wiki-cli)**
  (`npm i -g karpathywiki-cli`). This repo's `tools/dev-instrument/` is for
  engine contributors only — do not point users at it. (`project_v1_27_0_cli_demote_done`)

### Engine invariants (engine contributors)

- **Dedup halving was dead code.** v1.26.0 Batch 2: counter reset inside
  the for-loop so concurrency halving never actually halved; `null` and
  `{"duplicates":[]}` both routed to `[]` conflated truncation with success.
  Fix PR #411 (Batches 6+7). Future LLM business paths need retry + backoff
  + halving + log + Notice — extract `callLlmWithRetry<T>()` from
  `runDedupPhase` before adding a 6th caller. (`feedback_dedup_phase_halving_dead_code`,
  `feedback_dedup_phase_truncation_vs_empty_conflation`, `feedback_llm_retry_extraction`)
- **`schema/config.md` MUST stay pure user-domain knowledge.** v1.26.0 Batch
  1 (Issue #328) fixed the dual-source tag-vocab problem: schema file owns
  user domain knowledge (page templates, content rules, naming conventions,
  merge policies); runtime parameters (tag vocabulary, folder layout, output
  language, page-type registration) MUST be injected at call time via
  `getSchemaContext()`, never baked into the schema file. Violating
  reintroduces the dual-source drift Phase 1 was designed to eliminate.
  (`feedback-schema-phase1-option-a-decision`, `feedback_schema_template_programmatic_injection`)

### PR self-approve & maintainer passby

- **GitHub blocks self-approve on own PR.** Platform hard restriction:
  `gh pr review <N> --approve` on your own PR fails with
  `GraphQL: Review Can not approve your own pull request`. For own-PR
  merges, use `gh pr merge <N> --admin --squash --delete-branch` (the
  `--admin` flag bypasses the requirement rule, not the review event
  rule). After merge, post `gh pr comment <N> --body-file <audit-note>`
  to patch the audit trail. Document the procedural miss in the audit
  note; do NOT rebase or amend. (`feedback_pr_merge_workflow`,
  `feedback_pr_review_vs_comment`)

---

## Release cadence (since v1.20.2)

- v1.20.2–v1.24.x: PATCH cadence every 1-2 weeks, occasional MINOR (v1.24.0)
- v1.25.x: 11 PATCH releases in 6 weeks (eucher-era hot-fix cadence)
- v1.26.x: 5 releases (v1.26.0 MINOR + v1.26.1–v1.26.4 PATCH)
- **v1.27.0 MINOR** ships 2026-08-27; **next** is v1.27.x PATCH (deferred items)

MINOR cadence is roughly every 3-4 PATCH releases or when an architect-level
contributor lands a ≥5-PR cluster. Decision documented in CLAUDE.md "PR merge
workflow".

---

## Where to look

- **Project standards & process:** [CLAUDE.md](./CLAUDE.md) (canonical)
- **Roadmap & planning:** [ROADMAP.md](./ROADMAP.md)
- **Per-version history:** [CHANGELOG.md](./CHANGELOG.md)
- **Contributor guide:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Architect-level attribution:** [NOTICE](./NOTICE)
- **Release workflow skill:** `~/.claude/skills/obsidian-plugin-release/SKILL.md`
- **Detailed session learnings (project-internal):** `~/.claude/projects/-Users-greener-project-obsidian-llm-wiki/memory/`

---

**Maintainer:** [@green-dalii](https://github.com/green-dalii) ·
**Repository:** [green-dalii/obsidian-llm-wiki](https://github.com/green-dalii/obsidian-llm-wiki)
