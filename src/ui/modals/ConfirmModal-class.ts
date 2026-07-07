// ConfirmModal — small yes/no confirmation modal (#164).
//
// `onChoice` fires exactly once:
//   - true on confirm
//   - false on cancel / Escape / dismiss / onClose.
//
// Extracted from the original `src/ui/modals.ts` god file (PR split).
// No behavior change — pure code movement.

import { App, Modal } from 'obsidian';

export class ConfirmModal extends Modal {
  private decided = false;

  constructor(
    app: App,
    private opts: { title: string; body: string; confirmText: string; cancelText: string; onChoice: (confirmed: boolean) => void }
  ) {
    super(app);
  }

  onOpen() {
    this.contentEl.createEl('h2', { text: this.opts.title });
    this.contentEl.createEl('p', { text: this.opts.body });
    const btnRow = this.contentEl.createDiv({ attr: { style: 'margin-top: 16px; text-align: right;' } });
    btnRow.createEl('button', { text: this.opts.cancelText })
      .addEventListener('click', () => this.decide(false));
    btnRow.createEl('button', { text: this.opts.confirmText, cls: 'mod-cta', attr: { style: 'margin-left: 8px;' } })
      .addEventListener('click', () => this.decide(true));
  }

  private decide(confirmed: boolean) {
    this.decided = true;
    this.opts.onChoice(confirmed);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
    // Escape / X / click-outside → treat as cancel, exactly once.
    if (!this.decided) {
      this.decided = true;
      this.opts.onChoice(false);
    }
  }
}