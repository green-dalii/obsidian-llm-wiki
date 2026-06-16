import { describe, it, expect } from 'vitest';
import { deleteEmptyStubs } from '../../../wiki/lint/delete-empty-stubs';
import { createMockContext } from '../../__support__/engine-context';

describe('deleteEmptyStubs', () => {
  it('deletes empty stub pages and reports count', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        // Below threshold — should be deleted
        'wiki/entities/empty1.md': '---\ntype: entity\n---\n# Empty1\n\n',
        // Substantive content — should be kept
        'wiki/entities/full.md': '---\ntype: entity\n---\n# Full\n\nThis is a substantive entity page with enough content to exceed the fifty character threshold for empty page detection.\n',
        // Below threshold — should be deleted
        'wiki/concepts/empty2.md': '---\ntype: concept\n---\n# Empty2\n',
        // index.md should be excluded
        'wiki/index.md': 'Index content',
        // schema/ should be excluded
        'wiki/schema/config.md': 'schema',
        // sources/ should be excluded
        'wiki/sources/some-source.md': '# source content',
        // contradictions/ should be excluded
        'wiki/contradictions/c1.md': 'c',
      },
    });
    const result = await deleteEmptyStubs(ctx, 'wiki');

    expect(result.deleted).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
    // Verify deletions
    expect(vault.read('wiki/entities/empty1.md')).toBeNull();
    expect(vault.read('wiki/concepts/empty2.md')).toBeNull();
    // Verify kept files
    expect(vault.read('wiki/entities/full.md')).not.toBeNull();
    expect(vault.read('wiki/index.md')).not.toBeNull();
    expect(vault.read('wiki/schema/config.md')).not.toBeNull();
    expect(vault.read('wiki/sources/some-source.md')).not.toBeNull();
  });

  it('skips reviewed pages even when content is empty', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        'wiki/entities/empty-reviewed.md': '---\ntype: entity\nreviewed: true\n---\n# Empty\n\n',
        'wiki/entities/empty-normal.md': '---\ntype: entity\n---\n# Empty\n\n',
      },
    });
    const result = await deleteEmptyStubs(ctx, 'wiki');

    expect(result.deleted).toBe(1);
    expect(vault.read('wiki/entities/empty-normal.md')).toBeNull();
    // Reviewed page must be kept
    expect(vault.read('wiki/entities/empty-reviewed.md')).not.toBeNull();
  });

  it('returns zero counts on empty wiki', async () => {
    const { ctx } = createMockContext({ vaultFiles: {} });
    const result = await deleteEmptyStubs(ctx, 'wiki');

    expect(result.deleted).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
  });
});
