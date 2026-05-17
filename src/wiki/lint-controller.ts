// Lint Controller — Wiki health analysis and fix orchestration.
// Extracted from main.ts to keep the plugin entry point manageable.

import { App, Notice } from 'obsidian';
import { LLMWikiSettings, LLMClient } from '../types';
import { LintFixCallbacks, LintCounts, LintReportModal } from '../ui/modals';
import { TEXTS } from '../texts';
import { PROMPTS } from '../prompts';
import { cleanMarkdownResponse, parseJsonResponse } from '../utils';
import { isPageEmpty } from './lint-fixes';
import { generateDuplicateCandidates, DuplicateCandidate } from './lint/duplicate-detection';
import { runAliasCompletion, runDeadLinkFixes, runEmptyPageFixes, runOrphanFixes, runDuplicateMerges } from './lint/fix-runners';
import { WikiEngine } from './wiki-engine';

export interface LintContext {
  app: App;
  settings: LLMWikiSettings;
  llmClient: LLMClient | null;
  wikiEngine: WikiEngine;
  onAnalyzeSchema: () => void;
}

export async function runLintWiki(ctx: LintContext): Promise<void> {
  if (!ctx.llmClient) {
    new Notice(TEXTS[ctx.settings.language].errorNoApiKey);
    return;
  }

  new Notice(TEXTS[ctx.settings.language].lintWikiStart);

  let stageNotice: Notice | null = null;

  try {
    const wikiFiles = ctx.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(ctx.settings.wikiFolder) &&
                   !f.path.includes('index.md') &&
                   !f.path.includes('log.md') &&
                   !f.path.includes('/schema/') &&
                   !f.path.includes('/contradictions/'));

    // ---- 1. Programmatic checks ----

    const allVaultFiles = ctx.app.vault.getMarkdownFiles();
    const knownTargets = new Set<string>();
    const knownTargetsLower = new Set<string>();
    for (const file of allVaultFiles) {
      const nameWithoutExt = file.basename.replace('.md', '');
      const addTarget = (t: string) => {
        knownTargets.add(t);
        knownTargetsLower.add(t.toLowerCase());
      };
      addTarget(file.basename);
      addTarget(nameWithoutExt);

      const relPath = file.path.replace('.md', '');
      addTarget(relPath);
      addTarget(file.path);

      const parts = relPath.split('/');
      for (let i = 1; i < parts.length; i++) {
        const subPath = parts.slice(i).join('/');
        addTarget(subPath);
        addTarget(subPath + '.md');
      }
    }

    const t = TEXTS[ctx.settings.language];
    const pageMap = new Map<string, { path: string; content: string; basename: string }>();
    stageNotice = new Notice('', 0);
    stageNotice.setMessage(t.lintReadingPages.replace('{count}', String(wikiFiles.length)));
    console.debug(`lintWiki: reading ${wikiFiles.length} wiki pages in parallel`);

    const totalPages = wikiFiles.length;
    const BATCH_READ = 200;
    for (let i = 0; i < wikiFiles.length; i += BATCH_READ) {
      const batch = wikiFiles.slice(i, i + BATCH_READ);
      const batchResults = await Promise.all(
        batch.map(async file => {
          const content = await ctx.app.vault.read(file);
          return { path: file.path, content, basename: file.basename };
        })
      );
      for (const r of batchResults) {
        pageMap.set(r.path, r);
      }
    }
    stageNotice.setMessage(t.lintReadingPagesProgress
      .replace('{current}', String(totalPages))
      .replace('{total}', String(totalPages)));
    console.debug(`lintWiki: read ${totalPages}/${totalPages} pages`);

    // ---- 1. Alias deficiency check (runs first — enables better duplicate detection) ----
    const aliasDeficientPages: Array<{ path: string; content: string; basename: string }> = [];
    for (const file of wikiFiles) {
      if (file.path.includes('/entities/') || file.path.includes('/concepts/')) {
        const info = pageMap.get(file.path);
        if (info) {
          const fmMatch = info.content.match(/^---\n([\s\S]*?)\n---/);
          if (fmMatch && !fmMatch[1].includes('aliases:')) {
            aliasDeficientPages.push(info);
          }
        }
      }
    }
    console.debug(`lintWiki: ${aliasDeficientPages.length} entity/concept pages missing aliases`);

    // ---- 2. Duplicate detection (Layer 1 programmatic candidates + Layer 3 LLM verification) ----
    let duplicates: Array<{target: string, source: string, reason: string}> = [];
    const entityConceptFiles = wikiFiles.filter(f =>
      f.path.includes('/entities/') || f.path.includes('/concepts/')
    );
    if (entityConceptFiles.length >= 2 && ctx.llmClient) {
      stageNotice.setMessage(t.lintCheckingDuplicates);
      try {
        const pagesForDedup: Array<{ path: string; content: string; title: string }> = [];
        for (const file of entityConceptFiles) {
          const info = pageMap.get(file.path);
          if (info) {
            pagesForDedup.push({ path: file.path, content: info.content, title: file.basename });
          }
        }

        // Layer 1: Programmatic candidates (2 signals: sharedLinks + bigram/crossLang)
        const allCandidates = await generateDuplicateCandidates(pagesForDedup);

        // Tier classification: semantic meaning of each signal
        // Tier 1 (must-send): direct evidence of duplication
        // Tier 2 (fill): indirect evidence, only if token budget allows
        const tier1: DuplicateCandidate[] = [];
        const tier2: DuplicateCandidate[] = [];
        for (const c of allCandidates) {
          if (c.signal === 'crossLang') {
            tier1.push(c);
          } else if (c.signal === 'bigram') {
            (c.score >= 0.6 ? tier1 : tier2).push(c);
          } else if (c.signal === 'sharedLinks') {
            tier2.push(c);
          }
        }

        // Discard: bigram < 0.4 and sharedLinks < 0.4 already filtered in generateDuplicateCandidates
        // Discard: all sharedSources signal removed

        console.debug(`lintWiki: ${allCandidates.length} candidates → Tier 1: ${tier1.length}, Tier 2: ${tier2.length}`);
        console.debug(`lintWiki: candidate breakdown by signal:`, {
          crossLang: allCandidates.filter(c => c.signal === 'crossLang').length,
          bigram: allCandidates.filter(c => c.signal === 'bigram').length,
          sharedLinks: allCandidates.filter(c => c.signal === 'sharedLinks').length,
        });

        if (allCandidates.length === 0) {
          console.debug('lintWiki: no duplicate candidates found — wiki is clean');
        }

        // Layer 3: LLM verification with token-budget batching
        // Each candidate ≈ 120 chars ≈ 30 tokens. Batch size: 100 candidates ≈ 3K input tokens.
        // Total input budget for this phase: 15K tokens (leaves room for prompt + output in 200K window).
        const CANDIDATE_TOKENS = 30;
        const MAX_INPUT_TOKENS = 15000;
        const BATCH_SIZE = 100;
        const maxTotalCandidates = Math.floor(MAX_INPUT_TOKENS / CANDIDATE_TOKENS);

        // Tier 1 always included in full. Tier 2 fills remaining token budget.
        const verifyCandidates = [...tier1];
        const tier2Budget = Math.max(0, maxTotalCandidates - tier1.length);
        const tier2ToInclude = Math.min(tier2.length, tier2Budget);
        for (let i = 0; i < tier2ToInclude; i++) {
          verifyCandidates.push(tier2[i]);
        }
        console.debug(`lintWiki: sending ${verifyCandidates.length}/${maxTotalCandidates} candidates (Tier 1: ${tier1.length}, Tier 2: ${tier2ToInclude}/${tier2.length}, budget: ${MAX_INPUT_TOKENS} tokens)`);

        if (verifyCandidates.length > 0) {
          // Split into batches
          const batches: DuplicateCandidate[][] = [];
          for (let i = 0; i < verifyCandidates.length; i += BATCH_SIZE) {
            batches.push(verifyCandidates.slice(i, i + BATCH_SIZE));
          }

          const concurrency = ctx.settings.pageGenerationConcurrency || 1;
          console.debug(`lintWiki: ${batches.length} batches, concurrency=${concurrency}`);

          // Process batches in parallel with concurrency limit
          const allDuplicates: Array<{target: string, source: string, reason: string}> = [];
          for (let i = 0; i < batches.length; i += concurrency) {
            const chunk = batches.slice(i, i + concurrency);
            const results = await Promise.allSettled(
              chunk.map(async (batch, bi) => {
                const batchNum = i + bi + 1;
                const candidateList = batch.map(c =>
                  `- Candidate A: ${c.target}\n  Candidate B: ${c.source}\n  Signal: ${c.reason}`
                ).join('\n');

                const dedupPrompt = PROMPTS.lintDuplicateDetection
                  .replace('{{candidates}}', candidateList)
                  .replace('{{total}}', String(pagesForDedup.length));

                console.debug(`lintWiki: batch ${batchNum}/${batches.length} — ${batch.length} candidates`);
                const dedupResponse = await ctx.llmClient!.createMessage({
                  model: ctx.settings.model,
                  max_tokens: 4000,
                  messages: [{ role: 'user', content: dedupPrompt }],
                  response_format: { type: 'json_object' }
                });

                const dedupResult = await parseJsonResponse(dedupResponse) as {
                  duplicates?: Array<{target: string, source: string, reason: string}>
                } | null;

                console.debug(`lintWiki: batch ${batchNum}/${batches.length} → ${dedupResult?.duplicates?.length || 0} duplicates confirmed`);
                // Guard against non-array LLM responses (single object, string, etc.)
                const rawDups = dedupResult?.duplicates;
                return Array.isArray(rawDups) ? rawDups : [];
              })
            );

            for (const result of results) {
              if (result.status === 'fulfilled') {
                // Defensive filter: ensure array + drop entries missing required fields
                const rawDups = Array.isArray(result.value) ? result.value : [];
                const validDups = rawDups.filter(
                  d => typeof d.target === 'string' && d.target.length > 0 &&
                       typeof d.source === 'string' && d.source.length > 0
                );
                allDuplicates.push(...validDups);
              } else {
                console.error('lintWiki: duplicate detection batch failed:', result.reason);
              }
            }
          }

          duplicates = allDuplicates;
          console.debug(`lintWiki: LLM confirmed ${duplicates.length} duplicate pairs total`);
        }
      } catch (e) {
        console.error('Duplicate detection failed:', e);
        const errMsg = e instanceof Error ? e.message : String(e);
        const errNotice = new Notice(t.lintDuplicateCheckFailedDetail.replace('{step}', 'Layer 3 (LLM verify)').replace('{error}', errMsg), 0);
        window.setTimeout(() => errNotice.hide(), 10000);
      }
    }

    // Dead links (now after duplicate detection to show root cause relationship)
    stageNotice.setMessage(t.lintScanningLinks);
    console.debug('lintWiki: scanning dead links');
    const deadLinks: Array<{ source: string; target: string }> = [];
    const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
    let scanCount = 0;
    for (const { path, content } of pageMap.values()) {
      let match: RegExpExecArray | null;
      while ((match = linkRegex.exec(content)) !== null) {
        const target = match[1].trim();
        if (!knownTargets.has(target) && !knownTargetsLower.has(target.toLowerCase())) {
          deadLinks.push({
            source: path.replace(ctx.settings.wikiFolder + '/', '').replace('.md', ''),
            target
          });
        }
      }
      linkRegex.lastIndex = 0;
      scanCount++;
      if (scanCount % 10 === 0 || scanCount === totalPages) {
        stageNotice.setMessage(t.lintScanningLinksProgress
          .replace('{current}', String(scanCount))
          .replace('{total}', String(totalPages)));
      }
    }

    // Empty pages
    const emptyPages: Array<{path: string, content: string}> = [];
    for (const { path, content } of pageMap.values()) {
      if (isPageEmpty(content)) {
        emptyPages.push({path, content});
      }
    }

    // Orphan pages
    const incomingLinks = new Map<string, string[]>();
    for (const { path, content } of pageMap.values()) {
      const sourceRel = path.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
      let match: RegExpExecArray | null;
      while ((match = linkRegex.exec(content)) !== null) {
        const target = match[1].trim();
        if (!incomingLinks.has(target)) incomingLinks.set(target, []);
        incomingLinks.get(target)!.push(sourceRel);
      }
      linkRegex.lastIndex = 0;
    }
    const orphans: string[] = [];
    for (const { path, basename } of pageMap.values()) {
      const relPath = path.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
      const nameWithoutExt = basename.replace('.md', '');
      const forms = [basename, nameWithoutExt, relPath];
      const parts = relPath.split('/');
      for (let i = 1; i < parts.length; i++) {
        const subPath = parts.slice(i).join('/');
        forms.push(subPath);
        forms.push(subPath + '.md');
      }
      const hasIncoming = forms.some(f => incomingLinks.has(f));
      if (!hasIncoming) {
        orphans.push(path);
      }
    }

    // ---- 2. Build programmatic findings report ----
    // Build duplicate page set for causality marking
    const duplicatePaths = new Set<string>();
    for (const d of duplicates) {
      duplicatePaths.add(d.target);
      duplicatePaths.add(d.source);
    }

    // Build report in causality-aware order: Duplicates → Dead Links → Empty Pages → Orphans
    let progReport = '';

    // 1. Duplicates section (root cause, shown first)
    if (duplicates.length > 0) {
      progReport += `## ${t.lintDuplicateSection}\n\n`;
      for (const d of duplicates) {
        const targetRel = d.target.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
        const sourceRel = d.source.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
        progReport += t.lintDuplicateItem
          .replace('{target}', targetRel)
          .replace('{source}', sourceRel)
          .replace('{reason}', d.reason) + '\n';
      }
      progReport += '\n';
    }

    // 2. Dead links section (mark if involves duplicate pages)
    let deadLinkFromDup = 0;
    if (deadLinks.length > 0) {
      progReport += `## ${t.lintDeadLinkSection}\n\n`;
      const showDead = deadLinks.slice(0, 20);
      for (const dl of showDead) {
        const sourcePath = `${ctx.settings.wikiFolder}/${dl.source}.md`;
        const targetPath = `${ctx.settings.wikiFolder}/${dl.target}.md`;
        const involvesDup = duplicatePaths.has(sourcePath) || duplicatePaths.has(targetPath);
        if (involvesDup) deadLinkFromDup++;
        const dupFlag = involvesDup ? t.lintDeadLinkAffectedByDup : '';
        progReport += t.lintDeadLinkItem
          .replace('{source}', dl.source)
          .replace('{target}', dl.target)
          .replace('{dupFlag}', dupFlag) + '\n';
      }
      if (deadLinks.length > 20) progReport += t.lintDeadLinkMore.replace('{count}', String(deadLinks.length)) + '\n';
      progReport += '\n';
    }

    // 3. Empty pages section
    if (emptyPages.length > 0) {
      progReport += `## ${t.lintEmptyPageSection}\n\n`;
      for (const ep of emptyPages) {
        const epRel = ep.path.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
        progReport += t.lintEmptyPageItem.replace('{page}', epRel) + '\n';
      }
      progReport += '\n';
    }

    // 4. Orphans section (mark if is a duplicate page)
    let orphanFromDup = 0;
    if (orphans.length > 0) {
      progReport += `## ${t.lintOrphanSection}\n\n`;
      for (const op of orphans) {
        const opRel = op.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
        const isDup = duplicatePaths.has(op);
        if (isDup) orphanFromDup++;
        const dupFlag = isDup ? t.lintOrphanIsDuplicate : '';
        progReport += t.lintOrphanItem
          .replace('{page}', opRel)
          .replace('{dupFlag}', dupFlag) + '\n';
      }
      progReport += '\n';
    }

    // 5. No issues message
    if (!duplicates.length && !deadLinks.length && !emptyPages.length && !orphans.length) {
      progReport += `${t.lintNoIssuesFound}\n\n`;
    }

    // ---- 2.5 Contradiction scanning ----
    const openContradictions = await ctx.wikiEngine.getOpenContradictions();
    let contradictionsReport = '';

    const reviewOkItems = openContradictions.filter(c => c.status === 'review_ok');
    for (const c of reviewOkItems) {
      try {
        await ctx.wikiEngine.resolveContradiction(c.path);
        await ctx.wikiEngine.updateContradictionStatus(c.path, 'resolved');
        console.debug('Auto-resolved contradiction:', c.path);
      } catch (error) {
        console.error('Failed to resolve contradiction:', c.path, error);
        await ctx.wikiEngine.updateContradictionStatus(c.path, 'pending_fix');
      }
    }

    const remaining = await ctx.wikiEngine.getOpenContradictions();
    if (remaining.length > 0) {
      contradictionsReport = `## ${t.lintContradictionSection}\n\n`;
      contradictionsReport += `- ${(t.lintContradictionOpen as string).replace('{count}', String(remaining.length))}`;
      const resolvedCount = openContradictions.length - remaining.length;
      if (resolvedCount > 0) {
        contradictionsReport += ` ${t.lintContradictionAutoFixed.replace('{count}', String(resolvedCount))}`;
      }
      contradictionsReport += '\n';
      for (const c of remaining) {
        const relPath = c.path.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
        const statusLabel = c.status === 'detected' ? t.lintContradictionStatusDetected :
                            c.status === 'pending_fix' ? t.lintContradictionStatusPendingFix : c.status;
        contradictionsReport += t.lintContradictionItem
          .replace('{status}', statusLabel)
          .replace('{page}', relPath)
          .replace('{claim}', c.claim.substring(0, 80)) + '\n';
      }
      contradictionsReport += '\n';
    }

    // ---- 3. LLM analysis ----
    const indexContent = await ctx.wikiEngine.tryReadFile(`${ctx.settings.wikiFolder}/index.md`) || '';

    let contentSample = '';
    const samplePages = wikiFiles.slice(0, 8);
    for (const file of samplePages) {
      const info = pageMap.get(file.path);
      if (info) {
        const body = info.content.substring(0, 600);
        contentSample += `\n### ${info.basename}\n${body}\n`;
      }
    }

    const prompt = t.lintAnalysisPrompt
      .replace('{index}', indexContent)
      .replace('{total}', String(wikiFiles.length))
      .replace('{sample}', String(samplePages.length))
      .replace('{contentSample}', contentSample)
      .replace('{progReport}', progReport || 'No issues detected by programmatic checks.');

    stageNotice.setMessage(t.lintAnalyzingLLM);
    const llmReport = await ctx.llmClient.createMessage({
      model: ctx.settings.model,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedLLM = cleanMarkdownResponse(llmReport);

    // ---- 4. Combine and display ----
    const summaryText = t.lintReportSummary
      .replace('{total}', String(wikiFiles.length))
      .replace('{aliasesMissing}', String(aliasDeficientPages.length))
      .replace('{duplicates}', String(duplicates.length))
      .replace('{deadLinks}', String(deadLinks.length))
      .replace('{deadLinkFromDup}', String(deadLinkFromDup))
      .replace('{orphans}', String(orphans.length))
      .replace('{orphanFromDup}', String(orphanFromDup))
      .replace('{emptyPages}', String(emptyPages.length));

    // Prepend aliases deficiency section to progReport (shown first in report body)
    if (aliasDeficientPages.length > 0) {
      const aliasPre = `> ${t.lintAliasesMissing.replace('{count}', String(aliasDeficientPages.length))}\n\n`;
      progReport = aliasPre + progReport;
    }

    const fullReport = `# ${t.lintReportTitle}\n\n> ${summaryText}\n\n${progReport}${contradictionsReport}${cleanedLLM.startsWith('##') ? '' : t.lintLLMAnalysisHeading + '\n\n'}${cleanedLLM}`;

    const counts: LintCounts = {
      deadLinks: deadLinks.length,
      emptyPages: emptyPages.length,
      orphans: orphans.length,
      duplicates: duplicates.length,
      pagesMissingAliases: aliasDeficientPages.length
    };

    // ---- Build callbacks ----
    const fixCallbacks: LintFixCallbacks = {};
    fixCallbacks.onAnalyzeSchema = () => { void ctx.onAnalyzeSchema(); };

    // Alias completion (runs first — improves duplicate detection for future Lint runs)
    if (aliasDeficientPages.length > 0) {
      fixCallbacks.onCompleteAliases = () => {
        void (async () => {
          const { filled, results } = await runAliasCompletion(ctx, aliasDeficientPages);
          new Notice(t.lintAliasesFilled.replace('{filled}', String(filled)).replace('{total}', String(aliasDeficientPages.length)));
          if (filled > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Complete Aliases', results.join('\n'));
            new Notice(t.lintFixIndexUpdated);
          }
        })();
      };
    }

    if (deadLinks.length > 0) {
      fixCallbacks.onFixDeadLinks = () => {
        void (async () => {
          const { fixed, results } = await runDeadLinkFixes(ctx, deadLinks);
          new Notice(t.lintFixDeadComplete.replace('{fixed}', String(fixed)).replace('{total}', String(deadLinks.length)));
          if (fixed > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Fix Dead Links', results.join('\n'));
            new Notice(t.lintFixIndexUpdated);
          }
        })();
      };
    }

    if (emptyPages.length > 0) {
      fixCallbacks.onFillEmptyPages = () => {
        void (async () => {
          const { filled, results } = await runEmptyPageFixes(ctx, emptyPages);
          new Notice(t.lintFillComplete.replace('{filled}', String(filled)).replace('{total}', String(emptyPages.length)));
          if (filled > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Expand Empty Pages', results.join('\n'));
            new Notice(t.lintFixIndexUpdated);
          }
        })();
      };
    }

    if (orphans.length > 0) {
      fixCallbacks.onLinkOrphans = () => {
        void (async () => {
          const { linked, results } = await runOrphanFixes(ctx, orphans);
          new Notice(t.lintLinkComplete.replace('{linked}', String(linked)));
          if (linked > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Link Orphan Pages', results.join('\n'));
            new Notice(t.lintFixIndexUpdated);
          }
        })();
      };
    }

    if (duplicates.length > 0) {
      fixCallbacks.onMergeDuplicates = () => {
        void (async () => {
          const { merged, results } = await runDuplicateMerges(ctx, duplicates);
          new Notice(t.lintMergeComplete.replace('{merged}', String(merged)).replace('{total}', String(duplicates.length)));
          if (merged > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Merge Duplicate Pages', results.join('\n'));
            new Notice(t.lintFixIndexUpdated);
          }
        })();
      };
    }

    const totalFixable = deadLinks.length + emptyPages.length + orphans.length + duplicates.length;
    const totalFixableIncludingAliases = totalFixable + aliasDeficientPages.length;
    if (totalFixableIncludingAliases > 0) {
      fixCallbacks.onFixAll = () => {
        void (async () => {
          const allResults: string[] = [];
          const fixAllNotice = new Notice('', 0);

          // Smart fix strategy: follow causality chain with aliases as foundation
          // Phase 0: Complete aliases (pre-flight, ensures duplicate detection accuracy)
          // → Aliases are required for Tier 1 duplicate signals (crossLang)
          // → Missing aliases → duplicate detection misses true duplicates → downstream fixes incomplete
          fixAllNotice.setMessage('Smart fix: Phase 0 — Completing aliases...');
          if (aliasDeficientPages.length > 0) {
            const { filled, results } = await runAliasCompletion(ctx, aliasDeficientPages);
            if (filled > 0) {
              allResults.push(`## Complete Aliases\n${results.join('\n')}`);
              console.debug(`Smart fix: Completed ${filled} aliases, improving duplicate detection accuracy`);
            }
          }

          // Phase 1: Merge duplicates (root cause)
          // → Eliminates redundant pages, resolves many dead links and orphans automatically via link rewriting
          // → Duplicate detection now uses complete aliases (Tier 1 crossLang signals active)
          fixAllNotice.setMessage('Smart fix: Phase 1 — Merging duplicates...');
          if (duplicates.length > 0) {
            const { merged, results } = await runDuplicateMerges(ctx, duplicates);
            if (merged > 0) {
              allResults.push(`## Merge Duplicate Pages\n${results.join('\n')}`);
              console.debug(`Smart fix: Merged ${merged} duplicates, dead links and orphans may be auto-resolved`);
            }
          }

          // Phase 2: Fix remaining dead links
          // → Links to deleted source pages were already rewritten during merge
          // → This phase fixes any remaining dead links (pointing to non-existent pages)
          // → Dead link fallback uses aliases to find existing pages (avoiding stub creation)
          fixAllNotice.setMessage('Smart fix: Phase 2 — Fixing dead links...');
          if (deadLinks.length > 0) {
            const { fixed, results } = await runDeadLinkFixes(ctx, deadLinks);
            if (fixed > 0) {
              allResults.push(`## Fix Dead Links\n${results.join('\n')}`);
              console.debug(`Smart fix: Fixed ${fixed} dead links`);
            }
          }

          // Phase 3: Link remaining orphan pages
          // → Some orphans may be auto-resolved after duplicate merge (source page deleted, target page now has incoming links)
          // → This phase links any remaining orphan pages
          fixAllNotice.setMessage('Smart fix: Phase 3 — Linking orphan pages...');
          if (orphans.length > 0) {
            const { linked, results } = await runOrphanFixes(ctx, orphans);
            if (linked > 0) {
              allResults.push(`## Link Orphan Pages\n${results.join('\n')}`);
              console.debug(`Smart fix: Linked ${linked} orphan pages`);
            }
          }

          // Phase 4: Expand empty pages (last, independent of other issues)
          fixAllNotice.setMessage('Smart fix: Phase 4 — Expanding empty pages...');
          if (emptyPages.length > 0) {
            const { filled, results } = await runEmptyPageFixes(ctx, emptyPages);
            if (filled > 0) {
              allResults.push(`## Expand Empty Pages\n${results.join('\n')}`);
              console.debug(`Smart fix: Expanded ${filled} empty pages`);
            }
          }

          fixAllNotice.hide();
          if (allResults.length > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Smart Fix All (Causality-Aware with Aliases)', allResults.join('\n\n'));
            new Notice(t.lintFixAllComplete);
          }
        })();
      };
    }

    stageNotice.hide();
    new LintReportModal(ctx.app, fullReport, fixCallbacks, counts, ctx.settings.language).open();
    await ctx.wikiEngine.generateIndexFromEngine();
    new Notice(TEXTS[ctx.settings.language].lintWikiComplete);

  } catch (error) {
    stageNotice?.hide();
    const errMsg = error instanceof Error ? error.message : String(error);
    new Notice(TEXTS[ctx.settings.language].lintWikiFailed + ': ' + errMsg, 0);
    console.error(error);
  }
}
