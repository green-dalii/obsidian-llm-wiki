import { describe, it, expect } from 'vitest';
import { TFile } from 'obsidian'; // mocked in setup.ts
import { createWikiEngineHarness, wikiPagesWritten } from '../__support__/wiki-engine-harness';
import { hashBody } from '../../core/source-requirements';

// Build a TFile-shaped source file object. The engine reads path/basename/extension.
function sourceFile(path = 'sources/empty.md'): TFile {
  const name = path.split('/').pop() || path;
  const dot = name.lastIndexOf('.');
  return Object.assign(new TFile(), {
    path,
    basename: dot > 0 ? name.slice(0, dot) : name,
    extension: dot > 0 ? name.slice(dot + 1) : 'md',
    stat: { mtime: 1 },
  });
}

// A fabricated analysis as a small/local model would invent from a blank prompt.
const HALLUCINATED = JSON.stringify({
  source_title: 'Untitled',
  summary: 'fabricated from nothing',
  entities: [{ name: 'Some Hallucination', type: 'person', summary: '', mentions_in_source: [] }],
  concepts: [{ name: 'Made Up Concept', type: 'term', summary: '', mentions_in_source: [], related_concepts: [] }],
});

describe('WikiEngine.ingestSource — empty source (#164)', () => {
  it('creates NO wiki pages when ingesting an empty file (the real hallucination symptom)', async () => {
    // The bug was "an empty file yields >=1 wiki page". We assert the symptom
    // directly — no entity/concept/source page may be written — independent of
    // whatever name a model invents.
    const h = createWikiEngineHarness({
      files: { 'sources/empty.md': '' },
      llmResponses: [HALLUCINATED],
    });

    // Pre-gate code paths may throw ("analysis failed"); the symptom (zero
    // pages) must hold regardless of how the ingest terminates.
    try {
      await h.engine.ingestSource(sourceFile());
    } catch { /* tolerated — we assert on what was written, not on throwing */ }

    expect(wikiPagesWritten(h.writtenPaths)).toEqual([]);
  });

  it('skips cleanly (no throw) and reports a skip, without calling the LLM', async () => {
    // Drives the Phase C gate: an empty file must be a graceful skip, not an error.
    const h = createWikiEngineHarness({
      files: { 'sources/empty.md': '' },
      llmResponses: [HALLUCINATED],
    });

    await expect(h.engine.ingestSource(sourceFile())).resolves.toBeUndefined();

    const last = h.reports.at(-1);
    expect(last?.skipped).toBe(true);
    expect(last?.createdPages).toEqual([]);
    expect(h.stats.llmCalls).toBe(0);
  });
});

