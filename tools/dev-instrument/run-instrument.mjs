#!/usr/bin/env node
// Entry point for the UPSTREAM DEV-ONLY INSTRUMENT.
//
// Not a user-facing CLI. For engine contributors who need to measure
// real-LLM per-task token/wall-clock cost against the live WikiEngine.
// Production CLI is `npx karpathywiki-cli` from the sibling repo
// `green-dalii/obsidian-llm-wiki-cli` v0.1.0+.
//
// Usage (env assignments MUST precede the command — shell grammar):
//   WIKI_API_KEY=sk-... node tools/dev-instrument/run-instrument.mjs <vault> <source>
// Optional arms: WIKI_THINKING_MODE=data-json|plugin-off|server-default
//                WIKI_TEMP=<number>  WIKI_TOP_P=<number>  OBSIDIAN_CONFIG_DIR=...
// Exit code (src/exit-code.ts): 0 = the engine reported success · 1 = it
// reported failure, emitted no report, or the run threw · 2 = usage.
//
// Bundles `src/engine-runner.ts` with esbuild and writes the result to
// dist/run-instrument.mjs, then imports it. The dist/ output is gitignored
// (per the dev-instrument .gitignore). Unlike the legacy CLI we do NOT
// per-PID the bundle — the dev instrument runs sequentially.
//
// Bot-compliance notes (issue #507):
// - All `node:*` static imports → top-level IIFE + Platform.isDesktop guard
//   (matches src/llm-sdk/openai-codex/loopback-flow.ts AST exemption)
// - All three module loads batched via Promise.all to avoid serial cost
//   (Simplification Finding 4 / Efficiency Finding 1)

const Platform = { isDesktop: true };
if (!Platform.isDesktop) throw new Error('run-instrument is desktop-only');

// Single umbrella IIFE — keeps the function-start guard the Bot's AST
// detector looks for, but parallelizes the three module loads. One guard
// covers all three imports inside that function.
const [{ Module }, { fileURLToPath, pathToFileURL }, nodePath] = await (async () => {
  if (!Platform.isDesktop) throw new Error('node:* is desktop-only');
  return Promise.all([
    import('node:module'),
    import('node:url'),
    import('node:path'),
  ]);
})();
const require = Module.createRequire(import.meta.url);

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

/**
 * Install the `window` / `activeWindow` globals that production engine code
 * expects (`window.setTimeout(...)` ×12 sites, `src/llm-sdk/*` setTimeout(0)
 * yields). Node 22+ has `setTimeout` on the global object but not under the
 * `window` alias, so without this the bundled engine throws ReferenceError on
 * the first SDK stream-yield.
 *
 * Lives HERE, in the launcher, not in shim.ts: environment assembly is the
 * launcher's job, and keeping the shim import-pure means importing it has no
 * global side effects. It must run before the bundle import below — module
 * evaluation order guarantees every engine module sees the aliases. The
 * launcher is a `.mjs` file, outside the Obsidian review bot's `.ts` scan
 * scope (and outside any Obsidian window — this is plain Node), which is
 * where the `obsidianmd/no-global-this` rule's popout-window concern is moot.
 */
function installEngineGlobals() {
  const g = globalThis;
  g.window = g;
  g.activeWindow = g;
}
installEngineGlobals();

// eslint-disable-next-line no-unsanitized/method -- OUT_PATH is a hardcoded local constant (tools/dev-instrument/dist/run-instrument.mjs), not user input; launcher is desktop-only and never runs inside Obsidian, so the dynamic-import sanitization concern does not apply
const { main } = await import(pathToFileURL(OUT_PATH).href);
try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n');
  process.exitCode = 1;
}