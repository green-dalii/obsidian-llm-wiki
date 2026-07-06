// Unit tests for the 8 pure helpers in render-state.ts.
//
// These helpers (maintenanceInsight, fixInsight, ingestInsight, otherInsight,
// computeKpiDeltas, matchesSearch, matchesFilter, matchesTimeRange,
// computeGlobalInsight) were not individually unit-tested in the original
// 1579-LOC history-modal.ts — they were only exercised through the top-level
// renderHistoryEntries() end-to-end tests. Splitting the file is the right
// moment to give each helper its own focused regression net.

import { describe, it, expect } from 'vitest';
import type { LogEntry } from '../../../core/log-parser';
import {
  maintenanceInsight,
  fixInsight,
  ingestInsight,
  otherInsight,
  computeKpiDeltas,
  matchesSearch,
  matchesFilter,
  matchesTimeRange,
  badgeForKind,
  kindLabelFor,
  computeGlobalInsight,
  deltaChip,
  formatBytesShort,
} from '../../../ui/history-modal/render-state';
import type { HistoryTexts } from '../../../ui/history-modal/types';

// Minimal HistoryTexts fixture (only fields the helpers actually touch).
const t: HistoryTexts = {
  historyModalSubtitle: '',
  historyReadError: '',
  historyEmpty: '',
  historyEntryKindIngest: 'ingest',
  historyEntryKindMaintenance: 'maintenance',
  historyEntryKindFix: 'fix',
  historyEntryKindOther: 'other',
  historyEntryTime: '',
  historyEntryTimeNoTime: '',
  historyEntrySource: '',
  historyEntrySourceUnknown: '',
  historyEntryCreatedLabel: '',
  historyEntryUpdatedLabel: '',
  historyEntryCreatedCount: '{count} created',
  historyEntryUpdatedCount: '{count} updated',
  historyEntryNoChanges: 'no changes',
  historyEntryContradictions: '',
  historyEntrySectionCreated: '',
  historyEntrySectionUpdated: '',
  historyEntrySectionContradictions: '',
  historyEntrySectionDetails: '',
  historyEntrySectionReport: '',
  historyEntryOpenPage: '',
  historyEntryDetailsNoContradictions: '',
  historySearchPlaceholder: '',
  historyFilterAll: '',
  historyFilterIngest: '',
  historyFilterMaintenance: '',
  historyFilterFix: '',
  historyFilterContradictions: '',
  historyRefreshButton: '',
  historyExpandDay: '',
  historyCollapseDay: '',
  historyShowMore: '',
  historyNoMatch: '',
  historyCloseButton: '',
  historyLimit: 50,
  historyBadgeIngestShort: '📥',
  historyBadgeMaintenanceShort: '🔍',
  historyBadgeFixShort: '🔧',
  historyBadgeOtherShort: '📌',
  historyKpiPages: 'pages',
  historyKpiDeadLinks: 'dead links',
  historyKpiOrphans: 'orphans',
  historyKpiEmpty: 'empty',
  historyKpiDuplicates: 'duplicates',
  historyKpiTagViolations: 'tag issues',
  historyKpiUnsourced: 'unsourced',
  historyKpiDuration: 'duration',
  historyKpiDurationSec: '{seconds}s',
  historySectionDeadLinks: '',
  historySectionTagViolations: '',
  historySectionOrphans: '',
  historySectionEmptyPages: '',
  historySectionLlmAnalysis: '',
  historyDeadLinkSource: '',
  historyDeadLinkTarget: '',
  historyOpenInLog: '',
  historyShowMoreItems: '',
  historyTrendUp: '↗ {delta}',
  historyTrendDown: '↘ {delta}',
  historyTrendSame: '→ same',
  historyChipContradiction: '',
  historyChipOutdated: '',
  historyChipMissing: '',
  historyChipStructure: '',
  historySeverityHigh: '',
  historySeverityMedium: '',
  historySeverityLow: '',
  historyPageTypeEntity: 'entity',
  historyPageTypeConcept: 'concept',
  historyPageTypeSource: 'source',
  historyGlobalInsight: 'Wiki: {dead}d {orphans}o {tags}t {duration}',
  historyGlobalInsightClean: 'clean',
  historyGlobalInsightNoData: 'no data',
  historyModalHeaderTitle: '',
  historyModalSubtitleWithCount: '',
  historyTimeRangeAll: '',
  historyTimeRange1d: '',
  historyTimeRange3d: '',
  historyTimeRange1w: '',
  historyTimeRange1m: '',
  historyTimeRangeCustom: '',
  historyCustomRangeFrom: '',
  historyCustomRangeTo: '',
  historyCustomRangeApply: '',
  historyCustomRangeClear: '',
  historyIngestTotal: '',
  historyIngestByType: '',
  historyIngestSource: '',
  historyIngestNoTimestamp: '',
  historyIngestFirstTime: '',
  historyIngestLatestTime: '',
};

const makeEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  kind: 'ingest',
  date: '2026-06-21',
  operation: 'test',
  createdPages: [],
  updatedPages: [],
  sections: [],
  details: [],
  ...overrides,
});

describe('maintenanceInsight', () => {
  it('falls back to operation name when kpi is missing', () => {
    const e = makeEntry({ kind: 'maintenance', operation: 'Wiki 维护报告' });
    expect(maintenanceInsight(e, t).primary).toBe('Wiki 维护报告');
    expect(maintenanceInsight(e, t).severity).toBe('none');
  });

  it('composes a list of present issues', () => {
    const e = makeEntry({
      kind: 'maintenance',
      kpi: { deadLinks: 3, orphans: 2, tagViolations: 1, totalPages: 50, durationSeconds: 5 },
    });
    const { primary } = maintenanceInsight(e, t);
    expect(primary).toContain('3 dead links');
    expect(primary).toContain('2 orphans');
    expect(primary).toContain('1 tag issues');
  });

  it('returns duration-only insight when all counters are zero', () => {
    const e = makeEntry({
      kind: 'maintenance',
      kpi: { deadLinks: 0, orphans: 0, tagViolations: 0, totalPages: 50, durationSeconds: 7 },
    });
    const { primary, severity } = maintenanceInsight(e, t);
    expect(primary).toContain('✓');
    expect(primary).toContain('7s');
    expect(severity).toBe('none');
  });

  it('marks severity=high when deadLinks > 10', () => {
    const e = makeEntry({
      kind: 'maintenance',
      kpi: { deadLinks: 11, totalPages: 100, durationSeconds: 5 },
    });
    expect(maintenanceInsight(e, t).severity).toBe('high');
  });

  it('marks severity=medium when deadLinks>0 but <=10 with other issues', () => {
    const e = makeEntry({
      kind: 'maintenance',
      kpi: { deadLinks: 3, orphans: 1, totalPages: 50, durationSeconds: 5 },
    });
    expect(maintenanceInsight(e, t).severity).toBe('medium');
  });

  it('marks severity=low when only duplicates or minor issues', () => {
    const e = makeEntry({
      kind: 'maintenance',
      kpi: { duplicates: 2, totalPages: 50, durationSeconds: 5 },
    });
    expect(maintenanceInsight(e, t).severity).toBe('low');
  });
});

describe('fixInsight', () => {
  it('falls back to operation name when no details', () => {
    const e = makeEntry({ kind: 'fix', operation: 'Lint — fixDeadLinks' });
    expect(fixInsight(e, t).primary).toBe('Lint — fixDeadLinks');
  });

  it('reports singular "1 item fixed" for one detail', () => {
    const e = makeEntry({
      kind: 'fix',
      operation: 'x',
      details: [{ isBullet: true, links: [], textWithoutLinks: '', raw: 'a' }],
    });
    expect(fixInsight(e, t).primary).toBe('1 item fixed');
  });

  it('reports plural "N items fixed" for many details', () => {
    const e = makeEntry({
      kind: 'fix',
      operation: 'x',
      details: [
        { isBullet: true, links: [], textWithoutLinks: '', raw: 'a' },
        { isBullet: true, links: [], textWithoutLinks: '', raw: 'b' },
        { isBullet: true, links: [], textWithoutLinks: '', raw: 'c' },
      ],
    });
    expect(fixInsight(e, t).primary).toBe('3 items fixed');
  });
});

