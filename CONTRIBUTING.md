# Contributing to Karpathy LLM Wiki

Thanks for your interest in contributing! This plugin follows Obsidian's plugin development conventions and enforces quality standards through automated tooling.

## Development Setup

```bash
git clone https://github.com/green-dalii/obsidian-llm-wiki.git
cd obsidian-llm-wiki
pnpm install
```

## Building

```bash
# Development build (watch mode)
pnpm dev

# Production build
pnpm build
```

`main.js` is the compiled output loaded by Obsidian. Test by copying `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/karpathywiki/` folder.

## Quality Checks

All three checks must pass before submitting any change:

```bash
pnpm lint    # ESLint with Obsidian plugin rules (0 errors, 0 warnings)
pnpm test    # Vitest unit tests
pnpm build   # esbuild production build (must exit cleanly)
```

## Code Conventions

- **TypeScript**: strict types, no `any` (use `unknown` with type guards)
- **Console**: only `console.debug` / `console.warn` / `console.error` (no `console.log`)
- **Comments**: English only, minimal — explain WHY not WHAT
- **Naming**: PascalCase classes, camelCase functions, UPPER_SNAKE_CASE constants
- **Booleans**: prefix with `is/has/can` (e.g., `isValid`, `hasContent`)
- **Commit messages**: English, conventional commits format (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- **Obsidian Bot compliance**: 15 `eslint-plugin-obsidianmd` rules enforced by `pnpm lint`

## Project Structure

```
src/
├── main.ts              # Plugin entry point
├── types.ts             # Shared types + EngineContext
├── utils.ts             # Utilities (slugify, parseJson, frontmatter parsing)
├── llm-client.ts        # LLM clients (Anthropic, OpenAI-compatible)
├── wiki/                # Wiki engine modules
│   ├── wiki-engine.ts   # Orchestrator
│   ├── query-engine.ts  # Conversational query
│   ├── page-factory.ts  # Entity/concept CRUD + merge
│   ├── lint-fixes.ts    # Fix logic (dead links, orphans, empty pages)
│   ├── lint/            # Lint sub-modules
│   └── prompts/         # LLM prompt templates by domain
├── schema/              # Schema co-evolution
├── ui/                  # Settings + Modals
├── texts/               # i18n (8 languages)
└── __tests__/           # Unit tests (vitest)
```

## Internationalization

- **UI**: 8 languages (EN/ZH/JA/KO/DE/FR/ES/PT), text keys in `src/texts/`
- **New text**: add the key to `en.ts` first, then translate to all 7 other languages
- **Wiki output**: 8 languages independent of UI, with custom input option

## Testing

Unit tests cover pure utility functions in `src/__tests__/`. Run with:

```bash
pnpm test          # single run
pnpm test:watch    # watch mode
```

Functions that depend on Obsidian APIs (vault I/O, file operations) should be tested manually in Obsidian.

## Architecture Principles

This plugin follows [Karpathy's LLM Wiki vision](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f):

- **Knowledge compounds** — query results flow back into wiki
- **Human-in-the-loop** — LLM suggests, user decides
- **Three-layer architecture** — Sources (read-only) → Wiki (LLM-generated) → Schema (co-evolved)
- **Incremental accumulation** — wiki is persistent, not one-shot

## Pull Request Process

1. Run `pnpm lint && pnpm test && pnpm build` — all must pass
2. Update CHANGELOG.md if the change is user-visible
3. Commit with English conventional commit message
4. Open a PR against `main` branch

## Questions?

Open a [Discussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions) or [Issue](https://github.com/green-dalii/obsidian-llm-wiki/issues).
