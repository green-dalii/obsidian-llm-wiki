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

    // Button-row builder: default style (no `mod-cta`) for per-fix
    // buttons, optional `mod-cta` for the highlight action. Keeps the
    // modal visually calm — the user's eyes go to "Smart Fix All" without
    // every secondary button competing for attention.
    const makeButton = (
      parent: HTMLElement,
      text: string,
      cta: boolean,
      click: () => void,
    ): HTMLButtonElement => {
      const btn = parent.createEl('button', { text });
      if (cta) btn.classList.add('mod-cta');
      btn.addEventListener('click', () => {
        click();
        this.close();
      });
      return btn;
    };
    const rowStyle = 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;';

    // === Layer 1: Pre-flight row (alias completion + tag retag share one row) ===
    const preflightCount =
      (this.counts.pagesMissingAliases > 0 ? 1 : 0) +
      (this.counts.tagViolations > 0 ? 1 : 0);
    if (preflightCount > 0) {
      const preflightRow = actionSection.createDiv({ attr: { style: rowStyle } });
      if (this.counts.pagesMissingAliases > 0 && this.fixCallbacks.onCompleteAliases) {
        makeButton(
          preflightRow,
          t.lintAliasesCompleteBtn.replace('{count}', String(this.counts.pagesMissingAliases)),
          false,
          () => this.fixCallbacks.onCompleteAliases?.(),
        );
      }
      if (this.counts.tagViolations > 0 && this.fixCallbacks.onRetagViolations) {
        makeButton(
          preflightRow,
          t.lintTagViolationRetagBtn.replace('{count}', String(this.counts.tagViolations)),
          false,
          () => this.fixCallbacks.onRetagViolations?.(),
        );
      }
    }

    // === Layer 1b: Polluted page fix (structural root cause, optional own row) ===
    if (this.counts.pollutedPages > 0 && this.fixCallbacks.onFixPollutedPages) {
      const pollutedRow = actionSection.createDiv({ attr: { style: rowStyle } });
      makeButton(
        pollutedRow,
        t.lintModalFixPolluted.replace('{count}', String(this.counts.pollutedPages)),
        false,
        () => this.fixCallbacks.onFixPollutedPages?.(),
      );
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
      const fixRow = actionSection.createDiv({ attr: { style: rowStyle } });
      for (const item of fixableItems) {
        makeButton(
          fixRow,
          item.text.replace('{count}', String(item.count)),
          false,
          () => item.cb?.(),
        );
      }
    }

    // === Layer 3 + 4 (combined row): Smart Fix All (highlight) + Analyze Schema ===
    const totalFixable = this.counts.deadLinks + this.counts.emptyPages + this.counts.orphans + this.counts.duplicates + this.counts.pagesMissingAliases;
    const hasFixAll = totalFixable > 0 && this.fixCallbacks.onFixAll;
    const hasAnalyzeSchema = !!this.fixCallbacks.onAnalyzeSchema;
    if (hasFixAll || hasAnalyzeSchema) {
      const summaryRow = actionSection.createDiv({ attr: { style: rowStyle } });
      if (hasFixAll) {
        makeButton(
          summaryRow,
          t.lintModalFixAll.replace('{count}', String(totalFixable)),
          true, // mod-cta — this is the highlight action
          () => this.fixCallbacks.onFixAll?.(),
        );
      }
      if (hasAnalyzeSchema) {
        makeButton(
          summaryRow,
          t.lintModalAnalyzeSchema,
          false,
          () => this.fixCallbacks.onAnalyzeSchema?.(),
        );
      }
    }
  }

  onClose() {
    this.renderComponent?.unload();
    this.contentEl.empty();
  }
}