import { describe, it, expect } from 'vitest';
import { INGESTION_PROMPTS } from '../../../wiki/prompts/ingestion';
import { LINT_PROMPTS } from '../../../wiki/prompts/lint';
import { FIX_PROMPTS } from '../../../wiki/prompts/fixes';
import { MERGE_PROMPTS } from '../../../wiki/prompts/merge';

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
  it('mergeEntityPage uses {{section_*}} placeholders for Related sections', () => {
    const tpl = MERGE_PROMPTS.mergeEntityPage;
    // Must use placeholders, not hardcoded English
    expect(tpl).toContain('{{section_related_entities}}');
    expect(tpl).toContain('{{section_related_concepts}}');
    expect(tpl).toContain('{{section_basic_information}}');
    expect(tpl).toContain('{{section_description}}');
    // Issue #244: Mentions in Source section is now written programmatically
    // by the page-factory post-processing. No longer part of LLM prompt.
    expect(tpl).not.toContain('{{section_mentions_in_source}}');
  });

  it('mergeConceptPage uses {{section_*}} placeholders for Related sections', () => {
    const tpl = MERGE_PROMPTS.mergeConceptPage;
    expect(tpl).toContain('{{section_related_entities}}');
    expect(tpl).toContain('{{section_related_concepts}}');
    expect(tpl).toContain('{{section_basic_information}}');
    expect(tpl).toContain('{{section_description}}');
    // Issue #244: Mentions in Source section is now written programmatically.
    expect(tpl).not.toContain('{{section_mentions_in_source}}');
  });
});
