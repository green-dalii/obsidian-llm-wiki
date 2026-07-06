// jsdom-based unit tests for the complex renderer modules.
//
// The 22 private methods in the original HistoryModal class were not
// individually unit-tested. Splitting the file is the right moment to give
// the complex ones (regex parsing, table construction, grouping) their own
// regression net. Simple renderers (renderSectionTitle, renderCloseFooter)
// are tested by integration; complex ones are tested here with jsdom.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import type { App } from 'obsidian';
import { renderLineWithLinks, renderOpenInLogLink } from '../../../ui/history-modal/renderers/link-helpers';
import { renderGlobalInsight } from '../../../ui/history-modal/renderers/global-insight';
import { renderDeadLinkTable, renderDeadLinkSection } from '../../../ui/history-modal/renderers/dead-link-table';
import { renderLlmAnalysisSection, renderLlmItems } from '../../../ui/history-modal/renderers/llm-analysis';
import { renderPageTypeGroup, renderIngestMetricCards, renderIngestDetails } from '../../../ui/history-modal/renderers/ingest-details';
import { renderEntry } from '../../../ui/history-modal/renderers/entry';
import { renderCriticalKpiCards, renderMaintenanceDetails, renderReportSection } from '../../../ui/history-modal/renderers/maintenance-details';
import type { HistoryTexts, RenderedEntry } from '../../../ui/history-modal/types';
import type { ReportSection } from '../../../core/log-parser';

// Minimal HistoryTexts fixture for renderer tests.
const t: HistoryTexts = {
  historyModalSubtitle: '',
  historyReadError: '',
  historyEmpty: '',
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
  historyEntryContradictions: '',
  historyEntrySectionCreated: 'Created pages',
  historyEntrySectionUpdated: 'Updated pages',
  historyEntrySectionContradictions: '',
  historyEntrySectionDetails: 'Details',
  historyEntrySectionReport: 'Report findings',
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
  historyTrendUp: '↗ {delta}',
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
  historyGlobalInsight: 'Wiki: {dead} dead',
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
  historyIngestTotal: 'Total pages',
  historyIngestByType: 'By type',
  historyIngestSource: 'Source file',
  historyIngestNoTimestamp: 'No timestamp',
  historyIngestFirstTime: 'First',
  historyIngestLatestTime: 'Latest',
};

function makeCtx(openLinkText = vi.fn().mockResolvedValue(undefined)) {
  const app = {
    workspace: { openLinkText },
  } as unknown as App;
  return { app, logPath: 'wiki/log.md', openLinkText };
}

/**
 * Shape of the `createEl` / `createDiv` / `createSpan` options that
 * Obsidian's HTMLElement extensions accept. The renderers pass these
 * option objects to the production code; the test polyfill mirrors the
 * shape but only honors the fields the renderers actually use.
 */
interface ObsidianCreateOptions {
  cls?: string;
  text?: string;
  type?: string;
  placeholder?: string;
  href?: string;
  value?: string;
  attr?: {
    style?: string;
  };
}

/**
 * Extend jsdom's HTMLElement.prototype with the createDiv / createEl /
 * createSpan / appendText / empty methods that Obsidian's HTMLElement adds.
 * The renderers call these helper methods instead of
 * `document.createElement` + `appendChild` so the production code can be
 * exercised end-to-end in tests.
 *
 * Installed on the per-window prototype so each jsdom instance has its
 * own copy (no leakage across tests).
 */