describe('ingestInsight', () => {
  it('shows created/updated counts', () => {
    const e = makeEntry({ createdPages: ['a', 'b'], updatedPages: ['c'] });
    const { primary } = ingestInsight(e, t);
    expect(primary).toContain('2 created');
    expect(primary).toContain('1 updated');
  });

  it('appends duration when ingestMetrics present', () => {
    const e = makeEntry({
      createdPages: ['a'],
      ingestMetrics: { durationSec: 28 },
    });
    expect(ingestInsight(e, t).primary).toContain('28s');
  });

  it('falls back to "no changes" when no pages', () => {
    const e = makeEntry({});
    expect(ingestInsight(e, t).primary).toBe('no changes');
    expect(ingestInsight(e, t).severity).toBe('low');
  });
});

describe('otherInsight', () => {
  it('returns operation name with severity=none', () => {
    const e = makeEntry({ kind: 'other', operation: 'manual edit' });
    expect(otherInsight(e)).toEqual({ primary: 'manual edit', severity: 'none' });
  });
});

describe('computeKpiDeltas', () => {
  it('returns undefined when current entry has no kpi', () => {
    const e = makeEntry({ kind: 'maintenance' });
    expect(computeKpiDeltas([e], 0)).toBeUndefined();
  });

  it('returns delta=0 with prev=undefined when there is no prior maintenance entry', () => {
    const e = makeEntry({ kind: 'maintenance', kpi: { deadLinks: 5, totalPages: 10, durationSeconds: 3 } });
    const d = computeKpiDeltas([e], 0);
    expect(d?.deadLinks?.current).toBe(5);
    expect(d?.deadLinks?.prev).toBeUndefined();
    expect(d?.deadLinks?.delta).toBe(0);
  });

  it('computes deltas against the most recent earlier maintenance entry', () => {
    const prev = makeEntry({
      kind: 'maintenance',
      date: '2026-06-17',
      kpi: { deadLinks: 12, orphans: 2, totalPages: 38, durationSeconds: 7 },
    });
    const curr = makeEntry({
      kind: 'maintenance',
      date: '2026-06-21',
      kpi: { deadLinks: 19, orphans: 3, totalPages: 39, durationSeconds: 78 },
    });
    const d = computeKpiDeltas([prev, curr], 1);
    expect(d?.deadLinks?.delta).toBe(7);
    expect(d?.orphans?.delta).toBe(1);
    expect(d?.totalPages?.delta).toBe(1);
    expect(d?.durationSeconds?.delta).toBe(71);
  });

  it('skips non-maintenance entries when looking for prev', () => {
    const prev = makeEntry({ kind: 'maintenance', kpi: { deadLinks: 12, totalPages: 38, durationSeconds: 7 } });
    const ing = makeEntry({ kind: 'ingest' });
    const curr = makeEntry({ kind: 'maintenance', kpi: { deadLinks: 20, totalPages: 40, durationSeconds: 9 } });
    const d = computeKpiDeltas([prev, ing, curr], 2);
    expect(d?.deadLinks?.delta).toBe(8); // 20 - 12 (ingest is skipped)
  });
});

