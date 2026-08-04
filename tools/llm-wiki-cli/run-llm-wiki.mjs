#!/usr/bin/env node
// Entry point for the ingest CLI.
//
// The plugin's sources are TypeScript and import a module named `obsidian`
// that only exists inside the app. esbuild solves both in one pass: it
// compiles the TS and rewrites every `obsidian` import to the shim in
// ./src/obsidian.ts, so plugin code and CLI code share one TFile class and
// `instanceof` keeps working. The bundle is then imported and run.

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as nodePath from 'node:path';
import { readdir, rm } from 'node:fs/promises';

const CLI_DIR = nodePath.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = nodePath.resolve(CLI_DIR, '../..');
// Per-process, because several runs may overlap and esbuild writes the bundle
// in place: a second builder truncating the file while the first is importing
// it fails the import — usually `SyntaxError: Unexpected end of input`, and
// occasionally `main is not a function` when the truncation happens to leave
// valid syntax. Measured on the shared path: 14 of 60 concurrent runs failed.
const BUNDLE_DIR = nodePath.join(CLI_DIR, '.build');
const BUNDLE_PATH = nodePath.join(BUNDLE_DIR, `llm-wiki-cli.${process.pid}.mjs`);
const OBSIDIAN_SHIM = nodePath.join(CLI_DIR, 'src', 'obsidian.ts');

/**
 * Bundles left behind by runs that died between the build and the import — a
 * per-process name means nothing overwrites them, so without this they
 * accumulate at 11 MB each. A file is only removed when its process is gone:
 * `kill(pid, 0)` throws for a dead pid and succeeds for a live one, so a
 * concurrent run's bundle is never pulled out from under it.
 */
async function sweepStaleBundles() {
  let names;
  try {
    names = await readdir(BUNDLE_DIR);
  } catch {
    return; // first run: the directory is esbuild's to create
  }
  for (const name of names) {
    const pid = Number(/^llm-wiki-cli\.(\d+)\.mjs$/.exec(name)?.[1]);
    if (!pid || pid === process.pid) continue;
    try {
      process.kill(pid, 0);
      continue; // alive — its bundle is in use
    } catch {
      await rm(nodePath.join(BUNDLE_DIR, name), { force: true });
    }
  }
}

await sweepStaleBundles();

const require = createRequire(nodePath.join(PLUGIN_ROOT, 'package.json'));
const esbuild = require('esbuild');

const obsidianShimPlugin = {
  name: 'obsidian-shim',
  setup(build) {
    build.onResolve({ filter: /^obsidian$/ }, () => ({ path: OBSIDIAN_SHIM }));
  },
};

await esbuild.build({
  entryPoints: [nodePath.join(CLI_DIR, 'src', 'main.ts')],
  outfile: BUNDLE_PATH,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: 'inline',
  logLevel: 'warning',
  absWorkingDir: PLUGIN_ROOT,
  plugins: [obsidianShimPlugin],
  // Some bundled dependencies still call `require` at runtime; ESM output has
  // no such binding, so provide one built from this module's URL.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
});

const { main } = await import(pathToFileURL(BUNDLE_PATH).href);
// Node keeps the loaded module, so removing the file now is safe — the stack
// traces and the inline sourcemap survive it. A run killed before this line
// leaves its bundle behind; the sweep above collects it on the next run.
await rm(BUNDLE_PATH, { force: true });

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