function installObsidianDomHelpers(win: { HTMLElement: { prototype: unknown } }, doc: Document): void {
  type ObsidianElement = HTMLElement & {
    createDiv(opts?: ObsidianCreateOptions): HTMLDivElement;
    createEl(tag: string, opts?: ObsidianCreateOptions): HTMLElement;
    createSpan(opts?: ObsidianCreateOptions): HTMLSpanElement;
    appendText(text: string): void;
    empty(): void;
  };
  // Declare as method on Object.prototype (functions, not arrow) so the
  // installs can coexist with the prototype's existing Obsidian-style
  // createEl overload type. Using direct assignment with explicit-shape
  // functions satisfies both jsdom HTMLElement and ObsidianElement types.
  const proto = win.HTMLElement.prototype as Record<string, unknown>;

  function createDiv(this: ObsidianElement, opts: ObsidianCreateOptions = {}): HTMLDivElement {
    const div = doc.createElement('div');
    if (opts.cls) div.className = opts.cls;
    if (opts.text) div.textContent = opts.text;
    if (opts.attr?.style) div.setAttribute('style', opts.attr.style);
    this.appendChild(div);
    return div;
  }

  function createEl(this: ObsidianElement, tag: string, opts: ObsidianCreateOptions = {}): HTMLElement {
    const el = doc.createElement(tag);
    if (opts.cls) el.className = opts.cls;
    if (opts.text) el.textContent = opts.text;
    if (opts.type !== undefined) el.setAttribute('type', opts.type);
    if (opts.placeholder !== undefined) el.setAttribute('placeholder', opts.placeholder);
    if (opts.href !== undefined) el.setAttribute('href', opts.href);
    if (opts.value !== undefined) el.setAttribute('value', opts.value);
    if (opts.attr?.style) el.setAttribute('style', opts.attr.style);
    this.appendChild(el);
    return el;
  }

  function createSpan(this: ObsidianElement, opts: ObsidianCreateOptions = {}): HTMLSpanElement {
    const span = doc.createElement('span');
    if (opts.text) span.textContent = opts.text;
    if (opts.attr?.style) span.setAttribute('style', opts.attr.style);
    this.appendChild(span);
    return span;
  }

  function appendText(this: ObsidianElement, text: string): void {
    this.appendChild(doc.createTextNode(text));
  }

  function empty(this: ObsidianElement): void {
    while (this.firstChild) this.removeChild(this.firstChild);
  }

  proto.createDiv = createDiv;
  proto.createEl = createEl;
  proto.createSpan = createSpan;
  proto.appendText = appendText;
  proto.empty = empty;
}

let body: HTMLElement;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
  // eslint-disable-next-line obsidianmd/no-global-this
  globalThis.document = dom.window.document;
  // eslint-disable-next-line obsidianmd/no-global-this
  (globalThis as Record<string, unknown>).activeDocument = dom.window.document;
  installObsidianDomHelpers(dom.window, dom.window.document);
  body = dom.window.document.getElementById('root')!;
});

afterEach(() => {
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).document;
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).activeDocument;
});

describe('renderLineWithLinks', () => {
  it('renders plain text without links as a text node', () => {
    const p = body.createEl('p');
    renderLineWithLinks(p, 'no links here', makeCtx());
    expect(p.textContent).toBe('no links here');
    expect(p.querySelectorAll('a').length).toBe(0);
  });

  it('replaces [[path]] with a clickable <a>', () => {
    const p = body.createEl('p');
    renderLineWithLinks(p, 'see [[entities/Foo]] for details', makeCtx());
    const a = p.querySelector('a');
    expect(a?.textContent).toBe('entities/Foo');
    expect(p.textContent).toBe('see entities/Foo for details');
  });

  it('uses alias when [[path|alias]] is provided', () => {
    const p = body.createEl('p');
    renderLineWithLinks(p, '[[entities/Foo|the Foo]]', makeCtx());
    const a = p.querySelector('a');
    expect(a?.textContent).toBe('the Foo');
  });

  it('handles multiple links in one line', () => {
    const p = body.createEl('p');
    renderLineWithLinks(p, '[[a]] and [[b]] and [[c]]', makeCtx());
    const anchors = p.querySelectorAll('a');
    expect(anchors.length).toBe(3);
    expect(anchors[0]?.textContent).toBe('a');
    expect(anchors[1]?.textContent).toBe('b');
    expect(anchors[2]?.textContent).toBe('c');
  });

  it('click handler calls openLinkText with the path and logPath', () => {
    const openLinkText = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx(openLinkText);
    const p = body.createEl('p');
    renderLineWithLinks(p, '[[entities/Foo]]', ctx);
    const a = p.querySelector('a')!;
    a.click()
    expect(openLinkText).toHaveBeenCalledWith('entities/Foo', 'wiki/log.md');
  });

  it('strips #anchor from link path', () => {
    const p = body.createEl('p');
    renderLineWithLinks(p, '[[entities/Foo#section-1]]', makeCtx());
    const a = p.querySelector('a')!;
    a.click()
    expect(a.textContent).toBe('entities/Foo');
  });
});

