// v1.24.0 #185 follow-up: Tier-2 per-section append trailing-blank-line bug.
//
// Symptom (observed during the #185 e2e on `## 相关概念` / `## 相关实体`):
// when complementary items are appended to a list-typed section, an extra
// blank line appeared between the existing bullets and the new bullet:
//
//   ## 相关概念
//   - [[concepts/tool-calling|tool-calling]]
//   - [[concepts/prompt-caching|prompt caching]]
//                                              ← extra blank line (bug)
//   - [[concepts/exekutive-funktionen|Exekutive Funktionen]]
//
// Root cause: vault bodies always end with `\n` after the last bullet, and
// the splice site concatenated a separator onto that trailing newline with
// no normalization → even a single-`\n` separator became `\n\n` (visible
// blank line) at runtime, regardless of intent.
//
// Fix (page-factory.ts):
//   1. `callPerSectionAppend` returns the cleaned LLM text verbatim (no
//      hard `\n` prepend). Empty responses short-circuit to NO_NEW_CONTENT.
//   2. `spliceAfterSection` strips trailing whitespace from the prefix
//      before applying the separator, so the separator shape alone
//      controls the resulting blank-line behavior.
//   3. `isListSection` autodetects list-typed sections by scanning for
//      any markdown list marker (`-`, `*`, `+`, numbered); the caller
//      passes this boolean into spliceAfterSection:
//        list section      → single `\n` (no blank)
//        paragraph section → `\n\n` (blank line)
//
// These tests pin all four scenarios through the real `applyComplementaryAppends`
// code path (no harness LLM-queue guessing), following the pattern in
// page-factory-complementary-append.test.ts: construct PageFactory directly,
// override `getClient` with a single canned response, and assert on the
// spliced result.

import { describe, it, expect } from 'vitest';
import { PageFactory } from '../../wiki/page-factory';
import { createMockContext, createMockFile } from '../__support__/engine-context';
import { createMockEntity } from '../__support__/factories';
import type { LLMClient } from '../../types';

type HelperAccess = {
  applyComplementaryAppends: (
    items: Array<{ kind: 'complementary'; content: string; target_section: string; reason?: string }>,
    existingBody: string,
    info: Parameters<PageFactory['mergePage']>[0],
    sourceFile: Parameters<PageFactory['mergePage']>[2],
  ) => Promise<string>;
};

function makeFactory(perSectionResponse: string) {
  const { ctx } = createMockContext({ vaultFiles: {}, llmResponses: [] });
  ctx.getClient = () => {
    const client: LLMClient = {
      createMessage: async () => perSectionResponse,
    };
    return client;
  };
  return new PageFactory(ctx);
}

function runAppend(
  factory: PageFactory,
  existingBody: string,
  targetSection: string,
  appended: string,
) {
  return (factory as unknown as HelperAccess).applyComplementaryAppends(
    [{ kind: 'complementary', content: 'stub', target_section: targetSection, reason: 'stub' }],
    existingBody,
    createMockEntity({ name: 'Target Page', summary: 'stub', related_concepts: [] }),
    createMockFile('src.md'),
  );
}

