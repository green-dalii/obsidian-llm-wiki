import { describe, it, expect } from 'vitest';
import { fixPollutedPage } from '../../../wiki/lint/fix-polluted-page';
import { createMockContext } from '../../__support__/engine-context';

describe('fixPollutedPage', () => {
  it('renames polluted page and rewrites wiki-links across the vault', async () => {
    const oldPath = 'wiki/entities/布局优化.md';
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        [oldPath]: '---\ntype: entity\n---\n# 布局优化\n\nBody content.',
        // Another page linking to the polluted page, both piped and unpiped forms
        'wiki/concepts/some.md': '# Some\n\nSee [[entities/布局优化|layout]] and [[entities/布局优化]].\n',
      },
    });

    const result = await fixPollutedPage(ctx, oldPath, 'layout-optimization');

    expect(result).toMatch(/renamed/);
    // Old polluted file should be gone
    expect(vault.read(oldPath)).toBeNull();
    // New clean file should contain the original content
    const newContent = vault.read('wiki/entities/layout-optimization.md');
    expect(newContent).toContain('# 布局优化');
    // External page links should be rewritten
    const updated = vault.read('wiki/concepts/some.md');
    expect(updated).toContain('[[entities/layout-optimization|layout]]');
    expect(updated).toContain('[[entities/layout-optimization]]');
    expect(updated).not.toContain('[[entities/布局优化');
  });

  it('merges into existing clean path when target already exists', async () => {
    const oldPath = 'wiki/entities/布局优化.md';
    const newPath = 'wiki/entities/layout-optimization.md';
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        [oldPath]: '---\ntype: entity\n---\n# 布局优化\n\nOld polluted body.',
        [newPath]: '---\ntype: entity\n---\n# Layout Optimization\n\nExisting clean body.',
      },
    });

    const result = await fixPollutedPage(ctx, oldPath, 'layout-optimization');

    expect(result).toMatch(/merged/);
    // Old polluted file should be deleted
    expect(vault.read(oldPath)).toBeNull();
    // Clean path should be kept (not overwritten with old content)
    const keptContent = vault.read(newPath);
    expect(keptContent).toContain('Existing clean body');
    expect(keptContent).not.toContain('Old polluted body');
  });
});
