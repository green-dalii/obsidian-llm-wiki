# LLM Wiki Plugin Project Development Standards

> Development guidelines for international open-source quality

**Last Updated:** 2026-05-16

---

## Current Phase: Post-v1.7.18 — Code Quality Phase 1 Planning

**v1.7.18 critical bug fix completed.** Next step: Phase 1 refactoring (constants.ts, utils helpers, lint caching/scope/batching) with zero breaking changes.

Comprehensive codebase review (May 2026) identified 26 issues across three dimensions:
- **Code reuse**: 8 issues, ~200 lines reducible via shared utilities
- **Code quality**: 6 issues, copy-paste templates + magic strings
- **Efficiency**: 10 issues, lint performance bottlenecks + redundant operations

**Phase 1 (7 items, immediate)**: Create constants.ts, add utils helpers, fix lint caching/scope/batching, parameterize prompts, generalize page-factory. Zero breaking changes.

**Phase 2 (7 items)**: Extract withRetry wrapper, parallel lint fixes, flatten parseFrontmatter, use existing utilities.

**Phase 3 (6 items)**: WikiLinkParser class, EngineContext refactor, SSE parser, change detection guards.

**v1.7.18 completed**: Critical folder name leakage bug fixed — `{{source_path}}` removed from `mergeDuplicatePages` and `{{page_path}}` removed from `fillEmptyPage` prompts (LLM only needs semantic content, not file system paths). Added contaminated alias filtering to prevent pollution propagation (aliases matching `entities*`, `concepts*`, `sources*` rejected).

Recently completed (v1.7.18):
- **Folder name leakage fix**: Removed `{{source_path}}` from `mergeDuplicatePages` prompt — LLM was misinterpreting full paths like `wiki/entities/DeepSeek-V3` as page titles, producing polluted titles (`entitiesDeepSeek-V3-2`, `concepts表征学习`). LLM now only receives body content.
- **Alias contamination defense**: Added filter to reject aliases matching `entities*`, `concepts*`, `sources*` patterns (folder-name prefix leakage) during merge, preventing existing pollution from spreading.

Recently completed (v1.7.17):
- **Lint UI freeze fix**: Added async yield points in Phase 1 frontmatter parsing (every 50 pages) and inner loop comparison (every 500 comparisons) to prevent 10-40s UI blocking on large wikis (1200+ pages)
- **Smart Fix All button count**: Fixed to include missing aliases count, making Phase 0 aliases completion visible in button label
- **Smart Fix All logic**: Added Phase 0 aliases completion before Phase 1 duplicate merge, ensuring aliases exist before duplicate detection runs

Recently completed (v1.7.16):
- **#17 CORS fix**: Replaced `openai` npm SDK (browser `fetch()`, CORS-bound) with `requestUrl()`-based `OpenAICompatibleClient`. `requestUrl()` delegates to Obsidian's Main process (Node.js), bypassing CORS entirely. Also rewrote model fetching in settings.ts. Removed `openai` from dependencies.
- **Query progress overhaul**: Five-phase progress display with page names, elapsed time counter, proper non-streaming labeling.
- **Cmd+Enter to send + Stop button**: Prevent accidental Enter-only sends. Button transforms to red "Stop" during generation.
- **Copy button**: Hover-visible copy button on each assistant message, copies raw markdown.
- **Markdown rendering fix**: Fresh Component per render call (stale component accumulation was causing degraded table/styles rendering).
- **Auto-scroll**: Chat history scrolls to bottom on new messages and during streaming.
- **Table/CSS overhaul**: Explicit markdown element styles (tables, code, blockquotes) using Obsidian CSS variables.

