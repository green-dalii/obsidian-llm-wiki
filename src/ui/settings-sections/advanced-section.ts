/**
 * v1.25.1 Phase C-PR2: Advanced section renderer.
 *
 * Extracted from `LLMWikiSettingTab.display()`. Renders the Advanced
 * Settings block:
 *
 *   - Advanced Settings Mode dropdown (default / custom)
 *   - Disable Thinking toggle (only in custom mode)
 *   - Per-step output mode / thinking spec (Issue #524, only in custom mode)
 *   - Three temperature / repetition penalty number inputs
 *   - Force PDF Support toggle (v1.25.0 PR3 universal escape hatch)
 *
 * NOTE (v1.26.0 #382 item 2): the lint dedup threshold inputs ORIGINALLY
 * landed in this section, but were moved to the bottom "Advanced settings"
 * panel (advanced-settings-section.ts) — this section is exclusively LLM
 * sampling parameters (temperature / penalty / PDF force support / thinking),
 * and lint quality knobs belong with the generic advanced-user panel, not
 * with LLM sampling. The number-input helper both panels use lives in
 * `./shared-inputs`. The mode dropdown key was renamed
 * `advancedSettingsModeName` → `advancedLlmModeName` to make the LLM-scope
 * explicit.
 *
 * Why extracted:
 *   - The block has nested conditional rendering (custom mode gates
 *     4 sub-controls) and one cross-section invariant (forcePdfSupport
 *     resets to false when Advanced mode flips back to default).
 *     Isolating it makes both invariants easier to audit.
 *
 * Invariants preserved:
 *   - Switching Advanced to default mode resets disableThinking +
 *     all 3 temperature/penalty fields + taskPolicies + forcePdfSupport
 *     to defaults.
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
import { renderNumberInput } from './shared-inputs';
import { formatTaskPolicyMap, parseTaskPolicySpec } from '../../core/task-policy';

export function renderAdvancedSection(tab: LLMWikiSettingTab, containerEl: HTMLElement): void {
  const { tempSettings } = tab;

  // Advanced Settings Mode dropdown (v1.26.0 renamed advancedSettingsModeName
  // → advancedLlmModeName to disambiguate from the generic bottom "Advanced
  // settings" panel — this dropdown is specifically about LLM sampling params).
  new Setting(containerEl)
    .setName(tab.getText('advancedLlmModeName'))
    .setDesc(tab.getText('advancedLlmModeDesc'))
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
            // Issue #524: the per-step policy is rendered only inside this
            // block, same reasoning as forcePdfSupport below.
            tempSettings.taskPolicies = undefined;
            // v1.25.0 PR3: reset forcePdfSupport - it's rendered only inside
            // the Advanced block, so hiding the block without resetting
            // the value would leave users with a no-UI-affordance setting.
            tempSettings.forcePdfSupport = false;
            // writePdfMarkdownToVault lives in the bottom "Advanced settings"
            // panel (gated by showAdvancedSettings) and is NOT reset here —
            // that panel's own toggle reset handles it.
            // v1.26.0 (#382 item 1, Batch 2): lintDedupIncludeSources reset
            // lives in the bottom "Advanced settings" panel
            // (advanced-settings-section.ts) where its toggle is now
            // rendered. This LLM-Advanced reset block intentionally does
            // NOT reset it.
            // tempSettings.lintDedupIncludeSources = undefined;
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

  // Issue #524: per-step output mode / thinking (src/core/task-policy.ts).
  // The field existed since #490 but only data.json reached it; without a
  // control no user could move a step off the built-in baseline or back
  // onto the schema. Spec format `step=mode[:thinking]`, comma-separated,
  // e.g. `extract=text:off`. Blank = built-in baseline. An unreadable spec
  // is reported on the input and not saved, so the last good value stands.
  new Setting(containerEl)
    .setName(tab.getText('taskPoliciesName'))
    .setDesc(tab.getText('taskPoliciesDesc'))
    .addText(text => {
      text
        .setPlaceholder(tab.getText('taskPoliciesPlaceholder'))
        .setValue(tempSettings.taskPolicies ? formatTaskPolicyMap(tempSettings.taskPolicies) : '')
        .onChange((value) => {
          const trimmed = value.trim();
          if (trimmed === '') {
            tempSettings.taskPolicies = undefined;
            text.inputEl.setCustomValidity('');
            return;
          }
          try {
            tempSettings.taskPolicies = parseTaskPolicySpec(trimmed);
            text.inputEl.setCustomValidity('');
          } catch (err) {
            text.inputEl.setCustomValidity(err instanceof Error ? err.message : String(err));
            text.inputEl.reportValidity();
          }
        });
    });

  // Three temperature / repetition penalty inputs. Shared number-input
  // helper from ./shared-inputs (also used by Auto Maintenance for the
  // lint dedup thresholds). It takes string keys and routes them through
  // getTextDynamic (v1.25.1 Phase C-PR2 simplify pass — keep type-safe
  // getText for literal keys, only widen for the parametric ones).
  renderNumberInput(tab, containerEl, 'extractionTemperatureName', 'extractionTemperatureDesc', 'extractionTemperature');
  renderNumberInput(tab, containerEl, 'chatTemperatureName', 'chatTemperatureDesc', 'chatTemperature');
  renderNumberInput(tab, containerEl, 'repetitionPenaltyName', 'repetitionPenaltyDesc', 'repetitionPenalty');

  // v1.26.0 (#382 item 1, Batch 2): lintDedupIncludeSources toggle was
  // rendered here in an earlier draft of this commit, but it belongs in
  // the bottom "Advanced settings" panel (advanced-settings-section.ts),
  // not in the LLM Advanced section. LLM sampling parameters and
  // per-source-file dedup toggles are different scopes — keeping them
  // in separate panels avoids the "Advanced" name collision. See CLAUDE.md
  // "Tech debt: LLM Advanced vs bottom Advanced settings panel" for the
  // structural naming-collision concern.

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
