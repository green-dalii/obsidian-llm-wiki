// Issue #356 parity for the duplicate merge: `mergeDuplicatePages` was the one
// frontmatter writer that re-serialized from the parsed object alone, so every
// user-owned field of the surviving page was dropped by a merge. The LLM client
// is absent on purpose — the programmatic merge is the path that writes the
// frontmatter either way.

import { describe, it, expect } from 'vitest';
import { mergeDuplicatePages } from '../../../wiki/lint/merge-duplicates';
import { createMergeCtx } from '../../__support__/link-vault';

const TARGET = 'wiki/entities/Ferritin.md';
const SOURCE = 'wiki/entities/Ferritin-2.md';

function makeCtx(files: Record<string, string>) {
  return createMergeCtx(files);
}

describe('mergeDuplicatePages — unknown frontmatter fields of the surviving page (#356 parity)', () => {
  it('passes them through verbatim', async () => {
    const { ctx, fake } = makeCtx({
      [TARGET]: '---\ntype: entity\ntags: [substance]\nredirect_to: "[[x]]"\nparent_org: Acme\n---\n\n# Ferritin\n\nIron store.\n',
      [SOURCE]: '---\ntype: entity\ntags: [substance]\n---\n\n# Ferritin-2\n\nAlso the iron store.\n',
    });
    await mergeDuplicatePages(ctx, TARGET, SOURCE);
    const written = fake.read(TARGET) ?? '';
    expect(written).toContain('redirect_to: "[[x]]"');
    expect(written).toContain('parent_org: Acme');
    // The canonical fields still come from the merge, not from the passthrough.
    expect(written.match(/^type:/gm)?.length).toBe(1);
    expect(written.match(/^tags:/gm)?.length).toBe(1);
  });

  it('does not add anything when the survivor has no unknown fields', async () => {
    const { ctx, fake } = makeCtx({
      [TARGET]: '---\ntype: entity\ntags: [substance]\n---\n\n# Ferritin\n\nIron store.\n',
      [SOURCE]: '---\ntype: entity\ntags: [substance]\n---\n\n# Ferritin-2\n\nAlso the iron store.\n',
    });
    await mergeDuplicatePages(ctx, TARGET, SOURCE);
    const written = fake.read(TARGET) ?? '';
    expect(written.startsWith('---\ntype: entity\n')).toBe(true);
  });
});
