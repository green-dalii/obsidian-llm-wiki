// v3.1 split: global insight card extracted from history-modal.ts
// (was at lines 776-803).
//
// The top-of-modal summary card. Three states: clean / withData / noData.
// Each state picks a left-border color (success / warning / faint) and an
// icon (✅ / ⚠️ / ℹ️). The renderer is a single createDiv + createEl pair.

import type { HistoryTexts } from '../types';

export interface GlobalInsightData {
  kind: 'clean' | 'withData' | 'noData';
  primary: string;
}

export function renderGlobalInsight(
  parent: HTMLElement,
  insight: GlobalInsightData,
  _t: HistoryTexts,
): void {
  const isClean = insight.kind === 'clean';
  const isNoData = insight.kind === 'noData';
  // Use a neutral background with a colored left border + accent icon.
  // Previously used --background-modifier-error-hover, which is too red and
  // dominates the visual hierarchy. Per user feedback (2026-06-21):
  // "modal 中的警示 background 太红了，可以直接不要这么红的填充，保持默认即可".
  const bg = 'var(--background-secondary)';
  const borderColor =
    isClean ? 'var(--text-success)'
    : isNoData ? 'var(--text-faint)'
    : 'var(--text-warning)';
  const icon = isClean ? '✅' : isNoData ? 'ℹ️' : '⚠️';
  parent.createDiv({
    attr: {
      style:
        `padding: 12px 14px; margin-bottom: 16px; border-radius: 6px; ` +
        `background: ${bg}; border-left: 4px solid ${borderColor}; font-size: 0.95em;`,
    },
  }).createEl('div', {
    text: `${icon}  ${insight.primary}`,
  });
}
