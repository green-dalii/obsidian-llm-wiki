import { describe, it, expect } from 'vitest';
import { linkOrphanPage } from '../../../wiki/lint/link-orphan';
import { createMockContext } from '../../__support__/engine-context';

describe('linkOrphanPage', () => {
  it('returns empty array for non-existent file', async () => {
    const { ctx } = createMockContext({ vaultFiles: {} });
    const result = await linkOrphanPage(ctx, 'wiki/entities/missing.md');
    expect(result).toEqual([]);
  });

  it('returns empty array when LLM returns no related pages', async () => {
    const { ctx } = createMockContext({
      vaultFiles: {
        'wiki/entities/orphan.md': '# Orphan\n\nAn orphan page with no related content.',
        'wiki/index.md': '# Index\n- [[entities/orphan]]\n',
      },
      llmResponses: [
        // LLM returns no related_pages
        '{"related_pages": []}',
      ],
    });
    const result = await linkOrphanPage(ctx, 'wiki/entities/orphan.md');
    expect(result).toEqual([]);
  });

  it('links orphan to related page by adding a link to the related page', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        'wiki/entities/orphan.md': '# Orphan\n\nAn orphan page with no related content.',
        // related-content is the target page; it does NOT yet contain the orphan link
        'wiki/entities/related.md': '# Related\n\nSome related content.\n',
        'wiki/index.md': '# Index\n- [[entities/orphan]]\n- [[entities/related]]\n',
      },
      llmResponses: [
        // LLM says: link orphan from "related" page
        JSON.stringify({
          related_pages: [
            {
              page_path: 'wiki/entities/related.md',
              link_text: 'Orphan',
              link_target: '[[entities/orphan]]',
            },
          ],
        }),
      ],
    });
    const result = await linkOrphanPage(ctx, 'wiki/entities/orphan.md');

    expect(result).toEqual(['wiki/entities/related.md']);
    const updatedRelated = vault.read('wiki/entities/related.md');
    expect(updatedRelated).toContain('[[entities/orphan]]');
    expect(updatedRelated).toContain('Related Pages');
  });

  it('skips related page that already has the link', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        'wiki/entities/orphan.md': '# Orphan',
        // related already has the link
        'wiki/entities/related.md': '# Related\n\n## Related Pages\n- Orphan [[entities/orphan]]\n',
        'wiki/index.md': '# Index\n- [[entities/orphan]]\n- [[entities/related]]\n',
      },
      llmResponses: [
        JSON.stringify({
          related_pages: [
            {
              page_path: 'wiki/entities/related.md',
              link_text: 'Orphan',
              link_target: '[[entities/orphan]]',
            },
          ],
        }),
      ],
    });
    const result = await linkOrphanPage(ctx, 'wiki/entities/orphan.md');
    // Already has the link — should not be re-added
    expect(result).toEqual([]);
    // Content should remain unchanged
    const updatedRelated = vault.read('wiki/entities/related.md');
    expect(updatedRelated).toContain('## Related Pages\n- Orphan [[entities/orphan]]');
  });
});