describe('renderOpenInLogLink', () => {
  it('renders a link that opens the log path', () => {
    const openLinkText = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx(openLinkText);
    const div = body.createDiv();
    renderOpenInLogLink(div, t, ctx);
    const a = div.querySelector('a')!;
    expect(a.textContent).toBe('Open in log.md');
    a.click()
    expect(openLinkText).toHaveBeenCalledWith('wiki/log.md', '');
  });
});

describe('renderGlobalInsight', () => {
  it('renders ✅ icon and success border for clean', () => {
    renderGlobalInsight(body, { kind: 'clean', primary: 'Wiki is clean' }, t);
    expect(body.textContent).toContain('✅');
    expect(body.textContent).toContain('Wiki is clean');
  });

  it('renders ℹ️ icon and faint border for noData', () => {
    renderGlobalInsight(body, { kind: 'noData', primary: 'No data' }, t);
    expect(body.textContent).toContain('ℹ️');
  });

  it('renders ⚠️ icon and warning border for withData', () => {
    renderGlobalInsight(body, { kind: 'withData', primary: '19 dead' }, t);
    expect(body.textContent).toContain('⚠️');
  });
});

describe('renderDeadLinkTable', () => {
  it('renders a 3-column table (Source → Missing)', () => {
    const section: ReportSection = {
      kind: 'deadLinks',
      heading: 'Dead links',
      items: [
        { links: [{ path: 'sources/x' }], text: '→ concepts/y', raw: '- [[sources/x]] → **concepts/y**', targetPage: 'concepts/y', severity: 'high' },
      ],
    };
    renderDeadLinkTable(body, section.items, t, makeCtx());
    const table = body.querySelector('table')!;
    const headers = table.querySelectorAll('th');
    expect(headers.length).toBe(3);
    expect(headers[0]?.textContent).toBe('Source');
    expect(headers[2]?.textContent).toBe('Missing');
  });

  it('uses raw text as target when targetPage is missing', () => {
    const section: ReportSection = {
      kind: 'deadLinks', heading: 'Dead links',
      items: [
        { links: [{ path: 'sources/x' }], text: 'raw text', raw: 'sources/x → raw text', severity: 'high' },
      ],
    };
    renderDeadLinkTable(body, section.items, t, makeCtx());
    const lastCells = body.querySelectorAll('tbody tr td:last-child');
    // targetPage is missing → falls back to the entire `raw` field (preserves
    // the source → target arrow for visual clarity).
    expect(lastCells[0]?.textContent).toBe('sources/x → raw text');
  });
});

describe('renderDeadLinkSection', () => {
  it('renders ✓ when section is empty', () => {
    const section: ReportSection = { kind: 'deadLinks', heading: 'Dead', items: [] };
    renderDeadLinkSection(body, section, t, makeCtx());
    expect(body.textContent).toContain('✓');
  });

  it('renders inline table when item count <= 10', () => {
    const section: ReportSection = {
      kind: 'deadLinks', heading: 'Dead',
      items: [
        { links: [{ path: 'sources/x' }], text: '→ concepts/y', raw: '[[sources/x]] → concepts/y', targetPage: 'concepts/y', severity: 'high' },
      ],
    };
    renderDeadLinkSection(body, section, t, makeCtx());
    expect(body.querySelector('table')).toBeTruthy();
    // No <details> wrapper
    expect(body.querySelector('details')).toBeNull();
  });

  it('collapses by default when item count > 10', () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      links: [{ path: `sources/x${i}` }], text: `→ concepts/y${i}`,
      raw: `[[sources/x${i}]] → concepts/y${i}`,
      targetPage: `concepts/y${i}`, severity: 'high' as const,
    }));
    renderDeadLinkSection(body, { kind: 'deadLinks', heading: 'Dead', items }, t, makeCtx());
    expect(body.querySelector('details')).toBeTruthy();
    expect(body.textContent).toContain('Show 15 more');
  });
});

