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
  it('rejects an unsupported file type without creating pages', async () => {
    const h = createWikiEngineHarness({ files: { 'sources/diagram.pdf': 'not real text' } });
    await expect(h.engine.ingestSource(sourceFile('sources/diagram.pdf'))).resolves.toBeUndefined();
    expect(h.reports.at(-1)?.rejectedFiles?.[0]?.reason).toBe('incompatible-type');
    expect(wikiPagesWritten(h.writtenPaths)).toEqual([]);
    expect(h.stats.llmCalls).toBe(0);
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
