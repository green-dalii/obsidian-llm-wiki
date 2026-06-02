// Lint Fix Methods — dead link correction, empty page expansion, orphan linking,
// and duplicate merge. Extracted from WikiEngine.

import { App } from 'obsidian';
import { EngineContext } from '../types';
import { PROMPTS } from '../prompts';
import { slugify, parseJsonResponse, cleanMarkdownResponse, parseFrontmatter, enforceFrontmatterConstraints } from '../utils';
import { TOKENS_LINT_PAGE_FIX, TOKENS_LINT_ORPHAN_FIX, WIKI_SUBFOLDERS } from '../constants';
import {
  buildSystemPrompt,
  getSectionLabels,
  applySectionLabels,
  getGranularityFixLimits,
} from './system-prompts';
import {
  findDeadLinkTarget,
  buildDeadLinkReplacement,
  replaceDeadLink,
} from '../core/dead-link-detector';
import {
  buildEmptyPagePrompt,
  cleanWikiIndex,
  correctLinkPollution,
} from '../core/prompt-builders';
import {
  buildOrphanLinkPrompt,
  validateOrphanLinkTarget,
  buildOrphanLinkUpdate,
  normalizeOrphanPagePath,
} from '../core/orphan-matcher';

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
      // parseFrontmatter normalizes aliases to array, but guard anyway
      aliases: Array.isArray(fm?.aliases) ? fm.aliases : undefined,
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

    // ---- Pre-check: deterministic title + alias match (avoids unnecessary LLM calls) ----
    const sourceContent =
      (await this.ctx.tryReadFile(sourcePath)) || '(empty)';
    const targetBasename = targetName.includes('/')
      ? targetName.split('/').pop()!
      : targetName;

    // Extract pure logic to core/dead-link-detector.ts
    const preMatch = findDeadLinkTarget(existingPages, targetBasename);

    if (preMatch) {
      const newLink = buildDeadLinkReplacement(preMatch, this.ctx.settings.wikiFolder);
      const updatedContent = replaceDeadLink(sourceContent, targetName, newLink);
      await this.ctx.createOrUpdateFile(sourcePath, updatedContent);
      return `pre-check corrected (alias match): ${newLink}`;
    }

    // ---- LLM path: semantic matching with alias-aware prompt ----
    const pagesList = existingPages
      .filter(p => {
        // Purge polluted entries from the index before showing to LLM.
        // Polluted basename pattern: "<folder><non-separator-chars>"
        // e.g. "concepts布局优化", "entities张三" — folder prefix glued to CJK name.
        // Safe: "Concepts-of-ML", "entities-list" — separator after folder prefix.
        const bn = p.title || '';
        const hasPollutedBasename = /^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])/.test(bn);
        return !hasPollutedBasename;
      })
      .map(p => {
        const aliasSuffix = p.aliases?.length ? ` \`aliases: ${p.aliases.join(', ')}\`` : '';
        return `- ${p.wikiLink}${aliasSuffix}`;
      }).join('\n');

    const prompt = PROMPTS.fixDeadLink
      .replace('{{source_content}}', sourceContent.substring(0, 2000))
      .replace('{{target_name}}', targetName)
      .replace('{{existing_pages}}', pagesList.substring(0, 3000));

    const client = this.ctx.getClient();
    if (!client) return 'no action taken (no client)';

    let response = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: TOKENS_LINT_PAGE_FIX,
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
        max_tokens: TOKENS_LINT_PAGE_FIX,
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
      // Sanitize stub title: strip folder-prefix pollution if LLM prepended it.
      // e.g. "concepts布局优化" → "布局优化", "entities张三" → "张三" (L3)
      const sanitizedTitle = result.stub_title.replace(/^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])/, '$2');

      // Safety net: re-check aliases before creating a stub.
      // The LLM may have missed an alias match even though aliases were
      // included in the prompt. This prevents duplicate page creation.
      const stubTitleLower = sanitizedTitle.toLowerCase();
      const safetySlug = slugify(sanitizedTitle).toLowerCase();
      const aliasMatch = existingPages.find(p =>
        p.title.toLowerCase() === stubTitleLower ||
        p.aliases?.some(a => a.toLowerCase() === stubTitleLower) ||
        slugify(p.title).toLowerCase() === safetySlug ||
        p.aliases?.some(a => slugify(a).toLowerCase() === safetySlug)
      );
      if (aliasMatch) {
        const newLink = `[[${aliasMatch.path.replace(this.ctx.settings.wikiFolder + '/', '').replace('.md', '')}|${aliasMatch.title}]]`;
        const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
        const updatedContent = sourceContent.replace(
          linkRegex,
          (fullMatch: string, capturedTarget: string) => {
            if (capturedTarget.trim() === targetName) return newLink;
            return fullMatch;
          }
        );
        await this.ctx.createOrUpdateFile(sourcePath, updatedContent);
        return `safety-net corrected (alias match for stub): ${newLink}`;
      }

      const stubType = result.stub_type || 'entity';
      const pluralMap: Record<string, string> = {
        entity: WIKI_SUBFOLDERS.entities,
        concept: WIKI_SUBFOLDERS.concepts,
      };
      const stubDir = pluralMap[stubType] || `${stubType}s`;
      const stubSlug = slugify(sanitizedTitle);
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
# ${sanitizedTitle}