Recently completed (v1.7.12):
- **Provider-aware model ID filtering**: Fixed critical bug where OpenRouter model IDs containing `/` (e.g., `openai/gpt-4o`) and Ollama model IDs containing `:` (e.g., `qwen3.5:latest`) were incorrectly filtered out. Implemented smart `getModelFilter()` in `settings.ts` with provider-specific rules: OpenRouter preserves `/`, Ollama preserves `:`.
- **Alias-aware Wiki index**: `generateFlatIndex()` now reads each page's frontmatter `aliases` and appends them in backtick-brackets (`[alias1, alias2]`) to index entries. New `getPageAliases()` helper in wiki-engine.ts.
- **Alias-aware page selection prompt**: `selectRelevantPagesWithLLM()` prompt updated with explicit alias-matching instruction. Users upgrading should run "Regenerate index" to rebuild with aliases.

Recently completed (v1.7.11):
- **Mandatory aliases in page generation**: All three generation prompts now require `aliases:` to be non-empty, with fallback hierarchy (translation → source name → original name). Every new entity/concept/source page gets at least 1 alias.
- **`generateAliases` prompt + alias completion in Lint**: New prompt for filling missing aliases on existing pages; Lint detects pages without aliases and offers "Complete aliases" button with parallel batch processing (reuses `pageGenerationConcurrency`).
- **Duplicate detection scaling fix**: Removed `sharedSources` signal (generated false positives from same-source pages that aren't duplicates). Raised `sharedLinks` Jaccard threshold from 0.25 → 0.4. Implemented semantic tiering: Tier 1 (must-send: crossLang, abbreviation, bigram ≥ 0.6) always verified; Tier 2 (fill: bigram 0.4-0.6, sharedLinks ≥ 0.4) uses token budget (15K input tokens). Batch size 100 candidates per LLM call at 4000 max_tokens, parallelized with configurable concurrency.
- **`DuplicateCandidate` interface**: Structured candidate with `signal` and `score` fields for clean tier classification.
- **Smart Fix All**: Causality-ordered batch fix (duplicates → dead links → orphans → empty pages) in Lint report.
- **Frontmatter fixes**: `enforceFrontmatterConstraints()` and `mergeDuplicatePages()` now correctly insert blank line between closing `---` and body; merge path strips frontmatter before sending to LLM.
- **minAppVersion bumped to 1.6.6**: Required for `FileManager.trashFile()` API.
- **Lint report redesigned**: 4-layer button layout, summary includes `{aliasesMissing}` count, causality annotations on dead links and orphans.

Recently completed (v1.7.10):
- **方案C Phase 1+2 — Knowledge deduplication**:
  - Three-layer duplicate detection: programmatic signals (shared sources/links/bigram) → LLM title scan (cross-lingual) → LLM content verification
  - Intelligent merge: LLM fuses content + discovers aliases, programmatic frontmatter merge (sources appended, updated refreshed), source page deleted and all wiki-links rewritten
  - Aliases infrastructure: `mergeFrontmatter` and `enforceFrontmatterConstraints` preserve aliases, `getExistingWikiPages` reads aliases from frontmatter, `fixDeadLink` fallback checks aliases
  - Duplicate section in lint report with "Merge duplicates" action button
  - `deleteFile` in EngineContext using `vault.trash()`
- **5xx retry mechanism**: All three LLM clients retry on HTTP 5xx/429 errors (max 2 retries, exponential backoff)
- **Persistent progress notices**: All lint/fix/ingest stages use `new Notice('', 0)` + `setMessage()` + `hide()` pattern with per-item detail
- **Error handling overhaul**: Per-item failure Notices (8s) with specific error messages in all fix loops, duplicate detection failure shows persistent Notice with layer info, outer catch shows error detail

Recently completed (v1.7.9):
- **GitHub artifact attestations** — Cryptographic provenance verification for release assets (supply chain security)

Recently completed (v1.7.8):
- **Obsidian Bot review compliance** — 15-rule audit fixes, `window.setTimeout` replacement, type safety improvements

Recently completed (v1.7.7):
- **Conversation summary page LLM generation**: Query Wiki saved pages now use `generateSummaryPage` prompt (same as file ingestion), proper schema context, frontmatter `updated` field
- **Duplicate save prompt fix**: Hash tracking prevents re-evaluation of unchanged conversations, `lastOfferedQueryHash` in settings
- **Progress notice guarantee**: Save-to-wiki operations use try-finally cleanup, progress callback wired in both paths
- **Conversation save report**: `ingestConversation()` returns `IngestReport` (unified with file ingestion), Notice shows entity/concept count
- **Notice i18n compliance**: All Notice() calls respect Interface Language (7 new texts, auto-maintain/query/settings updated)
- **Smart batch skip mechanism**: Folder ingestion checks `wiki/sources/${slug}.md` existence, skips already-ingested files, conservative fallback protects user edits, report shows skipped count

Recently completed (v1.7.6):
- **Related page update parallelization**: Stage 4 now uses configurable concurrency (reuses `pageGenerationConcurrency`), reducing related-page update time by up to 3x
- **Hardcoded wiki path fixes**: `FileSuggestModal` and `FolderSuggestModal` now accept `wikiFolder` parameter; query-engine wiki-link format instructions now use `settings.wikiFolder` instead of hardcoded `wiki/`
- **Promise.allSettled error isolation**: per-page retry with 2s delay on failure; batch-level delay control via `batchDelayMs`

Recently completed (v1.7.5):
- **TypeScript compilation fixes**: 20+ type errors resolved across wiki-engine.ts, query-engine.ts, auto-maintain.ts, modals.ts

Recently completed (v1.7.3):
- **Ingestion Parallel Acceleration**: Configurable page generation concurrency (1-5, default 1)
- **Batch delay control**: 100-2000ms for API rate limit protection
- **Verbatim mentions preservation**: Source quotes in original language
- **Entity/Concept relationship enhancement**: Separate Related Entities/Concepts sections
- **Schema template optimization**: Explicit structure rules and merge policies

Recently completed (v1.7.2): All development on `feature/schema-auto-maintain`; pending Obsidian human review on main (v1.2.0 PR since 2026-04-29).

Recently completed (v1.7.0-1.7.2):
- **v1.7.2 — Intelligent Multi-Source Merge (CRITICAL FIX)**:
  - Programmatic frontmatter merge: sources[] deterministically appended (not overwritten), created preserved, updated refreshed, reviewed protected
  - Intelligent body fusion: LLM merges new source following schema sections — no redundancy, contradictions preserved with attribution, bidirectional links maintained
  - Reviewed page minimal-append mode: pages with `reviewed: true` get only genuinely new content appended
  - NO_NEW_CONTENT signal: skip redundant updates when source adds nothing new
- **v1.7.1 — Multi-Folder Watch & Granularity Control**:
  - Multi-folder auto-watch: `watchedFolders` array with "Add Folder" UI, Web Clipper preset
  - Granularity-linked iteration caps: coarse(3/10/20) / standard(6/20/50) / fine(12/30/unlimited)
  - Semantic entity deduplication: LLM fallback for translations, abbreviations, renamings
- **v1.7.0 — Content Truncation Protection & Quality**:
  - 8000 max_tokens + stop_reason/finish_reason detection + auto-retry
  - fillEmptyPage reliability: pre-read content bypasses string→TFile resolution
  - Batch ingest aggregated reports with entity/concept breakdown
  - Lint report & command palette i18n
  - Lint fix log enrichment with per-item details

Active gaps (postponed to post-quality-update phase):
- Lint batch fix without per-item review (human-in-the-loop) — v1.8.0 (postponed)
- Ingest Wizard: conversational ingestion with user review — v1.8.0 (postponed)
- Stale-claim detection in lint — medium priority
- Lint UI freeze before duplicate detection on large wikis — investigating, high priority for v1.7.17

## 📁 Project Structure (v1.6.7+)

```
src/
├── main.ts                         # Plugin entry point
├── types.ts                        # Shared types + EngineContext
├── utils.ts                        # Utilities (slugify, parseJson, etc.)
├── prompts.ts                      # All LLM prompt templates
├── texts.ts                        # i18n texts (8 languages)
├── llm-client.ts                   # Anthropic/OpenAI/Ollama clients (with 5xx retry)
├── wiki/                           # Wiki engine + knowledge modules
│   ├── wiki-engine.ts              # Orchestrator (526 lines)
│   ├── query-engine.ts             # Conversational query
│   ├── source-analyzer.ts          # Iterative batch extraction
│   ├── page-factory.ts             # Entity/concept CRUD + merge
│   ├── conversation-ingest.ts      # Chat → wiki knowledge + dedup
│   ├── lint-fixes.ts               # Dead link fix, empty page fill, orphan link
│   ├── lint-controller.ts          # Lint orchestration (extracted from main.ts)
│   ├── contradictions.ts           # Contradiction detection/resolution
│   └── system-prompts.ts           # Language directive + section labels
├── schema/                         # Schema co-evolution
│   ├── schema-manager.ts           # Schema CRUD + suggestions
│   └── auto-maintain.ts            # File watcher + periodic lint
└── ui/                             # User interface
    ├── settings.ts                 # Settings panel
    └── modals.ts                   # Lint/Ingest/Query modals
```

---

## ⚠️ Branch Policy

**Plugin is under Obsidian human review.** The v1.2.0 PR passed automated bot review and has been queued for human review since 2026-04-29. Subsequent versions up to v1.7.10 have been pushed to main.

- **main branch is active** — all development happens here
- **No feature branch requirement** — direct commits to main are fine
- **Pre-commit**: `pnpm lint` + `pnpm build` must pass
- After Obsidian review completes, the plugin will be available in the Community Plugin directory

---

## 📋 Karpathy Philosophy Compliance

All features must align with [Karpathy's original LLM Wiki vision](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f):

- **Knowledge compounds** — query results should flow back into the wiki; every exploration leaves lasting value
- **Human-in-the-loop** — LLM suggests, user decides. Never auto-modify schema, never overwrite reviewed pages
- **Three-layer architecture** — Sources (read-only) → Wiki (LLM-generated) → Schema (co-evolved)
- **Incremental accumulation** — wiki is a persistent, compounding artifact, not a one-shot consumer

## 📦 Development Workflow

After completing each Phase, execute in order:
1. `pnpm lint` + `pnpm build` pass
2. Obsidian Bot audit against all 15 rules
3. Update docs (README/ROADMAP) and memory
4. Notify user with manual testing steps, wait for approval
5. Commit to Git only after user confirms
6. Proceed to next Phase

---

## 🌍 Internationalization Standards

### Language Requirements

**Documentation:**
- ✅ **README.md:** English (primary, for international users)
- ✅ **docs/README_CN.md:** Chinese (optional, for local users)
- ✅ **docs/README_JA.md:** Japanese
- ✅ **docs/README_KO.md:** Korean
- ✅ **docs/README_DE.md:** German
- ✅ **docs/README_FR.md:** French
- ✅ **docs/README_ES.md:** Spanish
- ✅ **docs/README_PT.md:** Portuguese

**User Interface (v1.0.9+):**
- ✅ **Settings panel:** Supports English and Chinese interface
- ✅ **Language switcher:** Dropdown at top of settings panel
- ✅ **Default language:** English (for international users)
- ✅ **TEXTS system:** Complete translation constants for all UI text
- ✅ **Dynamic rendering:** Real-time UI update when switching language
- ✅ **Language preference:** Persisted in plugin settings (`language: 'en' | 'zh'`)

**Code Comments:**
- ⚠️ **Minimal comments:** Only for non-obvious logic (WHY, not WHAT)
- ✅ **English comments:** No Chinese comments in codebase
- ✅ **Clear naming:** Use descriptive English variable/function names

**Git Commit Messages:**
- ✅ **MUST use English:** All commit messages in English
- ✅ **Follow conventional commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- ✅ **Clear description:** Explain WHAT changed and WHY
- ✅ **Reference issues:** Link to GitHub issues when applicable

**Example Commits:**
```bash
# ✅ Good (English, conventional format)
git commit -m "feat: add multi-provider LLM support (Anthropic + OpenAI)"
git commit -m "fix: resolve Chinese filename slugify issue"
git commit -m "docs: add Karpathy LLM Wiki acknowledgment in README"

# ❌ Bad (Chinese, no conventional format)
git commit -m "添加多Provider支持"
git commit -m "修复bug"
```

---

## 📋 Git Commit Message Standards

### Conventional Commits Format

**Required Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring (no feature change)
- `test:` - Adding tests
- `chore:` - Maintenance tasks (build, dependencies)
- `perf:` - Performance improvements
- `style:` - Code style changes (formatting, not logic)

**Examples:**

```bash
# Feature addition
feat: add dynamic model list fetching from LLM API

Users can now click "Fetch Models" button to get real-time
available models from provider API, avoiding hard-coded lists.

Closes #42

# Bug fix
fix: resolve JSON parsing failure for large responses

Enhanced parseJsonResponse with 5-step strategy:
1. Clean markdown wrapping
2. Direct parse attempt
3. Extract JSON object
4. Fix common issues (trailing commas)
5. Detailed debug logs

Fixes #88

# Documentation
docs: add comprehensive Chinese user guide (README_CN)

Mirroring English README for Chinese users, covering:
- Installation steps
- Configuration guides
- Troubleshooting section

# Refactor
refactor: remove toLowerCase() in slugify for Unicode safety

The toLowerCase() step caused Chinese characters to become
empty strings in edge cases. Now preserving original case
to support full Unicode range.

```

**Commit Footer (Optional):**
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Reviewed-by: Username <email@example.com>
```

---

## 🎯 Code Quality Standards

- **No `any`:** Use explicit types or `unknown` with type guards
- **Null checks:** Use `?.` optional chaining and `??` nullish coalescing
- **Naming:** PascalCase classes, camelCase functions, UPPER_SNAKE_CASE constants
- ✅ **Booleans:** Prefix with `is/has/can` (`isValid`, `hasContent`, `canIngest`)

---

## 🔧 Obsidian Plugin Guidelines Compliance

### Official Submission Checklist (PR Template)

Per the [official PR template](https://raw.githubusercontent.com/obsidianmd/obsidian-releases/refs/heads/master/.github/PULL_REQUEST_TEMPLATE/plugin.md):

1. **Release assets as individual files** — `main.js` (required), `manifest.json` (required), `styles.css` (optional). Never only inside source archives.
2. **Version tag NO `v` prefix** — `manifest.json` version must match GitHub Release tag exactly. `1.2.0` ✅, `v1.2.0` ❌
3. **Plugin ID consistency** — `manifest.json` `id` must match `community-plugins.json` `id` exactly
4. **README** — Must explain purpose and usage
5. **LICENSE** — Must exist in repo
6. **Third-party code attribution** — Respect original license, credit in README
7. **Testing** — Test on Windows, macOS, Linux (Android/iOS if applicable)
8. **Developer Policies** — Comply with https://docs.obsidian.md/Developer+policies
9. **Plugin Guidelines** — Read https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines and self-review common mistakes
10. **Maintenance commitment** — Ongoing support, bug fixes, or find successor / delist

### Required Practices

**Plugin Safety:**
- ✅ **No hardcoded secrets:** API keys from user settings only
- ✅ **Local storage:** Store sensitive data in `.obsidian/plugins/data.json`
- ✅ **User consent:** Explain browser mode risks (OpenAI SDK)

**User Experience:**
- ✅ **Clear settings:** Provide test connection buttons, save buttons
- ✅ **Friendly errors:** Use Obsidian Notice API with actionable messages
- ✅ **Command naming:** Verb + noun format (`Ingest Sources`, `Query Wiki`)
- ✅ **Progress feedback:** Show progress for long operations

**Performance:**
- ✅ **Async operations:** Use async/await, avoid blocking UI
- ✅ **Batch processing:** Process multiple files with progress tracking
- ✅ **Error recovery:** Catch errors without crashing plugin

### Automated Code Review (ObsidianReviewBot) — Required Rules

The bot runs `eslint-plugin-obsidianmd` on every PR. These are the most common rejection reasons, ordered by frequency:

#### 1. Sentence Case for UI Text (`ui/sentence-case`)
**All user-facing text MUST use sentence case.** Only the first word and proper nouns are capitalized.
```typescript
// ❌ Wrong
new Notice('Please Configure API Key First');
new Notice('请输入 API Key');  // mixed Chinese-English also flagged

// ✅ Correct
new Notice('Please configure API key first');
new Notice(TEXTS[this.settings.language].errorNoApiKey);  // use i18n system
```
**Rule:** Never hardcode Chinese strings. Always use `TEXTS[this.settings.language].xxx`.

#### 2. Promise Handling (`no-floating-promises`)
**Promises must be awaited, `.catch()`'d, or explicitly `void`'d.**
```typescript
// ❌ Wrong
this.autoMaintainManager.runStartupCheck();  // returns Promise, not handled

// ✅ Correct
void this.autoMaintainManager.runStartupCheck();  // fire-and-forget
await this.autoMaintainManager.runStartupCheck();  // awaited
```

#### 3. Promise in Void Callback (`no-misused-promises`)
**Callbacks expecting `void` must not return a Promise.**
```typescript
// ❌ Wrong
button.onClick(() => this.asyncMethod());  // returns Promise

// ✅ Correct
button.onClick(() => { void this.asyncMethod(); });
```

#### 4. No `console.log` — Only `console.debug/warn/error`
```typescript
// ❌ Wrong
console.log('debug info');

// ✅ Correct
console.debug('debug info');  // only these 3 methods allowed
```

#### 5. No `any` Type (`no-explicit-any`)
```typescript
// ❌ Wrong
function process(data: any) { }
catch (error: any) { }

// ✅ Correct
function process(data: unknown) { }
catch (error) { /* implicit unknown */ }
```

#### 6. Unnecessary Type Assertions
```typescript
// ❌ Wrong
const file = vault.getAbstractFileByPath(path) as TFile;

// ✅ Correct
const file = vault.getAbstractFileByPath(path);
if (file instanceof TFile) { /* narrowed safely */ }
```

#### 7. Use `Setting().setHeading()` not HTML Elements
```typescript
// ❌ Wrong
containerEl.createEl('h2', { text: 'Section Title' });

// ✅ Correct
new Setting(containerEl).setName('Section Title').setHeading();
```

#### 8. No Inline Styles — Use CSS Classes
```typescript
// ❌ Wrong
element.style.display = 'none';
element.style.width = '100%';

// ✅ Correct
element.addClass('llm-wiki-hidden');
```

#### 9. Async Methods Must Use `await`
```typescript
// ❌ Wrong
private async hasChanges(): Promise<boolean> {
  return this.files.length > 0;  // no await — remove async!
}

// ✅ Correct
private hasChanges(): boolean {
  return this.files.length > 0;
}
```

#### 10. Use `Vault#configDir` not Hardcoded `.obsidian`
```typescript
// ❌ Wrong
const configPath = '.obsidian/plugins/...';

// ✅ Correct
const configPath = this.app.vault.configDir + '/plugins/...';
```

#### 11. Avoid Deprecated APIs
```typescript
// ❌ Wrong
MarkdownRenderer.renderMarkdown(...);  // deprecated

// ✅ Correct
MarkdownRenderer.render(...);  // current API
```

#### 12. Plugin Instance as Component (Memory Leak Risk)
```typescript
// ❌ Wrong
MarkdownRenderer.render(app, content, container, '', this);  // plugin 'this' too long-lived

// ✅ Correct
MarkdownRenderer.render(app, content, container, '', component);  // use proper Component
```

#### 13. Command Names Must Not Include Plugin Name
```typescript
// ❌ Wrong (plugin name already shown in UI)
name: 'LLM Wiki: Ingest source'

// ✅ Correct
name: 'Ingest single source'
```

#### 14. No `v` Prefix on Version Tags
- `1.4.0` ✅
- `v1.4.0` ❌

#### 15. Plugin Description Rules
- Must NOT contain "Obsidian" word
- Must end with `.`, `?`, or `!`
- Must match between `manifest.json` and PR description

#### Local Validation
```bash
pnpm lint  # runs eslint-plugin-obsidianmd on src/
```
**Always run `pnpm lint` before pushing.** If it passes, the bot will pass (for code issues). PR metadata issues (template, description mismatch) are separate.

---

## 📦 Version Management Standards

### Semantic Versioning

**Format:** `MAJOR.MINOR.PATCH` (e.g., `1.0.8`)

**Rules:**
- **MAJOR:** Breaking changes (incompatible API changes)
- **MINOR:** New features (backward-compatible)
- **PATCH:** Bug fixes (backward-compatible)

**Update Process:**

1. **Update 3 files:**
   ```json
   // manifest.json
   {"version": "1.0.9"}

   // package.json
   {"version": "1.0.9"}

   // versions.json
   {"1.0.9": "0.15.0"}
   ```

2. **Commit with conventional format:**
   ```bash
   git commit -m "chore: bump version to 1.0.9"
   ```

3. **Create Git tag (NO `v` prefix — Obsidian requirement):**
   ```bash
   git tag 1.0.9
   git push origin 1.0.9
   ```

4. **Create GitHub Release:**
   - Tag: `1.0.9` (no `v` prefix)
   - Title: `1.0.9 - Brief description`
   - Upload as individual files: `main.js`, `manifest.json`, `styles.css`
   - Do NOT only include source archives (`.zip`, `.tar.gz`)

---

## 📖 Documentation Standards

- **README:** English primary, version number, features, install steps, usage examples, troubleshooting
- **CHANGELOG:** Keep a Changelog format, group by Added/Changed/Fixed/Removed, ISO dates
- **Commit messages:** English + conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)

## ✅ Pre-Commit Checklist

- `pnpm build` passes
- `pnpm lint` passes (0 errors)
- Version numbers synced: `manifest.json` + `package.json` + `versions.json`
- CHANGELOG + README updated if features changed
- Commit message in English, conventional format
- ✅ Core commands execute successfully
- ✅ Error messages are user-friendly

---

## 🚀 Release Process (Automated via GitHub Actions)

> This is the ONLY release mechanism. Never manually upload release assets.
> Workflow: `.github/workflows/release.yml` | Trigger: tag push
> Precondition: Settings → Actions → General → Read and write permissions (already configured)

### Step-by-Step

1. **Finalize Code:**
   ```bash
   # Ensure working tree clean
   git status

   # Build final version
   pnpm build

   # Test in Obsidian
   # (manual testing)
   ```

2. **Update Version:**
   ```bash
   # Update manifest.json, package.json, versions.json
   # Example: 1.0.8 → 1.0.9
   ```

3. **Update Documentation:**
   ```bash
   # Update CHANGELOG.md
   # Update README.md (if new features)
   ```

4. **Commit Changes:**
   ```bash
   git add .
   git commit -m "chore: bump version to 1.0.9

   Release 1.0.9 with new features:
   - Dynamic model list fetching
   - Enhanced JSON parsing

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
   ```

5. **Create Git Tag (NO `v` prefix — Obsidian requirement):**
   ```bash
   git tag -a 1.0.9 -m "1.0.9"
   git push origin main
   git push origin 1.0.9
   ```
   - This triggers `.github/workflows/release.yml` automatically

6. **GitHub Actions creates draft release:**
   - Go to GitHub → **Actions** tab, wait for workflow to finish
   - Go to **Releases** → find the draft release created by the workflow
   - Edit release: add release notes, verify `main.js`/`manifest.json`/`styles.css` are attached
   - Select **Publish release**

7. **After publishing:**
   - If first release: [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
   - If update: Users can update to the latest version

---

## 📚 Resources & References

### Official Guidelines
- [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

### Best Practices
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Open Source Guides](https://opensource.guide/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

**Document Purpose:** Ensure LLM Wiki Plugin meets international open-source standards for quality, maintainability, and community contribution.

**Maintainer:** Greener-Dalii | **Last Review:** 2025-04-26