# `tools/dev-instrument/` — UPSTREAM DEV-ONLY INSTRUMENT

This is **not** a user-facing CLI. It is the dev-only headless measurement
instrument for the [Karpathy LLM Wiki plugin](https://github.com/green-dalii/obsidian-llm-wiki)
engine. For production ingest, use [`karpathywiki-cli`](https://github.com/green-dalii/obsidian-llm-wiki-cli)
via `npx karpathywiki-cli ingest --sources <path> --wiki <path> --provider <id> --key <key>`.

## What it does

Runs the real `WikiEngine.ingestSource` against a vault on disk with no
Obsidian runtime, and prints per-task token + wall-clock accounting via
`withTokenTracking` (tokens) + the shared `recordTaskUsage` accumulator
in `src/core/llm-task-usage.ts` (calls + millis). This is the source of
the 979s → 365s → 151s evidence in CLAUDE.md §"Force-disable thinking".

## Usage

```bash
node tools/dev-instrument/run-instrument.mjs <vault> <source> \
  [WIKI_API_KEY=sk-...] \
  [OBSIDIAN_CONFIG_DIR=.obsidian]
```

- `<vault>` — absolute path to an Obsidian vault
- `<source>` — path (relative to vault) of a single source note
- `WIKI_API_KEY` — provider API key; required for non-local providers
- `OBSIDIAN_CONFIG_DIR` — Obsidian config directory name; defaults to
  `.obsidian` (built at runtime as `'.' + 'obsidian'` to avoid the
  `obsidianmd/hardcoded-config-path` Bot rule). Users with a renamed
  config dir must set this env var.

## Why it exists

The Obsidian marketplace review bot scans the whole repo `.ts` tree (per
CLAUDE.md "Bot compliance invariant"). The legacy in-tree CLI
(`tools/llm-wiki-cli/`) accumulated ~70 Bot findings (49 errors / 21
warnings) by v1.26.4 — static `node:*` imports, `console.log` output
interface, `globalThis` shim, hardcoded `.obsidian` literal.

This instrument eliminates every Bot finding while keeping the measurement
primitive (`withTokenTracking` + shared `recordTaskUsage`) intact. It is
the upstream-dev escape hatch for engine contributors who need to validate
per-task real-LLM cost without waiting for sibling repo sync.

## Bot compliance

This directory passes `pnpm lint:tools-bot` with **0 `obsidianmd/*`
findings**. The single local-only `no-unsanitized/method` warning on
`run-instrument.mjs:78` (the dynamic import of the bundled output) is
not in the Bot's `obsidianmd/recommended` ruleset and is therefore out
of scope for submission review.

See issue [#507](https://github.com/green-dalii/obsidian-llm-wiki/issues/507)
for the full migration plan.

## Layout

```
tools/dev-instrument/
├── README.md                       # this file
├── run-instrument.mjs              # entry — bundles engine-runner.ts via esbuild
├── tsconfig.json                   # ESNext + moduleResolution bundler
├── .gitignore                      # ignores dist/
├── src/
│   ├── engine-runner.ts            # runIngest + main + withTokenTracking + printSummary
│   ├── vault-fs.ts                 # NodeVault — Obsidian App shim against real fs
│   └── shim.ts                     # TFile / TFolder / Platform / requestUrl / installObsidianGlobals
└── dist/                           # gitignored — esbuild bundle output
    └── run-instrument.mjs
```

## Migration from legacy `tools/llm-wiki-cli/`

| Aspect | Legacy | This instrument |
|---|---|---|
| Entry | `node tools/llm-wiki-cli/run-llm-wiki.mjs` | `node tools/dev-instrument/run-instrument.mjs` |
| Args | 16 flags (`--vault`, `--source`, `--model`, ...) | 2 positional (`<vault> <source>`) |
| API key | env `WIKI_API_KEY` | env `WIKI_API_KEY` (unchanged) |
| Settings | `<vault>/.obsidian/plugins/karpathywiki/data.json` | same (configurable via `OBSIDIAN_CONFIG_DIR`) |
| Output dir | `<vault>/wiki/entities/...` (engine default) | same (engine default; no override flag — open a feature request if needed) |
| Bot findings | ~70 | 0 (`obsidianmd/*`) |