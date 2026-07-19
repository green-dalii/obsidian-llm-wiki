/**
 * v1.25.1 Phase C-PR2: Advanced section renderer.
 *
 * Extracted from `LLMWikiSettingTab.display()`. Renders the Advanced
 * Settings block:
 *
 *   - Advanced Settings Mode dropdown (default / custom)
 *   - Disable Thinking toggle (only in custom mode)
 *   - Three temperature / repetition penalty number inputs
 *   - Force PDF Support toggle (v1.25.0 PR3 universal escape hatch)
 *
 * Why extracted:
 *   - The block has nested conditional rendering (custom mode gates
 *     4 sub-controls) and one cross-section invariant (forcePdfSupport
 *     resets to false when Advanced mode flips back to default).
 *     Isolating it makes both invariants easier to audit.
 *
 * Invariants preserved:
 *   - Switching Advanced to default mode resets disableThinking +
 *     all 3 temperature/penalty fields + forcePdfSupport to defaults.
 *   - Switching Advanced to default does NOT touch writePdfMarkdownToVault
 *     (that field lives in Wiki Configuration, v1.25.0 PR3).
 *   - forcePdfSupport toggle renders ONLY for non-native providers
 *     (anthropic/openai/bedrock-* already handle PDF natively, so the
 *     escape hatch is meaningless and would mislead users).
 *   - forcePdfSupport is reset to false when provider switches to a
 *     native one (handled in provider-section.ts, not here).
 */

import { Setting } from 'obsidian';
import type { LLMWikiSettingTab } from '../settings';
import { NATIVE_PDF_PROVIDER_IDS } from '../../constants';

export function renderAdvancedSection(tab: LLMWikiSettingTab, containerEl: HTMLElement): void {
  const { tempSettings } = tab;

  // Advanced Settings Mode dropdown
  new Setting(containerEl)
    .setName(tab.getText('advancedSettingsModeName'))
    .setDesc(tab.getText('advancedSettingsModeDesc'))
    .addDropdown(dropdown => {
      dropdown
        .addOption('default', tab.getText('advancedSettingsDefault'))
        .addOption('custom', tab.getText('advancedSettingsCustom'))
        .setValue(tempSettings.advancedSettingsMode || 'default')
        .onChange((value: string) => {
          tempSettings.advancedSettingsMode = value as 'default' | 'custom';
          if (value === 'default') {
            tempSettings.disableThinking = false;
            tempSettings.extractionTemperature = undefined;
            tempSettings.chatTemperature = undefined;
            tempSettings.repetitionPenalty = undefined;
            // v1.25.0 PR3: reset forcePdfSupport - it's rendered only inside
            // the Advanced block, so hiding the block without resetting
            // the value would leave users with a no-UI-affordance setting.
            tempSettings.forcePdfSupport = false;
            // writePdfMarkdownToVault lives in Wiki Configuration (always
            // visible) and is NOT reset here.
          }
          tab.display();
        });
    });

  if (tempSettings.advancedSettingsMode !== 'custom') return;

  // Disable Thinking
  new Setting(containerEl)
    .setName(tab.getText('disableThinkingName'))
    .setDesc(tab.getText('disableThinkingDesc'))
    .addToggle(toggle => toggle
      .setValue(tempSettings.disableThinking === true)
      .onChange((value) => {
        tempSettings.disableThinking = value;
      }));

  // Three temperature / repetition penalty inputs. The local helper takes
  // string keys and routes them through getTextDynamic (v1.25.1 Phase
  // C-PR2 simplify pass — keep type-safe getText for literal keys, only
  // widen for the parametric ones).
  const renderNumericInput = (
    nameKey: string,
    descKey: string,
    fieldKey: 'extractionTemperature' | 'chatTemperature' | 'repetitionPenalty',
  ): void => {
    new Setting(containerEl)
      .setName(tab.getTextDynamic(nameKey))
      .setDesc(tab.getTextDynamic(descKey))
      .addText(text => {
        text
          .setPlaceholder(tab.getText('temperaturePlaceholder'))
          .setValue(tempSettings[fieldKey]?.toString() ?? '')
          .onChange((value) => {
            const trimmed = value.trim();
            if (trimmed === '') {
              tempSettings[fieldKey] = undefined;
            } else {
              const parsed = parseFloat(trimmed);
              if (!isNaN(parsed)) {
                tempSettings[fieldKey] = parsed;
              }
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '0';
        text.inputEl.max = '2';
        text.inputEl.step = '0.05';
        text.inputEl.classList.add('llm-wiki-number-input');
      });
  };

  renderNumericInput('extractionTemperatureName', 'extractionTemperatureDesc', 'extractionTemperature');
  renderNumericInput('chatTemperatureName', 'chatTemperatureDesc', 'chatTemperature');
  renderNumericInput('repetitionPenaltyName', 'repetitionPenaltyDesc', 'repetitionPenalty');

  // v1.25.0 PR3: PDF force-support toggle (universal escape hatch).
  // Renders for ANY non-native provider.
  if (!(NATIVE_PDF_PROVIDER_IDS as readonly string[]).includes(tempSettings.provider)) {
    new Setting(containerEl)
      .setName(tab.getText('forcePdfSupportName'))
      .setDesc(tab.getText('forcePdfSupportDesc'))
      .addToggle(toggle => toggle
        .setValue(tempSettings.forcePdfSupport === true)
        .onChange((value) => { tempSettings.forcePdfSupport = value; }));
  }
}
