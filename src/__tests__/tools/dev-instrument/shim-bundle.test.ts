// Bundle smoke test for the UPSTREAM DEV-ONLY INSTRUMENT (PR #511 review,
// DocTpoint blocking finding 1).
//
// The instrument's esbuild step aliases every `from 'obsidian'` import —
// engine code AND instrument code — to `tools/dev-instrument/src/shim.ts`.
// That alias only executes at run-instrument time, which is why all five
// local Gates stayed green while the instrument could not bundle at all:
// typecheck resolves `obsidian` to the real npm types, and no test exercised
// the alias. The failure mode is a missing export on the shim (first hit:
// `Notice`, imported at module level by `src/wiki/wiki-engine.ts:5` and
// constructed on the abort / PDF / rate-limit branches even though the
// ingest path never fires it).
//
// This test reproduces run-instrument.mjs's exact build — same entry, same
// alias plugin, same platform/format/target — so any future engine-side
// import of an obsidian symbol the shim lacks fails HERE, in Gate 1, not at
// the contributor's terminal mid-measurement. Output goes to the gitignored
// dist/ directory.

import { describe, it, expect } from 'vitest';
import type { PluginBuild } from 'esbuild';

describe('dev-instrument bundle — obsidian alias resolves against shim.ts', () => {
  it('bundles engine-runner.ts with the obsidian→shim alias', async () => {
    const path = await import('node:path');
    // Vitest runs from the repo root; resolve everything from there so the
    // paths match run-instrument.mjs's absWorkingDir.
    const pluginRoot = process.cwd();
    const entry = path.join(pluginRoot, 'tools/dev-instrument/src/engine-runner.ts');
    const shim = path.join(pluginRoot, 'tools/dev-instrument/src/shim.ts');
    const outfile = path.join(pluginRoot, 'tools/dev-instrument/dist/test-bundle.mjs');

    const esbuild = await import('esbuild');

    const obsidianShimPlugin = {
      name: 'obsidian-shim',
      setup(build: PluginBuild) {
        build.onResolve({ filter: /^obsidian$/ }, () => ({ path: shim }));
      },
    };

    const result = await esbuild.build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      logLevel: 'silent',
      absWorkingDir: pluginRoot,
      plugins: [obsidianShimPlugin],
    });

    // A missing shim export surfaces as a build error here (first hit was
    // `Notice`, wiki-engine.ts:5). Empty errors = every obsidian import in
    // the engine graph resolves against the shim.
    expect(result.errors).toEqual([]);

    // The bundle exists and is not a stub.
    const fs = await import('node:fs');
    expect(fs.statSync(outfile).size).toBeGreaterThan(10_000);
  });
});
