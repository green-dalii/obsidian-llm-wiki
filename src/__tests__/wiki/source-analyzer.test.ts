import { describe, it, expect, vi } from 'vitest';
import { createMockContext, createMockFile } from '../__support__/engine-context';
import { SourceAnalyzer, buildCompactSlugList } from '../../wiki/source-analyzer';
import { TFile } from 'obsidian';

// We can't instantiate TFile without Obsidian, so we test SourceAnalyzer
// by mocking its dependencies through createMockContext.
// Tests pass mock file objects as unknown as TFile — the SourceAnalyzer only
// reads file.path and file.basename from the parameter, which our mock provides.

const TEST_PATH = 'sources/test.md';
const GLOSSARY_PATH = 'sources/glossary.md';
const THEORY_PATH = 'sources/theory.md';
const DOC_PATH = 'sources/doc.md';
const EMPTY_PATH = 'sources/empty.md';

function mockAnalyze(
  vaultFiles: Record<string, string>,
  llmResponses: string[]
): SourceAnalyzer {
  const { ctx } = createMockContext({ vaultFiles, llmResponses });
  return new SourceAnalyzer(ctx);
}

function run(
  analyzer: SourceAnalyzer,
  path: string
): Promise<import('../../types').SourceAnalysis | null> {
  // The SourceAnalyzer only reads file.path and file.basename from the TFile.
  // Our mock provides both fields, so the cast is safe for testing.
  // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
  return analyzer.analyzeSource(createMockFile(path) as unknown as TFile);
}

