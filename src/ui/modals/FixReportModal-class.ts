// FixReportModal — displays the summary of a "Fix All" run, listing
// every phase (label + detail) that ran.
//
// Extracted from the original `src/ui/modals.ts` god file (PR split).
// No behavior change — pure code movement.

import { App, Modal } from 'obsidian';
import { TEXTS } from '../../texts';
import { getText } from '../../core/i18n';
import type { FixReportPhase } from './types';

export class FixReportModal extends Modal {
  private phases: FixReportPhase[];
  private language: string;

  constructor(app: App, phases: FixReportPhase[], language: string) {
    super(app);
    this.phases = phases;
    this.language = language;
  }

  onOpen() {
    const tk = (k: string) => getText(this.language, k as keyof typeof TEXTS.en) || k;
    const titleText = tk('lintFixAllComplete');

    this.contentEl.createEl('h2', { text: titleText });

    const list = this.contentEl.createEl('ul', {
      attr: { style: 'margin: 12px 0; line-height: 1.8;' }
    });
    for (const phase of this.phases) {
      const itemText = phase.detail
        ? `${phase.label}: ${phase.detail}`
        : phase.label;
      list.createEl('li', { text: itemText });
    }

    const indexNote = tk('lintFixIndexUpdated');
    if (indexNote) {
      this.contentEl.createEl('p', {
        text: indexNote,
        attr: { style: 'color: var(--text-muted); font-size: 13px; margin-top: 8px;' }
      });
    }

    const btnRow = this.contentEl.createDiv({ attr: { style: 'margin-top: 16px; text-align: right;' } });
    const closeText = tk('ingestReportClose');
    btnRow.createEl('button', { text: closeText }).addEventListener('click', () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}