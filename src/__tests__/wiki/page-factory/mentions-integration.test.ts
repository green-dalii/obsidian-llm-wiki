// Module-level unit tests for page-factory/mentions-integration.ts
//
// v1.24.1 Phase 2 refactor: `assembleFinalContent` was lifted out of the
// PageFactory class. The tests pin the union-with-existing-body behavior
// (the central #267 fix) and the fail-safe preserveRaw path so future
// refactors cannot silently drop accumulated Mentions or skip the hand-
// edited verbatim preservation.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  assembleFinalContent,
  type MentionsContext,
} from '../../../wiki/page-factory/mentions-integration';
import { createMockEntity } from '../../__support__/factories';
import type { LLMWikiSettings } from '../../../types';

const WIKI = 'wiki';
// The MentionsContext only requires a settings-shaped object that
// `getSectionLabels` can read; we use a minimal LLMWikiSettings cast.
const CTX: MentionsContext = {
  settings: { wikiFolder: WIKI, language: 'en' } as unknown as LLMWikiSettings,
};

function makeSource(path: string, basename?: string) {
  return { path, basename: basename ?? path.replace(/^.*\//, '').replace(/\.md$/, '') };
}

const SECTION = '## Mentions in Source';

describe('assembleFinalContent — conversation source (Issue #244)', () => {
  it('emits a synthetic citation and DOES NOT call computeReingestMentions', async () => {
    // Conversation sources live under <wikiFolder>/sources/.
    const source = makeSource('wiki/sources/conv-2026-07-11.md', 'conv-2026-07-11');
    const info = createMockEntity({
      name: 'Karpathy',
      mentions_in_source: ['should be ignored'],
    });
    const out = await assembleFinalContent(
      CTX,
      '---\ntitle: Karpathy\n---',
      '# Karpathy\n\nBody.',
      info,
      source,
      // existingBody irrelevant — conversation path skips union.
      '# Karpathy',
    );
    expect(out).toMatch(/Conversation: conv-2026-07-11/);
    expect(out).not.toContain('should be ignored');
  });
});

describe('assembleFinalContent — non-conversation, union path (Issue #267)', () => {
  it('UNIONS new mentions with existing-body mentions (dedup by quote+source_path)', async () => {
    const source = makeSource('notes/article.md', 'article');
    const info = createMockEntity({
      name: 'Caching',
      mentions_with_provenance: [
        { quote: 'new quote', source_path: 'notes/article.md', source_slug: '', extracted_at: '' },
      ],
    });
    const existingBody = `# Caching\n\n${SECTION}\n- "old quote" — [[sources/old|old]]`;
    const out = await assembleFinalContent(
      CTX,
      '---\ntitle: Caching\n---',
      '# Caching\n\nBody.',
      info,
      source,
      existingBody,
    );
    // Both old and new should appear in the rendered Mentions section.
    expect(out).toContain('old quote');
    expect(out).toContain('new quote');
  });

  it('drops duplicate (same quote, same source_path) — re-ingest idempotent', async () => {
    const source = makeSource('notes/article.md', 'article');
    const info = createMockEntity({
      name: 'Caching',
      mentions_with_provenance: [
        { quote: 'shared quote', source_path: 'notes/article.md', source_slug: '', extracted_at: '' },
      ],
    });
    const existingBody = `# Caching\n\n${SECTION}\n- "shared quote" — [[sources/article|article]]`;
    const out = await assembleFinalContent(
      CTX,
      '---\ntitle: Caching\n---',
      '# Caching\n\nBody.',
      info,
      source,
      existingBody,
    );
    // The quote appears once in the unioned Mentions section.
    const occurrences = (out.match(/"shared quote"/g) || []).length;
    expect(occurrences).toBe(1);
  });

  it('preserves mentions from a DIFFERENT source_path (multi-source accumulation)', async () => {
    const source = makeSource('notes/newer.md', 'newer');
    const info = createMockEntity({
      name: 'Caching',
      mentions_with_provenance: [
        { quote: 'newer source quote', source_path: 'notes/newer.md', source_slug: '', extracted_at: '' },
      ],
    });
    const existingBody = `# Caching\n\n${SECTION}\n- "older quote" — [[sources/older|older]]`;
    const out = await assembleFinalContent(
      CTX,
      '---\ntitle: Caching\n---',
      '# Caching\n\nBody.',
      info,
      source,
      existingBody,
    );
    expect(out).toContain('older quote');
    expect(out).toContain('newer source quote');
  });

  it('falls back to mentions_in_source when mentions_with_provenance is empty', async () => {
    const source = makeSource('notes/article.md', 'article');
    const info = createMockEntity({
      name: 'Caching',
      mentions_in_source: ['legacy-only'],
      mentions_with_provenance: [],
    });
    const existingBody = `# Caching\n\n${SECTION}\n- "older quote" — [[sources/older|older]]`;
    const out = await assembleFinalContent(
      CTX,
      '---\ntitle: Caching\n---',
      '# Caching\n\nBody.',
      info,
      source,
      existingBody,
    );
    expect(out).toContain('legacy-only');
    expect(out).toContain('older quote');
  });
});

describe('assembleFinalContent — fail-safe preserveRaw path (#267 hand-edited guard)', () => {
  let warnSpy: { mockRestore: () => void };

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('preserves hand-edited Mentions section verbatim and skips the merge', async () => {
    const source = makeSource('notes/article.md', 'article');
    const info = createMockEntity({
      name: 'Caching',
      mentions_with_provenance: [
        { quote: 'would-be-new', source_path: 'notes/article.md', source_slug: '', extracted_at: '' },
      ],
    });
    // Construct a Mentions section that computeReingestMentions' parser will
    // refuse to fully parse: mixed bullet styles + a hand-edited summary line.
    const handEdited = [
      '',
      SECTION,
      '- "q1" — [[sources/a|a]]',
      'random prose line, not a bullet',
      '- "q2" — [[sources/b|b]]',
    ].join('\n');
    const existingBody = `# Caching${handEdited}`;
    const out = await assembleFinalContent(
      CTX,
      '---\ntitle: Caching\n---',
      '# Caching\n\nBody.',
      info,
      source,
      existingBody,
    );
    // The new mention was NOT injected (fail-safe skipped the merge).
    expect(out).not.toContain('would-be-new');
    // The verbatim raw block survived.
    expect(out).toContain('random prose line, not a bullet');
    expect(out).toContain('"q1"');
    expect(out).toContain('"q2"');
    // We logged the diagnostic so users can investigate the source page.
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('assembleFinalContent — frontmatter + body composition', () => {
  it('joins frontmatter and body with a single blank line', async () => {
    const source = makeSource('wiki/sources/c.md', 'c');
    const info = createMockEntity({ name: 'X' });
    const out = await assembleFinalContent(
      CTX,
      '---\ntitle: X\n---',
      '# X\n\nBody.',
      info,
      source,
      '',
    );
    expect(out.startsWith('---\ntitle: X\n---\n\n# X')).toBe(true);
  });
});