describe('renderLlmAnalysisSection', () => {
  it('groups items by llmType and renders one chip per group', () => {
    const section: ReportSection = {
      kind: 'llmAnalysis', heading: 'LLM analysis',
      items: [
        { links: [], text: 'outdated A', raw: 'outdated A', llmType: '过时', severity: 'medium' },
        { links: [], text: 'outdated B', raw: 'outdated B', llmType: '过时', severity: 'medium' },
        { links: [], text: 'missing C', raw: 'missing C', llmType: '缺失', severity: 'low' },
      ],
    };
    renderLlmAnalysisSection(body, section, t, makeCtx());
    expect(body.textContent).toContain('Outdated');
    expect(body.textContent).toContain('Missing');
    expect(body.textContent).toContain('2');
    expect(body.textContent).toContain('1');
  });

  it('uses English fallbacks for llmType keywords', () => {
    const section: ReportSection = {
      kind: 'llmAnalysis', heading: 'LLM',
      items: [
        { links: [], text: 'a', raw: 'a', llmType: 'contradiction', severity: 'high' },
        { links: [], text: 'b', raw: 'b', llmType: 'outdated', severity: 'medium' },
      ],
    };
    renderLlmAnalysisSection(body, section, t, makeCtx());
    expect(body.textContent).toContain('Contradiction');
    expect(body.textContent).toContain('Outdated');
  });

  it('collapses when group size > 5', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      links: [], text: `item ${i}`, raw: `item ${i}`, llmType: '过时', severity: 'medium' as const,
    }));
    renderLlmAnalysisSection(body, { kind: 'llmAnalysis', heading: 'LLM', items }, t, makeCtx());
    expect(body.querySelector('details')).toBeTruthy();
    expect(body.textContent).toContain('Show 8 more');
  });
});

describe('renderLlmItems', () => {
  it('renders each item as a list item with the raw text', () => {
    const items = [
      { links: [], text: 'a', raw: 'first', severity: 'low' as const },
      { links: [], text: 'b', raw: 'second', severity: 'low' as const },
    ];
    renderLlmItems(body, items, makeCtx());
    const lis = body.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0]?.textContent).toBe('first');
  });
});

describe('renderPageTypeGroup', () => {
  it('groups pages by entities/concepts/sources/other prefix', () => {
    renderPageTypeGroup(body, [
      'entities/Foo', 'entities/Bar',
      'concepts/Baz',
      'sources/Qux',
      'misc/Other',
    ], 'Created', t, makeCtx());
    expect(body.textContent).toContain('Created (5)');
    expect(body.textContent).toContain('entity ×2');
    expect(body.textContent).toContain('concept ×1');
    expect(body.textContent).toContain('source ×1');
    expect(body.textContent).toContain('other ×1');
  });

  it('strips folder prefix from link text', () => {
    renderPageTypeGroup(body, ['entities/Foo'], 'X', t, makeCtx());
    const a = body.querySelector('a')!;
    expect(a.textContent).toBe('Foo');
  });

  it('click handler calls openLinkText with full path', () => {
    const openLinkText = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx(openLinkText);
    renderPageTypeGroup(body, ['entities/Foo'], 'X', t, ctx);
    const a = body.querySelector('a')!;
    a.click()
    expect(openLinkText).toHaveBeenCalledWith('entities/Foo', 'wiki/log.md');
  });
});

describe('renderIngestMetricCards', () => {
  const makeEntry = (overrides: Partial<RenderedEntry> = {}): RenderedEntry => ({
    kind: 'ingest',
    date: '2026-06-21', operation: 'ingest',
    createdPages: ['entities/A', 'entities/B'],
    updatedPages: ['entities/C'],
    sections: [], details: [],
    insight: { primary: '3 created', severity: 'none' },
    badge: '📥', kindLabel: 'Ingest',
    ...overrides,
  });

  it('renders 4 cards: total, duration, model, source', () => {
    renderIngestMetricCards(body, makeEntry({
      ingestMetrics: { durationSec: 28, model: 'gpt-4', sourceBytes: 2048 },
    }), t);
    expect(body.textContent).toContain('3');
    expect(body.textContent).toContain('28s');
    expect(body.textContent).toContain('gpt-4');
    expect(body.textContent).toContain('2.0KB');
  });

  it('omits optional cards when not present', () => {
    renderIngestMetricCards(body, makeEntry(), t);
    // Only total card
    expect(body.querySelectorAll('div > div').length).toBeGreaterThan(0);
    expect(body.textContent).not.toContain('gpt-4');
    expect(body.textContent).not.toContain('KB');
  });
});

