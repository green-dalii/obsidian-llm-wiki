/**
 * v1.26.0 (#382 item 2): Advanced Settings panel renderer.
 *
 * The bottom-most section of the Settings tab. A generic home for ALL
 * advanced-user settings that are NOT LLM sampling parameters (those live
 * in the Advanced section under advancedSettingsMode). Currently:
 *
 *   - "Advanced settings" H2 heading
 *   - Show advanced settings toggle (default off)
 *   - When on:
 *       - 3 lint dedup threshold inputs (no sub-heading — the parent
 *         "Advanced settings" heading already groups these power-user knobs)
 *       - Max Conversation History dropdown (moved from Wiki Configuration)
 *       - Write PDF Markdown to Vault toggle (moved from Wiki Configuration)
 *       - Slug Case dropdown (moved from Wiki Configuration)
 *       - First-run Welcome note toggle (moved from Auto Maintenance)
 *
 * Why separate from Auto Maintenance / Wiki Configuration:
 *   - Auto Maintenance is daily-driver config (watch, periodic lint, smart
 *     fix). Wiki Configuration is daily storage/format config (folder,
 *     granularity, tags). Lint thresholds, sidecar writes, slug casing, and
 *     the Welcome note are power-user / one-time choices — they clutter the
 *     everyday surface.
 *   - This section is the designated home for FUTURE advanced-user
 *     settings, so a power user has one place to look instead of hunting
 *     across sections.
 *
 * Invariant: closing the showAdvancedSettings toggle resets every gated
 * field to its default (lint thresholds → undefined, writePdfMarkdownToVault
 * → undefined, slugCase → 'lower') so a hidden setting never keeps a
 * no-UI-affordance value. Welcome note (createWelcomeNote) is NOT reset on
 * close — it is a permanent first-run behavior, only its UI home moved.
 */

import { Setting } from 'obsidian';
import type { LLMWikiSettingTab } from '../settings';
import { renderNumberInput } from './shared-inputs';

export function renderAdvancedSettingsSection(tab: LLMWikiSettingTab, containerEl: HTMLElement): void {
  const { tempSettings } = tab;

  // Advanced settings heading
  new Setting(containerEl).setName(tab.getText('advancedSettingsSection')).setHeading();

  // Show advanced settings toggle
  new Setting(containerEl)
    .setName(tab.getText('showAdvancedSettingsName'))
    .setDesc(tab.getText('showAdvancedSettingsDesc'))
    .addToggle(toggle => toggle
      .setValue(tempSettings.showAdvancedSettings === true)
      .onChange((value) => {
        tempSettings.showAdvancedSettings = value;
        if (!value) {
          // Closing the panel resets every gated field to its default so a
          // hidden setting never keeps a no-UI-affordance value.
          tempSettings.lintJaccardLinkThreshold = undefined;
          tempSettings.lintJaccardBodyGate = undefined;
          tempSettings.lintBigramThreshold = undefined;
          tempSettings.writePdfMarkdownToVault = undefined;
          tempSettings.slugCase = 'lower';
        }
        tab.display();
      }));

  if (!tempSettings.showAdvancedSettings) return;

  // Lint duplicate-detection thresholds (no sub-heading — the parent
  // "Advanced settings" H2 already groups these power-user knobs; adding
  // a sub-heading would create a redundant level-3 layer that adds noise
  // without adding structure).
  renderNumberInput(tab, containerEl, 'lintDedupJaccardLinkThresholdName', 'lintDedupJaccardLinkThresholdDesc', 'lintJaccardLinkThreshold', '1');
  renderNumberInput(tab, containerEl, 'lintDedupJaccardBodyGateName', 'lintDedupJaccardBodyGateDesc', 'lintJaccardBodyGate', '1');
  renderNumberInput(tab, containerEl, 'lintDedupBigramThresholdName', 'lintDedupBigramThresholdDesc', 'lintBigramThreshold', '1');

  // Max Conversation History (moved from Wiki Configuration in v1.26.0 —
  // the presets dropdown is a one-time tuning choice most users don't
  // revisit).
  new Setting(containerEl)
    .setName(tab.getText('maxConversationHistoryName'))
    .setDesc(tab.getText('maxConversationHistoryDesc'))
    .addDropdown(dropdown => {
      const presets = [1, 10, 30, 50, 100, 500];
      for (const n of presets) {
        dropdown.addOption(n.toString(), n.toString());
      }
      const current = tempSettings.maxConversationHistory;
      const currentStr = presets.includes(current) ? current.toString() : '50';
      dropdown.setValue(currentStr);
      dropdown.onChange((value) => {
        const parsed = parseInt(value);
        if (!isNaN(parsed) && parsed >= 1) {
          tempSettings.maxConversationHistory = parsed;
        }
      });
    });

  // v1.25.0 PR3: opt-in sidecar write (PDF → Markdown). Moved here from
  // Wiki Configuration in v1.26.0 — a power-user storage policy choice.
  if (tempSettings.pdfConversionBackend !== 'mineru') {
    new Setting(containerEl)
      .setName(tab.getText('writePdfMarkdownToVaultName'))
      .setDesc(tab.getText('writePdfMarkdownToVaultDesc'))
      .addToggle(toggle => toggle
        .setValue(tempSettings.writePdfMarkdownToVault === true)
        .onChange((value) => { tempSettings.writePdfMarkdownToVault = value; }));
  }

  // Slug Case (filename casing for generated wiki pages). Moved here from
  // Wiki Configuration in v1.26.0 — a one-time naming-policy choice.
  new Setting(containerEl)
    .setName(tab.getText('slugCaseName'))
    .setDesc(tab.getText('slugCaseDesc'))
    .addDropdown(dropdown => {
      dropdown.addOption('lower', tab.getText('slugCaseLower'));
      dropdown.addOption('preserve', tab.getText('slugCasePreserve'));
      dropdown.setValue(tempSettings.slugCase || 'lower');
      dropdown.onChange((value: string) => {
        tempSettings.slugCase = value as 'lower' | 'preserve';
      });
    });

  // First-run Welcome note toggle (moved from Auto Maintenance in v1.26.0)
  new Setting(containerEl)
    .setName(tab.getText('welcomeNoteSettingsToggle'))
    .setDesc(tab.getText('welcomeNoteSettingsToggleDesc'))
    .addToggle(toggle => toggle
      .setValue(tempSettings.createWelcomeNote)
      .onChange((value) => { tempSettings.createWelcomeNote = value; }));
}