describe('WikiEngine.ingestSource — requirements gate (#164)', () => {
  it('ingests a PDF once and writes its extracted text to the source page', async () => {
    const extracted = 'PDF body with a known sentence.';
    const h = createWikiEngineHarness({
      binaryFiles: { 'sources/paper.pdf': new Uint8Array([37, 80, 68, 70]).buffer },
      documentText: extracted,
      llmResponses: [
        JSON.stringify({ source_title: 'Paper', summary: 'Summary', entities: [], concepts: [], contradictions: [], related_pages: [], key_points: [] }),
        '---\ntype: source\n---\n\n# Paper summary',
      ],
    });

    await h.engine.ingestSource(sourceFile('sources/paper.pdf'));

    const sourcePath = h.writtenPaths.find(path => path.includes('/sources/'));
    expect(sourcePath).toBeDefined();
    expect(h.files.get(sourcePath ?? '')).toContain('## Extracted Text');
    expect(h.files.get(sourcePath ?? '')).toContain(extracted);
    expect(h.files.get(sourcePath ?? '')).toContain(hashBody(extracted));
    expect(h.stats.documentReads).toBe(1);
    expect(h.stats.binaryReads).toBe(1);
  });

  it('skips PDF before any document request when the provider is known unsupported', async () => {
    const h = createWikiEngineHarness({
      binaryFiles: { 'sources/paper.pdf': new ArrayBuffer(1) },
      settings: { provider: 'deepseek' },
    });

    await expect(h.engine.ingestSource(sourceFile('sources/paper.pdf'))).resolves.toBeUndefined();

    expect(h.reports.at(-1)?.rejectedFiles?.[0]?.reason).toBe('unsupported-pdf');
    expect(h.stats.documentReads).toBe(0);
    expect(wikiPagesWritten(h.writtenPaths)).toEqual([]);
  });

  it('reports empty when PDF extraction returns no readable text', async () => {
    const h = createWikiEngineHarness({
      binaryFiles: { 'sources/paper.pdf': new ArrayBuffer(1) },
      documentText: '',
    });

    await expect(h.engine.ingestSource(sourceFile('sources/paper.pdf'))).resolves.toBeUndefined();

    expect(h.reports.at(-1)?.rejectedFiles?.[0]?.reason).toBe('empty');
    expect(h.stats.documentReads).toBe(1);
  });

  it('preserves a damaged or password-protected PDF provider error', async () => {
    const h = createWikiEngineHarness({
      binaryFiles: { 'sources/paper.pdf': new ArrayBuffer(1) },
      documentError: new Error('password-protected PDF'),
    });

    await expect(h.engine.ingestSource(sourceFile('sources/paper.pdf'))).rejects.toThrow('password-protected PDF');
    expect(h.stats.documentReads).toBe(1);
  });

  it('skips a file whose content already exists in the wiki (cross-session dedup)', async () => {
    const dupBody = 'This exact body already lives in the wiki.';
    const h = createWikiEngineHarness({
      files: {
        // an existing source page carrying the content hash of dupBody
        'wiki/sources/old_abc123.md': `---\ntype: source\ncontentHash: ${hashBody(dupBody)}\n---\n\nold`,
        'sources/new-copy.md': dupBody,
      },
    });
    await expect(h.engine.ingestSource(sourceFile('sources/new-copy.md'))).resolves.toBeUndefined();
    expect(h.reports.at(-1)?.rejectedFiles?.[0]?.reason).toBe('duplicate');
    expect(wikiPagesWritten(h.writtenPaths)).toEqual([]);
    expect(h.stats.llmCalls).toBe(0);
  });

  it('flags a second identical file in the same batch as a duplicate', async () => {
    const h = createWikiEngineHarness();
    const ctx = h.engine.createBatchContext();
    expect(await h.engine.checkRequirements(sourceFile('sources/a.md'), 'identical body', ctx)).toBeNull();
    const dup = await h.engine.checkRequirements(sourceFile('sources/b.md'), 'identical body', ctx);
    expect(dup?.reason).toBe('duplicate');
  });

  it('prompts on a duplicate for interactive ingest and skips when the user declines', async () => {
    const dupBody = 'dup body';
    const h = createWikiEngineHarness({
      files: {
        'wiki/sources/x_1.md': `---\ntype: source\ncontentHash: ${hashBody(dupBody)}\n---\n\nx`,
        'sources/copy.md': dupBody,
      },
    });
    let prompted = false;
    h.engine.onConfirmReingest = async () => { prompted = true; return false; };

    await h.engine.ingestSource(sourceFile('sources/copy.md'), { interactive: true });

    expect(prompted).toBe(true);
    expect(h.reports.at(-1)?.skipped).toBe(true);
    expect(wikiPagesWritten(h.writtenPaths)).toEqual([]);
    expect(h.stats.llmCalls).toBe(0);
  });

  it('re-ingests past the gate when the interactive prompt is confirmed', async () => {
    const dupBody = 'dup body text';
    const h = createWikiEngineHarness({
      files: {
        'wiki/sources/x_1.md': `---\ntype: source\ncontentHash: ${hashBody(dupBody)}\n---\n\nx`,
        'sources/copy.md': dupBody,
      },
      llmResponses: [JSON.stringify({ source_title: 't', summary: 's', entities: [], concepts: [] })],
    });
    h.engine.onConfirmReingest = async () => true;

    // Confirming bypasses the duplicate skip → the engine proceeds to analysis
    // (which calls the LLM). Full ingest may hit mock edges; we only assert the
    // gate was passed.
    try { await h.engine.ingestSource(sourceFile('sources/copy.md'), { interactive: true }); } catch { /* mock edge */ }

    expect(h.stats.llmCalls).toBeGreaterThan(0);
  });
});

