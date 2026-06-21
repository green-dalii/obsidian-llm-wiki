// Ingestion History Panel (#122).
//
// Pure rendering logic for the history modal. Accepts parsed LogEntry[]
// and returns a grouped, filtered, paginated result that the modal
// DOM code can render directly. No IO, no Obsidian API — fully testable.
//
// The HistoryModal class is an Obsidian Modal subclass that calls
// renderHistoryEntries and builds DOM from the result.

import type { LogEntry } from '../core/log-parser';
import { TEXTS } from '../texts';

// ── Types ──────────────────────────────────────────────────────────

export type HistoryFilter = 'all' | 'ingest' | 'lint' | 'contradictions';

export interface HistoryRenderParams {
  search: string;
  filter: HistoryFilter;
}

/** Per-entry rendered line as it will appear in the modal. */
export interface RenderedEntry {
  kind: 'ingest' | 'lint';
  date: string;
  time?: string;
  operation: string;
  sourceTitle?: string;
  summary: string;
  createdPages: string[];
  updatedPages: string[];
  hasContradictions: boolean;
  contradictions: string[];
  details?: string;
  badge: string; // short badge letter ('I', 'L', '摄', etc.)
}

export interface HistoryDayGroup {
  date: string;
  entries: RenderedEntry[];
}

export type HistoryRenderResult =
  | { kind: 'empty' }
  | { kind: 'noMatch' }
  | { kind: 'groups'; groups: HistoryDayGroup[]; overflow: number; totalFiltered: number };

// ── Texts interface (minimal subset used by render logic) ──
// Extracted from TEXTS.en/zh/ja/ko/de/fr/es/pt/it keys for type safety.
export interface HistoryTexts {
  historyModalSubtitle: string;
  historyReadError: string;
  historyEmpty: string;
  historyEntryKindIngest: string;
  historyEntryKindLint: string;
  historyEntryTime: string;
  historyEntryTimeNoTime: string;
  historyEntrySource: string;
  historyEntrySourceUnknown: string;
  historyEntryCreatedLabel: string;
  historyEntryUpdatedLabel: string;
  historyEntryCreatedCount: string;
  historyEntryUpdatedCount: string;
  historyEntryNoChanges: string;
  historyEntryContradictions: string;
  historyEntrySectionCreated: string;
  historyEntrySectionUpdated: string;
  historyEntrySectionContradictions: string;
  historyEntrySectionDetails: string;
  historyEntryOpenPage: string;
  historyEntryDetailsNoContradictions: string;
  historySearchPlaceholder: string;
  historyFilterAll: string;
  historyFilterIngest: string;
  historyFilterLint: string;
  historyFilterContradictions: string;
  historyRefreshButton: string;
  historyExpandDay: string;
  historyCollapseDay: string;
  historyShowMore: string;
  historyNoMatch: string;
  historyCloseButton: string;
  historyLimit: number;
  historyBadgeIngestShort: string;
  historyBadgeLintShort: string;
}

const HISTORY_LIMIT = 50;

// ── Pure rendering function ────────────────────────────────────────

function buildSummary(e: LogEntry, t: HistoryTexts): string {
  const parts: string[] = [];
  if (e.kind === 'ingest') {
    if (e.createdPages.length > 0) {
      parts.push(t.historyEntryCreatedCount.replace('{count}', String(e.createdPages.length)));
    }
    if (e.updatedPages.length > 0) {
      parts.push(t.historyEntryUpdatedCount.replace('{count}', String(e.updatedPages.length)));
    }
    if (parts.length === 0 && !e.hasContradictions) {
      parts.push(t.historyEntryNoChanges);
    }
  }
  if (e.hasContradictions) {
    parts.push(t.historyEntryContradictions.replace('{count}', String(e.contradictions.length)));
  }
  return parts.join(' · ');
}

function matchesSearch(e: LogEntry, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  if (e.sourceTitle && e.sourceTitle.toLowerCase().includes(q)) return true;
  if (e.operation.toLowerCase().includes(q)) return true;
  for (const p of e.createdPages) {
    if (p.toLowerCase().includes(q)) return true;
  }
  for (const p of e.updatedPages) {
    if (p.toLowerCase().includes(q)) return true;
  }
  if (e.details && e.details.toLowerCase().includes(q)) return true;
  return false;
}

