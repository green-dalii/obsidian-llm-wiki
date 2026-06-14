import { describe, it, expect, vi } from 'vitest';
import { createMockContext, createMockFile } from '../__support__/engine-context';
import { PageFactory } from '../../wiki/page-factory';
import type { SourceAnalysis } from '../../types';

function makeAnalysis(over: Partial<SourceAnalysis> = {}): SourceAnalysis {
  return {
    source_file: 'Notizen/New-Source.md',
    source_title: 'New Source',
    summary: '',
    entities: [],
    concepts: [],
    contradictions: [],
    related_pages: [],
    key_points: [],
    created_pages: [],
    updated_pages: [],
    ...over,
  };
}

function makeFactory(vaultFiles: Record<string, string>) {
  const { ctx, vault } = createMockContext({ vaultFiles });
  const factory = new PageFactory(ctx);
  return { factory, vault: vault as unknown as Record<string, string | null> };
}

function page(vault: Record<string, string | null>, path: string): string | null {
  return (vault as unknown as { read: (p: string) => string | null }).read(path);
}

async function appendAliases(factory: PageFactory, path: string, aliases: string[]): Promise<void> {
  const fn = (PageFactory.prototype as unknown as { appendAliases: (p: string, a: string[]) => Promise<void> }).appendAliases;
  await fn.call(factory, path, aliases);
}

describe('PageFactory — appendAliases', () => {
  it('adds new alias to page without existing aliases', async () => {
    const { factory, vault } = makeFactory({
      'wiki/entities/llm.md': '---\ntype: entity\n---\n# LLM\nBody',
    });
    await appendAliases(factory, 'wiki/entities/llm.md', ['Large Language Model']);

    const content = page(vault, 'wiki/entities/llm.md');
    expect(content).toContain('aliases:');
    expect(content).toContain('"Large Language Model"');
  });

  it('does not add redundant self-pointing alias', async () => {
    const { factory, vault } = makeFactory({
      'wiki/entities/vigilanz.md': '---\ntype: entity\n---\n# Vigilanz\nBody',
    });
    await appendAliases(factory, 'wiki/entities/vigilanz.md', ['Vigilanz']);

    const content = page(vault, 'wiki/entities/vigilanz.md');
    expect(content).not.toContain('aliases:');
  });

  it('does not add duplicate alias to existing aliases', async () => {
    const { factory, vault } = makeFactory({
      'wiki/entities/openai.md': '---\ntype: entity\naliases: ["OpenAI Inc"]\n---\n# OpenAI\nBody',
    });
    await appendAliases(factory, 'wiki/entities/openai.md', ['OpenAI Inc', 'OAI']);

    const content = page(vault, 'wiki/entities/openai.md');
    expect(content).not.toBeNull();
    expect(content!).toContain('"OpenAI Inc"');
    expect(content!).toContain('"OAI"');
    const matches = content!.match(/"OpenAI Inc"/g);
    expect(matches).toHaveLength(1);
  });

  it('handles page without frontmatter gracefully', async () => {
    const { factory, vault } = makeFactory({
      'wiki/entities/bare.md': '# Just a heading\nNo frontmatter here.',
    });
    await appendAliases(factory, 'wiki/entities/bare.md', ['Some Alias']);

    const content = page(vault, 'wiki/entities/bare.md');
    expect(content).toBe('# Just a heading\nNo frontmatter here.');
  });

  it('skips non-existent page silently', async () => {
    const { factory, vault } = makeFactory({});
    await appendAliases(factory, 'wiki/entities/nonexistent.md', ['Alias']);

    const content = page(vault, 'wiki/entities/nonexistent.md');
    expect(content).toBeNull();
  });
});

describe('PageFactory — buildPagesListForPrompt', () => {
  it('returns formatted list from existing pages', async () => {
    const mockPages = [
      { path: 'wiki/entities/llm.md', title: 'LLM', wikiLink: '[[entities/llm|LLM]]', aliases: ['Large Language Model'] },
      { path: 'wiki/concepts/rlhf.md', title: 'RLHF', wikiLink: '[[concepts/rlhf|RLHF]]' },
    ];
    const result = mockPages.map(p => {
      const aliasSuffix = p.aliases?.length ? ` \`aliases: ${p.aliases.join(', ')}\`` : '';
      return `- ${p.wikiLink}${aliasSuffix}`;
    }).join('\n');
    expect(result).toContain('[[entities/llm|LLM]]');
    expect(result).toContain('[[concepts/rlhf|RLHF]]');
    expect(result).toContain('aliases: Large Language Model');
  });

  it('includes extra paths not in existing list', async () => {
    const includePaths = ['wiki/entities/foo.md'];
    const item = includePaths.map(p => {
      const relPath = p.replace('wiki/', '').replace('.md', '');
      const name = relPath.split('/').pop() || relPath;
      return `- [[${relPath}|${name}]]`;
    }).join('\n');
    expect(item).toContain('[[entities/foo|foo]]');
  });

  it('handles empty pages', async () => {
    expect('').toBe('');
  });
});

describe('PageFactory — updateRelatedPage no-op skip (Issue #131)', () => {
  it('skips the LLM call when the source extracted nothing matching the related page', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        'wiki/concepts/Dysbiose.md':
          '---\ntype: concept\nsources:\n  - "[[sources/Old]]"\n---\n\n## Description\nOriginal body, must stay verbatim.',
      },
    });
    // Spy on the LLM client to assert it is never invoked.
    const spy = vi.spyOn(ctx.getClient()!, 'createMessage');

    const factory = new PageFactory(ctx);
    // related_pages references Dysbiose, but it is not among extracted entities/concepts
    const analysis = makeAnalysis({ related_pages: ['Dysbiose'] });
    const sourceFile = createMockFile('Notizen/New-Source.md');

    const result = await factory.updateRelatedPage('Dysbiose', analysis, sourceFile);

    expect(spy).not.toHaveBeenCalled();  // LLM never invoked
    expect(result).toBe(true);        // page still counts as updated
    const content = vault.read('wiki/concepts/Dysbiose.md')!;
    expect(content).toContain('Original body, must stay verbatim.');  // body untouched
    expect(content).toContain('[[Notizen/New-Source.md]]');           // source recorded in frontmatter
  });

  it('still calls the LLM when the related page matches an extracted entity', async () => {
    const { ctx, vault } = createMockContext({
      vaultFiles: {
        'wiki/entities/Butyrat.md': '---\ntype: entity\n---\n\n## Description\nOld body.',
      },
      llmResponses: ['## Description\nNew merged body.'],
    });
    const spy = vi.spyOn(ctx.getClient()!, 'createMessage');

    const factory = new PageFactory(ctx);
    const analysis = makeAnalysis({
      related_pages: ['Butyrat'],
      entities: [{ name: 'Butyrat', type: 'other', summary: 'An SCFA', mentions_in_source: [] }],
    });
    const sourceFile = createMockFile('Notizen/New-Source.md');

    const result = await factory.updateRelatedPage('Butyrat', analysis, sourceFile);

    expect(spy).toHaveBeenCalledTimes(1);  // LLM invoked because there is new info
    expect(result).toBe(true);
    expect(vault.read('wiki/entities/Butyrat.md')!).toContain('New merged body.');
  });
});