describe('WikiEngine.buildIngestedHashes — TTL cache (#164 review)', () => {
  it('reuses one vault walk across back-to-back checks within the TTL window', () => {
    // createBatchContext() is the public entry to buildIngestedHashes(). The cache
    // should make a second call within the TTL window read the snapshot instead of
    // re-walking vault.getMarkdownFiles() — the reviewer's perf concern.
    const h = createWikiEngineHarness({
      files: { 'wiki/sources/a.md': `---\ntype: source\ncontentHash: abc\n---\n\na` },
    });

    h.engine.createBatchContext();
    h.engine.createBatchContext();

    expect(h.stats.vaultMarkdownScans).toBe(1);
  });

  it('rebuilds the snapshot after a write invalidates the cache', async () => {
    // A fresh ingest writes a source page → invalidatePageCaches() must drop the
    // hash cache so the next check sees the just-written content (correctness, not
    // just perf — a 5s-stale snapshot would miss an immediate duplicate).
    const h = createWikiEngineHarness({
      files: { 'wiki/sources/a.md': `---\ntype: source\ncontentHash: abc\n---\n\na` },
    });

    h.engine.createBatchContext();
    expect(h.stats.vaultMarkdownScans).toBe(1);

    // A write (happy path: create) invalidates the cache without scanning itself.
    await h.engine.createOrUpdateFile('wiki/sources/b.md', `---\ntype: source\ncontentHash: def\n---\n\nb`);
    expect(h.stats.vaultMarkdownScans).toBe(1);

    h.engine.createBatchContext();
    expect(h.stats.vaultMarkdownScans).toBe(2);
  });
});

describe('WikiEngine.createOrUpdateFile — NFC/NFD path resolution (#173 Symptom A)', () => {
  it('resolves an existing file via directory scan when getAbstractFileByPath returns null', async () => {
    // Simulate macOS NFC/NFD normalization: the file exists in the vault but
    // getAbstractFileByPath returns null (the resolved path uses a different
    // Unicode normalization form from the stored filename).
    const h = createWikiEngineHarness({
      files: { 'wiki/sources/existing.md': `---\ntype: source\n---\n\nexisting content` },
      nfcNfdPaths: ['wiki/sources/existing.md'],
    });

    // The file is in the vault; nfcNfdPaths makes getAbstractFileByPath return
    // null for it. createOrUpdateFile should resolve it via resolveFileInVault
    // (directory-level scan, not full getMarkdownFiles) and call process().
    await h.engine.createOrUpdateFile('wiki/sources/existing.md', `---\ntype: source\n---\n\nupdated content`);

    // Content was updated (process was called, not create).
    expect(h.files.get('wiki/sources/existing.md')).toContain('updated content');

    // resolveFileInVault does a parent-directory listing, NOT a full
    // vault.getMarkdownFiles() scan — so vaultMarkdownScans must stay 0.
    expect(h.stats.vaultMarkdownScans).toBe(0);
  });

  it('still creates a new file normally when the path genuinely does not exist', async () => {
    const h = createWikiEngineHarness({});

    await h.engine.createOrUpdateFile('wiki/sources/new.md', 'fresh content');

    expect(h.files.get('wiki/sources/new.md')).toBe('fresh content');
    // A new file creation should not trigger vaultMarkdownScans either.
    expect(h.stats.vaultMarkdownScans).toBe(0);
  });
});