> Auto-generated stub page — referenced by [[${sourceRel}]].
`;
      await this.ctx.createOrUpdateFile(stubPath, stubContent);
      // Expand the stub with AI-generated content immediately (LLM path)
      await this.fillEmptyPage(stubPath);
      // Update the source page's broken link to point to the new stub
      const newLink = `[[${stubDir}/${stubSlug}|${sanitizedTitle}]]`;
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
      const targetSlug = slugify(targetBasename).toLowerCase();
      // Case-insensitive match — macOS file system is case-insensitive by
      // default, so "Thinking" and "thinking" refer to the same page.
      let match = existingPages.find(p =>
        p.title.toLowerCase() === lowerTarget ||
        slugify(p.title).toLowerCase() === targetSlug
      );

      // Also check aliases for case-insensitive match
      if (!match) {
        match = existingPages.find(p =>
          p.aliases?.some(a =>
            a.toLowerCase() === lowerTarget ||
            slugify(a).toLowerCase() === targetSlug
          )
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
      // Sanitize basename: strip folder-prefix pollution from fallback path (L3)
      const cleanBasename = targetBasename.replace(/^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])/, '$2');
      const stubType = targetName.includes('/entities/')
        ? 'entity'
        : 'concept';
      const stubDir = stubType === 'entity' ? 'entities' : 'concepts';
      const stubSlug = slugify(cleanBasename);
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
# ${cleanBasename}

> Auto-generated stub page — referenced by [[${sourceRel}]].
`;
      await this.ctx.createOrUpdateFile(stubPath, stubContent);
      // Bug 4 fix: expand fallback stubs too
      await this.fillEmptyPage(stubPath);
      // Update the source page's broken link to point to the new stub
      const newLink = `[[${stubDir}/${stubSlug}|${cleanBasename}]]`;
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

    const pageType = pagePath.includes(`/${WIKI_SUBFOLDERS.entities}/`)
      ? WIKI_SUBFOLDERS.entities
      : pagePath.includes(`/${WIKI_SUBFOLDERS.concepts}/`)
        ? WIKI_SUBFOLDERS.concepts
        : WIKI_SUBFOLDERS.sources;
    const indexPath = `${this.ctx.settings.wikiFolder}/index.md`;
    const rawWikiIndex = (await this.ctx.tryReadFile(indexPath)) || '';

    // Extract pure logic to core/prompt-builders.ts
    const wikiIndex = cleanWikiIndex(rawWikiIndex);
    const limits = getGranularityFixLimits(this.ctx.settings);

    const prompt = buildEmptyPagePrompt(PROMPTS.fillEmptyPage, {
      pageType,
      existingContent: content,
      wikiIndex,
      sectionLabelsHint: buildSectionLabelsHint(this.ctx.settings),
      maxEntities: limits.maxEntities,
      maxConcepts: limits.maxConcepts,
    });

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const filledContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: TOKENS_LINT_PAGE_FIX,
      system: await buildSystemPrompt(
        this.ctx.settings,
        this.ctx.getSchemaContext,
        'full'
      ),
      messages: [{ role: 'user', content: finalPrompt }],
    });

    const cleaned = cleanMarkdownResponse(filledContent);

    // Extract pure logic to core/prompt-builders.ts
    const pollutionFree = correctLinkPollution(cleaned);

    // Strip any residual stub marker line — LLM may preserve it from the
    // existing content, which would cause isPageEmpty to keep flagging it.
    const stubFree = pollutionFree.includes(STUB_MARKER)
      ? pollutionFree
          .split('\n')
          .filter(line => !line.includes(STUB_MARKER))
          .join('\n')
          .trim()
      : pollutionFree;

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
    const pageTypeSingular = pageType === WIKI_SUBFOLDERS.entities ? 'entity' : pageType === WIKI_SUBFOLDERS.concepts ? 'concept' : 'source';
    const enforced = enforceFrontmatterConstraints(withDates, pageTypeSingular);

    await this.ctx.createOrUpdateFile(pagePath, enforced);

    const pageRel = pagePath.replace(this.ctx.settings.wikiFolder + '/', '').replace('.md', '');
    return `${pageRel} (${beforeLen} → ${enforced.length} chars)`;
  }

  async linkOrphanPage(orphanPath: string): Promise<string[]> {
    const orphanContent = await this.ctx.tryReadFile(orphanPath);
    if (!orphanContent) return [];

    const indexPath = `${this.ctx.settings.wikiFolder}/index.md`;
    const rawWikiIndex = (await this.ctx.tryReadFile(indexPath)) || '';

    // Extract pure logic to core/orphan-matcher.ts
    const wikiIndex = cleanWikiIndex(rawWikiIndex);
    const prompt = buildOrphanLinkPrompt(PROMPTS.linkOrphanPage, {
      orphanContent,
      wikiIndex,
    });

    const client = this.ctx.getClient();
    if (!client) return [];

    const response = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: TOKENS_LINT_ORPHAN_FIX,
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
    const labels = getSectionLabels(this.ctx.settings);

    for (const related of result.related_pages) {
      // Extract pure logic to core/orphan-matcher.ts
      const fullPath = normalizeOrphanPagePath(
        related.page_path,
        this.ctx.settings.wikiFolder
      );
      const relatedContent = await this.ctx.tryReadFile(fullPath);
      if (!relatedContent) continue;

      // Extract pure logic to core/orphan-matcher.ts
      if (!validateOrphanLinkTarget(relatedContent, related.link_target)) {
        const updated = buildOrphanLinkUpdate(
          relatedContent,
          {
            pagePath: related.page_path,
            linkText: related.link_text,
            linkTarget: related.link_target,
          },
          labels.related_pages
        );
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

    // Filter out contaminated aliases: folder-name-prefix leakage
    // e.g. "entitiesDeepSeek-V3-2" → startsWith("entities") && longer than "entities"
    const wikiSubfolders = [WIKI_SUBFOLDERS.entities, WIKI_SUBFOLDERS.concepts, WIKI_SUBFOLDERS.sources];
    const cleanAliases = allAliases.filter(a => {
      if (!a) return false;
      for (const folder of wikiSubfolders) {
        if (a.startsWith(folder) && a.length > folder.length) return false;
      }
      return true;
    });

    const targetTitle = targetFm?.title as string || targetFilename;
    let dedupedAliases = cleanAliases.filter((a, i) =>
      a && a !== targetTitle && cleanAliases.indexOf(a) === i
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
          .replace('{{source_content}}', sourceBody);  // ONLY body, no frontmatter - removed path to prevent folder name leakage

        const mergedContent = await client.createMessage({
          model: this.ctx.settings.model,
          max_tokens: TOKENS_LINT_PAGE_FIX,
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
      fmLines.push(`${WIKI_SUBFOLDERS.sources}:`);
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

  // Fix a single polluted page: rename file, update all incoming links,
  // rebuild index. Returns a description of what was done.
  async fixPollutedPage(
    oldPath: string,
    newBasename: string
  ): Promise<string> {
    const oldRel = oldPath.replace(this.ctx.settings.wikiFolder + '/', '').replace('.md', '');
    const dir = oldRel.split('/').slice(0, -1).join('/');
    const newPath = `${this.ctx.settings.wikiFolder}/${dir}/${newBasename}.md`;
    const newRel = `${dir}/${newBasename}`;

    // If new path already exists, merge content instead of renaming
    const existingAtNew = await this.ctx.tryReadFile(newPath);
    if (existingAtNew !== null) {
      console.debug(`fixPollutedPage: clean path already exists, merging ${oldRel} → ${newRel}`);
      await this.ctx.createOrUpdateFile(newPath, existingAtNew);
      await this.ctx.deleteFile(oldPath);
      return `merged ${oldRel} → ${newRel} (clean path existed)`;
    }

    // Read old content, write to new path, delete old
    const oldContent = await this.ctx.tryReadFile(oldPath);
    if (oldContent === null) {
      return `cannot fix ${oldRel}: file not found`;
    }

    await this.ctx.createOrUpdateFile(newPath, oldContent);
    await this.ctx.deleteFile(oldPath);

    // Scan all wiki pages for references to old path and update them
    const allPages = await getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);
    let updatedCount = 0;
    for (const page of allPages) {
      const content = await this.ctx.tryReadFile(page.path);
      if (!content) continue;

      // Replace all wiki-link variants pointing to the old path
      const newContent = content
        .replace(new RegExp(`\\[\\[${escapeRegex(oldRel)}\\|([^\\]]+)\\]\\]`, 'g'), `[[${newRel}|$1]]`)
        .replace(new RegExp(`\\[\\[${escapeRegex(oldRel)}\\]\\]`, 'g'), `[[${newRel}]]`);

      if (content !== newContent) {
        await this.ctx.createOrUpdateFile(page.path, newContent);
        updatedCount++;
      }
    }

    return `renamed ${oldRel} → ${newRel} (${updatedCount} pages updated)`;
  }
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build a hint string listing section labels in the target language,
// so the LLM knows what headers to use when generating page content.
function buildSectionLabelsHint(settings: import('../types').LLMWikiSettings): string {
  const labels = getSectionLabels(settings);
  const entityLabels = [
    `- ${labels.basic_information}`,
    `- ${labels.description}`,
    `- ${labels.related_entities}`,
    `- ${labels.related_concepts}`,
    `- ${labels.mentions_in_source}`,
  ].join('\n');
  const conceptLabels = [
    `- ${labels.definition}`,
    `- ${labels.key_characteristics}`,
    `- ${labels.applications}`,
    `- ${labels.related_concepts}`,
    `- ${labels.related_entities}`,
    `- ${labels.mentions_in_source}`,
  ].join('\n');
  const sourceLabels = [
    `- ${labels.source}`,
    `- ${labels.core_content}`,
    `- ${labels.key_entities}`,
    `- ${labels.key_concepts}`,
    `- ${labels.main_points}`,
  ].join('\n');
  return `Entity pages use:\n${entityLabels}\n\nConcept pages use:\n${conceptLabels}\n\nSource pages use:\n${sourceLabels}`;
}

// Normalize frontmatter dates: replace any LLM-generated `updated` with
// the current date. The LLM often generates dates from its training data
// which can be older than `created`, breaking chronology.
export function normalizeFrontmatterDates(content: string, dateStr: string): string {
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

// Fix double-nested wiki-links caused by log.md wrapping already-formatted
// wiki-link strings. e.g. [[[[entities/Foo|Foo]]]] → [[entities/Foo|Foo]]
// Returns the fixed content and a count of fixes applied.
export function fixDoubleNestedWikiLinks(content: string): { fixed: number; content: string } {
  let fixed = 0;
  // Match [[[[target|display]]]] or [[[[target]]]]
  const doubleNestRegex = /\[\[\[\[([^\]|#]+)(?:[|#]([^\]]+))?\]\]\]\]/g;
  const result = content.replace(doubleNestRegex, (_fullMatch, target: string, display?: string) => {
    fixed++;
    if (display) {
      return `[[${target}|${display}]]`;
    }
    return `[[${target}]]`;
  });
  return { fixed, content: result };
}
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

// Detect pages with polluted basenames — folder-prefix duplication where
// the page slug starts with "entities", "concepts", or "sources" directly
// followed by a non-separator character (CJK, letter, etc.).
// e.g. "concepts布局优化.md", "entities张三.md"
export function detectPollutedPages(
  pages: Array<{ path: string; title: string }>
): Array<{ path: string; title: string; cleanTitle: string }> {
  const polluted: Array<{ path: string; title: string; cleanTitle: string }> = [];
  for (const p of pages) {
    const match = /^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])/.exec(p.title);
    if (match) {
      polluted.push({
        path: p.path,
        title: p.title,
        cleanTitle: p.title.replace(/^(entities|concepts|sources)/, ''),
      });
    }
  }
  return polluted;
}