describe('renderIngestDetails', () => {
  const makeEntry = (overrides: Partial<RenderedEntry> = {}): RenderedEntry => ({
    kind: 'ingest', date: '2026-06-21', time: '14:30', operation: 'ingest',
    sourceTitle: 'src.md',
    createdPages: ['entities/A', 'concepts/B'],
    updatedPages: [],
    sections: [], details: [],
    insight: { primary: '2 created', severity: 'none' },
    badge: '📥', kindLabel: 'Ingest',
    ...overrides,
  });

  it('renders time + source heading + page-type groups', () => {
    renderIngestDetails(body, makeEntry(), t, makeCtx());
    expect(body.textContent).toContain('Latest:');
    expect(body.textContent).toContain('14:30');
    expect(body.textContent).toContain('src.md');
    expect(body.textContent).toContain('entity');
    expect(body.textContent).toContain('concept');
  });

  it('renders fallback text when no pages', () => {
    renderIngestDetails(body, makeEntry({ createdPages: [], updatedPages: [] }), t, makeCtx());
    expect(body.textContent).toContain('No page changes');
  });

  it('renders ingest metric cards when ingestMetrics is present', () => {
    renderIngestDetails(body, makeEntry({
      ingestMetrics: { durationSec: 42, model: 'gpt-4' },
    }), t, makeCtx());
    expect(body.textContent).toContain('42s');
    expect(body.textContent).toContain('gpt-4');
  });

  it('renders timestamp fallback when time is missing', () => {
    renderIngestDetails(body, makeEntry({ time: undefined }), t, makeCtx());
    expect(body.textContent).toContain('No timestamp');
  });
});

describe('renderCriticalKpiCards', () => {
  it('renders 8 cards (one per KPI dimension)', () => {
    const kpi = {
      totalPages: 38, deadLinks: 19, orphans: 2, emptyPages: 1,
      duplicates: 3, tagViolations: 1, unsourced: 0, durationSeconds: 7,
    };
    renderCriticalKpiCards(body, kpi, undefined, t);
    expect(body.textContent).toContain('38');
    expect(body.textContent).toContain('19');
    expect(body.textContent).toContain('2');
    expect(body.textContent).toContain('1');
    expect(body.textContent).toContain('3');
    expect(body.textContent).toContain('7s');
  });

  it('skips cards whose KPI is undefined', () => {
    const kpi = { totalPages: 50, durationSeconds: 5 };
    renderCriticalKpiCards(body, kpi, undefined, t);
    expect(body.textContent).not.toContain('Dead links');
    expect(body.textContent).not.toContain('Orphans');
  });

  it('renders delta chip when previous entry exists', () => {
    const kpi = { totalPages: 38, deadLinks: 19, orphans: 2, durationSeconds: 7 };
    const deltas = {
      deadLinks: { current: 19, prev: 12, delta: 7 },
      orphans: { current: 2, prev: 3, delta: -1 },
      totalPages: { current: 38, prev: 38, delta: 0 },
    };
    renderCriticalKpiCards(body, kpi, deltas, t);
    // Code adds the + sign for positive delta (template is `↗ {delta}`)
    expect(body.textContent).toContain('↗ +7');
    // Negative delta is the raw number, which already carries the - sign
    expect(body.textContent).toContain('↘ -1');
    expect(body.textContent).toContain('→ same');
  });
});

describe('renderMaintenanceDetails', () => {
  const makeEntry = (overrides: Partial<RenderedEntry> = {}): RenderedEntry => ({
    kind: 'maintenance', date: '2026-06-21', time: '14:30', operation: 'Wiki 维护报告',
    createdPages: [], updatedPages: [],
    sections: [], details: [],
    kpi: { totalPages: 50, deadLinks: 3, orphans: 1, durationSeconds: 5 },
    insight: { primary: '3 Dead', severity: 'medium' },
    badge: '🔍', kindLabel: 'Maintenance',
    ...overrides,
  });

  it('renders KPI cards and per-section content', () => {
    const entry = makeEntry({
      sections: [
        { kind: 'orphan', heading: 'Orphan', items: [
          { links: [{ path: 'entities/X' }], text: 'orphan', raw: 'orphan', severity: 'low' },
        ] },
      ],
    });
    renderMaintenanceDetails(body, entry, t, makeCtx());
    expect(body.textContent).toContain('Report findings');
    expect(body.textContent).toContain('Orphan');
  });

  it('renders raw details as fallback when no kpi and no sections', () => {
    const entry = makeEntry({ kpi: undefined, sections: [], rawDetails: 'raw content' });
    renderMaintenanceDetails(body, entry, t, makeCtx());
    expect(body.textContent).toContain('raw content');
  });
});

