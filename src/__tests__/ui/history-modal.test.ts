import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LogEntry } from '../../core/log-parser';

/**
 * HistoryModal rendering tests (Operation History Panel #122 v3).
 *
 * Tests the pure rendering function `renderHistoryEntries`. Verifies:
 *  - 1-line insight (not raw operation name) drives the summary
 *  - Per-KPI delta vs previous maintenance entry
 *  - Per-section rendering dispatches by SectionKind
 *  - Global insight card from the most recent maintenance entry
 *  - Emoji badges (📥 🔍 🔧 📌) instead of single-char
 *  - Page-type grouping for ingest entries
 */

const t = {
  historyModalSubtitle: 'Recent operations from your LLM-Wiki',
  historyReadError: 'Could not read operation log: {error}',
  historyEmpty: 'No operations recorded yet.',
  historyEntryKindIngest: '📥 Ingest',
  historyEntryKindMaintenance: '🔍 Maintenance',
  historyEntryKindFix: '🔧 Fix',
  historyEntryKindOther: '📌 Operation',
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
  historyEntrySectionReport: 'Report findings',
  historyEntryOpenPage: 'Open',
  historyEntryDetailsNoContradictions: 'No contradictions found',
  historySearchPlaceholder: '🔍 Search…',
  historyFilterAll: 'All',
  historyFilterIngest: 'Ingest only',
  historyFilterMaintenance: 'Maintenance only',
  historyFilterFix: 'Fix only',
  historyFilterContradictions: '⚠️ Has contradictions',
  historyRefreshButton: '⟳ Refresh',
  historyExpandDay: 'Click to expand',
  historyCollapseDay: 'Click to collapse',
  historyShowMore: 'Show {count} older entries',
  historyNoMatch: 'No operations match your search/filter.',
  historyCloseButton: 'Close',
  historyLimit: 50,
  historyBadgeIngestShort: '📥',
  historyBadgeMaintenanceShort: '🔍',
  historyBadgeFixShort: '🔧',
  historyBadgeOtherShort: '📌',
  historyKpiPages: 'Pages',
  historyKpiDeadLinks: 'Dead links',
  historyKpiOrphans: 'Orphans',
  historyKpiEmpty: 'Empty',
  historyKpiDuplicates: 'Duplicates',
  historyKpiTagViolations: 'Tag issues',
  historyKpiUnsourced: 'Unsourced',
  historyKpiDuration: 'Lint time',
  historyKpiDurationSec: '{seconds}s',
  historySectionDeadLinks: 'Dead links ({count})',
  historySectionTagViolations: 'Tag issues ({count})',
  historySectionOrphans: 'Orphan pages ({count})',
  historySectionEmptyPages: 'Empty pages ({count})',
  historySectionLlmAnalysis: 'LLM analysis ({count})',
  historyDeadLinkSource: 'Source',
  historyDeadLinkTarget: 'Missing',
  historyOpenInLog: 'Open in log.md',
  historyShowMoreItems: 'Show {count} more',
  historyTrendUp: '↗ +{delta}',
  historyTrendDown: '↘ {delta}',
  historyTrendSame: '→ same',
  historyChipContradiction: 'Contradiction',
  historyChipOutdated: 'Outdated',
  historyChipMissing: 'Missing',
  historyChipStructure: 'Structure',
  historySeverityHigh: 'High',
  historySeverityMedium: 'Medium',
  historySeverityLow: 'Low',
  historyPageTypeEntity: '📦 entity',
  historyPageTypeConcept: '💡 concept',
  historyPageTypeSource: '📄 source',
  historyGlobalInsight: 'Your Wiki has {dead} dead link(s), {orphans} orphan(s), and {tags} tag issue(s). Last Lint took {duration}.',
  historyGlobalInsightClean: 'Your Wiki is clean.',
  historyGlobalInsightNoData: 'No maintenance reports yet.',
  historyModalHeaderTitle: 'Operation History',
  historyModalSubtitleWithCount: 'Recent operations from your LLM-Wiki · {count} entries',
  historyTimeRangeAll: 'All time',
  historyTimeRange1d: 'Past day',
  historyTimeRange3d: 'Past 3 days',
  historyTimeRange1w: 'Past week',
  historyTimeRange1m: 'Past month',
  historyIngestTotal: 'Total pages',
  historyIngestByType: 'By type',
  historyIngestSource: 'Source file',
  historyIngestNoTimestamp: 'No timestamp',
  historyIngestFirstTime: 'First ingest',
  historyIngestLatestTime: 'Latest ingest',
  historyTimeRangeCustom: 'Custom range',
  historyCustomRangeFrom: 'From',
  historyCustomRangeTo: 'To',
  historyCustomRangeApply: 'Apply',
  historyCustomRangeClear: 'Clear',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unused = vi.fn();

const makeIngestEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  kind: 'ingest',
  date: '2026-06-21',
  operation: 'ingest',
  sourceTitle: 'my-source.md',
  createdPages: ['entities/Foo', 'concepts/Bar'],
  updatedPages: ['entities/Qux'],
  sections: [],
  details: [],
  ...overrides,
});

const makeMaintenanceEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  kind: 'maintenance',
  date: '2026-06-21',
  time: '14:30',
  operation: 'Wiki 维护报告',
  createdPages: [],
  updatedPages: [],
  sections: [],
  details: [],
  kpi: { totalPages: 38, deadLinks: 19, orphans: 2, durationSeconds: 7 },
  ...overrides,
});

const makeFixEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  kind: 'fix',
  date: '2026-06-21',
  time: '14:30',
  operation: 'Lint — fixPollutedSources',
  createdPages: [],
  updatedPages: [],
  sections: [],
  details: [
    { isBullet: true, links: [{ path: 'entities/Foo' }], textWithoutLinks: ': added 3 aliases', raw: '- [[entities/Foo]]: added 3 aliases' },
  ],
  ...overrides,
});

describe('renderHistoryEntries — insight-driven (not log dump)', () => {
  let renderHistoryEntries: (typeof import('../../ui/history-modal'))['renderHistoryEntries'];

  function expectGroups(result: ReturnType<typeof renderHistoryEntries>) {
    expect(result.kind).toBe('groups');
    if (result.kind !== 'groups') throw new Error('Expected groups result');
    return result;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../ui/history-modal');
    renderHistoryEntries = mod.renderHistoryEntries;
  });

  it('returns empty state when no entries', () => {
    const r = renderHistoryEntries([], t, { search: '', filter: 'all' });
    expect(r.kind).toBe('empty');
  });

  it('groups entries by date (most recent first)', () => {
    const entries = [
      makeIngestEntry({ date: '2026-06-21' }),
      makeIngestEntry({ date: '2026-06-20' }),
    ];
    const { groups } = expectGroups(renderHistoryEntries(entries, t, { search: '', filter: 'all' }));
    expect(groups.map((g) => g.date)).toEqual(['2026-06-21', '2026-06-20']);
  });

  // ── INSIGHT LINE (the core change vs v2) ──

  it('replaces raw operation name with 1-line insight on maintenance entries', () => {
    // User feedback: "operation: Wiki 维护报告" tells you nothing.
    // v3 should show "19 Dead links · 2 Orphans" instead.
    const entry = makeMaintenanceEntry({
      kpi: { totalPages: 38, deadLinks: 19, orphans: 2, durationSeconds: 7 },
    });
    const { groups } = expectGroups(renderHistoryEntries([entry], t, { search: '', filter: 'maintenance' }));
    const rendered = groups[0].entries[0];
    expect(rendered.insight.primary).toContain('19 Dead links');
    expect(rendered.insight.primary).toContain('2 Orphans');
    expect(rendered.insight.severity).toBe('high'); // >10 dead links = high
  });

  it('shows severity=medium for maintenance with <10 dead links but some orphans', () => {
    const entry = makeMaintenanceEntry({
      kpi: { totalPages: 50, deadLinks: 3, orphans: 5, durationSeconds: 12 },
    });
    const { groups } = expectGroups(renderHistoryEntries([entry], t, { search: '', filter: 'maintenance' }));
    expect(groups[0].entries[0].insight.severity).toBe('medium');
  });

  it('shows positive insight when maintenance has 0 issues', () => {
    const entry = makeMaintenanceEntry({
      kpi: { totalPages: 50, deadLinks: 0, orphans: 0, durationSeconds: 5 },
    });
    const { groups } = expectGroups(renderHistoryEntries([entry], t, { search: '', filter: 'maintenance' }));
    const insight = groups[0].entries[0].insight;
    expect(insight.primary).toContain('5s');
    expect(insight.severity).toBe('none');
  });

  it('replaces raw operation name with item count on fix entries', () => {
    const entry = makeFixEntry({
      details: [
        { isBullet: true, links: [{ path: 'a' }], textWithoutLinks: '', raw: '- [[a]] fixed' },
        { isBullet: true, links: [{ path: 'b' }], textWithoutLinks: '', raw: '- [[b]] fixed' },
        { isBullet: true, links: [{ path: 'c' }], textWithoutLinks: '', raw: '- [[c]] fixed' },
      ],
    });
    const { groups } = expectGroups(renderHistoryEntries([entry], t, { search: '', filter: 'fix' }));
    expect(groups[0].entries[0].insight.primary).toContain('3 item');
  });

  it('shows "X created · Y updated" insight on ingest entries', () => {
    const entry = makeIngestEntry({ createdPages: ['a', 'b'], updatedPages: ['c'] });
    const { groups } = expectGroups(renderHistoryEntries([entry], t, { search: '', filter: 'all' }));
    const insight = groups[0].entries[0].insight;
    expect(insight.primary).toContain('2 created');
    expect(insight.primary).toContain('1 updated');
  });

  // ── DELTAS (the trend story) ──

  it('computes per-KPI delta vs previous maintenance entry', () => {
    const prev = makeMaintenanceEntry({
      date: '2026-06-17',
      time: '18:55',
      kpi: { totalPages: 38, deadLinks: 12, orphans: 2, durationSeconds: 7 },
    });
    const curr = makeMaintenanceEntry({
      date: '2026-06-21',
      time: '14:30',
      kpi: { totalPages: 39, deadLinks: 19, orphans: 3, durationSeconds: 78 },
    });
    const { groups } = expectGroups(renderHistoryEntries([prev, curr], t, { search: '', filter: 'maintenance' }));
    // groups are date-sorted desc, so curr (2026-06-21) is first.
    const rendered = groups[0].entries[0];
    expect(rendered.kpiDeltas?.deadLinks?.delta).toBe(7); // 19 - 12
    expect(rendered.kpiDeltas?.orphans?.delta).toBe(1);
    expect(rendered.kpiDeltas?.totalPages?.delta).toBe(1);
    expect(rendered.kpiDeltas?.durationSeconds?.delta).toBe(71);
  });

  // ── GLOBAL INSIGHT (top of modal) ──

  it('emits globalInsight=clean when no issues', () => {
    const entry = makeMaintenanceEntry({
      kpi: { totalPages: 50, deadLinks: 0, orphans: 0, tagViolations: 0, durationSeconds: 5 },
    });
    const result = renderHistoryEntries([entry], t, { search: '', filter: 'all' });
    if (result.kind !== 'groups') throw new Error('expected groups');
    expect(result.globalInsight?.kind).toBe('clean');
    expect(result.globalInsight?.primary).toContain('clean');
  });

  it('emits globalInsight=withData with dead/orphan/tag counts', () => {
    const entry = makeMaintenanceEntry({
      kpi: { totalPages: 38, deadLinks: 19, orphans: 2, tagViolations: 1, durationSeconds: 78 },
    });
    const result = renderHistoryEntries([entry], t, { search: '', filter: 'all' });
    if (result.kind !== 'groups') throw new Error('expected groups');
    expect(result.globalInsight?.kind).toBe('withData');
    expect(result.globalInsight?.primary).toContain('19');
    expect(result.globalInsight?.primary).toContain('78s');
  });

  // ── EMOJI BADGES (universal, not cryptic chars) ──

  it('uses universal emoji badges for each kind', () => {
    const entries = [
      makeIngestEntry(),
      makeMaintenanceEntry(),
      makeFixEntry(),
    ];
    const { groups } = expectGroups(renderHistoryEntries(entries, t, { search: '', filter: 'all' }));
    // groups are date-sorted desc; all 3 have same date so order matches input.
    const badges = groups[0].entries.map((e) => e.badge);
    expect(badges).toContain('📥');
    expect(badges).toContain('🔍');
    expect(badges).toContain('🔧');
  });

  it('uses kindLabel with emoji prefix + localized name', () => {
    const entry = makeMaintenanceEntry();
    const { groups } = expectGroups(renderHistoryEntries([entry], t, { search: '', filter: 'all' }));
    expect(groups[0].entries[0].kindLabel).toContain('🔍');
  });

  // ── STRUCTURED SECTION RENDERING ──

  it('preserves structured SectionItem[] on maintenance entries (deadLinks)', () => {
    const entry = makeMaintenanceEntry({
      sections: [
        {
          kind: 'deadLinks',
          heading: 'Dead links',
          items: [
            {
              links: [{ path: 'sources/x' }],
              text: '→ concepts/y',
              raw: '- [[sources/x]] → **concepts/y**',
              targetPage: 'concepts/y',
              severity: 'high',
            },
          ],
        },
      ],
    });
    const { groups } = expectGroups(renderHistoryEntries([entry], t, { search: '', filter: 'maintenance' }));
    expect(groups[0].entries[0].sections[0].kind).toBe('deadLinks');
    expect(groups[0].entries[0].sections[0].items[0].targetPage).toBe('concepts/y');
  });

  // ── FILTER & SEARCH ──

  it('filters by maintenance kind', () => {
    const r = renderHistoryEntries(
      [makeIngestEntry(), makeMaintenanceEntry()],
      t,
      { search: '', filter: 'maintenance' },
    );
    const { groups } = expectGroups(r);
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[0].entries[0].kind).toBe('maintenance');
  });

  it('returns noMatch when search produces zero results', () => {
    const r = renderHistoryEntries(
      [makeIngestEntry({ sourceTitle: 'machine.md' })],
      t,
      { search: 'nonexistent', filter: 'all' },
    );
    expect(r.kind).toBe('noMatch');
  });

  it('matches search inside section items', () => {
    const entry = makeMaintenanceEntry({
      sections: [{
        kind: 'tagViolation', heading: 'Tag issues',
        items: [{ links: [{ path: 'sources/x' }], text: 'invalid: document', raw: '- [[sources/x]] invalid: document', severity: 'medium' }],
      }],
    });
    const r = renderHistoryEntries([entry], t, { search: 'invalid', filter: 'all' });
    expect(r.kind).toBe('groups');
  });

  // ── PAGINATION ──

  it('truncates to historyLimit and returns overflow count', () => {
    const entries = Array.from({ length: 60 }, (_, i) =>
      makeIngestEntry({ date: '2026-06-21', sourceTitle: `file-${i}.md` })
    );
    const { overflow } = expectGroups(renderHistoryEntries(entries, t, { search: '', filter: 'all' }));
    expect(overflow).toBe(10);
  });
});
