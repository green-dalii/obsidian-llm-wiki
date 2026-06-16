// Fix runners — batch execution helpers for each lint fix phase.
// Extracted from lint-controller.ts to keep the orchestrator focused on
// detection, reporting, and callback wiring.

import { Notice, TFile } from 'obsidian';
import { LintContext } from './types';
import { TEXTS } from '../../texts';
import { PROMPTS } from '../../prompts';
import { parseJsonResponse, detectRateLimitFailures, formatRateLimitNotice, getActiveEntityTags, getActiveConceptTags, getActiveSourceTags, enforceFrontmatterConstraints } from '../../utils';
import { TOKENS_LINT_ALIAS_BATCH, NOTICE_ERROR, NOTICE_RATE_LIMIT } from '../../constants';
import { buildWikiLanguageDirective, appendTagVocabularyToPrompt } from '../system-prompts';
import { TagViolation } from './scanners';

// Issue #94: Status bar "click to cancel" already exists, but the fix-runner
// functions in this module previously never received the AbortSignal. Each
// runner must check `signal.aborted` at entry and inside its loop. Without
// this, users could click the status bar during a long fix phase and the
// LLM calls inside the runners would keep running to completion.
function checkCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException('Lint cancelled by user', 'AbortError');
  }
}

// Returns a Notice-like object whose setMessage() also mirrors the text to the
// status bar. Keeps popup and status bar in sync without manual updateStatusBar
// calls at every progress site.
export function makeMirroredNotice(ctx: LintContext): { setMessage: (msg: string) => void; hide: () => void } {
  const notice = new Notice('', 0);
  return {
    setMessage(msg: string) {
      notice.setMessage(msg);
      ctx.wikiEngine.updateStatusBar(msg);
    },
    hide() { notice.hide(); ctx.wikiEngine.updateStatusBar(''); }
  };
}

export async function runAliasCompletion(
  ctx: LintContext,
  signal: AbortSignal | undefined,
  aliasDeficientPages: Array<{ path: string; content: string; basename: string }>,
): Promise<{ filled: number; results: string[] }> {
  checkCancelled(signal);
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
  const aliasFailures: Array<{ name: string; reason: string }> = [];

  try {
    for (let i = 0; i < aliasDeficientPages.length; i += concurrency) {
    checkCancelled(signal);
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
            max_tokens: TOKENS_LINT_ALIAS_BATCH,
            system: buildWikiLanguageDirective(ctx.settings),
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
          new Notice(t.lintAliasesFillFailed.replace('{page}', page.basename).replace('{error}', errMsg), NOTICE_ERROR);
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
        const failureName = r.status === 'fulfilled' ? String(r.value.name || 'unknown') : 'promise-rejected';
        const failureReason = r.status === 'fulfilled' ? String(r.value.reason || 'unknown') :
          r.reason instanceof Error ? r.reason.message : String(r.reason || 'unknown');
        aliasFailures.push({ name: failureName, reason: failureReason });
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
  } finally {
    fixNotice.hide();
  }

  // Rate-limit detection for alias completion
  const aliasRateInfo = detectRateLimitFailures(aliasFailures, concurrency, ctx.settings.batchDelayMs ?? 300);
  if (aliasRateInfo) {
    console.warn(`[Alias Rate Limit] ${aliasRateInfo.count} alias generation(s) failed with 429, ` +
      `suggested concurrency=${aliasRateInfo.suggestedConcurrency}, delay=${aliasRateInfo.suggestedDelay}ms`);
    new Notice(formatRateLimitNotice(aliasRateInfo, ctx.settings.language), NOTICE_RATE_LIMIT);
  }

  const totalTime = Date.now() - aliasStartTime;
  console.debug(`[Alias] All done — success=${filled}, fail=${aliasDeficientPages.length - filled}, totalTime=${totalTime}ms`);
  return { filled, results };
}

export async function runDeadLinkFixes(
  ctx: LintContext,
  signal: AbortSignal | undefined,
  deadLinks: Array<{ source: string; target: string }>,
): Promise<{ fixed: number; results: string[] }> {
  checkCancelled(signal);
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
  try {
    for (let i = 0; i < unique.length; i++) {
      checkCancelled(signal);
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
        new Notice(t.lintFixItemFailed.replace('{target}', dl.target).replace('{error}', errMsg), NOTICE_ERROR);
      }
    }
  } finally {
    // Simplify Phase 1.3: dismiss the persistent Notice even on AbortError,
    // otherwise it stays on the status bar forever (zero-timeout Notice).
    fixNotice.hide();
  }
  return { fixed, results };
}

