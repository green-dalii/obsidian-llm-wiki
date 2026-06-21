import { describe, it, expect } from 'vitest';
import { parseLogEntries } from '../../core/log-parser';

/**
 * Log parser tests for the Ingestion History Panel (#122).
 *
 * The log.md file is written by WikiEngine.updateLog and WikiEngine.logLintFix
 * with this structure:
 *
 *   # Wiki Operation Log\n\n
 *
 *   ## [YYYY-MM-DD] <operation> | <source_title>
 *
 *   **Created pages**: [[page1]], [[page2]]
 *
 *   **Updated pages**: [[page3]]
 *
 *   ## [YYYY-MM-DD HH:MM] <operation>
 *
 *   <details>
 *
 * Parser is a pure function — no IO. Tests cover happy paths + edge cases
 * (empty file, header only, malformed entries are tolerated not thrown).
 */

const HEADER = '# Wiki Operation Log\n\n';

describe('parseLogEntries — ingest entries (operation | source_title)', () => {
  it('parses a single ingest entry with created + updated pages', () => {
    const log = HEADER + [
      '## [2026-06-21] ingest | my-source.md',
      '',
      '**Created pages**: [[entities/Foo]], [[concepts/Bar]]',
      '',
      '**Updated pages**: [[entities/Baz]]',
      '',
    ].join('\n');

    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: 'ingest',
      date: '2026-06-21',
      operation: 'ingest',
      sourceTitle: 'my-source.md',
      createdPages: ['entities/Foo', 'concepts/Bar'],
      updatedPages: ['entities/Baz'],
      hasContradictions: false,
    });
  });

  it('parses multiple ingest entries in chronological order', () => {
    const log = HEADER + [
      '## [2026-06-19] ingest | first.md',
      '',
      '**Created pages**: [[entities/A]]',
      '',
      '**Updated pages**:',
      '',
      '## [2026-06-20] ingest | second.md',
      '',
      '**Created pages**: [[entities/B]], [[entities/C]]',
      '',
      '**Updated pages**: [[entities/D]]',
      '',
    ].join('\n');

    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(2);
    expect(entries[0].sourceTitle).toBe('first.md');
    expect(entries[1].sourceTitle).toBe('second.md');
    expect(entries[1].createdPages).toEqual(['entities/B', 'entities/C']);
  });

  it('parses ingest entry with contradictions block', () => {
    const log = HEADER + [
      '## [2026-06-21] ingest | my-source.md',
      '',
      '**Created pages**: [[entities/Foo]]',
      '',
      '**Updated pages**:',
      '',
      '**Contradictions found**:',
      '',
      '- claim A vs source X',
      '- claim B vs source Y',
      '',
    ].join('\n');

    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0].hasContradictions).toBe(true);
    expect(entries[0].contradictions).toEqual([
      'claim A vs source X',
      'claim B vs source Y',
    ]);
  });
});

describe('parseLogEntries — lint entries (with HH:MM timestamp)', () => {
  it('parses a lint-fix entry', () => {
    const log = HEADER + [
      '## [2026-06-21 14:30] Lint — fixPollutedSources',
      '',
      'Fixed 3 polluted pages:',
      '- page1 → page1-renamed',
      '',
    ].join('\n');

    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: 'lint',
      date: '2026-06-21',
      time: '14:30',
      operation: 'Lint — fixPollutedSources',
      details: 'Fixed 3 polluted pages:\n- page1 → page1-renamed',
    });
  });
});

describe('parseLogEntries — edge cases', () => {
  it('returns empty array for empty string', () => {
    expect(parseLogEntries('')).toEqual([]);
  });

  it('returns empty array for header-only content', () => {
    expect(parseLogEntries(HEADER)).toEqual([]);
  });

  it('tolerates a malformed H2 line (no brackets) by skipping it', () => {
    const log = HEADER + [
      '## This is not a log entry',
      '',
      '## [2026-06-21] ingest | valid.md',
      '',
      '**Created pages**: [[entities/Foo]]',
      '',
      '**Updated pages**:',
      '',
    ].join('\n');

    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0].sourceTitle).toBe('valid.md');
  });

  it('handles Chinese wiki log header (# Wiki 操作日志)', () => {
    // The header text is locale-specific; the parser should not require
    // an exact English header. Entry body uses English labels because
    // wiki-engine.ts writes EN labels regardless of wiki language — the
    // header text is the only locale-dependent part.
    const log = '# Wiki 操作日志\n\n' + [
      '## [2026-06-21] ingest | source.md',
      '',
      '**Created pages**: [[entities/SourceEntity]]',
      '',
      '**Updated pages**:',
      '',
    ].join('\n');

    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0].sourceTitle).toBe('source.md');
    expect(entries[0].createdPages).toEqual(['entities/SourceEntity']);
  });

  it('skips entry where Created/Updated pages line is missing', () => {
    const log = HEADER + [
      '## [2026-06-21] ingest | nofields.md',
      '',
      'Some random text without the expected fields',
      '',
      '## [2026-06-21] ingest | withfields.md',
      '',
      '**Created pages**: [[entities/OK]]',
      '',
      '**Updated pages**:',
      '',
    ].join('\n');

    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0].sourceTitle).toBe('withfields.md');
  });
});
