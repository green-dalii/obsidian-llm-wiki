// Lint Fix Methods — dead link correction, empty page expansion, orphan linking.
// Extracted from WikiEngine. Includes fixes for:
//   Bug 1: stub pages evading empty-page detection (regex didn't strip `>`, `[`, `]`, `—`)
//   Bug 2: fillEmptyPage silent failure when tryReadFile returns null
//   Bug 3: fillEmptyPage not verifying post-write content
//   Bug 4: deterministic fallback stub not calling fillEmptyPage

import { App } from 'obsidian';
import { EngineContext } from '../types';
import { PROMPTS } from '../prompts';
import { slugify, parseJsonResponse, cleanMarkdownResponse, parseFrontmatter, enforceFrontmatterConstraints } from '../utils';
import {
  buildSystemPrompt,
  getSectionLabels,
} from './system-prompts';

// Regex used to strip markdown syntax for substantive-content measurement.
// Removes headings, bold/italic, list markers, blockquotes, wiki links, em dashes, whitespace.
const EMPTY_CONTENT_STRIP = /[#*\-_>\s\n[\]|—]/g;
const MIN_SUBSTANTIVE_CHARS = 50;
const STUB_MARKER = 'Auto-generated stub page';

export async function getExistingWikiPages(
  app: App,
  wikiFolder: string
): Promise<Array<{ path: string; title: string; wikiLink: string; aliases?: string[] }>> {
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

  const pages: Array<{ path: string; title: string; wikiLink: string; aliases?: string[] }> = [];
  for (const f of wikiFiles) {
    const relPath = f.path.replace(wikiFolder + '/', '').replace('.md', '');
    const content = await app.vault.read(f);
    const fm = parseFrontmatter(content);
    pages.push({
      path: f.path,
      title: f.basename,
      wikiLink: `[[${relPath}|${f.basename}]]`,
      aliases: fm?.aliases,
    });
  }
  return pages;
}

export class LintFixer {
  constructor(private ctx: EngineContext) {}

  async fixDeadLink(
    sourcePath: string,
    targetName: string
  ): Promise<string> {
    const existingPages = await getExistingWikiPages(
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
      max_tokens: 8000,
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
        max_tokens: 8000,
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
      const stubSlug = slugify(result.stub_title);
      const stubPath = `${this.ctx.settings.wikiFolder}/${stubDir}/${stubSlug}.md`;
      const sourceRel = sourcePath
        .replace(this.ctx.settings.wikiFolder + '/', '')
        .replace('.md', '');
      const stubContent = `---
type: ${stubType}
created: ${new Date().toISOString().split('T')[0]}
sources: ["[[${sourceRel}]]"]
tags: [${stubType === 'entity' ? 'other' : 'term'}]
---
# ${result.stub_title}

> Auto-generated stub page — referenced by [[${sourceRel}]].
`;
      await this.ctx.createOrUpdateFile(stubPath, stubContent);
      // Expand the stub with AI-generated content immediately (LLM path)
      await this.fillEmptyPage(stubPath);
      // Update the source page's broken link to point to the new stub
      const newLink = `[[${stubDir}/${stubSlug}|${result.stub_title}]]`;
      const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
      const updatedContent = sourceContent.replace(
        linkRegex,
        (fullMatch: string, capturedTarget: string) => {
          if (capturedTarget.trim() === targetName) return newLink;
          return fullMatch;
        }
      );
      await this.ctx.createOrUpdateFile(sourcePath, updatedContent);
      return `stub created and expanded: ${stubPath}`;
    }

    // ---- Deterministic fallback when LLM fails ----
    {
      const targetBasename = targetName.includes('/')
        ? targetName.split('/').pop()!
        : targetName;
      const lowerTarget = targetBasename.toLowerCase();
      // Case-insensitive match — macOS file system is case-insensitive by
      // default, so "Thinking" and "thinking" refer to the same page.
      let match = existingPages.find(p => p.title.toLowerCase() === lowerTarget);

      // Also check aliases for case-insensitive match
      if (!match) {
        match = existingPages.find(p =>
          p.aliases?.some(a => a.toLowerCase() === lowerTarget)
        );
      }

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
      const stubSlug = slugify(targetBasename);
      const stubPath = `${this.ctx.settings.wikiFolder}/${stubDir}/${stubSlug}.md`;
      const sourceRel = sourcePath
        .replace(this.ctx.settings.wikiFolder + '/', '')
        .replace('.md', '');
      const stubContent = `---
type: ${stubType}
created: ${new Date().toISOString().split('T')[0]}
sources: ["[[${sourceRel}]]"]
tags: [${stubType === 'entity' ? 'other' : 'term'}]
---
# ${targetBasename}

> Auto-generated stub page — referenced by [[${sourceRel}]].
`;
      await this.ctx.createOrUpdateFile(stubPath, stubContent);
      // Bug 4 fix: expand fallback stubs too
      await this.fillEmptyPage(stubPath);
      // Update the source page's broken link to point to the new stub
      const newLink = `[[${stubDir}/${stubSlug}|${targetBasename}]]`;
      const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
      const updatedContent = sourceContent.replace(
        linkRegex,
        (fullMatch: string, capturedTarget: string) => {
          if (capturedTarget.trim() === targetName) return newLink;
          return fullMatch;
        }
      );
      await this.ctx.createOrUpdateFile(sourcePath, updatedContent);
      return `fallback stub created and expanded: ${stubPath}`;
    }
  }

  async fillEmptyPage(pagePath: string, existingContent?: string): Promise<string> {
    // Use pre-read content when available (lint path); fall back to file read
    // for other callers (e.g. fixDeadLink stub expansion).
    // Note: existingContent may be "" (empty file) — that's valid, LLM can
    // generate from scratch. Only fall back to tryReadFile when undefined/null.
    const content = (existingContent != null) ? existingContent : await this.ctx.tryReadFile(pagePath);
    if (content === null || content === undefined) {
      throw new Error(
        `Cannot expand empty page: file not found at "${pagePath}"`
      );
    }

    const beforeLen = content.length;

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
      .replace('{{existing_content}}', content)
      .replace('{{wiki_index}}', wikiIndex.substring(0, 2000));

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const filledContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 8000,
      system: await buildSystemPrompt(
        this.ctx.settings,
        this.ctx.getSchemaContext,
        'full'
      ),
      messages: [{ role: 'user', content: prompt }],
    });

    const cleaned = cleanMarkdownResponse(filledContent);

    // Strip any residual stub marker line — LLM may preserve it from the
    // existing content, which would cause isPageEmpty to keep flagging it.
    const stubFree = cleaned.includes(STUB_MARKER)
      ? cleaned
          .split('\n')
          .filter(line => !line.includes(STUB_MARKER))
          .join('\n')
          .trim()
      : cleaned;

    // Bug 3 fix: verify the result is no longer empty before writing
    const textBody = stubFree
      .replace(/---[\s\S]*?---/, '')
      .replace(EMPTY_CONTENT_STRIP, '')
      .trim();
    if (textBody.length < MIN_SUBSTANTIVE_CHARS) {
      console.debug(
        `fillEmptyPage: LLM output still below threshold (${textBody.length} chars), writing anyway`
      );
    }

    // Override frontmatter `updated` date: the LLM may generate a date from
    // its training data (e.g. 2024) which is older than `created`.
    const dateStr = new Date().toISOString().split('T')[0];
    const withDates = normalizeFrontmatterDates(stubFree, dateStr);
    const pageTypeSingular = pageType === 'entities' ? 'entity' : pageType === 'concepts' ? 'concept' : 'source';
    const enforced = enforceFrontmatterConstraints(withDates, pageTypeSingular);

    await this.ctx.createOrUpdateFile(pagePath, enforced);

    const pageRel = pagePath.replace(this.ctx.settings.wikiFolder + '/', '').replace('.md', '');
    return `${pageRel} (${beforeLen} → ${enforced.length} chars)`;
  }

  async linkOrphanPage(orphanPath: string): Promise<string[]> {
    const orphanContent = await this.ctx.tryReadFile(orphanPath);
    if (!orphanContent) return [];

    const indexPath = `${this.ctx.settings.wikiFolder}/index.md`;
    const wikiIndex = (await this.ctx.tryReadFile(indexPath)) || '';

    const prompt = PROMPTS.linkOrphanPage
      .replace('{{orphan_content}}', orphanContent.substring(0, 2000))
      .replace('{{wiki_index}}', wikiIndex.substring(0, 3000));

    const client = this.ctx.getClient();
    if (!client) return [];

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

    if (!result?.related_pages?.length) return [];

    const linkedPages: string[] = [];
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
        linkedPages.push(related.page_path);
      }
    }
    return linkedPages;
  }

  async mergeDuplicatePages(targetPath: string, sourcePath: string): Promise<string> {
    const targetContent = await this.ctx.tryReadFile(targetPath);
    const sourceContent = await this.ctx.tryReadFile(sourcePath);
    if (!targetContent || !sourceContent) {
      throw new Error(`Cannot merge: target or source page not found (target=${targetPath}, source=${sourcePath})`);
    }

    const sourceFm = parseFrontmatter(sourceContent);
    const targetFm = parseFrontmatter(targetContent);
    const sourceTitle = sourcePath.split('/').pop()?.replace('.md', '') || '';

    // 1. Compute merged frontmatter fields (programmatic, not LLM)
    // Merge sources (dedup by lowercased key)
    const targetSources = Array.isArray(targetFm?.sources) ? targetFm.sources : [];
    const sourceSources = Array.isArray(sourceFm?.sources) ? sourceFm.sources : [];
    const mergedSourcesSet = new Set<string>();
    const mergedSourcesList: string[] = [];
    for (const s of [...targetSources, ...sourceSources]) {
      const key = s.trim().toLowerCase();
      if (!mergedSourcesSet.has(key)) {
        mergedSourcesSet.add(key);
        mergedSourcesList.push(s);
      }
    }

    // Merge aliases — sources:
    //   a) target's existing aliases
    //   b) source's frontmatter aliases
    //   c) source's filename (slug)
    //   d) source's H1 heading (display title, if different from slug)
    const targetAliases = Array.isArray(targetFm?.aliases) ? targetFm.aliases : [];
    const sourceAliases = Array.isArray(sourceFm?.aliases) ? sourceFm.aliases : [];

    // Extract H1 heading from source body as a display-name alias
    const extractH1 = (content: string): string | null => {
      const bodyMatch = content.match(/^---[\s\S]*?\n---\n?([\s\S]*)/);
      if (!bodyMatch) return null;
      const h1Match = bodyMatch[1].trim().match(/^#\s+(.+?)(?:\n|$)/);
      return h1Match ? h1Match[1].trim() : null;
    };
    const sourceH1 = extractH1(sourceContent);
    const targetH1 = extractH1(targetContent);

    const allAliases = [...targetAliases, sourceTitle, ...sourceAliases];
    if (sourceH1 && sourceH1 !== sourceTitle) {
      allAliases.push(sourceH1);
    }
    // Also add target's H1 if it differs from target filename (unlikely but safe)
    const targetFilename = targetPath.split('/').pop()?.replace('.md', '') || '';
    if (targetH1 && targetH1 !== targetFilename && !targetAliases.includes(targetH1)) {
      allAliases.unshift(targetH1); // prepend — likely the best human-readable name
    }

    const targetTitle = targetFm?.title as string || targetFilename;
    let dedupedAliases = allAliases.filter((a, i) =>
      a && a !== targetTitle && allAliases.indexOf(a) === i
    );

    // 2. LLM content merge — PASS ONLY THE BODY, NOT FRONTMATTER
    // Extract body from both pages (strip frontmatter before sending to LLM)
    const targetBodyMatch = targetContent.match(/^---[\s\S]*?\n---\n?([\s\S]*)/);
    const sourceBodyMatch = sourceContent.match(/^---[\s\S]*?\n---\n?([\s\S]*)/);
    const targetBody = targetBodyMatch ? targetBodyMatch[1].trim() : targetContent;
    const sourceBody = sourceBodyMatch ? sourceBodyMatch[1].trim() : sourceContent;

    const client = this.ctx.getClient();
    let mergedBody = '';
    let llmMergeSucceeded = false;
    if (client) {
      try {
        const prompt = PROMPTS.mergeDuplicatePages
          .replace('{{target_content}}', targetBody)  // ONLY body, no frontmatter
          .replace('{{source_content}}', sourceBody)  // ONLY body, no frontmatter
          .replace('{{source_path}}', sourcePath);

        const mergedContent = await client.createMessage({
          model: this.ctx.settings.model,
          max_tokens: 8000,
          system: await buildSystemPrompt(
            this.ctx.settings,
            this.ctx.getSchemaContext,
            'merge'
          ),
          messages: [{ role: 'user', content: prompt }]
        });

        const cleaned = cleanMarkdownResponse(mergedContent);
        if (cleaned && cleaned.length > 100) {
          // Parse JSON response: {body, aliases}
          let parsed: { body?: string; aliases?: string[] } | null = null;
          try {
            parsed = await parseJsonResponse(cleaned);
          } catch (parseErr) {
            console.error(`mergeDuplicatePages: JSON parse failed for ${sourcePath} → ${targetPath}`, parseErr);
          }
          if (parsed?.body) {
            mergedBody = parsed.body.trim();
            llmMergeSucceeded = true;
          } else if (!parsed) {
            console.warn(`mergeDuplicatePages: JSON parse returned null for ${sourcePath} → ${targetPath}, falling back to programmatic merge`);
          } else {
            console.warn(`mergeDuplicatePages: LLM response missing 'body' field for ${sourcePath} → ${targetPath}, falling back to programmatic merge`);
          }
          // Merge LLM-discovered aliases with programmatic aliases
          if (parsed?.aliases && Array.isArray(parsed.aliases)) {
            for (const a of parsed.aliases) {
              if (a && a !== targetTitle && !dedupedAliases.includes(a)) {
                dedupedAliases.push(a);
              }
            }
          }
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error(`LLM merge failed for ${sourcePath} → ${targetPath}: ${errMsg}. Using programmatic merge.`, e);
      }
    }

    // If LLM failed or returned empty body, fall back to programmatic merge (using already extracted bodies)
    if (!mergedBody) {
      if (llmMergeSucceeded) {
        console.warn(`mergeDuplicatePages: LLM returned empty body for ${sourcePath} → ${targetPath}, using programmatic merge`);
      }
      mergedBody = targetBody;
      // Append source's unique sections at the end
      if (sourceBody) {
        mergedBody += '\n\n## From ' + sourceTitle + '\n\n' + sourceBody;
      }
    }

    // 3. Build final frontmatter with all merged fields
    const today = new Date().toISOString().split('T')[0];
    const fmLines: string[] = ['---'];
    if (targetFm?.type) fmLines.push(`type: ${targetFm.type}`);
    fmLines.push(`created: ${targetFm?.created || today}`);
    fmLines.push(`updated: ${today}`);
    if (mergedSourcesList.length > 0) {
      fmLines.push('sources:');
      for (const s of mergedSourcesList) fmLines.push(`  - "${s}"`);
    }
    const tags = Array.isArray(targetFm?.tags) ? targetFm.tags : [];
    if (tags.length > 0) {
      fmLines.push('tags:');
      for (const t of tags) fmLines.push(`  - ${t}`);
    }
    if (targetFm?.reviewed) fmLines.push('reviewed: true');
    if (dedupedAliases.length > 0) {
      fmLines.push('aliases:');
      for (const a of dedupedAliases) fmLines.push(`  - "${a}"`);
    }
    fmLines.push('---');

    // CRITICAL: frontmatter closing delimiter MUST have blank line before body
    // Format: ---\n...\n---\n\n<body> (double newline after closing ---)
    const finalContent = fmLines.join('\n') + '\n\n' + mergedBody;

    // 4. Enforce frontmatter constraints (tag validation, etc.)
    const pageType = (targetFm?.type as 'entity' | 'concept' | 'source' | undefined) || 'entity';
    const validated = enforceFrontmatterConstraints(finalContent, pageType);

    // 5. Write merged target
    await this.ctx.createOrUpdateFile(targetPath, validated);

    // 6. Rewrite wiki-links: all references to sourcePath → targetPath
    const wikiFolder = this.ctx.settings.wikiFolder;
    const sourceRel = sourcePath.replace(wikiFolder + '/', '').replace('.md', '');
    const targetRel = targetPath.replace(wikiFolder + '/', '').replace('.md', '');
    const allWikiFiles = this.ctx.app.vault.getMarkdownFiles().filter(
      f => f.path.startsWith(wikiFolder) && f.path !== sourcePath
    );
    for (const file of allWikiFiles) {
      const content = await this.ctx.app.vault.read(file);
      if (content.includes(`[[${sourceRel}]]`) || content.includes(`[[${sourceRel}|`)) {
        const updated = content
          .replace(new RegExp(`\\[\\[${escapeRegex(sourceRel)}\\]\\]`, 'g'), `[[${targetRel}]]`)
          .replace(new RegExp(`\\[\\[${escapeRegex(sourceRel)}\\|`, 'g'), `[[${targetRel}|`);
        if (updated !== content) {
          await this.ctx.createOrUpdateFile(file.path, updated);
        }
      }
    }

    // 7. Delete source page
    await this.ctx.deleteFile(sourcePath);

    return `merged ${sourceRel} → ${targetRel}`;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Generate duplicate-page candidates using programmatic signals.
// Returns up to 50 candidate pairs for LLM verification.
// Three signals, ordered by reliability:
//   1. Shared frontmatter sources (strongest — catches translations of same source)
//   2. Shared outgoing wiki-links (catches pages linking to same related entities/concepts)
//   3. Character bigram title similarity (catches spelling variants, same-language near-matches)
export interface DuplicateCandidate {
  target: string;
  source: string;
  reason: string;
  signal: 'crossLang' | 'abbreviation' | 'bigram' | 'sharedLinks';
  score: number;
}

export async function generateDuplicateCandidates(
  pages: Array<{ path: string; content: string; title: string }>,
): Promise<DuplicateCandidate[]> {
  interface PageMeta {
    path: string;
    title: string;
    aliases: string[];
    links: Set<string>;
  }

  const YIELD_EVERY = 200;

  const metas: PageMeta[] = [];
  const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;

  for (const page of pages) {
    const fm = parseFrontmatter(page.content);
    const aliases = Array.isArray(fm?.aliases) ? fm.aliases : [];

    const links = new Set<string>();
    const body = page.content.replace(/---[\s\S]*?---/, '');
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(body)) !== null) {
      links.add(match[1].trim().toLowerCase());
    }

    metas.push({ path: page.path, title: page.title, aliases, links });
  }

  const candidates = new Map<string, DuplicateCandidate>();

  const addCandidate = (pathA: string, pathB: string, reason: string, signal: DuplicateCandidate['signal'], score: number) => {
    const key = [pathA, pathB].sort().join('|||');
    if (!candidates.has(key)) {
      candidates.set(key, { target: pathA, source: pathB, reason, signal, score });
    } else if (score > candidates.get(key)!.score) {
      candidates.set(key, { target: pathA, source: pathB, reason, signal, score });
    }
  };

  // Signal 1: Shared outgoing wiki-links (Jaccard >= 0.4)
  for (let i = 0; i < metas.length; i++) {
    if (i > 0 && i % YIELD_EVERY === 0) {
      await new Promise(resolve => window.setTimeout(resolve, 0));
    }
    for (let j = i + 1; j < metas.length; j++) {
      const a = metas[i], b = metas[j];
      if (a.links.size === 0 || b.links.size === 0) continue;
      let intersection = 0;
      for (const link of a.links) {
        if (b.links.has(link)) intersection++;
      }
      const union = a.links.size + b.links.size - intersection;
      const jaccard = union > 0 ? intersection / union : 0;
      if (jaccard >= 0.4) {
        addCandidate(a.path, b.path, `Shared wiki-links (${Math.round(jaccard * 100)}% overlap)`, 'sharedLinks', jaccard);
      }
    }
  }

  // Signal 2: Bigram + cross-language + abbreviation on titles/aliases
  const bigrams = (s: string): Set<string> => {
    const result = new Set<string>();
    const normalized = s.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '');
    for (let i = 0; i < normalized.length - 1; i++) {
      result.add(normalized.substring(i, i + 2));
    }
    return result;
  };

  for (let i = 0; i < metas.length; i++) {
    if (i > 0 && i % YIELD_EVERY === 0) {
      await new Promise(resolve => window.setTimeout(resolve, 0));
    }
    for (let j = i + 1; j < metas.length; j++) {
      const a = metas[i], b = metas[j];
      const namesA = [a.title, ...a.aliases];
      const namesB = [b.title, ...b.aliases];

      // 2a: Bigram similarity on all names (titles + aliases)
      let maxSim = 0;
      for (const nameA of namesA) {
        for (const nameB of namesB) {
          const bgA = bigrams(nameA);
          const bgB = bigrams(nameB);
          if (bgA.size === 0 || bgB.size === 0) continue;
          let intersection = 0;
          for (const bg of bgA) {
            if (bgB.has(bg)) intersection++;
          }
          const sim = intersection / (bgA.size + bgB.size - intersection);
          if (sim > maxSim) maxSim = sim;
        }
      }
      if (maxSim >= 0.4) {
        addCandidate(a.path, b.path, `Title/alias similarity (${Math.round(maxSim * 100)}% match)`, 'bigram', maxSim);
      }

      // 2b: Cross-language alias match
      const normalizeForMatch = (s: string) => s.toLowerCase().replace(/[\s\-_]+/g, '').replace(/[^a-z0-9一-鿿]/g, '');

      const normalizedNamesA = namesA.map(n => normalizeForMatch(n));
      const normalizedAliasesB = b.aliases.map(n => normalizeForMatch(n));
      const normalizedTitleB = normalizeForMatch(b.title);

      let crossLangMatch = false;
      for (const normA of normalizedNamesA) {
        if (normA && (normalizedAliasesB.includes(normA) || normalizedTitleB === normA)) {
          addCandidate(a.path, b.path, 'Cross-language match (alias or title overlap)', 'crossLang', 1.0);
          crossLangMatch = true;
          break;
        }
      }

      // Reverse check: B's title/alias in A's aliases
      if (!crossLangMatch) {
        const normalizedNamesB = namesB.map(n => normalizeForMatch(n));
        const normalizedAliasesA = a.aliases.map(n => normalizeForMatch(n));
        const normalizedTitleA = normalizeForMatch(a.title);

        for (const normB of normalizedNamesB) {
          if (normB && (normalizedAliasesA.includes(normB) || normalizedTitleA === normB)) {
            addCandidate(a.path, b.path, 'Cross-language match (alias or title overlap)', 'crossLang', 1.0);
            break;
          }
        }
      }

      // 2c: Common abbreviation expansion
      const abbreviations = new Map<string, string>([
        ['moe', 'mixtureofexperts'],
        ['cot', 'chainofthought'],
        ['ntp', 'nexttokenprediction'],
        ['kv', 'keyvalue'],
        ['lora', 'lowrankadaptation'],
        ['rag', 'retrievalaugmentedgeneration'],
        ['pe', 'positionencoding'],
        ['attn', 'attention'],
        ['mlp', 'multilayerperceptron'],
        ['ffn', 'feedforwardnetwork'],
        ['ce', 'crossentropy'],
        ['bf16', 'bfloat16'],
        ['fp16', 'float16'],
        ['fp32', 'float32'],
        ['gpu', 'graphicsprocessingunit'],
        ['cpu', 'centralprocessingunit'],
        ['nic', 'networkinterfacecard'],
        ['cnic', 'computenetworkinterfacecard'],
      ]);

      const expandAbbr = (s: string): string[] => {
        const norm = normalizeForMatch(s);
        const expanded = abbreviations.get(norm);
        return expanded ? [norm, expanded] : [norm];
      };

      // Check if A's title matches B's title after abbreviation expansion
      const expandedA = namesA.flatMap(n => expandAbbr(n));
      const expandedB = namesB.flatMap(n => expandAbbr(n));

      for (const expA of expandedA) {
        for (const expB of expandedB) {
          if (expA && expB && expA === expB && expA !== normalizeForMatch(a.title) && expA !== normalizeForMatch(b.title)) {
            addCandidate(a.path, b.path, `Abbreviation match (${expA})`, 'abbreviation', 1.0);
            break;
          }
        }
      }
    }
  }

	return Array.from(candidates.values());
}

// Normalize frontmatter dates: replace any LLM-generated `updated` with
// the current date. The LLM often generates dates from its training data
// which can be older than `created`, breaking chronology.
function normalizeFrontmatterDates(content: string, dateStr: string): string {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return content;

  const fmContent = fmMatch[1];
  const hasUpdated = /^updated:\s*.+$/m.test(fmContent);

  let newFm: string;
  if (hasUpdated) {
    newFm = fmContent.replace(/^updated:\s*.+$/m, `updated: ${dateStr}`);
  } else {
    newFm = fmContent + `\nupdated: ${dateStr}`;
  }

  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFm}\n---`);
}

// Standalone helper: determine if a page is substantively empty.
// Stub pages (Auto-generated stub page) are always treated as empty
// regardless of character count, since the template text itself inflates
// the count past the threshold.
export function isPageEmpty(content: string): boolean {
  if (content.includes(STUB_MARKER)) return true;

  const textBody = content
    .replace(/---[\s\S]*?---/, '')
    .replace(EMPTY_CONTENT_STRIP, '')
    .trim();
  return textBody.length < MIN_SUBSTANTIVE_CHARS;
}
