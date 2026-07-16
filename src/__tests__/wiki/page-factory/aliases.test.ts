// Module-level unit tests for page-factory/aliases.ts
//
// v1.24.1 Phase 2 refactor: `appendAliases` was lifted out of the PageFactory
// class. The tests pin its observable contract — what gets written back to
// disk for each input shape — so future refactors cannot silently change
// how aliases get added, deduplicated, or rewritten into the frontmatter.

import { describe, it, expect, vi } from 'vitest';
import { appendAliases, type AliasesContext } from '../../../wiki/page-factory/aliases';

function makeContext(initial: Record<string, string>): AliasesContext & {
  written: Map<string, string>;
} {
  const files = new Map<string, string>(Object.entries(initial));
  return {
    written: files,
    async tryReadFile(path: string): Promise<string | null> {
      return files.get(path) ?? null;
    },
    async createOrUpdateFile(path: string, content: string): Promise<void> {
      files.set(path, content);
    },
  };
}

const PAGE = 'wiki/vigilanz.md';
const PAGE_NO_FM = 'wiki/no-fm.md';

function makePage(aliases?: string[]): string {
  const lines = ['---', 'title: Vigilanz', ''];
  if (aliases) {
    lines.push('aliases:');
    for (const a of aliases) lines.push(`  - "${a}"`);
    lines.push('');
  }
  lines.push('---', '', '# Vigilanz', '', 'Body text.');
  return lines.join('\n');
}

describe('appendAliases — happy path', () => {
  it('appends a new alias to a page with no existing aliases', async () => {
    const ctx = makeContext({ [PAGE]: makePage() });
    await appendAliases(ctx, PAGE, ['Überwachung']);
    const written = ctx.written.get(PAGE)!;
    expect(written).toContain('aliases:');
    expect(written).toContain('  - "Überwachung"');
    // The rest of the frontmatter survives.
    expect(written).toContain('title: Vigilanz');
    expect(written).toContain('# Vigilanz');
  });

  it('appends to the existing aliases array without dropping entries', async () => {
    const ctx = makeContext({ [PAGE]: makePage(['existing']) });
    await appendAliases(ctx, PAGE, ['new']);
    const written = ctx.written.get(PAGE)!;
    expect(written).toContain('  - "existing"');
    expect(written).toContain('  - "new"');
  });

  it('preserves the original aliases order (existing first, then new)', async () => {
    const ctx = makeContext({ [PAGE]: makePage(['a', 'b']) });
    await appendAliases(ctx, PAGE, ['c', 'd']);
    const written = ctx.written.get(PAGE)!;
    const idxA = written.indexOf('  - "a"');
    const idxB = written.indexOf('  - "b"');
    const idxC = written.indexOf('  - "c"');
    const idxD = written.indexOf('  - "d"');
    expect(idxA).toBeGreaterThan(0);
    expect(idxA).toBeLessThan(idxB);
    expect(idxB).toBeLessThan(idxC);
    expect(idxC).toBeLessThan(idxD);
  });
});

describe('appendAliases — dedup', () => {
  it('no-op when input aliases are already present', async () => {
    const ctx = makeContext({ [PAGE]: makePage(['existing']) });
    const writeSpy = vi.spyOn(ctx, 'createOrUpdateFile');
    await appendAliases(ctx, PAGE, ['existing']);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('no-op when ALL input aliases are redundant (match the filename)', async () => {
    const ctx = makeContext({ [PAGE]: makePage() });
    const writeSpy = vi.spyOn(ctx, 'createOrUpdateFile');
    await appendAliases(ctx, PAGE, ['vigilanz', 'Vigilanz']);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('keeps the non-redundant input and drops the redundant one', async () => {
    const ctx = makeContext({ [PAGE]: makePage() });
    await appendAliases(ctx, PAGE, ['vigilanz', 'Surveillance']);
    const written = ctx.written.get(PAGE)!;
    expect(written).toContain('  - "Surveillance"');
    expect(written).not.toContain('  - "vigilanz"');
  });

  it('no-op when input is empty array', async () => {
    const ctx = makeContext({ [PAGE]: makePage() });
    const writeSpy = vi.spyOn(ctx, 'createOrUpdateFile');
    await appendAliases(ctx, PAGE, []);
    expect(writeSpy).not.toHaveBeenCalled();
  });
});

describe('appendAliases — edge cases', () => {
  it('no-op when the page is missing', async () => {
    const ctx = makeContext({});
    const writeSpy = vi.spyOn(ctx, 'createOrUpdateFile');
    await appendAliases(ctx, 'wiki/missing.md', ['x']);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('no-op when the file has no frontmatter delimiters', async () => {
    // File with body but no --- / --- pair → can't safely inject.
    const ctx = makeContext({ [PAGE_NO_FM]: 'just body content, no frontmatter' });
    const writeSpy = vi.spyOn(ctx, 'createOrUpdateFile');
    await appendAliases(ctx, PAGE_NO_FM, ['x']);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('does not mutate the body content', async () => {
    const original = makePage();
    const ctx = makeContext({ [PAGE]: original });
    await appendAliases(ctx, PAGE, ['x']);
    const written = ctx.written.get(PAGE)!;
    expect(written).toContain('# Vigilanz');
    expect(written).toContain('Body text.');
  });
});