export async function runEmptyPageFixes(
  ctx: LintContext,
  signal: AbortSignal | undefined,
  emptyPages: Array<{ path: string; content: string }>,
): Promise<{ filled: number; results: string[] }> {
  checkCancelled(signal);
  const t = TEXTS[ctx.settings.language];
  let filled = 0;
  const results: string[] = [];
  const fixNotice = new Notice('', 0);
  try {
    for (let i = 0; i < emptyPages.length; i++) {
      checkCancelled(signal);
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
        new Notice(t.lintFillFailed.replace('{page}', ep.path).replace('{error}', errMsg), NOTICE_ERROR);
      }
    }
  } finally {
    fixNotice.hide();
  }
  return { filled, results };
}

export async function runOrphanFixes(
  ctx: LintContext,
  signal: AbortSignal | undefined,
  orphans: string[],
): Promise<{ linked: number; results: string[] }> {
  checkCancelled(signal);
  const t = TEXTS[ctx.settings.language];
  const results: string[] = [];
  const fixNotice = new Notice('', 0);
  try {
    for (let i = 0; i < orphans.length; i++) {
      checkCancelled(signal);
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
        new Notice(t.lintLinkItemFailed.replace('{page}', opRel).replace('{error}', errMsg), NOTICE_ERROR);
      }
    }
  } finally {
    fixNotice.hide();
  }
  return { linked: results.length, results };
}

export async function runDuplicateMerges(
  ctx: LintContext,
  signal: AbortSignal | undefined,
  duplicates: Array<{ target: string; source: string; reason: string }>,
): Promise<{ merged: number; results: string[] }> {
  checkCancelled(signal);
  const t = TEXTS[ctx.settings.language];
  let merged = 0;
  const results: string[] = [];
  const fixNotice = new Notice('', 0);
  try {
    for (let i = 0; i < duplicates.length; i++) {
      checkCancelled(signal);
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
        new Notice(t.lintMergeItemFailed.replace('{source}', sourceRel).replace('{target}', targetRel).replace('{error}', errMsg), NOTICE_ERROR);
      }
    }
  } finally {
    fixNotice.hide();
  }
  return { merged, results };
}

// ── runRetagViolations (Issue #85 v7) ────────────────────────────

/**
 * Issue #85 v7: LLM-assisted retag for pages whose frontmatter `tags`
 * array contains values outside the active vocabulary. The LLM is
 * given the page's name + first paragraph (summary) + the active
 * vocabulary, and asked to return a new `tags: string[]` that
 * best describes the page using ONLY values from the vocabulary.
 * Body is never touched — only the `tags:` line in the frontmatter
 * is rewritten via enforceFrontmatterConstraints.
 *
 * The LLM call uses appendTagVocabularyToPrompt() to inject the
 * active vocabulary section (so the LLM knows what values are
 * allowed), and the system prompt is the existing wiki language
 * directive (no new schema task needed — retag is small-scope).
 *
 * Per-page loop (not batched). Each retag is a small, independent
 * LLM call. Issue #94 cancel propagation: the runner checks
 * `signal.aborted` before each iteration and at the top of every
 * await.
 */
