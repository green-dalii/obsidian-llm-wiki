import { describe, it, expect } from 'vitest';
import { buildKnownTargets, detectAliasDeficiency, scanDeadLinks, scanOrphans, ScannerPage } from '../wiki/lint/scanners';

// ── buildKnownTargets ─────────────────────────────────────────

describe('buildKnownTargets', () => {
  it('adds basename with and without .md extension', () => {
    const files = [{ basename: 'Test.md', path: 'wiki/entities/Test.md' }];
    const { known } = buildKnownTargets(files);
    expect(known.has('Test.md')).toBe(true);
    expect(known.has('Test')).toBe(true);
  });

  it('adds full path and relative path forms', () => {
    const files = [{ basename: 'Foo.md', path: 'wiki/entities/Foo.md' }];
    const { known } = buildKnownTargets(files);
    expect(known.has('wiki/entities/Foo')).toBe(true);
    expect(known.has('wiki/entities/Foo.md')).toBe(true);
  });

  it('adds sub-path variants', () => {
    const files = [{ basename: 'Deep.md', path: 'wiki/concepts/ML/Deep.md' }];
    const { known } = buildKnownTargets(files);
    expect(known.has('ML/Deep')).toBe(true);
    expect(known.has('ML/Deep.md')).toBe(true);
  });

  it('lowercases all entries for knownLower', () => {
    const files = [{ basename: 'Foo.md', path: 'wiki/Foo.md' }];
    const { knownLower } = buildKnownTargets(files);
    expect(knownLower.has('foo.md')).toBe(true);
    expect(knownLower.has('foo')).toBe(true);
  });

  it('handles empty input', () => {
    const { known, knownLower } = buildKnownTargets([]);
    expect(known.size).toBe(0);
    expect(knownLower.size).toBe(0);
  });
});

// ── detectAliasDeficiency ──────────────────────────────────────

describe('detectAliasDeficiency', () => {
  function makePage(path: string, hasAlias: boolean): ScannerPage {
    const fm = hasAlias ? 'type: entity\naliases: [Alias]\n' : 'type: entity\n';
    return { path, content: `---\n${fm}---\n\nBody`, basename: path.split('/').pop() || '' };
  }

  it('detects pages without aliases in entity/concept dirs', () => {
    const files = [
      { path: 'wiki/entities/Foo.md' },
      { path: 'wiki/concepts/Bar.md' },
    ];
    const pageMap = new Map<string, ScannerPage>();
    for (const f of files) pageMap.set(f.path, makePage(f.path, false));

    const result = detectAliasDeficiency(files, pageMap);
    expect(result).toHaveLength(2);
  });

  it('skips pages that already have aliases', () => {
    const files = [{ path: 'wiki/entities/HasAlias.md' }];
    const pageMap = new Map<string, ScannerPage>();
    pageMap.set(files[0].path, makePage(files[0].path, true));

    expect(detectAliasDeficiency(files, pageMap)).toHaveLength(0);
  });

  it('skips non-entity/concept directories', () => {
    const files = [{ path: 'wiki/sources/SomeSource.md' }];
    const pageMap = new Map<string, ScannerPage>();
    pageMap.set(files[0].path, makePage(files[0].path, false));

    expect(detectAliasDeficiency(files, pageMap)).toHaveLength(0);
  });
});

// ── scanDeadLinks ──────────────────────────────────────────────

