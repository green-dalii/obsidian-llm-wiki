// v3.1 split: thin Obsidian Modal wrapper extracted from history-modal.ts
// (was a 1003-LOC class with 22 private methods; now ~200 LOC + delegates
// to the renderer modules under ./renderers/).
//
// Public API preserved:
//   new HistoryModal(app, { language, wikiFolder }).open()
//
// The class itself owns:
//   - Obsidian Modal lifecycle (onOpen / onClose)
//   - Log file read + parse (vault.adapter.read + parseLogEntries)
//   - Search/filter/range state
//   - Control wiring (search input, filter select, range select, custom range, refresh)
//
// Everything else (the visual layer) is delegated to module-level pure
// functions in ./renderers/ and the data layer in ./render-state.ts.

import { App, Modal, Component } from 'obsidian';
import { parseLogEntries } from '../../core/log-parser';
import { TEXTS } from '../../texts';
import type { HistoryTexts } from './types';
import { renderHistoryEntries } from './render-state';
import {
  renderGlobalInsight, renderEntry, renderCloseFooter, type RendererContext,
} from './renderers';

export interface HistoryModalOptions {
  language: string;
  wikiFolder: string;
}

export class HistoryModal extends Modal {
  private language: string;
  private logPath: string;
  private renderComponent: Component | null = null;

  constructor(app: App, opts: HistoryModalOptions) {
    super(app);
    this.language = opts.language;
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
    const locale = this.language in TEXTS ? this.language : 'en';
    const t: HistoryTexts = (TEXTS as Record<string, HistoryTexts>)[locale];

    // Header
    container.createEl('h2', {
      text: t.historyModalHeaderTitle,
      attr: { style: 'margin: 0 0 4px 0;' },
    });
    const subtitle = container.createEl('p', {
      text: t.historyModalSubtitle,
      attr: { style: 'font-size: 0.85em; color: var(--text-muted); margin: 0 0 12px 0;' },
    });

    // Read log.md
    let rawContent: string;
    try {
      rawContent = await this.app.vault.adapter.read(this.logPath);
    } catch {
      container.createEl('p', {
        text: t.historyReadError.replace('{error}', 'file not found'),
        attr: { style: 'color: var(--text-warning); padding: 12px;' },
      });
      container.createEl('p', {
        text: t.historyGlobalInsightNoData,
        attr: { style: 'color: var(--text-muted); text-align: center; padding: 24px 0;' },
      });
      renderCloseFooter(container, t, () => this.close());
      return;
    }
    const entries = parseLogEntries(rawContent);

    // State
    let currentSearch = '';
    let currentFilter: import('./types').HistoryFilter = 'all';
    let currentRange: import('./types').TimeRange = 'all';
    let customFrom: string | undefined;
    let customTo: string | undefined;

    // Controls
    const controls = container.createDiv({
      attr: { style: 'display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;' },
    });
    const searchInput = controls.createEl('input', {
      type: 'text',
      placeholder: t.historySearchPlaceholder,
      attr: { style: 'flex: 1; min-width: 200px; padding: 6px 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border);' },
    });
    const filterSelect = controls.createEl('select', {
      attr: { style: 'padding: 6px 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border);' },
    });
    filterSelect.createEl('option', { value: 'all', text: t.historyFilterAll });
    filterSelect.createEl('option', { value: 'ingest', text: t.historyFilterIngest });
    filterSelect.createEl('option', { value: 'maintenance', text: t.historyFilterMaintenance });
    filterSelect.createEl('option', { value: 'fix', text: t.historyFilterFix });
    filterSelect.createEl('option', { value: 'contradictions', text: t.historyFilterContradictions });

    const rangeSelect = controls.createEl('select', {
      attr: { style: 'padding: 6px 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border);' },
    });
    rangeSelect.createEl('option', { value: 'all', text: t.historyTimeRangeAll });
    rangeSelect.createEl('option', { value: '1d', text: t.historyTimeRange1d });
    rangeSelect.createEl('option', { value: '3d', text: t.historyTimeRange3d });
    rangeSelect.createEl('option', { value: '1w', text: t.historyTimeRange1w });
    rangeSelect.createEl('option', { value: '1m', text: t.historyTimeRange1m });
    rangeSelect.createEl('option', { value: 'custom', text: t.historyTimeRangeCustom });

    const customRangeContainer = controls.createDiv({
      cls: 'llm-wiki-custom-range',
    });
    customRangeContainer.createSpan({
      text: t.historyCustomRangeFrom,
      attr: { style: 'font-size: 0.85em; color: var(--text-muted);' },
    });
    const fromDate = customRangeContainer.createEl('input', {
      type: 'date',
      cls: 'llm-wiki-date-input',
    });
    customRangeContainer.createSpan({
      text: t.historyCustomRangeTo,
      attr: { style: 'font-size: 0.85em; color: var(--text-muted);' },
    });
    const toDate = customRangeContainer.createEl('input', {
      type: 'date',
      cls: 'llm-wiki-date-input',
    });
    const applyBtn = customRangeContainer.createEl('button', {
      text: t.historyCustomRangeApply,
      attr: { style: 'padding: 4px 12px; border-radius: 4px; cursor: pointer;' },
    });
    const clearBtn = customRangeContainer.createEl('button', {
      text: t.historyCustomRangeClear,
      attr: { style: 'padding: 4px 12px; border-radius: 4px; cursor: pointer;' },
    });

    const refreshBtn = controls.createEl('button', {
      text: t.historyRefreshButton,
      attr: { style: 'padding: 6px 12px; border-radius: 4px; cursor: pointer;' },
    });

    const resultsContainer = container.createDiv();
    const ctx: RendererContext = { app: this.app, logPath: this.logPath };

    const render = () => {
      resultsContainer.empty();
      const result = renderHistoryEntries(entries, t, {
        search: currentSearch,
        filter: currentFilter,
        timeRange: currentRange,
        customFrom,
        customTo,
      });

      subtitle.textContent = t.historyModalSubtitleWithCount.replace(
        '{count}', String(entries.length),
      );

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

      if (result.globalInsight) {
        renderGlobalInsight(resultsContainer, result.globalInsight, t);
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
          renderEntry(dayEl, entry, t, ctx);
        }
      }

      if (result.overflow > 0) {
        const showMoreBtn = resultsContainer.createEl('button', {
          text: t.historyShowMore.replace('{count}', String(result.overflow)),
          attr: { style: 'margin-top: 8px; padding: 6px 12px; border-radius: 4px; cursor: pointer;' },
        });
        showMoreBtn.addEventListener('click', () => {
          // TODO: lazy-load expansion (out of scope for v3)
        });
      }
    };

