import { EngineContext } from '../../types';
import { PROMPTS } from '../../prompts';
import { TOKENS_LINT_PAGE_FIX, WIKI_SUBFOLDERS } from '../../constants';
import { buildSystemPrompt } from '../system-prompts';
import { parseFrontmatter, enforceFrontmatterConstraints, serializeFrontmatter } from '../../core/frontmatter';
import { parseJsonResponse } from '../../core/json';
import { cleanMarkdownResponse } from '../../core/markdown';
import { escapeRegex } from './utils';
import { resolveModelForTask } from '../../core/model-resolver';

export async function mergeDuplicatePages(
  ctx: EngineContext,
  targetPath: string,
  sourcePath: string
): Promise<string> {
  const targetContent = await ctx.tryReadFile(targetPath);
  const sourceContent = await ctx.tryReadFile(sourcePath);
  if (!targetContent || !sourceContent) {
    throw new Error(`Cannot merge: target or source page not found (target=${targetPath}, source=${sourcePath})`);
  }

  const sourceFm = parseFrontmatter(sourceContent);
  const targetFm = parseFrontmatter(targetContent);
  const sourceTitle = sourcePath.split('/').pop()?.replace('.md', '') || '';

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

  const targetAliases = Array.isArray(targetFm?.aliases) ? targetFm.aliases : [];
  const sourceAliases = Array.isArray(sourceFm?.aliases) ? sourceFm.aliases : [];

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
  const targetFilename = targetPath.split('/').pop()?.replace('.md', '') || '';
  if (targetH1 && targetH1 !== targetFilename && !targetAliases.includes(targetH1)) {
    allAliases.unshift(targetH1);
  }

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

  const targetBodyMatch = targetContent.match(/^---[\s\S]*?\n---\n?([\s\S]*)/);
  const sourceBodyMatch = sourceContent.match(/^---[\s\S]*?\n---\n?([\s\S]*)/);
  const targetBody = targetBodyMatch ? targetBodyMatch[1].trim() : targetContent;
  const sourceBody = sourceBodyMatch ? sourceBodyMatch[1].trim() : sourceContent;

  const client = ctx.getClient();
  let mergedBody = '';
  let llmMergeSucceeded = false;
  if (client) {
    try {
      const prompt = PROMPTS.mergeDuplicatePages
        .replace('{{target_content}}', targetBody)
        .replace('{{source_content}}', sourceBody);

      const mergedContent = await client.createMessage({
        model: resolveModelForTask(ctx.settings, 'lint'),
        max_tokens: TOKENS_LINT_PAGE_FIX,
        system: await buildSystemPrompt(
          ctx.settings,
          ctx.getSchemaContext,
          'merge'
        ),
        messages: [{ role: 'user', content: prompt }],
        ...(ctx.settings.disableThinking ? { enableThinking: false } : {}),
      });

      const cleaned = cleanMarkdownResponse(mergedContent);
      if (cleaned && cleaned.length > 100) {
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

  if (!mergedBody) {
    if (llmMergeSucceeded) {
      console.warn(`mergeDuplicatePages: LLM returned empty body for ${sourcePath} → ${targetPath}, using programmatic merge`);
    }
    mergedBody = targetBody;
    if (sourceBody) {
      mergedBody += '\n\n## From ' + sourceTitle + '\n\n' + sourceBody;
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const newContent = serializeFrontmatter(
    {
      type: targetFm?.type,
      created: targetFm?.created || today,
      updated: today,
      sources: mergedSourcesList,
      tags: Array.isArray(targetFm?.tags) ? targetFm.tags : [],
      reviewed: targetFm?.reviewed,
      aliases: dedupedAliases,
    },
    { tagStyle: 'block' }
  ) + '\n\n' + mergedBody;
  const pageType = targetPath.includes(`/${WIKI_SUBFOLDERS.entities}/`)
    ? 'entity'
    : targetPath.includes(`/${WIKI_SUBFOLDERS.concepts}/`)
      ? 'concept'
      : 'source';

  const enforced = enforceFrontmatterConstraints(newContent, pageType, ctx.settings);
  await ctx.createOrUpdateFile(targetPath, enforced);

  // Rewrite wiki-links: all references to sourcePath -> targetPath
  const wikiFolder = ctx.settings.wikiFolder;
  const sourceRel = sourcePath.replace(wikiFolder + '/', '').replace('.md', '');
  const targetRel = targetPath.replace(wikiFolder + '/', '').replace('.md', '');
  const allWikiFiles = ctx.app.vault.getMarkdownFiles().filter(
    f => f.path.startsWith(wikiFolder) && f.path !== sourcePath
  );
  for (const file of allWikiFiles) {
    const content = await ctx.app.vault.read(file);
    if (content.includes(`[[${sourceRel}]]`) || content.includes(`[[${sourceRel}|`)) {
      const updated = content
        .replace(new RegExp(`\\[\\[${escapeRegex(sourceRel)}\\]\\]`, 'g'), `[[${targetRel}]]`)
        .replace(new RegExp(`\\[\\[${escapeRegex(sourceRel)}\\|`, 'g'), `[[${targetRel}|`);
      if (updated !== content) {
        await ctx.createOrUpdateFile(file.path, updated);
      }
    }
  }

  await ctx.deleteFile(sourcePath);
  return `merged ${sourceRel} → ${targetRel}`;
}
