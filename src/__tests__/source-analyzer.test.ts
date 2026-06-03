import { describe, it, expect } from 'vitest';
import { createMockContext, createMockFile } from './__mocks__/engine-context';
import { SourceAnalyzer } from '../wiki/source-analyzer';
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
): Promise<import('../types').SourceAnalysis | null> {
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
});