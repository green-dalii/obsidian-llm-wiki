import { describe, it, expect } from 'vitest';
import { PageFactory } from '../../wiki/page-factory';
import { createMockContext } from '../__support__/engine-context';

// #234 (DocTpoint): The generation candidate list contradicts constraints.ts
// body rule `[[sources/...]]` because getExistingWikiPages returns sources/ pages
// AND buildPagesListForPrompt hands them to the LLM as body-link candidates.
// Weaker local models then emit [[sources/<fuzzy-slug>|<correct-label>]] in body
// text — links that resolve (not dead), but route RAG to the wrong page.
//
// Fix: buildPagesListForPrompt gains an `excludeSources: true` default option
// that filters `/sources/` paths out before assembling the LLM prompt. The
// raw getExistingWikiPages is unchanged because source-analyzer.ts:421
// programmatically matches extracted entity names against sources/ for
// fingerprint signals.
//
// These tests guard the contract independently of the rest of page-factory.

describe('PageFactory — buildPagesListForPrompt #234 sources/ filter', () => {
  function setupVault() {
    // 2 entities + 2 concepts + 2 sources = realistic corpus
    return {
      'wiki/entities/cardiovascular-disease.md':
        '---\ntype: entity\ntitle: Cardiovascular Disease\n---\n# Cardiovascular Disease',
      'wiki/entities/insulin.md':
        '---\ntype: entity\ntitle: Insulin\n---\n# Insulin',
      'wiki/concepts/hypertension.md':
        '---\ntype: concept\ntitle: Hypertension\n---\n# Hypertension',
      'wiki/concepts/oxidative-stress.md':
        '---\ntype: concept\ntitle: Oxidative Stress\n---\n# Oxidative Stress',
      'wiki/sources/doctor-notes-2026-03.md':
        '---\ntype: source\ntitle: Doctor Notes 2026 03\n---\n# Doctor Notes 2026 03',
      'wiki/sources/whocc-report-2025.md':
        '---\ntype: source\ntitle: WHOCC Report 2025\n---\n# WHOCC Report 2025',
    };
  }

  it('default call does NOT include any [[sources/...]] entries in the prompt', async () => {
    const { ctx } = createMockContext({ vaultFiles: setupVault(), llmResponses: [] });
    const factory = new PageFactory(ctx);

    const prompt = await (factory as unknown as {
      buildPagesListForPrompt: (includePaths?: string[]) => Promise<string>;
    }).buildPagesListForPrompt();

    // Constraint: body text forbids [[sources/...]] — the candidate list
    // must align with that constraint or weak models emit fuzzy-mismatched
    // links (real symptom: [[sources/Polysorbat-80|Polyphenolen]] from
    // label-only fuzzy-match).
    expect(prompt).not.toContain('[[sources/');
    expect(prompt).not.toMatch(/\[\[sources\/[^\]]+\]\]/);
  });

  it('default call still surfaces entities and concepts (regression guard)', async () => {
    const { ctx } = createMockContext({ vaultFiles: setupVault(), llmResponses: [] });
    const factory = new PageFactory(ctx);

    const prompt = await (factory as unknown as {
      buildPagesListForPrompt: (includePaths?: string[]) => Promise<string>;
    }).buildPagesListForPrompt();

    // Sanity: the filter must not over-filter. We expect entity + concept
    // pages to remain visible. wikilinks are slug-based, lowercase.
    expect(prompt).toContain('[[entities/cardiovascular-disease');
    expect(prompt).toContain('[[entities/insulin');
    expect(prompt).toContain('[[concepts/hypertension');
    expect(prompt).toContain('[[concepts/oxidative-stress');
  });

  it('explicit excludeSources: false retains [[sources/...]] (escape hatch)', async () => {
    const { ctx } = createMockContext({ vaultFiles: setupVault(), llmResponses: [] });
    const factory = new PageFactory(ctx);

    const prompt = await (factory as unknown as {
      buildPagesListForPrompt: (
        includePaths?: string[],
        options?: { excludeSources?: boolean }
      ) => Promise<string>;
    }).buildPagesListForPrompt([], { excludeSources: false });

    // Explicit opt-in keeps the old behaviour — useful for future
    // analytical surfaces that legitimately want to mention sources.
    expect(prompt).toMatch(/\[\[sources\//);
  });
});
