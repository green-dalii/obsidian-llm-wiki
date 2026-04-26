# Contributing to LLM Wiki Plugin

Thank you for your interest in contributing!

## Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/llm-wiki-plugin.git
cd llm-wiki-plugin

# Install dependencies
pnpm install

# Development build (watch mode)
pnpm dev

# Production build
pnpm build
```

## Project Structure

```
llm-wiki-plugin/
├── main.ts           # Plugin source code
├── manifest.json     # Obsidian plugin metadata
├── package.json      # Dependencies
├── styles.css        # UI styles
├── README.md         # User documentation
├── CHANGELOG.md      # Version history
├── ROADMAP.md        # Future plans
├── docs/             # Additional documentation
│   └── SECURITY.md   # Security analysis
└── .obsidian/        # Test vault (optional)
```

## Code Style

- TypeScript with strict types
- No `any` types (use proper typing)
- Clear naming conventions
- Minimal comments (self-documenting code)
- Obsidian API best practices

## Testing

1. Build plugin: `pnpm build`
2. Copy to test vault: `.obsidian/plugins/llm-wiki-plugin/`
3. Enable in Obsidian
4. Test all commands:
   - Ingest Sources
   - Query Wiki
   - Lint Wiki
   - Generate Index

## Pull Request Process

1. **Fork & Branch**: Create feature branch from `main`
2. **Code**: Implement changes with clear commits
3. **Test**: Verify functionality in Obsidian
4. **Document**: Update README/CHANGELOG if needed
5. **Submit**: Create PR with description

### PR Checklist

- [ ] Code compiles without errors
- [ ] Tested in Obsidian
- [ ] Updated CHANGELOG.md
- [ ] Follows code style guidelines
- [ ] No breaking changes (or documented)

## Code Guidelines

### TypeScript

```typescript
// ✅ Good: Proper types
interface LLMWikiSettings {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model: string;
}

// ❌ Bad: Any types
const settings: any = {};

// ✅ Good: Type-safe checks
const file = app.vault.getAbstractFileByPath(path);
if (file instanceof TFile) {
  await app.vault.modify(file, content);
}

// ❌ Bad: Unsafe casting
const file = app.vault.getAbstractFileByPath(path) as TFile;
await app.vault.modify(file, content);
```

### Obsidian API

```typescript
// ✅ Good: Proper lifecycle
async onload() {
  await this.loadSettings();
  this.initializeLLMClient();
  this.addCommand({ ... });
}

onunload() {
  // Cleanup
}

// ❌ Bad: Missing cleanup
async onload() {
  // No initialization
}
```

## Feature Requests

Open an [Issue](https://github.com/yourusername/llm-wiki-plugin/issues) with:
- Clear description
- Use case
- Expected behavior

## Bug Reports

Include:
- Obsidian version
- Plugin version
- Console errors (Developer Tools)
- Steps to reproduce
- Expected vs actual behavior

## Questions?

- 💬 [Discussions](https://github.com/yourusername/llm-wiki-plugin/discussions)
- 📖 [Documentation](docs/)

---

**License**: MIT | **Thanks for contributing!**