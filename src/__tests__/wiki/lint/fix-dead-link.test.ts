import { describe, it, expect } from 'vitest';
import { fixDeadLink } from '../../../wiki/lint/fix-dead-link';
import { createMockContext } from '../../__support__/engine-context';

const SOURCE_PATH = 'wiki/entities/test-page.md';
const SOURCE_CONTENT = `# Test Page

See [[BrokenLink]] for more details.

Also see [[BrokenLink]] again.
`;

describe('fixDeadLink', () => {
  it('pre-check: case-insensitive title match replaces dead link without LLM call', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        [SOURCE_PATH]: SOURCE_CONTENT,
        // title matches targetName 'BrokenLink' case-insensitively
        'wiki/entities/brokenlink.md': '---\ntype: entity\n---\n# brokenlink\n',
      },
      llmResponses: [],
    });
    const result = await fixDeadLink(ctx, SOURCE_PATH, 'BrokenLink');

    expect(result).toMatch(/pre-check corrected/);

    const updated = vault.read(SOURCE_PATH);
    expect(updated).toContain('[[entities/brokenlink|brokenlink]]');
    expect(updated).not.toContain('[[BrokenLink]]');
  });

  it('pre-check: alias match rewrites link', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        [SOURCE_PATH]: SOURCE_CONTENT,
        // alias 'BrokenLink' matches targetName case-insensitively
        'wiki/entities/someentity.md': '---\ntype: entity\naliases: [BrokenLink, OtherAlias]\n---\n# someentity\n',
      },
      llmResponses: [],
    });
    const result = await fixDeadLink(ctx, SOURCE_PATH, 'BrokenLink');

    expect(result).toMatch(/pre-check corrected/);
    const updated = vault.read(SOURCE_PATH);
    expect(updated).toContain('entities/someentity');
    expect(updated).not.toContain('[[BrokenLink]]');
  });

  it('LLM path: action=correct updates link to LLM-suggested target', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        [SOURCE_PATH]: SOURCE_CONTENT,
        'wiki/entities/target-page.md': '---\ntype: entity\n---\n# TargetPage\n',
      },
      llmResponses: [
        '{"action": "correct", "correct_link": "[[entities/target-page|TargetPage]]"}',
      ],
    });
    const result = await fixDeadLink(ctx, SOURCE_PATH, 'BrokenLink');

    expect(result).toMatch(/corrected:/);
    const updated = vault.read(SOURCE_PATH);
    expect(updated).toContain('[[entities/target-page|TargetPage]]');
    expect(updated).not.toContain('[[BrokenLink]]');
  });

  it('LLM path: action=create_stub creates stub and rewrites link', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        [SOURCE_PATH]: SOURCE_CONTENT,
      },
      llmResponses: [
        // First call: LLM says create stub
        '{"action": "create_stub", "stub_title": "NewConcept", "stub_type": "concept"}',
        // Second call: fillEmptyPage expansion via LLM
        '---\ntype: concept\n---\n# NewConcept\n\nA real concept body.\n',
      ],
    });
    const result = await fixDeadLink(ctx, SOURCE_PATH, 'BrokenLink');

    expect(result).toMatch(/stub created and expanded/);
    const stubPath = 'wiki/concepts/newconcept.md';
    expect(vault.read(stubPath)).not.toBeNull();
    // Source page should now link to the stub
    const updated = vault.read(SOURCE_PATH);
    expect(updated).toContain('concepts/newconcept');
  });

  it('LLM path: action=create_stub but alias match in safety net rewrites to existing page', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        [SOURCE_PATH]: SOURCE_CONTENT,
        // Existing page that aliases "NewConcept" — safety net should catch this
        'wiki/entities/existing.md': '---\ntype: entity\naliases: [NewConcept]\n---\n# Existing\n',
      },
      llmResponses: [
        '{"action": "create_stub", "stub_title": "NewConcept", "stub_type": "entity"}',
      ],
    });
    const result = await fixDeadLink(ctx, SOURCE_PATH, 'BrokenLink');

    expect(result).toMatch(/safety-net corrected/);
    // No stub should be created
    expect(vault.read('wiki/entities/newconcept.md')).toBeNull();
    // Link should point to existing page
    const updated = vault.read(SOURCE_PATH);
    expect(updated).toContain('entities/existing');
  });

  it('fallback: LLM returns no action, deterministic slug match rewrites link', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        // Source with a link whose slug matches an existing page
        'wiki/entities/source.md': 'See [[SomeEntity Page]] for details.',
        'wiki/entities/someentity-page.md': '---\ntype: entity\n---\n# someentity-page\n',
      },
      llmResponses: [
        // LLM returns JSON with no recognized action
        '{"action": "unknown", "data": "garbage"}',
      ],
    });
    // targetName = the text inside the [[]] link. Pre-check (case-insensitive title) won't
    // match "SomeEntity Page" === "someentity-page". Fallback uses slugify() match.
    const result = await fixDeadLink(ctx, 'wiki/entities/source.md', 'SomeEntity Page');

    expect(result).toMatch(/fallback corrected/);
    const updated = vault.read('wiki/entities/source.md');
    expect(updated).toContain('entities/someentity-page');
  });

  it('fallback: LLM fails and no match, creates stub and expands', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        // Source with dead link. No matching existing page.
        // targetName without folder prefix → fallback uses 'concepts' folder
        'wiki/entities/source.md': 'See [[BrandNewConcept]] for details.',
      },
      llmResponses: [
        // LLM response that fails JSON parsing
        'not valid json',
        // fillEmptyPage expansion — match stub type (concept)
        '---\ntype: concept\n---\n# BrandNewConcept\n\nA brand new concept body with substantial content for the LLM to generate.\n',
      ],
    });
    const result = await fixDeadLink(ctx, 'wiki/entities/source.md', 'BrandNewConcept');

    expect(result).toMatch(/fallback stub created and expanded/);
    const stubPath = 'wiki/concepts/brandnewconcept.md';
    expect(vault.read(stubPath)).not.toBeNull();
  });
});
