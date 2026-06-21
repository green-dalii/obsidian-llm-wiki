import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LogEntry } from '../../core/log-parser';

/**
 * HistoryModal rendering tests (Ingestion History Panel, #122).
 *
 * The modal is an Obsidian Modal subclass that:
 * - Accepts parsed LogEntry[] and renders them grouped by date
 * - Supports text search (sourceTitle + page paths)
 * - Supports filter (all / ingest-only / lint-only / has-contradictions)
 * - Each wiki-link shows an "Open" button that calls app.workspace.openLinkText
 * - Default limit: 50 entries; "Show more" button for the rest
 *
 * We test the rendering logic by extracting it from the Obsidian-specific
 * DOM construction into a testable pure function `renderHistoryEntries`.
 */

// ── Mock: Obsidian's App and related minimal interfaces ──
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _mockOpenLinkText = vi.fn();

const t = {
  historyModalSubtitle: 'Recent operations from {path}',
  historyReadError: 'Could not read log: {error}',
  historyEmpty: 'No operations yet.',
  historyEntryKindIngest: 'Ingest',
  historyEntryKindLint: 'Lint',
  historyEntryTime: '{date} · {time}',
  historyEntryTimeNoTime: '{date}',
  historyEntrySource: 'Source: {source}',
  historyEntrySourceUnknown: 'Untitled ingest',
  historyEntryCreatedLabel: 'Created',
  historyEntryUpdatedLabel: 'Updated',
  historyEntryCreatedCount: '{count} created',
  historyEntryUpdatedCount: '{count} updated',
  historyEntryNoChanges: 'No page changes',
  historyEntryContradictions: '⚠️ {count} contradiction(s)',
  historyEntrySectionCreated: 'Created pages',
  historyEntrySectionUpdated: 'Updated pages',
  historyEntrySectionContradictions: 'Contradictions',
  historyEntrySectionDetails: 'Details',
  historyEntryOpenPage: 'Open',
  historyEntryDetailsNoContradictions: 'No contradictions found',
  historySearchPlaceholder: '🔍 Search…',
  historyFilterAll: 'All',
  historyFilterIngest: 'Ingest only',
  historyFilterLint: 'Lint only',
  historyFilterContradictions: '⚠️ Has contradictions',
  historyRefreshButton: '⟳ Refresh',
  historyExpandDay: 'Click to expand',
  historyCollapseDay: 'Click to collapse',
  historyShowMore: 'Show {count} older entries',
  historyNoMatch: 'No operations match your search/filter.',
  historyCloseButton: 'Close',
  historyLimit: 50,
  historyBadgeIngestShort: 'I',
  historyBadgeLintShort: 'L',
};

const makeIngestEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  kind: 'ingest',
  date: '2026-06-21',
  operation: 'ingest',
  sourceTitle: 'my-source.md',
  createdPages: ['entities/Foo', 'concepts/Bar'],
  updatedPages: ['entities/Qux'],
  hasContradictions: false,
  contradictions: [],
  ...overrides,
});

const makeLintEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  kind: 'lint',
  date: '2026-06-21',
  time: '14:30',
  operation: 'Lint — fixPollutedSources',
  createdPages: [],
  updatedPages: [],
  hasContradictions: false,
  contradictions: [],
  details: 'Fixed 3 polluted pages.',
  ...overrides,
});