describe('scanDeadLinks', () => {
  function makePageMap(path: string, content: string): Map<string, ScannerPage> {
    const m = new Map<string, ScannerPage>();
    m.set(path, { path, content, basename: path.split('/').pop() || '' });
    return m;
  }

  it('detects links to non-existent targets', () => {
    const pm = makePageMap('wiki/concepts/Test.md', 'See [[MissingPage]] for details.');
    const known = new Set<string>(['Test']);

    const result = scanDeadLinks(pm, known, new Set(), 'wiki');
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe('MissingPage');
  });

  it('does not flag links to known targets', () => {
    const pm = makePageMap('wiki/concepts/Test.md', 'See [[KnownPage]] for details.');
    const known = new Set<string>(['KnownPage']);

    expect(scanDeadLinks(pm, known, new Set(), 'wiki')).toHaveLength(0);
  });

  it('matches case-insensitively via knownLower', () => {
    const pm = makePageMap('wiki/concepts/Test.md', 'See [[KNOWNPAGE]]');
    const knownLower = new Set<string>(['knownpage']);

    expect(scanDeadLinks(pm, new Set(), knownLower, 'wiki')).toHaveLength(0);
  });

  it('strips wiki folder from source path in output', () => {
    const pm = makePageMap('wiki/concepts/Nested/Test.md', '[[Missing]]');
    const result = scanDeadLinks(pm, new Set(), new Set(), 'wiki');
    expect(result[0].source).toBe('concepts/Nested/Test');
  });

  it('does not flag space-to-hyphen slug variants as dead links', () => {
    // Regression: [[entities/Claude Code]] was reported dead even though
    // the file entities/Claude-Code.md exists (space vs hyphen mismatch).
    const pm = makePageMap('wiki/entities/OpenCode-Pi.md', '[[entities/Claude Code|Claude Code]]');
    const { known, knownLower } = buildKnownTargets([
      { basename: 'Claude-Code.md', path: 'wiki/entities/Claude-Code.md' },
    ]);
    const result = scanDeadLinks(pm, known, knownLower, 'wiki');
    expect(result).toHaveLength(0);
  });

  it('still reports truly unknown targets even after slug normalization', () => {
    const pm = makePageMap('wiki/entities/Page.md', '[[entities/Truly Unknown Page]]');
    const { known, knownLower } = buildKnownTargets([
      { basename: 'Claude-Code.md', path: 'wiki/entities/Claude-Code.md' },
    ]);
    const result = scanDeadLinks(pm, known, knownLower, 'wiki');
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe('entities/Truly Unknown Page');
  });
});

// ── scanOrphans ────────────────────────────────────────────────

describe('scanOrphans', () => {
  function makePageMap(path: string, content: string, aliases?: string[]): Map<string, ScannerPage> {
    const aliasLine = aliases?.length ? `aliases: [${aliases.join(', ')}]\n` : '';
    const fm = `---\ntype: entity\n${aliasLine}---\n\n${content}`;
    const m = new Map<string, ScannerPage>();
    m.set(path, { path, content: fm, basename: path.split('/').pop() || '' });
    return m;
  }

  it('flags pages with no incoming links as orphans', () => {
    const pm = makePageMap('wiki/entities/Orphan.md', 'No links here.');
    const result = scanOrphans(pm, 'wiki');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('wiki/entities/Orphan.md');
  });

  it('does not flag page linked by another page', () => {
    const pm = new Map<string, ScannerPage>();
    const p = makePageMap('wiki/entities/Target.md', 'Target content.');
    const src = makePageMap('wiki/entities/Source.md', 'See [[Target]] for info.');
    for (const [k, v] of p) pm.set(k, v);
    for (const [k, v] of src) pm.set(k, v);

    const result = scanOrphans(pm, 'wiki');
    expect(result).not.toContain('wiki/entities/Target.md');
  });

  it('matches incoming links via aliases', () => {
    const pm = new Map<string, ScannerPage>();
    const p = makePageMap('wiki/entities/ML.md', 'ML page content.', ['Machine Learning']);
    const src = makePageMap('wiki/concepts/Source.md', 'See [[Machine Learning]] for info.');
    for (const [k, v] of p) pm.set(k, v);
    for (const [k, v] of src) pm.set(k, v);

    const result = scanOrphans(pm, 'wiki');
    expect(result).not.toContain('wiki/entities/ML.md');
  });
});
