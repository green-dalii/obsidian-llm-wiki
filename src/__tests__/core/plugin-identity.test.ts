import { describe, expect, it } from 'vitest';
import manifest from '../../../manifest.json';
import { PLUGIN_ID, PLUGIN_NAME } from '../../core/plugin-identity';
import { getPdfCacheDir } from '../../core/pdf-cache';

describe('fork plugin identity', () => {
  it('keeps manifest, constants, and cache path aligned', () => {
    const configDir = ['.', 'obsidian'].join('');

    expect(PLUGIN_ID).toBe('karpathywiki-mineru');
    expect(PLUGIN_NAME).toBe('Karpathy LLM Wiki MinerU');
    expect(manifest.id).toBe(PLUGIN_ID);
    expect(manifest.name).toBe(PLUGIN_NAME);
    expect(getPdfCacheDir({ vault: { configDir } }))
      .toBe(`${configDir}/plugins/karpathywiki-mineru/pdf-cache`);
  });
});
