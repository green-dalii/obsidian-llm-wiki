// Regression guards for the dev-instrument's Obsidian globals + shim module
// surface, adapted from the deleted
// `src/__tests__/tools/llm-wiki-cli/node-globals.test.ts` during the v1.27.0
// MINOR migration (PR #511 review, DocTpoint finding 2).
//
// What the migration changed: the legacy `node-globals.ts` module (async,
// dynamic `node:console` import, colors-off Console) collapsed into shim.ts's
// synchronous `installObsidianGlobals()` — window/activeWindow aliases only,
// because the instrument writes through `process.stdout.write`, not console.
// The contract worth pinning survived the collapse:
//
// 1. Importing the shim installs `window` / `activeWindow` on globalThis —
//    production engine code calls `window.setTimeout(...)` at 12 sites and
//    throws ReferenceError without the alias (this exact regression shipped
//    in commit e5c269e and was caught only by manual review in 3a6dfaa).
// 2. shim.ts carries no STATIC `node:*` import — the Bot's
//    `obsidianmd/no-nodejs-modules` rule scans the whole repo .ts tree, and a
//    static import at module top resurfaces the ~49 legacy findings.

import { describe, it, expect } from 'vitest';

describe('dev-instrument node-globals contract (issue #507 / PR #511)', () => {
  it('installing the shim sets globalThis.window and activeWindow aliases', async () => {
    // First import in this worker executes installObsidianGlobals() at module
    // load. Dynamic import so repeated workers re-evaluate rather than share
    // a cached namespace with unrelated suites.
    await import('../../../../tools/dev-instrument/src/shim');
    const g = globalThis as Record<string, unknown>;
    expect(g.window).toBe(globalThis);
    expect(g.activeWindow).toBe(globalThis);
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
