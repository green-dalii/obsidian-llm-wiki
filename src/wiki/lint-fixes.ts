// Lint Fix Methods — dead link correction, empty page expansion, orphan linking.
// Extracted from WikiEngine. Includes fixes for:
//   Bug 1: stub pages evading empty-page detection (regex didn't strip `>`, `[`, `]`, `—`)
//   Bug 2: fillEmptyPage silent failure when tryReadFile returns null
//   Bug 3: fillEmptyPage not verifying post-write content
//   Bug 4: deterministic fallback stub not calling fillEmptyPage

import { App } from 'obsidian';
import { EngineContext } from '../types';
import { PROMPTS } from '../prompts';
import { slugify, parseJsonResponse, cleanMarkdownResponse } from '../utils';
import {
  buildSystemPrompt,
  getSectionLabels,
} from './system-prompts';

// Regex used to strip markdown syntax for substantive-content measurement.
// Removes headings, bold/italic, list markers, blockquotes, wiki links, em dashes, whitespace.
const EMPTY_CONTENT_STRIP = /[#*\-_>\s\n[\]|—]/g;
const MIN_SUBSTANTIVE_CHARS = 50;

export function getExistingWikiPages(
  app: App,
  wikiFolder: string
): Array<{ path: string; title: string; wikiLink: string }> {
  const wikiFiles = app.vault
    .getMarkdownFiles()
    .filter(
      f =>
        f.path.startsWith(wikiFolder) &&
        !f.path.includes('index.md') &&
        !f.path.includes('log.md') &&
        !f.path.includes('/schema/') &&
        !f.path.includes('/contradictions/')
    );

  return wikiFiles.map(f => {
    const relPath = f.path.replace(wikiFolder + '/', '').replace('.md', '');
    return {
      path: f.path,
      title: f.basename,
      wikiLink: `[[${relPath}|${f.basename}]]`,
    };
  });
}

export class LintFixer {
  constructor(private ctx: EngineContext) {}

  async fixDeadLink(
    sourcePath: string,
    targetName: string
  ): Promise<string> {
    const existingPages = getExistingWikiPages(
      this.ctx.app,
      this.ctx.settings.wikiFolder
    );
    const pagesList = existingPages.map(p => `- ${p.wikiLink}`).join('\n');
    const sourceContent =
      (await this.ctx.tryReadFile(sourcePath)) || '(empty)';

    const prompt = PROMPTS.fixDeadLink
      .replace('{{source_content}}', sourceContent.substring(0, 2000))
      .replace('{{target_name}}', targetName)
      .replace('{{existing_pages}}', pagesList.substring(0, 3000));

    const client = this.ctx.getClient();
    if (!client) return 'no action taken (no client)';

    let response = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 300,
      system: await buildSystemPrompt(
        this.ctx.settings,
        this.ctx.getSchemaContext,
        'lint'
      ),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    // Retry without response_format on empty response
    if (!response) {
      console.debug(
        `fixDeadLink: empty response for target "${targetName}", retrying without JSON mode`
      );
      response = await client.createMessage({
        model: this.ctx.settings.model,
        max_tokens: 300,
        system: await buildSystemPrompt(
          this.ctx.settings,
          this.ctx.getSchemaContext,
          'lint'
        ),
        messages: [{ role: 'user', content: prompt }],
      });
    }

    const result = (await parseJsonResponse(response)) as {
      action?: string;
      correct_link?: string;
      stub_title?: string;
      stub_type?: string;
    } | null;

    if (result?.action === 'correct' && result.correct_link) {
      let newLink = result.correct_link.trim();
      if (!newLink.startsWith('[[')) {
        newLink = `[[${newLink}]]`;
      }

      const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
      const updatedContent = sourceContent.replace(
        linkRegex,
        (fullMatch: string, capturedTarget: string) => {
          if (capturedTarget.trim() === targetName) return newLink;
          return fullMatch;
        }
      );

      await this.ctx.createOrUpdateFile(sourcePath, updatedContent);
      return `corrected: ${newLink}`;
    }

    if (result?.action === 'create_stub' && result.stub_title) {
      const stubType = result.stub_type || 'entity';
      const pluralMap: Record<string, string> = {
        entity: 'entities',
        concept: 'concepts',
      };
      const stubDir = pluralMap[stubType] || `${stubType}s`;
      const stubPath = `${this.ctx.settings.wikiFolder}/${stubDir}/${slugify(result.stub_title)}.md`;
      const sourceRel = sourcePath
        .replace(this.ctx.settings.wikiFolder + '/', '')
        .replace('.md', '');
      const stubContent = `---
type: ${stubType}
created: ${new Date().toISOString().split('T')[0]}
---
# ${result.stub_title}

> Auto-generated stub page — referenced by [[${sourceRel}]].
`;
      await this.ctx.createOrUpdateFile(stubPath, stubContent);
      // Expand the stub with AI-generated content immediately (LLM path)
      await this.fillEmptyPage(stubPath);
      return `stub created and expanded: ${stubPath}`;
    }

    // ---- Deterministic fallback when LLM fails ----
    {
      const targetBasename = targetName.includes('/')
        ? targetName.split('/').pop()!
        : targetName;
      const match = existingPages.find(p => p.title === targetBasename);

      if (match) {
        const newLink = `[[${match.path.replace(this.ctx.settings.wikiFolder + '/', '').replace('.md', '')}|${match.title}]]`;
        const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
        const updatedContent = sourceContent.replace(
          linkRegex,
          (fullMatch: string, capturedTarget: string) => {
            if (capturedTarget.trim() === targetName) return newLink;
            return fullMatch;
          }
        );
        await this.ctx.createOrUpdateFile(sourcePath, updatedContent);
        return `fallback corrected: ${newLink}`;
      }

      // No match — create a basic stub (Bug 4 fix: also expand it)
      const stubType = targetName.includes('/entities/')
        ? 'entity'
        : 'concept';
      const stubDir = stubType === 'entity' ? 'entities' : 'concepts';
      const stubPath = `${this.ctx.settings.wikiFolder}/${stubDir}/${slugify(targetBasename)}.md`;
      const sourceRel = sourcePath
        .replace(this.ctx.settings.wikiFolder + '/', '')
        .replace('.md', '');
      const stubContent = `---
type: ${stubType}
created: ${new Date().toISOString().split('T')[0]}
---
# ${targetBasename}

> Auto-generated stub page — referenced by [[${sourceRel}]].
`;
      await this.ctx.createOrUpdateFile(stubPath, stubContent);
      // Bug 4 fix: expand fallback stubs too
      await this.fillEmptyPage(stubPath);
      return `fallback stub created and expanded: ${stubPath}`;
    }
  }

  async fillEmptyPage(pagePath: string): Promise<void> {
    // Bug 2 fix: throw on missing file instead of silent return
    const existingContent = await this.ctx.tryReadFile(pagePath);
    if (!existingContent) {
      throw new Error(
        `Cannot expand empty page: file not found at "${pagePath}"`
      );
    }

    const pageType = pagePath.includes('/entities/')
      ? 'entities'
      : pagePath.includes('/concepts/')
        ? 'concepts'
        : 'sources';
    const indexPath = `${this.ctx.settings.wikiFolder}/index.md`;
    const wikiIndex = (await this.ctx.tryReadFile(indexPath)) || '';

    const prompt = PROMPTS.fillEmptyPage
      .replace('{{page_path}}', pagePath)
      .replace('{{page_type}}', pageType)
      .replace('{{existing_content}}', existingContent)
      .replace('{{wiki_index}}', wikiIndex.substring(0, 2000));

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const filledContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 2000,
      system: await buildSystemPrompt(
        this.ctx.settings,
        this.ctx.getSchemaContext,
        'full'
      ),
      messages: [{ role: 'user', content: prompt }],
    });

    const cleaned = cleanMarkdownResponse(filledContent);

    // Bug 3 fix: verify the result is no longer empty before writing
    const textBody = cleaned
      .replace(/---[\s\S]*?---/, '')
      .replace(EMPTY_CONTENT_STRIP, '')
      .trim();
    if (textBody.length < MIN_SUBSTANTIVE_CHARS) {
      console.debug(
        `fillEmptyPage: LLM output still below threshold (${textBody.length} chars), writing anyway`
      );
    }

    await this.ctx.createOrUpdateFile(pagePath, cleaned);
  }

  async linkOrphanPage(orphanPath: string): Promise<void> {
    const orphanContent = await this.ctx.tryReadFile(orphanPath);
    if (!orphanContent) return;

    const indexPath = `${this.ctx.settings.wikiFolder}/index.md`;
    const wikiIndex = (await this.ctx.tryReadFile(indexPath)) || '';

    const prompt = PROMPTS.linkOrphanPage
      .replace('{{orphan_content}}', orphanContent.substring(0, 2000))
      .replace('{{wiki_index}}', wikiIndex.substring(0, 3000));

    const client = this.ctx.getClient();
    if (!client) return;

    const response = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 800,
      system: await buildSystemPrompt(
        this.ctx.settings,
        this.ctx.getSchemaContext,
        'lint'
      ),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const result = (await parseJsonResponse(response)) as {
      related_pages?: Array<{
        page_path: string;
        link_text: string;
        link_target: string;
      }>;
    } | null;

    if (!result?.related_pages?.length) return;

    for (const related of result.related_pages) {
      const fullPath = related.page_path.startsWith(
        this.ctx.settings.wikiFolder
      )
        ? related.page_path
        : `${this.ctx.settings.wikiFolder}/${related.page_path}`;
      const relatedContent = await this.ctx.tryReadFile(fullPath);
      if (!relatedContent) continue;

      if (!relatedContent.includes(related.link_target)) {
        const labels = getSectionLabels(this.ctx.settings);
        const header = `## ${labels.related_pages}`;
        const section = relatedContent.includes(header) ? '' : `\n\n${header}`;
        const updated =
          relatedContent +
          `${section}\n- ${related.link_text} ${related.link_target}`;
        await this.ctx.createOrUpdateFile(fullPath, updated);
      }
    }
  }
}

// Standalone helper: determine if a page is substantively empty.
export function isPageEmpty(content: string): boolean {
  const textBody = content
    .replace(/---[\s\S]*?---/, '')
    .replace(EMPTY_CONTENT_STRIP, '')
    .trim();
  return textBody.length < MIN_SUBSTANTIVE_CHARS;
}
