// Fix runners — batch execution helpers for each lint fix phase.
// Extracted from lint-controller.ts to keep the orchestrator focused on
// detection, reporting, and callback wiring.

import { Notice } from 'obsidian';
import { LintContext } from '../lint-controller';
import { TEXTS } from '../../texts';
import { PROMPTS } from '../../prompts';
import { parseJsonResponse } from '../../utils';

export async function runAliasCompletion(
  ctx: LintContext,
  aliasDeficientPages: Array<{ path: string; content: string; basename: string }>,
): Promise<{ filled: number; results: string[] }> {
  const client = ctx.llmClient;
  if (!client) return { filled: 0, results: [] };

  const t = TEXTS[ctx.settings.language];
  const concurrency = ctx.settings.pageGenerationConcurrency ?? 1;
  const totalBatches = Math.ceil(aliasDeficientPages.length / concurrency);
  console.debug(`[Alias] Starting alias completion — ${aliasDeficientPages.length} pages, concurrency=${concurrency}, batches=${totalBatches}`);

  let filled = 0;
  const results: string[] = [];
  const fixNotice = new Notice('', 0);
  const aliasStartTime = Date.now();

  for (let i = 0; i < aliasDeficientPages.length; i += concurrency) {
    const batch = aliasDeficientPages.slice(i, i + concurrency);
    const batchNum = Math.floor(i / concurrency) + 1;
    const batchStartTime = Date.now();

    console.debug(`[Alias batch ${batchNum}/${totalBatches}] Processing ${batch.length} pages: ${batch.map(p => p.basename).join(', ')}`);

    const batchResults = await Promise.allSettled(
      batch.map(async (page) => {
        const pageRel = page.path.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
        fixNotice.setMessage(t.lintAliasesFilling
          .replace('{current}', String(Math.min(i + batch.length, aliasDeficientPages.length)))
          .replace('{total}', String(aliasDeficientPages.length))
          .replace('{page}', page.basename));

        try {
          const bodyMatch = page.content.match(/^---[\s\S]*?\n---\n?([\s\S]*)/);
          const body = bodyMatch ? bodyMatch[1].trim() : '';

          const prompt = PROMPTS.generateAliases
            .replace('{{title}}', page.basename)
            .replace('{{body}}', body.substring(0, 2000));

          const response = await client.createMessage({
            model: ctx.settings.model,
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
          });

          const parsed = await parseJsonResponse(response) as { aliases?: string[] } | null;
          if (parsed?.aliases?.length) {
            console.debug(`[Alias] ${page.basename}: generated ${parsed.aliases.length} aliases → [${parsed.aliases.join(', ')}]`);

            const fmEnd = page.content.indexOf('\n---', 3);
            if (fmEnd !== -1) {
              const aliasesYaml = 'aliases:\n' + parsed.aliases.map(a => `  - "${a}"`).join('\n');
              const updated = page.content.substring(0, fmEnd) + '\n' + aliasesYaml + page.content.substring(fmEnd);
              await ctx.app.vault.adapter.write(page.path, updated);
              results.push(`- [[${pageRel}]]: added ${parsed.aliases.length} aliases`);
              return { success: true, name: page.basename, count: parsed.aliases.length };
            } else {
              console.warn(`[Alias] ${page.basename}: frontmatter closing marker not found`);
            }
          }
          return { success: false, name: page.basename, reason: 'No aliases generated' };
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          console.error(`[Alias] ${page.basename}: generation failed — ${errMsg}`);
          new Notice(t.lintAliasesFillFailed.replace('{page}', page.basename).replace('{error}', errMsg), 8000);
          return { success: false, name: page.basename, reason: errMsg };
        }
      })
    );

    let batchSuccess = 0;
    let batchFail = 0;
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value.success) {
        filled++;
        batchSuccess++;
      } else {
        batchFail++;
        if (r.status === 'rejected') {
          console.error(`[Alias batch ${batchNum}] Promise rejected:`, r.reason);
        }
      }
    }

    const batchTime = Date.now() - batchStartTime;
    console.debug(`[Alias batch ${batchNum}/${totalBatches}] Done — success=${batchSuccess}, fail=${batchFail}, time=${batchTime}ms`);

    if (i + concurrency < aliasDeficientPages.length && (ctx.settings.batchDelayMs ?? 300) > 0) {
      await new Promise(resolve => window.setTimeout(resolve, ctx.settings.batchDelayMs ?? 300));
    }
  }

  fixNotice.hide();
  const totalTime = Date.now() - aliasStartTime;
  console.debug(`[Alias] All done — success=${filled}, fail=${aliasDeficientPages.length - filled}, totalTime=${totalTime}ms`);
  return { filled, results };
}

