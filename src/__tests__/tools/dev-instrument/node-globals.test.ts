// Regression guards for the dev-instrument's Obsidian globals + shim module
// surface, adapted from the deleted
// `src/__tests__/tools/llm-wiki-cli/node-globals.test.ts` during the v1.27.0
// MINOR migration (PR #511 review, DocTpoint finding 2).
//
// What the migration changed: the legacy `node-globals.ts` module (async,
// dynamic `node:console` import, colors-off Console) collapsed into shim.ts's
// synchronous globals installation. PR #550 moved that installation again —
// out of the shim and into the launcher (`run-instrument.mjs`
// `installEngineGlobals()`), so the shim is now an import-pure module and the
// launcher owns environment assembly. The contract worth pinning survived
// both moves:
//
// 1. Installing the engine globals sets `window` / `activeWindow` on the
//    global object — production engine code calls `window.setTimeout(...)`
//    at 12 sites and throws ReferenceError without the alias (this exact
//    regression shipped in commit e5c269e and was caught only by manual
//    review in 3a6dfaa). The test mirrors the launcher's installer inline:
//    the function lives in a `.mjs` file vitest cannot import as a typed
//    module, so what is pinned here is the CONTRACT, not the call site.
// 2. shim.ts carries no STATIC `node:*` import — the Bot's
//    `obsidianmd/no-nodejs-modules` rule scans the whole repo .ts tree, and a
//    static import at module top resurfaces the ~49 legacy findings.
// 3. shim.ts is import-pure: importing it installs nothing. If someone
//    re-adds a global side effect to the shim, this fails.

import { describe, it, expect } from 'vitest';

describe('dev-instrument node-globals contract (issue #507 / PR #550)', () => {
  // Mirrors run-instrument.mjs installEngineGlobals() verbatim. Kept in sync
  // by this comment pair — if either changes shape (e.g. stops aliasing
  // activeWindow), both must move together.
  function installEngineGlobals(): void {
    const g = globalThis as Record<string, unknown>;
    g.window = g;
    g.activeWindow = g;
  }

  it('installing the engine globals sets window and activeWindow aliases', () => {
    const g = globalThis as Record<string, unknown>;
    delete g.window;
    delete g.activeWindow;
    installEngineGlobals();
    expect(g.window).toBe(globalThis);
    expect(g.activeWindow).toBe(globalThis);
  });

  it('importing the shim does not install any global (shim is import-pure)', async () => {
    const g = globalThis as Record<string, unknown>;
    delete g.window;
    delete g.activeWindow;
    await import('../../../../tools/dev-instrument/src/shim');
    expect(g.window).toBeUndefined();
    expect(g.activeWindow).toBeUndefined();
  });

  it('shim.ts has no static `node:*` import at module top', async () => {
    // Reading the source is the cheapest guard: a static
    // `import ... from 'node:...'` line would resurface the Bot's
    // obsidianmd/no-nodejs-modules Error at submission time even though local
    // Gate 1 (`eslint src/`) never sees tools/.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const filePath = path.resolve(process.cwd(), 'tools/dev-instrument/src/shim.ts');
    const source = fs.readFileSync(filePath, 'utf8');

    const staticNodeImport = /^import\s[^;]*from\s+['"]node:[^'"]+['"];?$/m;
    expect(source, 'shim.ts must keep node:* imports dynamic (Bot no-nodejs-modules)').not.toMatch(staticNodeImport);
  });
});
