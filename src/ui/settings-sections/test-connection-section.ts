/**
 * v1.25.1 Phase C-PR2: Test Connection section renderer.
 *
 * Extracted from `LLMWikiSettingTab.display()`. Renders the Test
 * Connection button that probes the live LLM endpoint and on success
 * commits+persists immediately.
 *
 * Why extracted:
 *   - The Test Connection flow has subtle v1.24.1 PATCH Phase 5.5.0
 *     hotfix behavior (commit on success, rollback on failure,
 *     mark llmReady) that is easy to break during future edits.
 *     Isolating it makes the success/failure paths reviewable as a
 *     single unit.
 *
 * Invariants preserved:
 *   - On success: sync every field testLLMConnection may have mutated
 *     into tempSettings; commitTempSettings + saveSettings immediately
 *     so the new model takes effect without the user clicking Save.
 *   - On failure: roll back to oldSettings, do NOT save (broken
 *     config must not be persisted).
 *   - Final llmReady is set to result.success regardless of branch.
 */

import { Setting, Notice } from 'obsidian';
import type { LLMWikiSettingTab } from '../settings';
import { NOTICE_NORMAL, NOTICE_ERROR } from '../../constants';

export function renderTestConnectionSection(tab: LLMWikiSettingTab, containerEl: HTMLElement): void {
  // v1.25.1 Phase C-PR2 simplify pass: applySettings triad (assign
  // plugin.settings + reinit LLM client + propagate to wikiEngine)
  // extracted to a local helper. Used by both success and rollback paths.
  const applySettings = (settings: typeof tab.plugin.settings): void => {
    tab.plugin.settings = settings;
    tab.plugin.initializeLLMClient();
    tab.plugin.wikiEngine?.updateSettings(settings);
  };

  new Setting(containerEl)
    .setName(tab.getText('testConnectionName'))
    .setDesc(tab.getText('testConnectionDesc'))
    .addButton(button => button
      .setButtonText(tab.getText('testButton'))
      .onClick(async () => {
        button.setButtonText(tab.getText('testing'));
        button.setDisabled(true);
        const testSettings = { ...tab.tempSettings };
        const oldSettings = tab.plugin.settings;
        applySettings(testSettings);
        const result = await tab.plugin.testLLMConnection();
        if (!result.success) {
          // Restore live settings on test failure - do not persist broken config.
          applySettings(oldSettings);
          await tab.plugin.saveSettings();
        } else {
          tab.tempSettings.thinkingControlCache = tab.plugin.settings.thinkingControlCache;
          tab.commitTempSettings();
          await tab.plugin.saveSettings();
        }
        tab.tempSettings.llmReady = result.success;
        button.setButtonText(tab.getText('testButton'));
        button.setDisabled(false);
        tab.display();
        new Notice(result.message, result.success ? NOTICE_NORMAL : NOTICE_ERROR);
      }));
}
