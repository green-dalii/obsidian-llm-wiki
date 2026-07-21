// v3.1 split: LLM analysis section extracted from history-modal.ts
// (renderLlmAnalysisSection was at 1247-1310, renderLlmItems at 1312-1322).
//
// Groups items by llmType (矛盾/过时/缺失/结构), each in its own collapsible
// group. This is the most info-dense section so we collapse by default
// when >5 items. Chip color is selected by llmType keyword match
// (Chinese + English fallbacks).

import type { ReportSection, SectionItem } from '../../../core/log-parser';
import type { HistoryTexts } from '../types';
import { renderSectionTitle } from './footer';
import { renderLineWithLinks } from './link-helpers';
import type { RendererContext } from './link-helpers';

export function renderLlmAnalysisSection(
  body: HTMLElement,
  section: ReportSection,
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  const label = t.historySectionLlmAnalysis.replace('{count}', String(section.items.length));
  renderSectionTitle(body, label, 'medium');

  // Group by llmType.
  const groups = new Map<string, SectionItem[]>();
  for (const item of section.items) {
    const key = item.llmType ?? 'other';
    const list = groups.get(key);
    if (list) list.push(item); else groups.set(key, [item]);
  }

  const chipLabel = (type: string): { label: string; color: string } => {
    if (type.includes('矛盾') || type.toLowerCase().includes('contradiction')) {
      return { label: t.historyChipContradiction, color: 'var(--text-error)' };
    }
    if (type.includes('过时') || type.toLowerCase().includes('outdated')) {
      return { label: t.historyChipOutdated, color: 'var(--text-warning)' };
    }
    if (type.includes('缺失') || type.toLowerCase().includes('missing')) {
      return { label: t.historyChipMissing, color: 'var(--text-accent)' };
    }
    if (type.includes('结构') || type.toLowerCase().includes('structure')) {
      return { label: t.historyChipStructure, color: 'var(--text-muted)' };
    }
    return { label: type, color: 'var(--text-muted)' };
  };

  const sortedTypes = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [type, items] of sortedTypes) {
    const { label: chipText, color } = chipLabel(type);
    const groupEl = body.createDiv({
      attr: { style: 'margin: 6px 0 0 0; padding-left: 4px; border-left: 2px solid ' + color + ';' },
    });
    const header = groupEl.createDiv({
      attr: { style: 'display: flex; gap: 6px; align-items: center;' },
    });
    header.createSpan({
      text: chipText,
      attr: {
        style:
          `font-size: 0.7em; font-weight: 600; padding: 2px 8px; ` +
          `border-radius: 10px; background: ${color}; color: var(--text-on-accent);`,
      },
    });
    header.createSpan({
      text: String(items.length),
      attr: { style: 'font-size: 0.85em; color: var(--text-muted);' },
    });
    // Items — collapse by default if many.
    const itemsContainer = groupEl.createDiv({ attr: { style: 'margin-top: 4px;' } });
    if (items.length > 5) {
      const det = itemsContainer.createEl('details');
      det.createEl('summary', {
        text: t.historyShowMoreItems.replace('{count}', String(items.length)),
        attr: { style: 'cursor: pointer; color: var(--text-accent); user-select: none;' },
      });
      const inner = det.createDiv({ attr: { style: 'margin-top: 4px; padding-left: 8px;' } });
      renderLlmItems(inner, items, ctx);
    } else {
      renderLlmItems(itemsContainer, items, ctx);
    }
  }
}

export function renderLlmItems(
  parent: HTMLElement,
  items: SectionItem[],
  ctx: RendererContext,
): void {
  const list = parent.createEl('ul', {
    attr: { style: 'margin: 0; padding-left: 16px; list-style: disc;' },
  });
  for (const item of items) {
    const li = list.createEl('li', {
      attr: { style: 'margin: 3px 0; color: var(--text-muted); line-height: 1.4;' },
    });
    renderLineWithLinks(li, item.raw, ctx);
  }
}
