import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types';
import { LLMWikiSettingTab } from '../../ui/settings';
import type { LLMWikiSettings } from '../../types';

vi.mock('obsidian', () => ({
  Notice: class {},
  Platform: { isDesktopApp: true, isMobile: false },
  PluginSettingTab: class {},
  Setting: class {},
  TFile: class {},
  TFolder: class {},
  FuzzySuggestModal: class {},
  BaseComponent: class {},
  Modal: class {},
  Component: class {},
  requestUrl: vi.fn(),
}));

function makeTab(overrides: Partial<LLMWikiSettings> = {}) {
  const tempSettings = { ...DEFAULT_SETTINGS, ...overrides };
  const plugin = {
    settings: { ...DEFAULT_SETTINGS },
    saveSettings: vi.fn(async () => undefined),
  };
  const tab = {
    app: {
      secretStorage: {
        getSecret: vi.fn(() => null),
        setSecret: vi.fn(),
      },
    },
    plugin,
    tempSettings,
    cascadeUnifiedModelChange: vi.fn(),
    commitTempSettings: LLMWikiSettingTab.prototype.commitTempSettings,
    flushApiKey: LLMWikiSettingTab.prototype.flushApiKey,
    flushMineruToken: LLMWikiSettingTab.prototype.flushMineruToken,
    saveTempSettings: LLMWikiSettingTab.prototype.saveTempSettings,
    getText: () => 'Secret write failed: {}',
  } as unknown as LLMWikiSettingTab;
  return {
    tab,
    plugin,
    secretStorage: tab.app.secretStorage as unknown as { setSecret: ReturnType<typeof vi.fn> },
  };
}

describe('settings shared safe save path', () => {
  it('flushes a pending MinerU token before committing settings', async () => {
    const { tab, plugin, secretStorage } = makeTab({ mineruApiToken: ' mineru-token ', mineruApiTokenSecretId: 'mineru-slot' });

    await expect(tab.saveTempSettings()).resolves.toBe(true);

    expect(secretStorage.setSecret).toHaveBeenCalledWith('mineru-slot', 'mineru-token');
    expect(tab.tempSettings.mineruApiToken).toBe('');
    expect(plugin.settings.mineruApiToken).toBe('');
    expect(plugin.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('keeps a pending MinerU token and skips settings commit when SecretStorage write fails', async () => {
    const { tab, plugin, secretStorage } = makeTab({ mineruApiToken: 'mineru-token', mineruApiTokenSecretId: 'mineru-slot' });
    secretStorage.setSecret.mockImplementation(() => { throw new Error('keychain locked'); });

    await expect(tab.saveTempSettings()).resolves.toBe(false);

    expect(tab.tempSettings.mineruApiToken).toBe('mineru-token');
    expect(plugin.settings.mineruApiToken).toBe(DEFAULT_SETTINGS.mineruApiToken);
    expect(plugin.saveSettings).not.toHaveBeenCalled();
  });
});
