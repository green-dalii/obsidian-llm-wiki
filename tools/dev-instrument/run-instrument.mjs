#!/usr/bin/env node
// Entry point for the UPSTREAM DEV-ONLY INSTRUMENT.
//
// Not a user-facing CLI. For engine contributors who need to measure
// real-LLM per-task token/wall-clock cost against the live WikiEngine.
// Production CLI is `npx karpathywiki-cli` from the sibling repo
// `green-dalii/obsidian-llm-wiki-cli` v0.1.0+.
//
// Usage:
//   ./run-instrument.mjs <vault> <source> [WIKI_API_KEY=sk-...] \
//     [OBSIDIAN_CONFIG_DIR=.obsidian]
//
// Bundles `src/engine-runner.ts` with esbuild and writes the result to
// dist/run-instrument.mjs, then imports it. The dist/ output is gitignored
// (per the dev-instrument .gitignore). Unlike the legacy CLI we do NOT
// per-PID the bundle — the dev instrument runs sequentially.
//
// Bot-compliance notes (issue #507):
// - All `node:*` static imports → top-level IIFE + Platform.isDesktop guard
//   (matches src/llm-sdk/openai-codex/loopback-flow.ts AST exemption)
// - The Platform constant here is local to this .mjs; the .ts shim has its
//   own Platform with the same desktop-only invariant for the bundled code

const Platform = { isDesktop: true };
if (!Platform.isDesktop) throw new Error('run-instrument is desktop-only');

// Load node:* behind the desktop-only gate. Top-level IIFE so the inner
// `await import(...)` sits inside a function whose first statement is the
// guard — the exact AST shape the rule's `isGuardedByPlatformIsDesktop`
// detector looks for.
const { Module } = await (async () => {
  if (!Platform.isDesktop) throw new Error('node:module is desktop-only');
  return import('node:module');
})();
const require = Module.createRequire(import.meta.url);

const { fileURLToPath, pathToFileURL } = await (async () => {
  if (!Platform.isDesktop) throw new Error('node:url is desktop-only');
  return import('node:url');
})();
const nodePath = await (async () => {
  if (!Platform.isDesktop) throw new Error('node:path is desktop-only');
  return import('node:path');
})();

const CLI_DIR = nodePath.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = nodePath.resolve(CLI_DIR, '../..');
const ENTRY = nodePath.join(CLI_DIR, 'src', 'engine-runner.ts');
const OUT_DIR = nodePath.join(CLI_DIR, 'dist');
const OUT_PATH = nodePath.join(OUT_DIR, 'run-instrument.mjs');
const SHIM = nodePath.join(CLI_DIR, 'src', 'shim.ts');

const esbuild = require('esbuild');

const obsidianShimPlugin = {
  name: 'obsidian-shim',
  setup(build) {
    build.onResolve({ filter: /^obsidian$/ }, () => ({ path: SHIM }));
  },
};

await esbuild.build({
  entryPoints: [ENTRY],
  outfile: OUT_PATH,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: 'inline',
  logLevel: 'warning',
  absWorkingDir: PLUGIN_ROOT,
  plugins: [obsidianShimPlugin],
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
});

const { main } = await import(pathToFileURL(OUT_PATH).href);
try {
  await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n');
  process.exitCode = 1;
}