import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types';
import { TEXTS } from '../../texts';
import { renderAdvancedSection } from '../../ui/settings-sections/advanced-section';
import { renderAdvancedSettingsSection } from '../../ui/settings-sections/advanced-settings-section';
import { renderWikiConfigSection } from '../../ui/settings-sections/wiki-config-section';
import type { LLMWikiSettingTab } from '../../ui/settings';

const { ui, SettingMock } = vi.hoisted(() => {
  type ChangeHandler = (value: string) => void;
  const state = {
    isDesktopApp: true,
    settings: [] as LocalSettingMock[],
  };

  class LocalControlMock {
    value = '';
    disabled = false;
    options = new Map<string, { label: string; disabled: boolean }>();
    onChangeHandler?: ChangeHandler;
    inputEl = {
      type: '',
      min: '',
      max: '',
      step: '',
      classList: { add: vi.fn() },
    };
    selectEl = {
      querySelector: (selector: string) => {
        const match = selector.match(/^option\[value="(.+)"\]$/);
        return match ? this.options.get(match[1]) ?? null : null;
      },
    };

    addOption(value: string, label: string): this {
      this.options.set(value, { label, disabled: false });
      return this;
    }
    setValue(value: string): this { this.value = value; return this; }
    setPlaceholder(): this { return this; }
    setDisabled(value: boolean): this { this.disabled = value; return this; }
    onChange(handler: ChangeHandler): this { this.onChangeHandler = handler; return this; }
    trigger(value: string): void { this.onChangeHandler?.(value); }
  }

  class LocalSettingMock {
    name = '';
    desc = '';
    heading = false;
    control?: LocalControlMock;
    settingEl = { style: { display: '' } };

    constructor(_containerEl: HTMLElement) { state.settings.push(this); }
    setName(value: string): this { this.name = value; return this; }
    setDesc(value: string): this { this.desc = value; return this; }
    setHeading(): this { this.heading = true; return this; }
    addDropdown(callback: (control: LocalControlMock) => void): this {
      this.control = new LocalControlMock();
      callback(this.control);
      return this;
    }
    addText(callback: (control: LocalControlMock) => void): this {
      this.control = new LocalControlMock();
      callback(this.control);
      return this;
    }
    addToggle(callback: (control: LocalControlMock) => void): this {
      this.control = new LocalControlMock();
      callback(this.control);
      return this;
    }
    addButton(): this { return this; }
    addComponent(): this { return this; }
  }

  return { ui: state, SettingMock: LocalSettingMock };
});

type SettingMock = InstanceType<typeof SettingMock>;

vi.mock('obsidian', () => ({
  Setting: SettingMock,
  Notice: class {},
  TFile: class {},
  BaseComponent: class {},
  Modal: class {},
  Component: class {},
  Platform: {
    get isDesktopApp() { return ui.isDesktopApp; },
  },
}));

function createTab(overrides: Partial<typeof DEFAULT_SETTINGS> = {}): LLMWikiSettingTab {
  return {
    tempSettings: { ...DEFAULT_SETTINGS, ...overrides },
    getText: (key: string) => key,
    getTextDynamic: (key: string) => key,
    display: vi.fn(),
    isWikiInitialized: vi.fn(() => true),
    app: {
      secretStorage: { getSecret: () => null, setSecret: vi.fn() },
      vault: { getAbstractFileByPath: vi.fn() },
      workspace: { getLeaf: vi.fn() },
    },
    plugin: { wikiEngine: {} },
  } as unknown as LLMWikiSettingTab;
}

function renderWiki(tab: LLMWikiSettingTab): void {
  ui.settings.length = 0;
  renderWikiConfigSection(tab, {} as HTMLElement);
}

function renderAdvancedSettings(tab: LLMWikiSettingTab): void {
  ui.settings.length = 0;
  renderAdvancedSettingsSection(tab, {} as HTMLElement);
}

function setting(name: string): SettingMock | undefined {
  return ui.settings.find((item) => item.name === name);
}