export async function runDeadLinkFixes(
  ctx: LintContext,
  deadLinks: Array<{ source: string; target: string }>,
): Promise<{ fixed: number; results: string[] }> {
  const t = TEXTS[ctx.settings.language];
  const seen = new Set<string>();
  const unique = deadLinks.filter(dl => {
    const key = `${dl.source}::${dl.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  let fixed = 0;
  const results: string[] = [];
  const fixNotice = new Notice('', 0);
  for (let i = 0; i < unique.length; i++) {
    const dl = unique[i];
    fixNotice.setMessage(t.lintFixProgress.replace('{current}', String(i + 1)).replace('{total}', String(unique.length)).replace('{target}', dl.target));
    console.debug(`lintFix: dead link ${i + 1}/${unique.length}: ${dl.source} -> ${dl.target}`);
    try {
      const sourcePath = `${ctx.settings.wikiFolder}/${dl.source}.md`;
      const result = await ctx.wikiEngine.fixDeadLink(sourcePath, dl.target);
      console.debug(`Dead link fix: ${dl.source} -> ${dl.target}: ${result}`);
      if (!result.includes(t.lintFixNoAction)) {
        fixed++;
        results.push(`- [[${dl.source}]]: \`[[${dl.target}]]\` → ${result}`);
      }
    } catch (e) {
      console.error(`Failed to fix dead link: ${dl.source} -> ${dl.target}`, e);
      const errMsg = e instanceof Error ? e.message : String(e);
      new Notice(t.lintFixItemFailed.replace('{target}', dl.target).replace('{error}', errMsg), 8000);
    }
  }
  fixNotice.hide();
  return { fixed, results };
}

export async function runEmptyPageFixes(
  ctx: LintContext,
  emptyPages: Array<{ path: string; content: string }>,
): Promise<{ filled: number; results: string[] }> {
  const t = TEXTS[ctx.settings.language];
  let filled = 0;
  const results: string[] = [];
  const fixNotice = new Notice('', 0);
  for (let i = 0; i < emptyPages.length; i++) {
    const ep = emptyPages[i];
    fixNotice.setMessage(t.lintFillProgress.replace('{current}', String(i + 1)).replace('{total}', String(emptyPages.length)).replace('{page}', ep.path));
    console.debug(`lintFix: fill empty page ${i + 1}/${emptyPages.length}: ${ep.path}`);
    try {
      const summary = await ctx.wikiEngine.fillEmptyPage(ep.path, ep.content);
      filled++;
      results.push(`- ${summary}`);
    } catch (e) {
      console.error(`Failed to expand empty page: ${ep.path}`, e);
      const errMsg = e instanceof Error ? e.message : String(e);
      new Notice(t.lintFillFailed.replace('{page}', ep.path).replace('{error}', errMsg), 8000);
    }
  }
  fixNotice.hide();
  return { filled, results };
}

export async function runOrphanFixes(
  ctx: LintContext,
  orphans: string[],
): Promise<{ linked: number; results: string[] }> {
  const t = TEXTS[ctx.settings.language];
  const results: string[] = [];
  const fixNotice = new Notice('', 0);
  for (let i = 0; i < orphans.length; i++) {
    const op = orphans[i];
    const opRel = op.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
    fixNotice.setMessage(t.lintLinkProgress.replace('{current}', String(i + 1)).replace('{total}', String(orphans.length)).replace('{page}', opRel));
    console.debug(`lintFix: link orphan ${i + 1}/${orphans.length}: ${op}`);
    try {
      const linkedPages = await ctx.wikiEngine.linkOrphanPage(op);
      if (linkedPages.length > 0) {
        results.push(`- [[${opRel}]] linked from: ${linkedPages.map(p => `[[${p}]]`).join(', ')}`);
      } else {
        results.push(`- [[${opRel}]]: no suitable linking targets found`);
      }
    } catch (e) {
      console.error(`Failed to link orphan: ${op}`, e);
      const errMsg = e instanceof Error ? e.message : String(e);
      new Notice(t.lintLinkItemFailed.replace('{page}', opRel).replace('{error}', errMsg), 8000);
    }
  }
  fixNotice.hide();
  return { linked: results.length, results };
}

export async function runDuplicateMerges(
  ctx: LintContext,
  duplicates: Array<{ target: string; source: string; reason: string }>,
): Promise<{ merged: number; results: string[] }> {
  const t = TEXTS[ctx.settings.language];
  let merged = 0;
  const results: string[] = [];
  const fixNotice = new Notice('', 0);
  for (let i = 0; i < duplicates.length; i++) {
    const d = duplicates[i];
    const sourceRel = d.source.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
    const targetRel = d.target.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
    fixNotice.setMessage(t.lintMergeProgress.replace('{current}', String(i + 1)).replace('{total}', String(duplicates.length)).replace('{source}', sourceRel).replace('{target}', targetRel));
    console.debug(`lintFix: merge duplicates ${i + 1}/${duplicates.length}: ${d.source} → ${d.target}`);
    try {
      const result = await ctx.wikiEngine.mergeDuplicatePages(d.target, d.source);
      merged++;
      results.push(`- ${d.source} → ${d.target}: ${result}`);
    } catch (e) {
      console.error(`Failed to merge duplicates: ${d.source} → ${d.target}`, e);
      const errMsg = e instanceof Error ? e.message : String(e);
      new Notice(t.lintMergeItemFailed.replace('{source}', sourceRel).replace('{target}', targetRel).replace('{error}', errMsg), 8000);
    }
  }
  fixNotice.hide();
  return { merged, results };
}
