# LLM Wiki Plugin Project Development Standards

> Development guidelines for international open-source quality

**Last Updated:** 2026-04-29

---

## 🌍 Internationalization Standards

### Language Requirements

**Documentation:**
- ✅ **README.md:** English (primary, for international users)
- ✅ **README_CN.md:** Chinese (optional, for local users)
- ✅ **ROADMAP.md:** English (international planning)
- ✅ **CHANGELOG.md:** English (international tracking)
- ✅ **All other docs:** English (except user-facing localized content)

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

### TypeScript Best Practices

**Type Safety:**
- ✅ **Avoid `any`:** Use explicit types or `unknown` with type guards
- ✅ **Interface definitions:** Define clear interfaces for data structures
- ✅ **Return types:** Always annotate function return types
- ✅ **Null checks:** Use `?.` optional chaining and `??` nullish coalescing

**Example:**
```typescript
// ✅ Good
interface EntityInfo {
  name: string;
  type: 'person' | 'organization' | 'other';
  summary: string;
}

function createEntityPage(entity: EntityInfo): Promise<string | null> {
  if (!entity?.name?.trim()) {
    return null;
  }
  // ...
}

// ❌ Bad
function createEntityPage(entity: any) {
  if (!entity.name) {
    return null;
  }
  // ...
}
```

**Naming Conventions:**
- ✅ **Classes:** PascalCase (`LLMWikiPlugin`, `AnthropicClient`)
- ✅ **Functions:** camelCase (`createOrUpdateFile`, `slugify`)
- ✅ **Constants:** UPPER_SNAKE_CASE or camelCase (`PROMPTS`, `DEFAULT_SETTINGS`)
- ✅ **Interfaces:** PascalCase with descriptive names (`LLMClient`, `SourceAnalysis`)
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

### README Requirements

**Structure:**
1. **Project Title** - Clear, descriptive
2. **Quick Summary** - One-sentence description
3. **Features** - Bullet list of core features
4. **Installation** - Step-by-step guide
5. **Usage** - Examples with screenshots/videos
6. **Configuration** - Settings panel explanation
7. **Troubleshooting** - Common issues and fixes
8. **Contributing** - Contribution workflow
9. **License** - MIT License link
10. **Acknowledgments** - Credit original concept authors

**Quality Checklist:**
- ✅ English language (primary README.md)
- ✅ Clear installation steps (manual + development)
- ✅ Usage examples with input/output
- ✅ Screenshots or diagrams (if applicable)
- ✅ Link to documentation (docs/ folder)
- ✅ License file linked
- ✅ Acknowledgments section with original concept link

### CHANGELOG Requirements

**Format:**
```markdown
## [1.0.9] - 2025-04-27

### Added
- Feature description

### Changed
- Change description

### Fixed
- Bug fix description

### Removed
- Deprecated feature removal
```

**Rules:**
- ✅ English language
- ✅ Date in ISO format (YYYY-MM-DD)
- ✅ Group changes by type (Added/Changed/Fixed/Removed)
- ✅ Reference GitHub issues (e.g., "Fixes #42")

---

## 🤝 Open Source Best Practices

### Attribution Requirements

**Must Include:**
- ✅ **Original concept:** Link to Karpathy's gist in README Acknowledgments
- ✅ **Dependencies:** Credit Anthropic SDK, OpenAI SDK, Obsidian API
- ✅ **License:** MIT License with proper copyright year
- ✅ **Author:** Your GitHub username in manifest.json and README

**Example Acknowledgments Section:**
```markdown
## Acknowledgments & Credits

### Concept Origin
This project implements **Karpathy's LLM Wiki** concept:
- [Andrej Karpathy's LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

We thank **Andrej Karpathy** for sharing this innovative idea.

### Technology Stack
- [Obsidian Plugin API](https://docs.obsidian.md/)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript)
```

### Repository Standards

**Required Files:**
- ✅ `.gitignore` - Exclude `node_modules/`, `main.js`, `.DS_Store`
- ✅ `LICENSE` - MIT License (or Apache 2.0, GPL)
- ✅ `README.md` - English documentation
- ✅ `manifest.json` - Obsidian plugin metadata
- ✅ `package.json` - Node.js package metadata
- ✅ `versions.json` - Obsidian version compatibility map

**Recommended Files:**
- ⚠️ `CHANGELOG.md` - Version history
- ⚠️ `ROADMAP.md` - Future planning
- ⚠️ `docs/` - Detailed documentation
- ⚠️ `SECURITY.md` - Security policy

---

## ✅ Quality Checklist (Pre-Commit)

Before each commit, verify:

**Code Quality:**
- ✅ TypeScript compiles without errors
- ✅ No `any` types (use explicit types)
- ✅ Error handling with try/catch + Notice
- ✅ Console logs for debugging (not excessive)

**Documentation:**
- ✅ README.md updated (if feature changed)
- ✅ CHANGELOG.md updated (new version entry)
- ✅ Version numbers synchronized (manifest/package/versions)

**Git Standards:**
- ✅ Commit message in English
- ✅ Conventional commit format (`feat:`, `fix:`, etc.)
- ✅ No large files committed (main.js in .gitignore)
- ✅ No sensitive data (API keys, passwords)

**Testing:**
- ✅ Plugin loads in Obsidian
- ✅ Settings panel works
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