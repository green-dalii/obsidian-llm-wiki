import { describe, it, expect } from 'vitest';
import { buildLintReport } from '../../../wiki/lint/report-builder';
import { LLMWikiSettings } from '../../../types';
import { ProgrammaticFindings } from '../../../wiki/lint/types';

function makeSettings(): LLMWikiSettings {
  return {
    wikiFolder: 'wiki',
    language: 'en',
    slugCase: 'lower',
    tagVocabularyMode: 'default',
  } as LLMWikiSettings;
}

function makeFindings(overrides: Partial<ProgrammaticFindings> = {}): ProgrammaticFindings {
  return {
    aliasDeficientPages: [],
    emptyPages: [],
    orphans: [],
    tagViolations: [],
    pollutedPages: [],
    deadLinks: [],
    ungroundedQuotes: [],
    hubLinkDensityIssues: [],
    sourcesNormalizedFiles: 0,
    sourcesNormalizedEntries: 0,
    doubleNestFixes: 0,
    ...overrides,
  };
}

describe('buildLintReport', () => {
  it('renders no-issues message when all findings are empty', () => {
    const report = buildLintReport({
      settings: makeSettings(),
      findings: makeFindings(),
      duplicates: [],
      contradictionsReport: '',
      cleanedLLM: '## LLM analysis\nLooks good.',
      elapsedSeconds: 5,
      totalPages: 10,
    });
    expect(report).toContain('10 pages total');
    expect(report).toContain('No duplicates');
    expect(report).toContain('Lint elapsed');
  });

  it('renders duplicates section when duplicates present', () => {
    const report = buildLintReport({
      settings: makeSettings(),
      findings: makeFindings(),
      duplicates: [{ target: 'wiki/entities/A.md', source: 'wiki/entities/B.md', reason: 'same name' }],
      contradictionsReport: '',
      cleanedLLM: 'OK',
      elapsedSeconds: 1,
      totalPages: 5,
    });
    expect(report).toContain('Duplicate pages');
    expect(report).toContain('[[entities/A]]');
    expect(report).toContain('[[entities/B]]');
  });

  it('renders dead links section', () => {
    const report = buildLintReport({
      settings: makeSettings(),
      findings: makeFindings({ deadLinks: [{ source: 'entities/X', target: 'entities/Missing' }] }),
      duplicates: [],
      contradictionsReport: '',
      cleanedLLM: 'OK',
      elapsedSeconds: 1,
      totalPages: 5,
    });
    expect(report).toContain('Dead links');
    expect(report).toContain('**entities/Missing**');
  });

  it('renders orphans section', () => {
    const report = buildLintReport({
      settings: makeSettings(),
      findings: makeFindings({ orphans: ['wiki/entities/Orphan.md'] }),
      duplicates: [],
      contradictionsReport: '',
      cleanedLLM: 'OK',
      elapsedSeconds: 1,
      totalPages: 5,
    });
    expect(report).toContain('Orphan pages');
    expect(report).toContain('[[entities/Orphan]]');
  });

  it('renders ungrounded quotes section', () => {
    const report = buildLintReport({
      settings: makeSettings(),
      findings: makeFindings({
        ungroundedQuotes: [
          { pagePath: 'wiki/entities/Foo.md', quote: 'fabricated', hasSourceLink: false },
        ],
      }),
      duplicates: [],
      contradictionsReport: '',
      cleanedLLM: 'OK',
      elapsedSeconds: 1,
      totalPages: 5,
    });
    expect(report).toContain('Ungrounded quotes');
    expect(report).toContain('fabricated');
  });

  it('renders tag violations section', () => {
    const report = buildLintReport({
      settings: makeSettings(),
      findings: makeFindings({
        tagViolations: [
          { path: 'wiki/entities/X.md', pageType: 'entity', title: 'X', currentTags: ['bogus'], invalidTags: ['bogus'] },
        ],
      }),
      duplicates: [],
      contradictionsReport: '',
      cleanedLLM: 'OK',
      elapsedSeconds: 1,
      totalPages: 5,
    });
    expect(report).toContain('out-of-vocabulary tags');
    expect(report).toContain('bogus');
  });

  it('marks dead links as duplicate-affected when target or source is a duplicate path', () => {
    const report = buildLintReport({
      settings: makeSettings(),
      findings: makeFindings({ deadLinks: [{ source: 'entities/X', target: 'entities/Y' }] }),
      duplicates: [{ target: 'wiki/entities/Y.md', source: 'wiki/entities/X.md', reason: 'same' }],
      contradictionsReport: '',
      cleanedLLM: 'OK',
      elapsedSeconds: 1,
      totalPages: 5,
    });
    expect(report).toContain('duplicate');
  });

  it('prepends aliases deficiency note when aliases missing', () => {
    const report = buildLintReport({
      settings: makeSettings(),
      findings: makeFindings({
        aliasDeficientPages: [{ path: 'wiki/entities/X.md', content: '', basename: 'X.md' }],
      }),
      duplicates: [],
      contradictionsReport: '',
      cleanedLLM: 'OK',
      elapsedSeconds: 1,
      totalPages: 5,
    });
    expect(report).toContain('Aliases missing');
  });
});

