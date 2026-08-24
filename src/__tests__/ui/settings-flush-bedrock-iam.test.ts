// flushBedrockIamKeys triad (#425 review follow-up): partial input is
// NEVER persisted and buffers survive for retry; success wipes buffers
// only AFTER the SecretStorage write returns (the #339 wipe-before-IO
// hazard is excluded by construction — this test pins it).
//
// Tab construction follows the prototype-stub pattern from
// settings-commit-flush-api-key.test.ts: flushBedrockIamKeys reads only
// plugin.bedrockAuthManager + its own buffer fields + getText.

import { describe, expect, it, vi } from 'vitest';
import { LLMWikiSettingTab } from '../../ui/settings';

function makeTab(failSave = false) {
  const savedKeys: Array<Record<string, string>> = [];
  const manager = {
    saveIamKeys: vi.fn((keys: Record<string, string>) => {
      if (failSave) throw new Error('keychain unavailable');
      savedKeys.push(keys);
    }),
    hasSsoToken: () => false,
    hasIamKeys: () => savedKeys.length > 0,
    clearIamKeys: vi.fn(),
  };
  const tab = Object.create(LLMWikiSettingTab.prototype) as LLMWikiSettingTab;
  (tab as unknown as { app: unknown }).app = {};
  (tab as unknown as { plugin: unknown }).plugin = { bedrockAuthManager: manager };
  (tab as unknown as { tempSettings: unknown }).tempSettings = { language: 'en' };
  tab.bedrockIamKeyBuffer = '';
  tab.bedrockIamSecretBuffer = '';
  tab.bedrockIamSessionTokenBuffer = '';
  return { tab, manager, savedKeys };
}

describe('flushBedrockIamKeys — triad', () => {
  it('partial entry persists nothing and keeps buffers for retry', () => {
    const { tab, savedKeys } = makeTab();
    tab.bedrockIamKeyBuffer = 'AKIA';
    tab.flushBedrockIamKeys();
    expect(savedKeys).toHaveLength(0);
    expect(tab.bedrockIamKeyBuffer).toBe('AKIA'); // kept for retry
  });

  it('complete entry writes to SecretStorage THEN clears the buffers', () => {
    const { tab, manager } = makeTab();
    tab.bedrockIamKeyBuffer = 'AKIA';
    tab.bedrockIamSecretBuffer = 'sk';
    // Record buffer state DURING the write: must not be wiped before IO.
    let wipedDuringWrite = false;
    manager.saveIamKeys.mockImplementation(() => {
      wipedDuringWrite = tab.bedrockIamKeyBuffer === '' && tab.bedrockIamSecretBuffer === '';
    });
    tab.flushBedrockIamKeys();
    expect(wipedDuringWrite).toBe(false); // #339 invariant holds by construction
    expect(manager.saveIamKeys).toHaveBeenCalledWith({ accessKeyId: 'AKIA', secretAccessKey: 'sk' });
    expect(tab.bedrockIamKeyBuffer).toBe('');
    expect(tab.bedrockIamSecretBuffer).toBe('');
  });

  it('session token rides along when present', () => {
    const { tab, manager } = makeTab();
    tab.bedrockIamKeyBuffer = 'ASIA';
    tab.bedrockIamSecretBuffer = 'sk';
    tab.bedrockIamSessionTokenBuffer = 'tok';
    tab.flushBedrockIamKeys();
    expect(manager.saveIamKeys).toHaveBeenCalledWith({ accessKeyId: 'ASIA', secretAccessKey: 'sk', sessionToken: 'tok' });
  });

  it('IO failure keeps the buffers for retry', () => {
    const { tab } = makeTab(true);
    tab.bedrockIamKeyBuffer = 'AKIA';
    tab.bedrockIamSecretBuffer = 'sk';
    tab.flushBedrockIamKeys();
    expect(tab.bedrockIamKeyBuffer).toBe('AKIA');
    expect(tab.bedrockIamSecretBuffer).toBe('sk');
  });
});