export async function runRetagViolations(
  ctx: LintContext,
  signal: AbortSignal | undefined,
  violations: TagViolation[],
): Promise<{ fixed: number; results: string[] }> {
  if (signal?.aborted) {
    throw new DOMException('Lint fix cancelled by user', 'AbortError');
  }
  if (!ctx.llmClient) {
    return { fixed: 0, results: ['LLM client not initialized; retag skipped.'] };
  }
  const t = TEXTS[ctx.settings.language];
  const fixNotice = new Notice(t.lintTagViolationFiring
    .replace('{current}', '0')
    .replace('{total}', String(violations.length))
    .replace('{path}', ''), 0);

  const results: string[] = [];
  let fixed = 0;
  try {
    for (let i = 0; i < violations.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('Lint fix cancelled by user', 'AbortError');
      }
      const v = violations[i];
      fixNotice.setMessage(t.lintTagViolationFiring
        .replace('{current}', String(i + 1))
        .replace('{total}', String(violations.length))
        .replace('{path}', v.path));

      try {
        // Read the current page content. The Obsidian API is
        // `Vault.read(file: TFile)` — TFile itself does not have a
        // `read()` method (this is a common mistake; TFile extends
        // TAbstractFile which has only metadata, not content). The
        // previous code called `tfile.read()` and produced
        // "tfile.read is not a function" at runtime, which is what
        // blew up the user's "Retag" button. The mock tests in
        // fix-runners.test.ts passed because the mock provided its
        // own `.read()` — a textbook shell test that did not
        // exercise the real production code path. The fix is the
        // correct call below; the new shell-test guard
        // ("TFile.read mock does not match real Obsidian TFile") is
        // added to fix-runners.test.ts to prevent regression.
        const file = ctx.app.vault.getAbstractFileByPath(v.path);
        if (!file) {
          results.push(`${v.path}: file not found`);
          continue;
        }
        // TFile is the concrete subclass of TAbstractFile that holds
        // vault-readable content. Use instanceof TFile to distinguish
        // TFile from TFolder — this satisfies the obsidianmd/
        // no-tfile-tfolder-cast lint rule while being type-safe.
        // Real Obsidian TFile passes this check in production;
        // the test mock (new TFile() with Object.assign) also passes
        // because vitest hoists TFile to the same class reference.
        if (!(file instanceof TFile)) {
          results.push(`${v.path}: not a regular file`);
          continue;
        }
        // Read via ctx.app.vault.read(file) — the correct Obsidian API
        // for reading a file by TFile. vault.cachedRead() is also
        // available but we want fresh content (the LLM must see
        // the current frontmatter, not a cached snapshot from a
        // prior render).
        const content = await ctx.app.vault.read(file);
        // Body preview for the LLM: only the first ~400 chars of the
        // post-frontmatter body, so we don't waste tokens on a long wiki
        // page. The LLM just needs the gist to pick the right tags.
        const fmEnd = content.indexOf('\n---\n', 3);
        const body = fmEnd === -1 ? content : content.substring(fmEnd + 5);
        const bodyPreview = body.slice(0, 400).replace(/\n+/g, ' ').trim();

        // Active vocabulary for the page's type
        const validVocab = v.pageType === 'entity'
          ? getActiveEntityTags(ctx.settings)
          : v.pageType === 'concept'
            ? getActiveConceptTags(ctx.settings)
            : getActiveSourceTags(ctx.settings);

        // Build the prompt: introduce the page, list current tags,
        // list allowed vocabulary, ask for new tags.
        // Note: no LLM-side schema task is added — the retag is
        // self-contained and does not need the full wiki schema.
        const prompt = appendTagVocabularyToPrompt(
          `You are retagging a wiki page whose current tags fall outside the active vocabulary.

Page name: ${v.title}
Page type: ${v.pageType}
Current tags (some are invalid): [${v.currentTags.join(', ')}]
Invalid tags: [${v.invalidTags.join(', ')}]

Page summary (first 400 chars of body):
${bodyPreview}

Task: Return a JSON object with a single field "tags" that is an array of strings.
- Each value MUST be one of the allowed values listed in the Active Tag Vocabulary section below.
- The values should be the closest valid matches for what this page is actually about.
- Do NOT include any other fields. Do NOT include any explanatory text.
- If the page is genuinely about nothing in the vocabulary, return an empty array.
`,
          ctx.settings
        );

        const response = await ctx.llmClient.createMessage({
          model: ctx.settings.model,
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        });
        if (signal?.aborted) {
          throw new DOMException('Lint fix cancelled by user', 'AbortError');
        }
        const parsed = await parseJsonResponse(response) as { tags?: string[] } | null;
        const newTags = Array.isArray(parsed?.tags)
          ? parsed.tags.map(t => String(t).trim()).filter(t => t.length > 0)
          : [];
        // Final safety: every returned tag MUST be in the active vocab.
        // (LLM may occasionally slip a non-vocab value.)
        const safeNewTags = newTags.filter(t => validVocab.includes(t));

        if (safeNewTags.length === 0) {
          results.push(`${v.path}: LLM kept no tags (no valid match)`);
          continue;
        }
        if (safeNewTags.length === v.currentTags.length &&
            safeNewTags.every(t => v.currentTags.includes(t))) {
          // No-op: the LLM returned the same tags we already had.
          results.push(`${v.path}: no change`);
          continue;
        }

        // Rebuild the frontmatter with the new tags. We reuse
        // enforceFrontmatterConstraints so date / aliases / created /
        // updated are preserved. The body is byte-identical to the
        // input we read.
        const updated = enforceFrontmatterConstraints(
          content,  // original content; only the tags: line will change
          v.pageType,
          ctx.settings,
        );
        // enforceFrontmatterConstraints preserves all LLM-emitted tags
        // (v6 preserve-LLM-intent), so we still need to REWRITE the
        // tags: line explicitly with the LLM's new tags.
        const rewritten = updated.replace(
          /tags:\s*\[[^\]]*\]/,
          `tags: [${safeNewTags.join(', ')}]`
        );
        await ctx.app.vault.adapter.write(v.path, rewritten);
        fixed++;
        results.push(`${v.path}: [${v.currentTags.join(', ')}] → [${safeNewTags.join(', ')}]`);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') throw e;
        const errMsg = e instanceof Error ? e.message : String(e);
        // console.error so the user sees the full stack in DevTools
        // (Ctrl+Shift+I). Notice alone truncates the error message
        // and gives no recovery info — that was the bug reported
        // when "Retag failed for X: tfile.read is not a function"
        // appeared with no other diagnostic output. We include the
        // page type + violation context for debugging.
        console.error(
          `[runRetagViolations] ${v.path} (${v.pageType}) failed:`,
          e
        );
        results.push(`${v.path}: ${errMsg}`);
        new Notice(t.lintTagViolationFailed.replace('{path}', v.path).replace('{error}', errMsg), NOTICE_ERROR);
      }
    }
  } finally {
    fixNotice.hide();
  }
  return { fixed, results };
}
