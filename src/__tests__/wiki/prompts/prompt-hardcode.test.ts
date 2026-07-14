import { describe, it, expect } from 'vitest';
import { INGESTION_PROMPTS } from '../../../wiki/prompts/ingestion';
import { LINT_PROMPTS } from '../../../wiki/prompts/lint';
import { FIX_PROMPTS } from '../../../wiki/prompts/fixes';
import { MERGE_PROMPTS } from '../../../wiki/prompts/merge';
import { GENERATION_PROMPTS } from '../../../wiki/prompts/generation';

describe('Prompt templates — no hardcoded wiki/ paths', () => {
  it('resolveEntityDedup uses {{wikiFolder}} placeholder for example path', () => {
    const tpl = INGESTION_PROMPTS.resolveEntityDedup;
    // The response format example should not have hardcoded wiki/ prefix
    expect(tpl).not.toContain('"wiki/');
    // Must contain the dynamic placeholder instead
    expect(tpl).toContain('{{wikiFolder}}/entities/');
  });

  it('lintTitleScanCandidates uses {{wikiFolder}} placeholder for example path', () => {
    const tpl = LINT_PROMPTS.lintTitleScanCandidates;
    expect(tpl).not.toContain('"wiki/concepts/');
    expect(tpl).toContain('{{wikiFolder}}/concepts/');
  });

  it('lintDuplicateDetection uses {{wikiFolder}} placeholder for example path', () => {
    const tpl = LINT_PROMPTS.lintDuplicateDetection;
    // The output format example inside the template
    expect(tpl).not.toContain('"wiki/entities/');
    expect(tpl).toContain('{{wikiFolder}}/entities/');
  });

  it('linkOrphanPage uses {{wikiFolder}} placeholder for example path', () => {
    const tpl = FIX_PROMPTS.linkOrphanPage;
    expect(tpl).not.toContain('"wiki/entities/');
    expect(tpl).toContain('{{wikiFolder}}/entities/');
  });
});

// #188: merge.ts must use {{section_*}} placeholders, not hardcoded English headers
describe('Prompt templates — merge.ts section headers (#188)', () => {
  it('mergeEntityPage uses placeholders only for sections the entity page actually carries', () => {
    const tpl = MERGE_PROMPTS.mergeEntityPage;
    expect(tpl).toContain('{{section_related_entities}}');
    expect(tpl).toContain('{{section_related_concepts}}');
    expect(tpl).toContain('{{section_description}}');
    // #258: Basic Information body block was removed — the merge prompt must not ask the LLM to render or update it.
    expect(tpl).not.toContain('{{section_basic_information}}');
    // #244: Mentions in Source is now written programmatically.
    expect(tpl).not.toContain('{{section_mentions_in_source}}');
  });

  it('mergeConceptPage uses placeholders only for sections the concept page actually carries', () => {
    const tpl = MERGE_PROMPTS.mergeConceptPage;
    expect(tpl).toContain('{{section_related_entities}}');
    expect(tpl).toContain('{{section_related_concepts}}');
    expect(tpl).toContain('{{section_description}}');
    // #258: Concept pages never had a Basic Information block — keep it that way.
    expect(tpl).not.toContain('{{section_basic_information}}');
    // #244: Mentions in Source is now written programmatically.
    expect(tpl).not.toContain('{{section_mentions_in_source}}');
  });
});

// #258: entity page-creation prompts must not embed a "Basic Information"
// body block — that block duplicates frontmatter fields (type / sources /
// tags) and the LLM occasionally copied it verbatim. Fix is at the prompt
// layer (root cause), not via a sanitizer.
describe('Prompt templates — entity pages drop redundant Basic Information (#258)', () => {
  it('generateEntityPage does not embed a Basic Information body block', () => {
    const tpl = GENERATION_PROMPTS.generateEntityPage;
    expect(tpl).not.toContain('{{section_basic_information}}');
    // After the H1, the body must not re-state frontmatter `tags: [...]`
    // and `sources: [...]` fields via `- Type:` / `- Source: [[...]]`.
    // (The leading `**Entity Information:**` block above the H1 contains a
    // legitimate `- Type: {{entity_type}}` input spec — that is required.)
    const h1Idx = tpl.indexOf('# {{entity_name}}');
    expect(h1Idx).toBeGreaterThan(-1);
    const body = tpl.slice(h1Idx);
    expect(body).not.toMatch(/^-\s*Type:\s*\{\{/m);
    expect(body).not.toMatch(/^-\s*Source:\s*\[\[\s*\{\{/m);
  });

  it('generateConceptPage does not embed a Basic Information body block', () => {
    // Concept pages never had this block; this is a sentinel against future copy-paste.
    const tpl = GENERATION_PROMPTS.generateConceptPage;
    expect(tpl).not.toContain('{{section_basic_information}}');
  });
});