describe('matchesSearch', () => {
  const e = makeEntry({
    sourceTitle: 'machine.md',
    operation: 'ingest',
    createdPages: ['entities/Foo'],
    updatedPages: ['entities/Bar'],
    sections: [{ kind: 'tagViolation', heading: 'Tag', items: [
      { links: [{ path: 'sources/x' }], text: 'invalid document', raw: 'invalid document', severity: 'medium' },
    ] }],
  });

  it('matches against empty search (no filter)', () => {
    expect(matchesSearch(e, '')).toBe(true);
  });

  it('matches against sourceTitle case-insensitively', () => {
    expect(matchesSearch(e, 'MACHINE')).toBe(true);
  });

  it('matches against operation', () => {
    expect(matchesSearch(e, 'InGest')).toBe(true);
  });

  it('matches against created/updated pages', () => {
    expect(matchesSearch(e, 'foo')).toBe(true);
    expect(matchesSearch(e, 'bar')).toBe(true);
  });

  it('matches against section heading', () => {
    expect(matchesSearch(e, 'tag')).toBe(true);
  });

  it('matches against section item text and raw', () => {
    expect(matchesSearch(e, 'invalid')).toBe(true);
    expect(matchesSearch(e, 'document')).toBe(true);
  });

  it('matches against rawDetails', () => {
    const e2 = makeEntry({ rawDetails: 'extra context here' });
    expect(matchesSearch(e2, 'context')).toBe(true);
  });

  it('returns false when no field matches', () => {
    expect(matchesSearch(e, 'nonexistent')).toBe(false);
  });
});

describe('matchesFilter', () => {
  it('keeps all entries when filter=all', () => {
    expect(matchesFilter(makeEntry({ kind: 'ingest' }), 'all')).toBe(true);
  });
  it('keeps only ingest entries for filter=ingest', () => {
    expect(matchesFilter(makeEntry({ kind: 'ingest' }), 'ingest')).toBe(true);
    expect(matchesFilter(makeEntry({ kind: 'maintenance' }), 'ingest')).toBe(false);
  });
  it('keeps only maintenance entries for filter=maintenance', () => {
    expect(matchesFilter(makeEntry({ kind: 'maintenance' }), 'maintenance')).toBe(true);
    expect(matchesFilter(makeEntry({ kind: 'fix' }), 'maintenance')).toBe(false);
  });
  it('keeps only fix entries for filter=fix', () => {
    expect(matchesFilter(makeEntry({ kind: 'fix' }), 'fix')).toBe(true);
    expect(matchesFilter(makeEntry({ kind: 'maintenance' }), 'fix')).toBe(false);
  });
  it('keeps only ingest entries for filter=contradictions (legacy alias)', () => {
    // v3.1: 'contradictions' filter is an alias for ingest — historical behavior.
    expect(matchesFilter(makeEntry({ kind: 'ingest' }), 'contradictions')).toBe(true);
    expect(matchesFilter(makeEntry({ kind: 'fix' }), 'contradictions')).toBe(false);
  });
});

describe('matchesTimeRange', () => {
  const now = Date.parse('2026-06-21T12:00:00Z');
  it('keeps all entries when range=all', () => {
    const e = makeEntry({ date: '2020-01-01' });
    expect(matchesTimeRange(e, 'all', now)).toBe(true);
  });
  it('keeps entries within 1d window', () => {
    const e = makeEntry({ date: '2026-06-21' });
    expect(matchesTimeRange(e, '1d', now)).toBe(true);
  });
  it('drops entries outside 1d window', () => {
    const e = makeEntry({ date: '2026-06-19' });
    expect(matchesTimeRange(e, '1d', now)).toBe(false);
  });
  it('keeps entries within 1w window', () => {
    const e = makeEntry({ date: '2026-06-15' });
    expect(matchesTimeRange(e, '1w', now)).toBe(true);
  });
  it('drops entries outside 1w window', () => {
    const e = makeEntry({ date: '2026-06-01' });
    expect(matchesTimeRange(e, '1w', now)).toBe(false);
  });
  it('honors custom from/to (inclusive)', () => {
    const e = makeEntry({ date: '2026-06-15' });
    expect(matchesTimeRange(e, 'custom', now, '2026-06-10', '2026-06-20')).toBe(true);
    expect(matchesTimeRange(e, 'custom', now, '2026-06-16', '2026-06-20')).toBe(false);
  });
  it('treats empty custom range as a no-op (all pass)', () => {
    const e = makeEntry({ date: '2020-01-01' });
    expect(matchesTimeRange(e, 'custom', now, undefined, undefined)).toBe(true);
  });
});

