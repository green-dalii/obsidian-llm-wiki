import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types';
import { renderProviderSection } from '../../ui/settings-sections/provider-section';
import { renderModelSection } from '../../ui/settings-sections/model-section';
import { renderTestConnectionSection } from '../../ui/settings-sections/test-connection-section';
import type { LLMWikiSettingTab } from '../../ui/settings';

const { buttonClicks, settingNames } = vi.hoisted(() => ({ buttonClicks: [] as Array<() => unknown>, settingNames: [] as string[] }));

vi.mock('obsidian', () => {
  class ControlMock {
    inputEl = { type: '' };
    addOption(): this { return this; }
    setValue(): this { return this; }
    onChange(): this { return this; }
    setPlaceholder(): this { return this; }
    setLimits(): this { return this; }
    setDynamicTooltip(): this { return this; }
    setButtonText(): this { return this; }
    setDisabled(): this { return this; }
    setWarning(): this { return this; }
    onClick(callback: () => unknown): this { buttonClicks.push(callback); return this; }
  }
  class SettingMock {
    settingEl = { style: { display: '' } };
    constructor(_containerEl: HTMLElement) {}
    setName(value: string): this { settingNames.push(value); return this; }
    setDesc(): this { return this; }
    setHeading(): this { return this; }
    addDropdown(callback: (control: ControlMock) => void): this { callback(new ControlMock()); return this; }
    addText(callback: (control: ControlMock) => void): this { callback(new ControlMock()); return this; }
    addSlider(callback: (control: ControlMock) => void): this { callback(new ControlMock()); return this; }
    addButton(callback: (control: ControlMock) => void): this { callback(new ControlMock()); return this; }
    then(callback: (setting: SettingMock) => void): this { callback(this); return this; }
  }
  return { Setting: SettingMock, Notice: class {}, Platform: { isMobile: false }, requestUrl: vi.fn() };
});

function createTab(): LLMWikiSettingTab {
  const modelFields: Array<{ allowCustom?: boolean }> = [];
  return {
    tempSettings: { ...DEFAULT_SETTINGS, provider: 'openai-codex', model: 'gpt-5.5' },
    plugin: { codexAuthManager: { hasCredential: () => false } },
    codexAuthBusy: false,
    codexDevicePrompt: null,
    getText: (key: string) => key,
    getTextDynamic: (key: string) => key,
    display: vi.fn(),
    renderModelField: (_container: HTMLElement, _field: string, options: { allowCustom?: boolean }) => { modelFields.push(options); },
    cascadeUnifiedModelChange: vi.fn(),
    prefillPerTaskFromUnified: vi.fn(),
    markLLMConfigStale: vi.fn(),
    loginOpenAICodexBrowser: vi.fn(),
    loginOpenAICodexDevice: vi.fn(),
    signOutOpenAICodex: vi.fn(),
    refreshOpenAICodexModels: vi.fn(),
    copyOpenAICodexDeviceCode: vi.fn(),
    queueStaleCodexModelRefresh: vi.fn(),
    __modelFields: modelFields,
  } as unknown as LLMWikiSettingTab;
}

describe('Codex settings section integration', () => {
  beforeEach(() => { buttonClicks.length = 0; settingNames.length = 0; });
  it('renders OAuth controls instead of an API key field', () => {
    renderProviderSection(createTab(), {} as HTMLElement);
    expect(settingNames).toContain('codexAuthName');
    expect(settingNames).not.toContain('apiKeyName');
  });
  it('uses the account catalog without generic fetch or custom model entry', () => {
    const tab = createTab();
    renderModelSection(tab, {} as HTMLElement);
    const fields = (tab as unknown as { __modelFields: Array<{ allowCustom?: boolean }> }).__modelFields;
    expect(settingNames).not.toContain('fetchModelsName');
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.every((field) => field.allowCustom === false)).toBe(true);
  });
  it('persists successful connection readiness', async () => {
    const persisted: boolean[] = [];
    const tab = createTab();
    tab.tempSettings.llmReady = false;
    tab.plugin.settings = { ...tab.tempSettings };
    tab.plugin.initializeLLMClient = vi.fn();
    tab.plugin.wikiEngine = { updateSettings: vi.fn() } as never;
    tab.plugin.testLLMConnection = vi.fn(async () => { tab.plugin.settings.llmReady = true; return { success: true, message: 'ok' }; });
    tab.plugin.saveSettings = vi.fn(async () => { persisted.push(tab.plugin.settings.llmReady); });
    tab.commitTempSettings = vi.fn(() => { tab.plugin.settings = { ...tab.tempSettings }; });
    tab.syncCodexModelsFromPlugin = vi.fn();
    renderTestConnectionSection(tab, {} as HTMLElement);
    await buttonClicks[0]();
    expect(tab.tempSettings.llmReady).toBe(true);
    expect(tab.plugin.settings.llmReady).toBe(true);
    expect(persisted).toEqual([true]);
  });
  it('preserves the active non-Codex model when a Codex connection test fails', async () => {
    const tab = createTab();
    tab.plugin.settings = { ...DEFAULT_SETTINGS, provider: 'openai', model: 'gpt-4.1', availableModels: ['gpt-4.1'] };
    tab.plugin.initializeLLMClient = vi.fn();
    tab.plugin.wikiEngine = { updateSettings: vi.fn() } as never;
    tab.plugin.testLLMConnection = vi.fn(async () => {
      tab.plugin.settings.model = 'codex-model';
      tab.plugin.settings.openAICodexModels = [{ slug: 'codex-model', displayName: 'Codex Model', supportedReasoningLevels: [], additionalSpeedTiers: [], serviceTiers: [] }];
      tab.plugin.settings.openAICodexModelsFetchedAt = 123;
      return { success: false, message: 'failed' };
    });
    tab.plugin.saveSettings = vi.fn();
    renderTestConnectionSection(tab, {} as HTMLElement);
    await buttonClicks[0]();
    expect(tab.plugin.settings).toMatchObject({ provider: 'openai', model: 'gpt-4.1', availableModels: ['gpt-4.1'], openAICodexModels: [{ slug: 'codex-model' }], openAICodexModelsFetchedAt: 123 });
  });
});