describe('PDF backend settings', () => {
  beforeEach(() => {
    ui.isDesktopApp = true;
    ui.settings.length = 0;
  });

  it('defaults to native and keeps the native sidecar setting in Advanced Settings', () => {
    const tab = createTab();
    renderWiki(tab);

    const backend = setting('pdfConversionBackendName')?.control;
    expect(backend?.value).toBe('native');
    expect([...backend!.options.keys()]).toEqual(['native', 'mineru']);
    expect(setting('writePdfMarkdownToVaultName')).toBeUndefined();
    expect(setting('mineruApiTokenName')).toBeUndefined();
    expect(setting('mineruTaskTimeoutName')).toBeUndefined();

    tab.tempSettings.showAdvancedSettings = true;
    renderAdvancedSettings(tab);
    expect(setting('writePdfMarkdownToVaultName')).toBeDefined();
  });

  it('shows MinerU-only fields, uses a password token, and hides the native sidecar', () => {
    const tab = createTab({ pdfConversionBackend: 'mineru', mineruApiToken: 'saved-token' });
    renderWiki(tab);

    expect(setting('writePdfMarkdownToVaultName')).toBeUndefined();
    expect(setting('mineruApiTokenName')?.control?.value).toBe('saved-token');
    expect(setting('mineruApiTokenName')?.control?.inputEl.type).toBe('password');
    expect(setting('mineruTaskTimeoutName')).toBeDefined();
    expect(ui.settings.some((item) => item.desc === 'mineruUploadDisclosure')).toBe(true);

    tab.tempSettings.showAdvancedSettings = true;
    renderAdvancedSettings(tab);
    expect(setting('writePdfMarkdownToVaultName')).toBeUndefined();
  });

  it('preserves an explicit empty MinerU token edit across settings rerenders', () => {
    const tab = createTab({ pdfConversionBackend: 'mineru' });
    tab.app.secretStorage.getSecret = vi.fn(() => 'stored-token');
    renderWiki(tab);

    setting('mineruApiTokenName')?.control?.trigger('');
    renderWiki(tab);

    expect(tab.pendingMineruTokenEdit).toBe('');
    expect(setting('mineruApiTokenName')?.control?.value).toBe('');
  });

  it('refreshes on backend changes without clearing the saved MinerU token', () => {
    const tab = createTab({ pdfConversionBackend: 'mineru', mineruApiToken: 'keep-me' });
    renderWiki(tab);
    setting('pdfConversionBackendName')?.control?.trigger('native');

    expect(tab.tempSettings.pdfConversionBackend).toBe('native');
    expect(tab.tempSettings.mineruApiToken).toBe('keep-me');
    expect((tab.display as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it('clamps valid timeout input to 5-120 and never stores NaN', () => {
    const tab = createTab({ pdfConversionBackend: 'mineru', mineruTaskTimeoutMinutes: 30 });
    renderWiki(tab);
    const timeout = setting('mineruTaskTimeoutName')?.control;

    timeout?.trigger('4');
    expect(tab.tempSettings.mineruTaskTimeoutMinutes).toBe(5);
    expect(timeout?.value).toBe('5');
    timeout?.trigger('121');
    expect(tab.tempSettings.mineruTaskTimeoutMinutes).toBe(120);
    expect(timeout?.value).toBe('120');
    timeout?.trigger('12.5');
    expect(tab.tempSettings.mineruTaskTimeoutMinutes).toBe(12.5);
    timeout?.trigger('12minutes');
    expect(tab.tempSettings.mineruTaskTimeoutMinutes).toBe(12.5);
    timeout?.trigger('not-a-number');
    expect(tab.tempSettings.mineruTaskTimeoutMinutes).toBe(12.5);
    expect(Number.isNaN(tab.tempSettings.mineruTaskTimeoutMinutes)).toBe(false);
  });

  it('shows MinerU as unavailable and rejects selecting it on mobile', () => {
    ui.isDesktopApp = false;
    const tab = createTab({ pdfConversionBackend: 'native' });
    renderWiki(tab);
    const backendSetting = setting('pdfConversionBackendName');
    const backend = backendSetting?.control;

    expect(backend?.options.get('mineru')?.disabled).toBe(true);
    expect(backendSetting?.desc).toContain('mineruDesktopOnlySettingDesc');
    backend?.trigger('mineru');
    expect(tab.tempSettings.pdfConversionBackend).toBe('native');
    expect((tab.display as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it('hides force PDF support for MinerU and preserves backend credentials when Advanced resets', () => {
    const tab = createTab({
      provider: 'custom',
      advancedSettingsMode: 'custom',
      pdfConversionBackend: 'mineru',
      mineruApiToken: 'keep-me',
      forcePdfSupport: true,
    });
    renderAdvancedSection(tab, {} as HTMLElement);

    expect(setting('forcePdfSupportName')).toBeUndefined();
    setting('advancedSettingsModeName')?.control?.trigger('default');
    expect(tab.tempSettings.pdfConversionBackend).toBe('mineru');
    expect(tab.tempSettings.mineruApiToken).toBe('keep-me');
  });
});

describe('PDF backend locale keys', () => {
  const keys = [
    'pdfConversionSection',
    'pdfConversionBackendName',
    'pdfConversionBackendDesc',
    'pdfConversionBackendNative',
    'pdfConversionBackendMineru',
    'mineruApiTokenName',
    'mineruApiTokenDesc',
    'mineruApiTokenPlaceholder',
    'mineruTaskTimeoutName',
    'mineruTaskTimeoutDesc',
    'mineruUploadDisclosure',
    'mineruDesktopOnlySettingDesc',
  ] as const;

  it('defines all keys with matching placeholders in every locale', () => {
    const english = TEXTS.en as unknown as Record<string, string>;
    for (const [locale, texts] of Object.entries(TEXTS)) {
      const values = texts as unknown as Record<string, string>;
      for (const key of keys) {
        expect(values[key], `${locale}.${key}`).toBeTypeOf('string');
        expect(values[key].trim(), `${locale}.${key}`).not.toBe('');
        expect(values[key].match(/\{[^}]+\}/g) ?? [], `${locale}.${key} placeholders`)
          .toEqual(english[key].match(/\{[^}]+\}/g) ?? []);
      }
    }
  });
});
