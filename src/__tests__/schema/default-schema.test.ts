import { describe, it, expect } from 'vitest';
import { buildDefaultSchemaBody } from '../../schema/schema-manager';

// Note on what used to be `mkSettings` and the partial LLMWikiSettings import:
// The v1.22.0 Phase 2 tests that consumed these helpers were deleted for
// Issue #328 Phase 1 (see the trailing comment block at the bottom of this
// file). The remaining tests in this file do not take a settings object.

describe('buildDefaultSchemaBody', () => {
  const body = buildDefaultSchemaBody();

  it('includes all required page templates', () => {
    expect(body).toContain('## Entity Page Template');
    expect(body).toContain('## Concept Page Template');
    expect(body).toContain('## Source Page Template');
  });

  it('Source Page Template documents the tags inheritance rule (Issue #90)', () => {
    // The source page tags MUST be inherited from the source note frontmatter,
    // not LLM-derived. This preserves the user's tag vocabulary.
    expect(body).toMatch(/## Source Page Template[\s\S]*?tags.*inherit/i);
    expect(body).toMatch(/do NOT use LLM-derived/i);
  });

  it('Date Fields section documents that created/updated are programmatic, not LLM-generated', () => {
    expect(body).toContain('## Date Fields');
    // The rule: dates are filled by the system, not by the LLM
    expect(body).toMatch(/created.*updated.*programmatic/i);
    expect(body).toMatch(/never LLM-generated|not LLM-generated|system.*override/i);
  });

  it('Mentions section uses academic-footnote style format', () => {
    // Expect: "Verbatim quote" — [[source-name|display-name]]
    expect(body).toMatch(/## Mentions Format/);
    expect(body).toMatch(/-\s+"[^"]+"\s*—\s*\[\[/);
  });

  it('preserves all original section headings for backward compatibility', () => {
    expect(body).toContain('## Wiki Structure');
    expect(body).toContain('## Naming Conventions');
    expect(body).toContain('## Content Rules');
    expect(body).toContain('## Classification Rules');
    expect(body).toContain('## Multi-Source Merge Rules');
    expect(body).toContain('## Maintenance Policies');
  });

  // #258: removed "Basic Information" section so system-prompt context the LLM reads agrees with the user-prompt output format.
  it('Entity Page Template does NOT include a Basic Information section (#258)', () => {
    const entityMatch = body.match(/## Entity Page Template[\s\S]*?(?=\n## |\s*$)/);
    expect(entityMatch).not.toBeNull();
    expect(entityMatch![0]).not.toMatch(/\*\*Basic Information\*\*/);
    expect(entityMatch![0]).toContain('**Description**');
  });

  it('Concept Page Template has never included a Basic Information section (#258)', () => {
    // Sentinel against future schema edits that introduce the block.
    const conceptMatch = body.match(/## Concept Page Template[\s\S]*?(?=\n## |\s*$)/);
    expect(conceptMatch).not.toBeNull();
    expect(conceptMatch![0]).not.toMatch(/\*\*Basic Information\*\*/);
  });

  it('does NOT preserve entity or concept subtype lists (#328 Phase 1)', () => {
    // Phase 1 reversed: the active tag vocabulary lives ONLY in the runtime
    // injection layer (buildActiveTagVocabularySection). This schema body
    // is intentionally free of any baked tag enum — see
    // src/__tests__/schema/runtime-injection.test.ts for the full
    // contract.
    expect(body).not.toMatch(/person[\s\S]*?organization[\s\S]*?project[\s\S]*?product[\s\S]*?event[\s\S]*?place[\s\S]*?other/);
    expect(body).not.toMatch(/theory[\s\S]*?method[\s\S]*?field[\s\S]*?phenomenon[\s\S]*?standard[\s\S]*?term[\s\S]*?other/);
  });
});

// The 5 v1.22.0 Phase 2 tests for buildDefaultSchemaBody(settings) were
// removed for Issue #328 Phase 1; see src/__tests__/schema/runtime-injection.test.ts
// for the reversed contract. History preserved by git blame on this file.