    searchInput.addEventListener('input', () => {
      currentSearch = searchInput.value.trim();
      render();
    });
    filterSelect.addEventListener('change', () => {
      currentFilter = filterSelect.value as import('./types').HistoryFilter;
      render();
    });
    rangeSelect.addEventListener('change', () => {
      currentRange = rangeSelect.value as import('./types').TimeRange;
      if (currentRange === 'custom') {
        customRangeContainer.classList.add('llm-wiki-custom-range-visible');
      } else {
        customRangeContainer.classList.remove('llm-wiki-custom-range-visible');
      }
      render();
    });
    applyBtn.addEventListener('click', () => {
      if (fromDate.value || toDate.value) {
        customFrom = fromDate.value || undefined;
        customTo = toDate.value || undefined;
        render();
      }
    });
    clearBtn.addEventListener('click', () => {
      fromDate.value = '';
      toDate.value = '';
      customFrom = undefined;
      customTo = undefined;
      render();
    });
    refreshBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const updatedContent = await this.app.vault.adapter.read(this.logPath);
          const newEntries = parseLogEntries(updatedContent);
          entries.length = 0;
          entries.push(...newEntries);
          render();
        } catch { /* silent fail */ }
      })();
    });

    render();
    renderCloseFooter(container, t, () => this.close());
  }
}
