// LintReportModal — displays a Markdown lint report with action buttons.
//
// The action buttons are organized into 4 layers:
//   Layer 1: Pre-flight operations (alias completion, tag violation retag)
//   Layer 1b: Polluted page fix (structural root cause)
//   Layer 2: Causality-ordered fix buttons (duplicates → dead links → orphans → empty pages)
//   Layer 3: Smart Fix All (batched all-in-one)
//   Layer 4: Schema analysis (independent)
//
// Extracted from the original `src/ui/modals.ts` god file (PR split).
// No behavior change — pure code movement.

import { App, Modal, MarkdownRenderer, Component } from 'obsidian';
import { TEXTS } from '../../texts';
import type { LintFixCallbacks, LintCounts } from './types';

export class LintReportModal extends Modal {
  report: string;
  fixCallbacks: LintFixCallbacks;
  counts: LintCounts;
  private language: string;
  private renderComponent: Component | null = null;

  constructor(app: App, report: string, fixCallbacks: LintFixCallbacks, counts: LintCounts, language: string = 'en') {
    super(app);
    this.report = report;
    this.fixCallbacks = fixCallbacks;
    this.counts = counts;
    this.language = language;
  }

  onOpen() {
    const { contentEl } = this;
    this.renderComponent = new Component();
    this.renderComponent.load();

    const t = TEXTS[this.language as keyof typeof TEXTS] || TEXTS.en;

    const reportDiv = contentEl.createDiv({
      attr: { style: 'max-height: 50vh; overflow-y: auto; padding: 8px 0;' }
    });
    void MarkdownRenderer.render(this.app, this.report, reportDiv, '', this.renderComponent);

    // Reference to persisted log entry
    if (t.lintLogReference) {
      contentEl.createEl('p', {
        text: `📋 ${t.lintLogReference}`,
        attr: { style: 'font-size: 0.85em; color: var(--text-muted); margin: 4px 0 0 0;' }
      });
    }

    // Action buttons — organized by operation logic
    // Layer 1: Pre-flight operations (improve detection quality)
    // Layer 2: Root cause fixes → downstream fixes (causality order)
    // Layer 3: Smart all-in-one
    // Layer 4: Analysis

    const actionSection = contentEl.createDiv({
      attr: { style: 'margin-top: 16px; border-top: 1px solid var(--background-modifier-border); padding-top: 12px;' }
    });

    actionSection.createEl('p', {
      text: t.lintModalActionsTitle,
      attr: { style: 'font-weight: bold; margin-bottom: 10px;' }
    });

    // === Layer 1: Alias completion (pre-flight, shown only when needed) ===
    if (this.counts.pagesMissingAliases > 0 && this.fixCallbacks.onCompleteAliases) {
      const row = actionSection.createDiv({ attr: { style: 'margin-bottom: 10px;' } });
      const btn = row.createEl('button', {
        text: t.lintAliasesCompleteBtn.replace('{count}', String(this.counts.pagesMissingAliases)),
        cls: 'mod-cta',
        attr: { style: 'font-weight: bold;' }
      });
      btn.addEventListener('click', () => {
        this.fixCallbacks.onCompleteAliases?.();
        this.close();
      });
    }

    // === Layer 1.5: Issue #85 v7 — Tag violation retag (LLM bulk) ===
    if (this.counts.tagViolations > 0 && this.fixCallbacks.onRetagViolations) {
      const row = actionSection.createDiv({ attr: { style: 'margin-bottom: 10px;' } });
      const btn = row.createEl('button', {
        text: t.lintTagViolationRetagBtn.replace('{count}', String(this.counts.tagViolations)),
        cls: 'mod-cta',
        attr: { style: 'font-weight: bold;' }
      });
      btn.addEventListener('click', () => {
        this.fixCallbacks.onRetagViolations?.();
        this.close();
      });
    }

    // === Layer 1b: Polluted page fix (structural root cause) ===
    if (this.counts.pollutedPages > 0 && this.fixCallbacks.onFixPollutedPages) {
      const row = actionSection.createDiv({ attr: { style: 'margin-bottom: 10px;' } });
      const btn = row.createEl('button', {
        text: t.lintModalFixPolluted.replace('{count}', String(this.counts.pollutedPages)),
        cls: 'mod-cta',
        attr: { style: 'font-weight: bold;' }
      });
      btn.addEventListener('click', () => {
        this.fixCallbacks.onFixPollutedPages?.();
        this.close();
      });
    }

    // === Layer 2: Causality-ordered fix buttons (duplicates → dead links → orphans → empty pages) ===
    const fixableItems = [
      { count: this.counts.duplicates, cb: this.fixCallbacks.onMergeDuplicates, text: t.lintModalMergeDuplicates },
      { count: this.counts.deadLinks, cb: this.fixCallbacks.onFixDeadLinks, text: t.lintModalFixDeadLinks },
      { count: this.counts.orphans, cb: this.fixCallbacks.onLinkOrphans, text: t.lintModalLinkOrphans },
      { count: this.counts.emptyPages, cb: this.fixCallbacks.onFillEmptyPages, text: t.lintModalExpandEmpty },
      { count: this.counts.emptyPages, cb: this.fixCallbacks.onDeleteEmptyStubs, text: t.lintModalDeleteEmpty },
    ].filter(item => item.count > 0 && item.cb);

    if (fixableItems.length > 0) {
      const fixRow = actionSection.createDiv({
        attr: { style: 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;' }
      });
      for (const item of fixableItems) {
        const btn = fixRow.createEl('button', {
          text: item.text.replace('{count}', String(item.count)),
          cls: 'mod-cta'
        });
        btn.addEventListener('click', () => {
          item.cb?.();
          this.close();
        });
      }
    }

    // === Layer 3: Smart Fix All (batched all-in-one) ===
    const totalFixable = this.counts.deadLinks + this.counts.emptyPages + this.counts.orphans + this.counts.duplicates + this.counts.pagesMissingAliases;
    if (totalFixable > 0 && this.fixCallbacks.onFixAll) {
      const row = actionSection.createDiv({ attr: { style: 'margin-bottom: 10px;' } });
      const btn = row.createEl('button', {
        text: t.lintModalFixAll.replace('{count}', String(totalFixable)),
        attr: { style: 'font-weight: bold;' }
      });
      btn.addEventListener('click', () => {
        this.fixCallbacks.onFixAll?.();
        this.close();
      });
    }

    // === Layer 4: Schema analysis (independent) ===
    if (this.fixCallbacks.onAnalyzeSchema) {
      const row = actionSection.createDiv({ attr: { style: 'margin-top: 8px;' } });
      row.createEl('button', {
        text: t.lintModalAnalyzeSchema,
      }).addEventListener('click', () => {
        this.fixCallbacks.onAnalyzeSchema?.();
        this.close();
      });
    }
  }

  onClose() {
    this.renderComponent?.unload();
    this.contentEl.empty();
  }
}