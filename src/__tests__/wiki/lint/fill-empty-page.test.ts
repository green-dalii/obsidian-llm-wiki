import { describe, it, expect } from 'vitest';
import { fillEmptyPage } from '../../../wiki/lint/fill-empty-page';
import { createMockContext } from '../../__support__/engine-context';

describe('fillEmptyPage', () => {
  it('expands a stub entity page with LLM-generated content', async () => {
    const pagePath = 'wiki/entities/empty-entity.md';
    const stubContent = '---\ntype: entity\n---\n# EmptyEntity\n\nAuto-generated stub page.\n';
    const { ctx, vault } = createMockContext({
      vaultFiles: { [pagePath]: stubContent },
      llmResponses: [
        // LLM returns a full page with frontmatter + body
        '---\ntype: entity\n---\n# EmptyEntity\n\n## Basic Information\n\nA real entity with substantial content for the LLM to generate.\n\n## Description\n\nSome description here that exceeds fifty characters to ensure the threshold is met.\n',
      ],
    });
    const result = await fillEmptyPage(ctx, pagePath);

    expect(result).toMatch(/entities\/empty-entity \(/);
    const updated = vault.read(pagePath);
    expect(updated).not.toBeNull();
    expect(updated!.length).toBeGreaterThan(stubContent.length);
    // Stub marker should be stripped
    expect(updated).not.toContain('Auto-generated stub page');
    // type should still be entity after enforceFrontmatterConstraints
    expect(updated).toMatch(/type:\s*entity/);
  });

  it('uses existingContent parameter without reading file again', async () => {
    const pagePath = 'wiki/concepts/empty-concept.md';
    const existingContent = '# MyConcept\n\nAuto-generated stub page.\n';
    const { ctx, vault } = createMockContext({
      // Note: pagePath file is intentionally absent — should not be read
      vaultFiles: {},
      llmResponses: [
        '---\ntype: concept\n---\n# MyConcept\n\n## Definition\n\nA real concept definition that is long enough to exceed the fifty character threshold easily.\n',
      ],
    });
    // Pre-load the vault with empty content so tryReadFile would fail
    // (or just pass existingContent directly)
    const result = await fillEmptyPage(ctx, pagePath, existingContent);

    expect(result).toMatch(/concepts\/empty-concept/);
    const updated = vault.read(pagePath);
    expect(updated).not.toBeNull();
    expect(updated).toMatch(/type:\s*concept/);
  });

  it('writes anyway when LLM output is below threshold', async () => {
    const pagePath = 'wiki/entities/empty-entity.md';
    const { ctx, vault } = createMockContext({
      vaultFiles: { [pagePath]: '---\ntype: entity\n---\n# X\n' },
      llmResponses: [
        // LLM returns very short content (below 50 chars)
        '---\ntype: entity\n---\n# X\n\nshort',
      ],
    });
    const result = await fillEmptyPage(ctx, pagePath);

    expect(result).toMatch(/entities\/empty-entity/);
    // File should still be written despite threshold warning
    const updated = vault.read(pagePath);
    expect(updated).not.toBeNull();
  });

  it('throws when file not found and no existingContent provided', async () => {
    const { ctx } = createMockContext({
      vaultFiles: {},
    });
    await expect(fillEmptyPage(ctx, 'wiki/entities/missing.md')).rejects.toThrow(/file not found/);
  });
});
