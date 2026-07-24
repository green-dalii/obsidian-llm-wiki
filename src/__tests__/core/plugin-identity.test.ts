import { describe, expect, it } from 'vitest';
import manifest from '../../../manifest.json';
import {
  PLUGIN_CODEX_SECRET_ID,
  PLUGIN_ID,
  PLUGIN_MINERU_TOKEN_SECRET_ID,
  PLUGIN_NAME,
  PLUGIN_PROVIDER_API_KEY_SECRET_ID,
} from '../../core/plugin-identity';
import { getPdfCacheDir } from '../../core/pdf-cache';

describe('fork plugin identity', () => {
  it('keeps manifest, constants, and cache path aligned', () => {
    const configDir = ['.', 'obsidian'].join('');

    expect(PLUGIN_ID).toBe('karpathywiki-mineru');
    expect(PLUGIN_NAME).toBe('Karpathy LLM Wiki MinerU');
    expect(PLUGIN_CODEX_SECRET_ID).toBe('karpathywiki-mineru-openai-codex');
    expect(PLUGIN_PROVIDER_API_KEY_SECRET_ID).toBe('karpathywiki-mineru-provider-api-key');
    expect(PLUGIN_MINERU_TOKEN_SECRET_ID).toBe('karpathywiki-mineru-mineru-api-token');
    expect(manifest.id).toBe(PLUGIN_ID);
    expect(manifest.name).toBe(PLUGIN_NAME);
    expect(getPdfCacheDir({ vault: { configDir } }))
      .toBe(`${configDir}/plugins/karpathywiki-mineru/pdf-cache`);
  });
});