describe('SourceAnalyzer', () => {
  it('returns null when first batch is unusable (no entities/concepts)', async () => {
    const a = mockAnalyze(
      { [TEST_PATH]: '# Test\nContent here.' },
      ['{"source_title": "Test", "summary": "Some summary"}']
    );
    expect(await run(a, TEST_PATH)).toBeNull();
  });

  it('proceeds when first batch has only entities (glossary case, PR #61)', async () => {
    const a = mockAnalyze(
      { [GLOSSARY_PATH]: '# Glossary\nTerm definitions here.' },
      [JSON.stringify({
        source_title: 'Glossary',
        summary: 'A glossary of terms.',
        entities: [{ name: 'TermA', type: 'other', summary: 'A term', mentions_in_source: [] }],
      })]
    );
    const result = await run(a, GLOSSARY_PATH);
    expect(result).not.toBeNull();
    expect(result!.entities).toHaveLength(1);
    expect(result!.entities[0].name).toBe('TermA');
    expect(result!.concepts).toHaveLength(0);
  });

  it('proceeds when first batch has only concepts', async () => {
    const a = mockAnalyze(
      { [THEORY_PATH]: '# Theory\nContent.' },
      [JSON.stringify({
        source_title: 'Theory',
        summary: 'A theory document.',
        concepts: [{ name: 'TheoryX', type: 'theory', summary: 'A theory', mentions_in_source: [] }],
      })]
    );
    const result = await run(a, THEORY_PATH);
    expect(result).not.toBeNull();
    expect(result!.concepts).toHaveLength(1);
    expect(result!.entities).toHaveLength(0);
  });

  it('extracts source_title and summary from first batch', async () => {
    const a = mockAnalyze(
      { [DOC_PATH]: '# Doc\nBody.' },
      [JSON.stringify({
        source_title: 'My Document',
        summary: 'This document covers important topics.',
        entities: [],
        concepts: [],
      })]
    );
    const result = await run(a, DOC_PATH);
    expect(result).not.toBeNull();
    expect(result!.source_title).toBe('My Document');
  });

  it('handles LLM returning empty arrays for both categories', async () => {
    const a = mockAnalyze(
      { [EMPTY_PATH]: '# Empty\nNothing useful here.' },
      [JSON.stringify({
        source_title: 'Empty',
        summary: 'No entities or concepts found.',
        entities: [],
        concepts: [],
      })]
    );
    const result = await run(a, EMPTY_PATH);
    expect(result).not.toBeNull();
  });

  it('returns null and never calls the LLM for blank / frontmatter-only sources (#164)', async () => {
    // Reproduction of the "Yinmin Zhong" bug: a blank prompt made small/local
    // models fabricate entities to satisfy the JSON schema. The guard must
    // short-circuit BEFORE any LLM call, for empty, whitespace-only, and
    // frontmatter-only files alike.
    for (const blank of ['', '   \n\n\t ', '---\ntags: [draft]\n---']) {
      const { ctx } = createMockContext({
        vaultFiles: { [EMPTY_PATH]: blank },
        llmResponses: [JSON.stringify({
          source_title: 'Hallucinated',
          summary: 'fabricated from nothing',
          entities: [{ name: 'Yinmin Zhong', type: 'person', summary: 'who?', mentions_in_source: [] }],
        })],
      });
      const spy = vi.spyOn(ctx.getClient()!, 'createMessage');
      const analyzer = new SourceAnalyzer(ctx);
      // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
      const result = await analyzer.analyzeSource(createMockFile(EMPTY_PATH) as unknown as TFile);
      expect(result).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it('hard-caps entities and concepts to customEntityLimit / customConceptLimit (#120)', async () => {
    // LLM returns 5 entities and 5 concepts, but limits are set to 2/2.
    // The hard cap must slice the accumulation before buildSourceAnalysis —
    // the prompt instruction alone is not enough since LLMs may ignore it.
    const { ctx } = createMockContext({
      vaultFiles: { [DOC_PATH]: '# Dense\nMany organisms and pathways.' },
      llmResponses: [JSON.stringify({
        source_title: 'Dense',
        summary: 'Many items.',
        entities: [
          { name: 'Alpha', type: 'other', summary: 'a', mentions_in_source: [] },
          { name: 'Beta',  type: 'other', summary: 'b', mentions_in_source: [] },
          { name: 'Gamma', type: 'other', summary: 'c', mentions_in_source: [] },
          { name: 'Delta', type: 'other', summary: 'd', mentions_in_source: [] },
          { name: 'Epsilon', type: 'other', summary: 'e', mentions_in_source: [] },
        ],
        concepts: [
          { name: 'One',   type: 'term', summary: '1', mentions_in_source: [], related_concepts: [] },
          { name: 'Two',   type: 'term', summary: '2', mentions_in_source: [], related_concepts: [] },
          { name: 'Three', type: 'term', summary: '3', mentions_in_source: [], related_concepts: [] },
          { name: 'Four',  type: 'term', summary: '4', mentions_in_source: [], related_concepts: [] },
          { name: 'Five',  type: 'term', summary: '5', mentions_in_source: [], related_concepts: [] },
        ],
      })],
      settings: { extractionGranularity: 'custom', customEntityLimit: 2, customConceptLimit: 2 },
    });
    const analyzer = new SourceAnalyzer(ctx);
    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
    const result = await analyzer.analyzeSource(createMockFile(DOC_PATH) as unknown as TFile);
    expect(result).not.toBeNull();
    expect(result!.entities).toHaveLength(2);
    expect(result!.concepts).toHaveLength(2);
    expect(result!.entities[0].name).toBe('Alpha');
    expect(result!.concepts[0].name).toBe('One');
  });
});

describe('buildCompactSlugList (#116)', () => {
  it('returns sorted slugs for all wiki pages except schema, index, and source itself', () => {
    const { ctx } = createMockContext({
      vaultFiles: {
        'sources/test.md': '# Test',
        'wiki/index.md': '# Index',
        'wiki/schema/config.md': '# Schema',
        'wiki/entities/Entity-One.md': '# Entity One',
        'wiki/concepts/Concept-Two.md': '# Concept Two',
      },
    });
    const slugs = buildCompactSlugList(ctx.app, 'wiki', 'sources/test.md');
    expect(slugs).toContain('entities/Entity-One');
    expect(slugs).toContain('concepts/Concept-Two');
    expect(slugs).not.toContain('index');
    expect(slugs).not.toContain('schema/config');
    expect(slugs).not.toContain('sources/test');
    const lines = slugs.split('\n');
    expect(lines).toEqual([...lines].sort());
  });

  it('injects the slug list into the analyzeSource prompt', async () => {
    const { ctx } = createMockContext({
      vaultFiles: {
        'sources/test.md': '# Test\nContent.',
        'wiki/entities/Existing-Page.md': '# Existing Page',
      },
      llmResponses: [JSON.stringify({
        source_title: 'Test',
        summary: 'A test.',
        entities: [{ name: 'Foo', type: 'other', summary: 'bar', mentions_in_source: [] }],
      })],
    });
    const spy = vi.spyOn(ctx.getClient()!, 'createMessage');
    const analyzer = new SourceAnalyzer(ctx);
    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
    await analyzer.analyzeSource(createMockFile('sources/test.md') as unknown as TFile);
    expect(spy).toHaveBeenCalled();
    const prompt = spy.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('entities/Existing-Page');
    expect(prompt).toContain('**Existing Wiki pages — use ONLY these exact paths when creating [[links]]:**');
  });
});