describe('renderHistoryEntries — pure rendering logic', () => {
  let renderHistoryEntries: (typeof import('../../ui/history-modal'))['renderHistoryEntries'];

  // Helper: assert result is 'groups' and return the groups array with proper type.
  function expectGroups(result: ReturnType<typeof renderHistoryEntries>) {
    expect(result.kind).toBe('groups');
    if (result.kind !== 'groups') throw new Error('Expected groups result');
    return result;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import so we can confirm the module exists (RED first)
    const mod = await import('../../ui/history-modal');
    renderHistoryEntries = mod.renderHistoryEntries;
  });

  it('returns an empty state message when no entries', () => {
    const result = renderHistoryEntries([], t, { search: '', filter: 'all' });
    expect(result.kind).toBe('empty');
  });

  it('groups entries by date', () => {
    const entries = [
      makeIngestEntry({ date: '2026-06-21' }),
      makeIngestEntry({ date: '2026-06-20' }),
    ];
    const result = renderHistoryEntries(entries, t, { search: '', filter: 'all' });
    const { groups } = expectGroups(result);
    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe('2026-06-21');
    expect(groups[1].date).toBe('2026-06-20');
  });

  it('filters by search text (case-insensitive match on sourceTitle)', () => {
    const entries = [
      makeIngestEntry({ sourceTitle: 'Machine Learning.md' }),
      makeIngestEntry({ sourceTitle: 'Neural Networks.md' }),
    ];
    const result = renderHistoryEntries(entries, t, { search: 'machine', filter: 'all' });
    const { groups } = expectGroups(result);
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[0].entries[0].sourceTitle).toBe('Machine Learning.md');
  });

  it('filters by search text matching page path', () => {
    const entries = [
      makeIngestEntry({ createdPages: ['entities/Foo'] }),
      makeIngestEntry({ createdPages: ['entities/Bar'] }),
    ];
    const result = renderHistoryEntries(entries, t, { search: 'Foo', filter: 'all' });
    const { groups } = expectGroups(result);
    expect(groups[0].entries).toHaveLength(1);
  });

  it('filters by kind: ingest only', () => {
    const entries = [makeIngestEntry(), makeLintEntry()];
    const result = renderHistoryEntries(entries, t, { search: '', filter: 'ingest' });
    const { groups } = expectGroups(result);
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[0].entries[0].kind).toBe('ingest');
  });

  it('filters by kind: lint only', () => {
    const entries = [makeIngestEntry(), makeLintEntry()];
    const result = renderHistoryEntries(entries, t, { search: '', filter: 'lint' });
    const { groups } = expectGroups(result);
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[0].entries[0].kind).toBe('lint');
  });

  it('filters to entries with contradictions only', () => {
    const entries = [
      makeIngestEntry({ hasContradictions: false }),
      makeIngestEntry({ hasContradictions: true, contradictions: ['claim vs source'] }),
    ];
    const result = renderHistoryEntries(entries, t, { search: '', filter: 'contradictions' });
    const { groups } = expectGroups(result);
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[0].entries[0].hasContradictions).toBe(true);
  });

  it('returns noMatch state when search produces zero results', () => {
    const entries = [makeIngestEntry()];
    const result = renderHistoryEntries(entries, t, { search: 'nonexistent', filter: 'all' });
    expect(result.kind).toBe('noMatch');
  });

  it('truncates to historyLimit and returns overflow count', () => {
    const entries = Array.from({ length: 60 }, (_, i) =>
      makeIngestEntry({ date: '2026-06-21', sourceTitle: `file-${i}.md` })
    );
    const result = renderHistoryEntries(entries, t, { search: '', filter: 'all' });
    const { overflow } = expectGroups(result);
    expect(overflow).toBe(10); // 60 - 50
  });

  it('renders a lint entry with details and time', () => {
    const entry = makeLintEntry({
      date: '2026-06-20',
      time: '09:15',
      operation: 'Lint — fixDeadLinks',
      details: 'Fixed 5 dead links',
    });
    const result = renderHistoryEntries([entry], t, { search: '', filter: 'all' });
    const { groups } = expectGroups(result);
    const rendered = groups[0].entries[0];
    expect(rendered.kind).toBe('lint');
    expect(rendered.time).toBe('09:15');
    expect(rendered.details).toBe('Fixed 5 dead links');
  });

  it('renders entry summary line with created/updated counts', () => {
    const entry = makeIngestEntry({
      createdPages: ['a', 'b', 'c'],
      updatedPages: ['d', 'e'],
    });
    const result = renderHistoryEntries([entry], t, { search: '', filter: 'all' });
    const { groups } = expectGroups(result);
    const rendered = groups[0].entries[0];
    expect(rendered.summary).toContain('3 created');
    expect(rendered.summary).toContain('2 updated');
  });

  it('renders contradiction count in summary', () => {
    const entry = makeIngestEntry({
      hasContradictions: true,
      contradictions: ['A vs B', 'C vs D'],
    });
    const result = renderHistoryEntries([entry], t, { search: '', filter: 'all' });
    const { groups } = expectGroups(result);
    const rendered = groups[0].entries[0];
    expect(rendered.summary).toContain('2 contradiction');
  });
});