describe('renderReportSection', () => {
  it('dispatches deadLinks to renderDeadLinkSection', () => {
    const section: ReportSection = { kind: 'deadLinks', heading: 'D', items: [] };
    renderReportSection(body, section, t, makeCtx());
    expect(body.textContent).toContain('Dead links (0)');
  });

  it('dispatches llmAnalysis to renderLlmAnalysisSection', () => {
    const section: ReportSection = {
      kind: 'llmAnalysis', heading: 'L', items: [
        { links: [], text: 'a', raw: 'a', llmType: '过时', severity: 'medium' },
      ],
    };
    renderReportSection(body, section, t, makeCtx());
    expect(body.textContent).toContain('Outdated');
  });

  it('dispatches orphan to simpleList with orphan label', () => {
    const section: ReportSection = {
      kind: 'orphan', heading: '', items: [
        { links: [{ path: 'x' }], text: 'x', raw: 'x', severity: 'low' },
      ],
    };
    renderReportSection(body, section, t, makeCtx());
    expect(body.textContent).toContain('Orphan pages');
  });
});

describe('renderEntry', () => {
  const baseEntry: RenderedEntry = {
    kind: 'maintenance', date: '2026-06-21', time: '14:30', operation: 'Wiki 维护',
    createdPages: [], updatedPages: [],
    sections: [], details: [],
    kpi: { totalPages: 50, deadLinks: 3, durationSeconds: 5 },
    insight: { primary: '3 Dead', severity: 'medium' },
    badge: '🔍', kindLabel: '🔍 Maintenance',
  };

  it('renders badge + time + kind label + insight line', () => {
    renderEntry(body, baseEntry, t, makeCtx());
    expect(body.textContent).toContain('🔍');
    expect(body.textContent).toContain('14:30');
    expect(body.textContent).toContain('Maintenance');
    expect(body.textContent).toContain('3 Dead');
  });

  it('renders delta line when present', () => {
    renderEntry(body, { ...baseEntry, insight: { primary: 'p', severity: 'none', delta: '↗ +3 vs prev' } }, t, makeCtx());
    expect(body.textContent).toContain('↗ +3 vs prev');
  });

  it('renders expandable details with maintenance KPI cards', () => {
    renderEntry(body, baseEntry, t, makeCtx());
    expect(body.querySelector('details')).toBeTruthy();
    expect(body.textContent).toContain('Dead links');
  });

  it('renders ingest-specific details for ingest entries', () => {
    const ingestEntry: RenderedEntry = {
      ...baseEntry, kind: 'ingest', sourceTitle: 'src.md',
      insight: { primary: '2 created', severity: 'none' },
      badge: '📥', kindLabel: '📥 Ingest',
      createdPages: ['entities/A'], updatedPages: [],
    };
    renderEntry(body, ingestEntry, t, makeCtx());
    expect(body.textContent).toContain('src.md');
    expect(body.textContent).toContain('entity');
  });

  it('renders fix details for fix entries', () => {
    const fixEntry: RenderedEntry = {
      ...baseEntry, kind: 'fix',
      insight: { primary: '1 item fixed', severity: 'low' },
      badge: '🔧', kindLabel: '🔧 Fix',
      details: [
        { isBullet: true, links: [{ path: 'x' }], textWithoutLinks: '', raw: 'fix x' },
      ],
    };
    renderEntry(body, fixEntry, t, makeCtx());
    expect(body.textContent).toContain('1 item fixed');
    expect(body.querySelector('details')).toBeTruthy();
  });

  it('renders raw text for other entries', () => {
    const otherEntry: RenderedEntry = {
      ...baseEntry, kind: 'other',
      insight: { primary: 'manual', severity: 'none' },
      badge: '📌', kindLabel: '📌 Operation',
      kpi: undefined, rawDetails: 'raw',
    };
    renderEntry(body, otherEntry, t, makeCtx());
    expect(body.textContent).toContain('raw');
  });
});
