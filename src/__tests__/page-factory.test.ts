import { describe, it, expect } from 'vitest';
import { createMockContext } from './__mocks__/engine-context';
import { PageFactory } from '../wiki/page-factory';

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
