// v3.1 split: leaf renderers extracted from history-modal.ts
// (renderSectionTitle was at lines 1504-1518, renderCloseFooter at 1565-1578).
//
// These are pure DOM builders with no dependency on app, logPath, or other
// renderers. Trivial single createEl / createDiv calls — the existing 17
// renderHistoryEntries tests cover the data path, and an end-to-end modal
// test would cover these visually. Kept as module-level functions so the
// call site doesn't need a `this` context.
//
// renderCloseFooter takes a `closeModal` callback so the caller (the
// HistoryModal class) can supply its own close behavior without the
// renderer needing to know about Obsidian's Modal class.

import type { HistoryTexts } from '../types';

export function renderSectionTitle(
  body: HTMLElement,
  label: string,
  severity: 'high' | 'medium' | 'low' | 'none',
): void {
  const color =
    severity === 'high' ? 'var(--text-error)'
    : severity === 'medium' ? 'var(--text-warning)'
    : severity === 'low' ? 'var(--text-accent)'
    : 'var(--text-muted)';
  body.createDiv({
    text: label,
    attr: {
      style:
        `font-weight: 600; margin-top: 10px; margin-bottom: 4px; ` +
        `color: ${color}; font-size: 0.85em;`,
    },
  });
}

export function renderCloseFooter(
  container: HTMLElement,
  t: HistoryTexts,
  closeModal: () => void,
): void {
  const footer = container.createDiv({
    attr: {
      style:
        'display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 12px; ' +
        'border-top: 1px solid var(--background-modifier-border);',
    },
  });
  const closeBtn = footer.createEl('button', {
    text: t.historyCloseButton,
    attr: { style: 'padding: 6px 16px; border-radius: 4px; cursor: pointer;' },
  });
  closeBtn.addEventListener('click', () => closeModal());
}