function matchesFilter(e: LogEntry, filter: HistoryFilter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'ingest': return e.kind === 'ingest';
    case 'lint': return e.kind === 'lint';
    case 'contradictions': return e.hasContradictions;
  }
}

function toRenderedEntry(e: LogEntry, t: HistoryTexts): RenderedEntry {
  return {
    kind: e.kind,
    date: e.date,
    time: e.time,
    operation: e.operation,
    sourceTitle: e.sourceTitle,
    summary: buildSummary(e, t),
    createdPages: e.createdPages,
    updatedPages: e.updatedPages,
    hasContradictions: e.hasContradictions,
    contradictions: e.contradictions,
    details: e.details,
    badge: e.kind === 'ingest' ? t.historyBadgeIngestShort : t.historyBadgeLintShort,
  };
}

/**
 * Pure function: render history entries into grouped, filtered, paginated result.
 * Called by HistoryModal.onOpen(); fully unit-testable (no DOM, no IO).
 */
export function renderHistoryEntries(
  entries: LogEntry[],
  t: HistoryTexts,
  params: HistoryRenderParams
): HistoryRenderResult {
  if (entries.length === 0) {
    return { kind: 'empty' };
  }

  // 1. Filter + search
  const filtered = entries.filter(e => matchesFilter(e, params.filter) && matchesSearch(e, params.search));
  if (filtered.length === 0) {
    return { kind: 'noMatch' };
  }

  // 2. Paginate (keep most recent first)
  const limit = t.historyLimit || HISTORY_LIMIT;
  const visible = filtered.slice(0, limit);
  const overflow = filtered.length - visible.length;

  // 3. Group by date (most recent first)
  const groupMap = new Map<string, LogEntry[]>();
  for (const e of visible) {
    const existing = groupMap.get(e.date);
    if (existing) {
      existing.push(e);
    } else {
      groupMap.set(e.date, [e]);
    }
  }
  const groups: HistoryDayGroup[] = [...groupMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // most recent first
    .map(([date, dayEntries]) => ({
      date,
      entries: dayEntries.map(e => toRenderedEntry(e, t)),
    }));

  return { kind: 'groups', groups, overflow, totalFiltered: filtered.length };
}

// ── Obsidian Modal wrapper ─────────────────────────────────────────

import { App, Modal } from 'obsidian';
import { parseLogEntries } from '../core/log-parser';
import { Component } from 'obsidian';

/**
 * HistoryModal: Obsidian Modal that renders the ingestion history panel.
 *
 * Public API:
 *   new HistoryModal(app, settings).open()
 *
 * Reads wiki/log.md via vault.read, parses with parseLogEntries,
 * then renders the grouped, filtered, paginated result as DOM.
 */
export class HistoryModal extends Modal {
  private language: string;
  private wikiFolder: string;
  private logPath: string;
  private renderComponent: Component | null = null;

  constructor(app: App, opts: { language: string; wikiFolder: string }) {
    super(app);
    this.language = opts.language;
    this.wikiFolder = opts.wikiFolder;
    this.logPath = `${opts.wikiFolder}/log.md`;
  }

  onOpen() {
    const { contentEl } = this;
    this.renderComponent = new Component();
    this.renderComponent.load();
    void this.renderContent(contentEl);
  }

  onClose() {
    this.renderComponent?.unload();
    this.contentEl.empty();
  }

  private async renderContent(container: HTMLElement) {
    // Resolve locale texts (fallback to EN for unknown locales)
    const locale = this.language in TEXTS ? this.language : 'en';
    const t: HistoryTexts = (TEXTS as Record<string, HistoryTexts>)[locale];

    // Subtitle
    container.createEl('p', {
      text: t.historyModalSubtitle.replace('{path}', this.logPath),
      attr: { style: 'font-size: 0.85em; color: var(--text-muted); margin: 0 0 12px 0;' },
    });

    // Read + parse log.md
    let rawContent: string;
    try {
      rawContent = await this.app.vault.adapter.read(this.logPath);
    } catch {
      container.createEl('p', { text: t.historyReadError.replace('{error}', 'file not found') });
      return;
    }
    const entries = parseLogEntries(rawContent);

    // State
    let currentSearch = '';
    let currentFilter: HistoryFilter = 'all';

    // Controls container
    const controls = container.createDiv({
      attr: { style: 'display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;' },
    });

    // Search input
    const searchInput = controls.createEl('input', {
      type: 'text',
      placeholder: t.historySearchPlaceholder,
      attr: { style: 'flex: 1; min-width: 200px; padding: 6px 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border);' },
    });

    // Filter dropdown
    const filterSelect = controls.createEl('select', {
      attr: { style: 'padding: 6px 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border);' },
    });
    filterSelect.createEl('option', { value: 'all', text: t.historyFilterAll });
    filterSelect.createEl('option', { value: 'ingest', text: t.historyFilterIngest });
    filterSelect.createEl('option', { value: 'lint', text: t.historyFilterLint });
    filterSelect.createEl('option', { value: 'contradictions', text: t.historyFilterContradictions });

    // Results container (below controls)
    const resultsContainer = container.createDiv();

    // Refresh button
    const refreshBtn = controls.createEl('button', {
      text: t.historyRefreshButton,
      attr: { style: 'padding: 6px 12px; border-radius: 4px; cursor: pointer;' },
    });

    const render = () => {
      resultsContainer.empty();
      const result = renderHistoryEntries(entries, t, {
        search: currentSearch,
        filter: currentFilter,
      });

      if (result.kind === 'empty') {
        resultsContainer.createEl('p', {
          text: t.historyEmpty,
          attr: { style: 'color: var(--text-muted); text-align: center; padding: 24px 0;' },
        });
        return;
      }
      if (result.kind === 'noMatch') {
        resultsContainer.createEl('p', {
          text: t.historyNoMatch,
          attr: { style: 'color: var(--text-muted); text-align: center; padding: 24px 0;' },
        });
        return;
      }

      for (const group of result.groups) {
        const dayEl = resultsContainer.createDiv({
          attr: { style: 'margin-bottom: 16px;' },
        });
        dayEl.createEl('strong', {
          text: group.date,
          attr: { style: 'display: block; font-size: 0.9em; color: var(--text-muted); margin-bottom: 6px;' },
        });

        for (const entry of group.entries) {
          const entryEl = dayEl.createDiv({
            attr: {
              style: 'padding: 8px 10px; border-left: 3px solid ' +
                (entry.kind === 'ingest' ? 'var(--text-accent)' : 'var(--text-success)') +
                '; margin-bottom: 4px; border-radius: 0 4px 4px 0; background: var(--background-secondary);',
            },
          });

          // Row 1: badge + time + source
          const row1 = entryEl.createDiv({
            attr: { style: 'display: flex; gap: 8px; align-items: center; margin-bottom: 4px;' },
          });
          row1.createEl('span', {
            text: entry.badge,
            attr: { style: 'font-weight: bold; font-size: 0.75em; min-width: 18px; text-align: center;' },
          });
          if (entry.time) {
            row1.createEl('span', {
              text: entry.time,
              attr: { style: 'color: var(--text-muted); font-size: 0.85em;' },
            });
          }
          row1.createEl('span', {
            text: entry.sourceTitle || t.historyEntrySourceUnknown,
            attr: { style: 'font-weight: 500;' },
          });

          // Row 2: summary
          entryEl.createEl('div', {
            text: entry.summary,
            attr: { style: 'font-size: 0.85em; color: var(--text-muted);' },
          });

          // Expandable details (created/updated page lists, contradictions, lint details)
          const detailsEl = entryEl.createEl('details', {
            attr: { style: 'margin-top: 4px;' },
          });
          detailsEl.createEl('summary', {
            text: t.historyEntrySectionDetails,
            attr: { style: 'cursor: pointer; font-size: 0.8em; color: var(--text-faint);' },
          });
          const detailsBody = detailsEl.createDiv({
            attr: { style: 'padding: 4px 0 0 0; font-size: 0.85em;' },
          });

          if (entry.createdPages.length > 0) {
            detailsBody.createEl('div', {
              text: t.historyEntrySectionCreated + ':',
              attr: { style: 'font-weight: 500; margin-top: 4px;' },
            });
            for (const page of entry.createdPages) {
              const linkRow = detailsBody.createDiv({
                attr: { style: 'display: flex; gap: 6px; align-items: center;' },
              });
              // Use Obsidian link syntax for clickable link
              const link = linkRow.createEl('a', {
                text: `[[${page}]]`,
                href: '#',
                attr: { style: 'color: var(--text-accent); cursor: pointer; text-decoration: none;' },
              });
              link.addEventListener('click', (ev) => {
                ev.preventDefault();
                void this.app.workspace.openLinkText(page, this.logPath);
              });
              linkRow.createEl('span', {
                text: t.historyEntryOpenPage,
                attr: { style: 'color: var(--text-faint); font-size: 0.8em;' },
              });
            }
          }

          if (entry.updatedPages.length > 0) {
            detailsBody.createEl('div', {
              text: t.historyEntrySectionUpdated + ':',
              attr: { style: 'font-weight: 500; margin-top: 6px;' },
            });
            for (const page of entry.updatedPages) {
              const linkRow = detailsBody.createDiv({
                attr: { style: 'display: flex; gap: 6px; align-items: center;' },
              });
              const link = linkRow.createEl('a', {
                text: `[[${page}]]`,
                href: '#',
                attr: { style: 'color: var(--text-accent); cursor: pointer; text-decoration: none;' },
              });
              link.addEventListener('click', (ev) => {
                ev.preventDefault();
                void this.app.workspace.openLinkText(page, this.logPath);
              });
            }
          }

          if (entry.hasContradictions) {
            detailsBody.createEl('div', {
              text: t.historyEntrySectionContradictions + ':',
              attr: { style: 'font-weight: 500; margin-top: 6px;' },
            });
            for (const c of entry.contradictions) {
              detailsBody.createEl('div', {
                text: `⚠️ ${c}`,
                attr: { style: 'color: var(--text-warning); margin-left: 8px;' },
              });
            }
          }

          if (entry.details) {
            detailsBody.createEl('div', {
              text: t.historyEntrySectionDetails + ':',
              attr: { style: 'font-weight: 500; margin-top: 6px;' },
            });
            detailsBody.createEl('div', {
              text: entry.details,
              attr: { style: 'white-space: pre-wrap; color: var(--text-muted); margin-left: 8px;' },
            });
          }

          if (!entry.hasContradictions && entry.details === undefined) {
            detailsBody.createEl('div', {
              text: t.historyEntryDetailsNoContradictions,
              attr: { style: 'color: var(--text-faint);' },
            });
          }
        }
      }

      // Show more button
      if (result.overflow > 0) {
        const showMoreBtn = resultsContainer.createEl('button', {
          text: t.historyShowMore.replace('{count}', String(result.overflow)),
          attr: { style: 'margin-top: 8px; padding: 6px 12px; border-radius: 4px; cursor: pointer;' },
        });
        showMoreBtn.addEventListener('click', () => {
          // TODO: implement lazy-load expansion (future enhancement)
        });
      }
    };

    // Event listeners
    searchInput.addEventListener('input', () => {
      currentSearch = searchInput.value.trim();
      render();
    });
    filterSelect.addEventListener('change', () => {
      currentFilter = filterSelect.value as HistoryFilter;
      render();
    });
    refreshBtn.addEventListener('click', () => {
      void (async () => {
        // Re-read log.md and re-render
        try {
          const updatedContent = await this.app.vault.adapter.read(this.logPath);
        const newEntries = parseLogEntries(updatedContent);
        entries.length = 0;
        entries.push(...newEntries);
        render();
      } catch {
        // silent fail — log.md may not exist yet
      }
      })();
    });

    // Initial render
    render();

    // Close button at bottom
    const footer = container.createDiv({
      attr: { style: 'display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--background-modifier-border);' },
    });
    const closeBtn = footer.createEl('button', {
      text: t.historyCloseButton,
      attr: { style: 'padding: 6px 16px; border-radius: 4px; cursor: pointer;' },
    });
    closeBtn.addEventListener('click', () => this.close());
  }
}

// Re-export for the public API (settings.ts imports from here)
// import { HistoryModal } from './history-modal';
// new HistoryModal(app, { language, wikiFolder }).open();