describe('mergePage Tier-2 trailing-blank-line normalization (#185 follow-up)', () => {
  it('list section: NO blank line between existing bullets and appended bullet', async () => {
    const factory = makeFactory('- [[concepts/exekutive-funktionen|Exekutive Funktionen]]');
    // Real vault bodies always end with a trailing \n after the last bullet —
    // this is exactly the condition that triggers the blank-line bug if
    // spliceAfterSection does not normalize trailing whitespace on the prefix.
    const existingBody = [
      '---',
      'type: concept',
      '---',
      '',
      '# Target Page',
      '',
      '## 相关概念',
      '- [[concepts/tool-calling|tool-calling]]',
      '- [[concepts/prompt-caching|prompt caching]]',
      '',  // trailing newline — the bug trigger
    ].join('\n');

    const result = await runAppend(factory, existingBody, '相关概念', 'stub');

    const idx = result.indexOf('## 相关概念');
    expect(idx).toBeGreaterThanOrEqual(0);
    const after = result.slice(idx);

    // Single \n separator between existing and new bullet — the visual list
    // stays contiguous (no blank line splitting it).
    expect(after).toContain(
      '- [[concepts/prompt-caching|prompt caching]]\n- [[concepts/exekutive-funktionen|Exekutive Funktionen]]',
    );
    expect(after).not.toMatch(/prompt caching\]\]\n\n-/);
  });

  it('paragraph section (`## 定义`): KEEPS a blank line before appended paragraph', async () => {
    const factory = makeFactory('A new paragraph appended by the LLM.');
    // Same trailing-newline reality for paragraph sections.
    const existingBody = [
      '---',
      'type: concept',
      '---',
      '',
      '# Target Page',
      '',
      '## 定义',
      'Some prior definition text that ends the paragraph.',
      '',  // trailing newline
    ].join('\n');

    const result = await runAppend(factory, existingBody, '定义', 'stub');

    const idx = result.indexOf('## 定义');
    expect(idx).toBeGreaterThanOrEqual(0);
    const after = result.slice(idx);

    // Blank line between the old paragraph and the new one — correct for
    // paragraph-typed sections (the fix must NOT collapse this to a single \n).
    expect(after).toMatch(/ends the paragraph\.\n\nA new paragraph/);
    // No accidental triple-newline.
    expect(after).not.toMatch(/paragraph\.\n\n\nA new paragraph/);
  });

  // ── isListSection edge cases (code-review findings #1 + #5) ─────────

  it('list section ending with a closing paragraph still classifies as list (mixed content)', async () => {
    // Hand-edited blocks often end with a one-line summary AFTER the bullets.
    // The detector must scan all lines, not only the last, so the appended
    // bullet stays visually contiguous with the existing list.
    const factory = makeFactory('- [[concepts/exekutive-funktionen|Exekutive Funktionen]]');
    const existingBody = [
      '# Target Page',
      '',
      '## 相关概念',
      '- [[concepts/tool-calling|tool-calling]]',
      '- [[concepts/prompt-caching|prompt caching]]',
      'Both are foundational building blocks.',
      '',  // trailing newline
    ].join('\n');

    const result = await runAppend(factory, existingBody, '相关概念', 'stub');
    const after = result.slice(result.indexOf('## 相关概念'));

    // Single \n separator (list mode), even though the section ends on a paragraph.
    expect(after).toContain(
      'Both are foundational building blocks.\n- [[concepts/exekutive-funktionen|Exekutive Funktionen]]',
    );
    expect(after).not.toMatch(/building blocks\.\n\n-/);
  });

  it('numbered-list section (`1. foo`) classifies as list (regex branch pin)', async () => {
    const factory = makeFactory('3. Third');
    const existingBody = [
      '# Target Page',
      '',
      '## Steps',
      '1. First',
      '2. Second',
      '',  // trailing newline
    ].join('\n');

    const result = await runAppend(factory, existingBody, 'Steps', 'stub');
    const after = result.slice(result.indexOf('## Steps'));

    expect(after).toContain('2. Second\n3. Third');
    expect(after).not.toMatch(/2\. Second\n\n3/);
  });

  // ── spliceAfterSection edge cases (code-review findings #4 + #7) ─────

  it('list section followed by another `##` heading: suffix gets normalized separator too', async () => {
    // The new `\n` separator must not collide with the existing `\n` before
    // the next `##` heading — we want one newline between the new bullet and
    // the next heading's blank line (which is two \n in well-formed markdown).
    const factory = makeFactory('- [[concepts/exekutive-funktionen|Exekutive Funktionen]]');
    const existingBody = [
      '# Target Page',
      '',
      '## Related Concepts',
      '- a',
      '- b',
      '',  // empty line before next heading
      '## Description',
      'Some description.',
    ].join('\n');

    const result = await runAppend(factory, existingBody, 'Related Concepts', 'stub');
    const after = result.slice(result.indexOf('## Related Concepts'));

    // Single \n between existing last bullet and new bullet.
    expect(after).toContain('- b\n- [[concepts/exekutive-funktionen|Exekutive Funktionen]]');
    // No blank line between the new bullet and the ## Description heading —
    // that's correct: bullet directly before heading is fine markdown.
    expect(after).not.toMatch(/Exekutive Funktionen\]\]\n\n-/);
    // ## Description preserved.
    expect(after).toContain('## Description');
    expect(after).toContain('Some description.');
  });

  it('body without trailing newline: separator is still applied once', async () => {
    // anchorEnd === body.length path: prefix trimEnd makes the result
    // independent of whether the body ends with `\n` or not.
    const factory = makeFactory('- new');
    const existingBody = [
      '# Target Page',
      '',
      '## List',
      '- a',
      '- b',  // NO trailing \n
    ].join('\n');

    const result = await runAppend(factory, existingBody, 'List', 'stub');
    const after = result.slice(result.indexOf('## List'));

    expect(after).toContain('- b\n- new');
    expect(after).not.toMatch(/- b\n\n- new/);
  });

  // ── empty LLM response handling (code-review finding #3) ────────────

  it('empty LLM response short-circuits to NO_NEW_CONTENT — no stray blank line', async () => {
    // The fix: `cleaned === ''` (weak model returns nothing) now also
    // short-circuits to NO_NEW_CONTENT, so the existing
    // sectionContent !== null → skip branch handles it. No stray
    // separator is injected into the body.
    const factory = makeFactory('');
    const existingBody = [
      '# Target Page',
      '',
      '## 相关概念',
      '- a',
      '- b',
      '',  // trailing newline
    ].join('\n');

    const result = await runAppend(factory, existingBody, '相关概念', 'stub');
    const after = result.slice(result.indexOf('## 相关概念'));

    // Body is unchanged — no appended bullet, no stray blank line.
    // Trailing `\n` preserved (vault bodies always end with one).
    expect(after).toBe(
      [
        '## 相关概念',
        '- a',
        '- b',
        '',
      ].join('\n'),
    );
  });
});
