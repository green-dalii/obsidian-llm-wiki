// `mergeDuplicatePages` was the one frontmatter writer without the #356
// passthrough — a duplicate merge dropped every user-owned field of the
// surviving page. It now passes them through; a user-authored `domains:` is
// an unknown key like any other (stage 5, #568): the survivor's copy rides
// the passthrough, the absorbed page's copy goes down with the page.

import { describe, it, expect } from 'vitest';
import { mergeDuplicatePages } from '../../../wiki/lint/merge-duplicates';
import { parseFrontmatter } from '../../../core/frontmatter';
import { createMergeCtx } from '../../__support__/link-vault';

const TARGET = 'wiki/entities/Ferritin.md';
const SOURCE = 'wiki/entities/Ferritin-2.md';

function makeCtx(files: Record<string, string>) {
  return createMergeCtx(files);
}

describe('mergeDuplicatePages — frontmatter passthrough and domains union', () => {
  it('passes the surviving page\'s unknown fields through', async () => {
    const { ctx, fake } = makeCtx({
      [TARGET]: '---\ntype: entity\ntags: [substance]\nredirect_to: "[[x]]"\nparent_org: Acme\n---\n\n# Ferritin\n\nIron store.\n',
      [SOURCE]: '---\ntype: entity\ntags: [substance]\n---\n\n# Ferritin-2\n\nAlso the iron store.\n',
    });
    await mergeDuplicatePages(ctx, TARGET, SOURCE);
    const written = fake.read(TARGET) ?? '';
    expect(written).toContain('redirect_to: "[[x]]"');
    expect(written).toContain('parent_org: Acme');
  });

  it("keeps the survivor's user-authored domains: verbatim and drops the absorbed page's", async () => {
    const { ctx, fake } = makeCtx({
      [TARGET]: '---\ntype: entity\ntags: [substance]\ndomains:\n  - "Sorte/Protein"\n---\n\n# Ferritin\n\nIron store.\n',
      [SOURCE]: '---\ntype: entity\ntags: [substance]\ndomains:\n  - "Thema/Eisen"\n---\n\n# Ferritin-2\n\nAlso the iron store.\n',
    });
    await mergeDuplicatePages(ctx, TARGET, SOURCE);
    const fm = parseFrontmatter(fake.read(TARGET) ?? '');
    expect(fm?.domains).toEqual(['Sorte/Protein']);
  });

  it('leaves no domains field when neither page carries one', async () => {
    const { ctx, fake } = makeCtx({
      [TARGET]: '---\ntype: entity\ntags: [substance]\n---\n\n# Ferritin\n\nIron store.\n',
      [SOURCE]: '---\ntype: entity\ntags: [substance]\n---\n\n# Ferritin-2\n\nAlso the iron store.\n',
    });
    await mergeDuplicatePages(ctx, TARGET, SOURCE);
    expect(fake.read(TARGET) ?? '').not.toContain('domains');
  });
});