describe('badgeForKind', () => {
  it('returns the right emoji for each kind', () => {
    expect(badgeForKind('ingest', t)).toBe('📥');
    expect(badgeForKind('maintenance', t)).toBe('🔍');
    expect(badgeForKind('fix', t)).toBe('🔧');
    expect(badgeForKind('other', t)).toBe('📌');
  });
});

describe('kindLabelFor', () => {
  it('returns the right localized label for each kind', () => {
    expect(kindLabelFor('ingest', t)).toBe('ingest');
    expect(kindLabelFor('maintenance', t)).toBe('maintenance');
    expect(kindLabelFor('fix', t)).toBe('fix');
    expect(kindLabelFor('other', t)).toBe('other');
  });
});

describe('computeGlobalInsight', () => {
  it('returns noData when no maintenance entry exists', () => {
    const entries = [makeEntry({ kind: 'ingest' })];
    const r = computeGlobalInsight(entries, t);
    expect(r).toEqual({ kind: 'noData', primary: 'no data' });
  });

  it('returns clean when latest maintenance has zero issues', () => {
    const entries = [makeEntry({
      kind: 'maintenance',
      kpi: { deadLinks: 0, orphans: 0, tagViolations: 0, totalPages: 50, durationSeconds: 5 },
    })];
    const r = computeGlobalInsight(entries, t);
    expect(r).toEqual({ kind: 'clean', primary: 'clean' });
  });

  it('returns withData with formatted counts when issues exist', () => {
    const entries = [makeEntry({
      kind: 'maintenance',
      kpi: { deadLinks: 19, orphans: 2, tagViolations: 1, totalPages: 38, durationSeconds: 78 },
    })];
    const r = computeGlobalInsight(entries, t);
    if (r.kind !== 'withData') throw new Error('expected withData');
    expect(r.primary).toContain('19');
    expect(r.primary).toContain('2');
    expect(r.primary).toContain('1');
    expect(r.primary).toContain('78s');
  });

  it('uses em-dash when duration is missing', () => {
    const entries = [makeEntry({
      kind: 'maintenance',
      kpi: { deadLinks: 1, totalPages: 10 },
    })];
    const r = computeGlobalInsight(entries, t);
    if (r.kind !== 'withData') throw new Error('expected withData');
    expect(r.primary).toContain('—');
  });
});

describe('deltaChip', () => {
  it('returns undefined when there is no delta object', () => {
    expect(deltaChip(undefined, t)).toBeUndefined();
  });
  it('returns undefined when there is no previous value', () => {
    expect(deltaChip({ current: 5, prev: undefined, delta: 0 }, t)).toBeUndefined();
  });
  it('returns "→ same" when delta is zero', () => {
    expect(deltaChip({ current: 5, prev: 5, delta: 0 }, t)).toBe('→ same');
  });
  it('returns "↗ +N" when delta is positive', () => {
    expect(deltaChip({ current: 8, prev: 5, delta: 3 }, t)).toBe('↗ +3');
  });
  it('returns "↘ -N" when delta is negative (raw value, no minus prefix in template)', () => {
    // t.historyTrendDown = '↘ {delta}' — caller passes the raw negative number.
    expect(deltaChip({ current: 4, prev: 7, delta: -3 }, t)).toBe('↘ -3');
  });
});

describe('formatBytesShort', () => {
  it('formats bytes (<1KB) without unit suffix', () => {
    expect(formatBytesShort(789)).toBe('789B');
  });
  it('formats kilobytes with 1 decimal', () => {
    expect(formatBytesShort(2048)).toBe('2.0KB');
    expect(formatBytesShort(1536)).toBe('1.5KB');
  });
  it('formats megabytes with 1 decimal', () => {
    expect(formatBytesShort(1024 * 1024)).toBe('1.0MB');
    expect(formatBytesShort(2.5 * 1024 * 1024)).toBe('2.5MB');
  });
});
