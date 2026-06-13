// Lint Controller — Wiki health analysis and fix orchestration.
// Extracted from main.ts to keep the plugin entry point manageable.

import { App, Notice, TFile } from 'obsidian';
import { LLMWikiSettings, LLMClient } from '../types';
import { LintFixCallbacks, LintCounts, LintReportModal, FixReportModal, FixReportPhase } from '../ui/modals';
import { TEXTS } from '../texts';
import { PROMPTS } from '../prompts';
import { cleanMarkdownResponse, parseJsonResponse, detectRateLimitFailures, formatRateLimitNotice, getText, nestReportUnderParent } from '../utils';
import { appendGranularityToPrompt, appendTagVocabularyToPrompt } from './system-prompts';
import { TOKENS_LINT_DEDUP_LLM, NOTICE_NORMAL, NOTICE_RATE_LIMIT } from '../constants';
import { isPageEmpty, detectPollutedPages, fixDoubleNestedWikiLinks } from './lint-fixes';
import { fixPollutedSources, scanPollutedSources } from '../core/sources-normalizer';
import { generateDuplicateCandidates, DuplicateCandidate } from './lint/duplicate-detection';
import { runAliasCompletion, runDeadLinkFixes, runEmptyPageFixes, runOrphanFixes, runDuplicateMerges, runRetagViolations } from './lint/fix-runners';
import { buildKnownTargets, detectAliasDeficiency, scanDeadLinks, scanOrphans, scanTagViolations } from './lint/scanners';
import { WikiEngine } from './wiki-engine';

export interface LintContext {
  app: App;
  settings: LLMWikiSettings;
  llmClient: LLMClient | null;
  wikiEngine: WikiEngine;
  onAnalyzeSchema: () => void;
}

export async function runLintWiki(ctx: LintContext, signal?: AbortSignal): Promise<void> {
  if (!ctx.llmClient) {
    new Notice(TEXTS[ctx.settings.language].errorNoApiKey);
    return;
  }

  const checkCancelled = () => {
    if (signal?.aborted) {
      throw new DOMException('Lint cancelled by user', 'AbortError');
    }
  };

  new Notice(TEXTS[ctx.settings.language].lintWikiStart);
  const lintStartTime = Date.now();

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
    const { known: knownTargets, knownLower: knownTargetsLower } = buildKnownTargets(allVaultFiles);

    const t = TEXTS[ctx.settings.language];
    const pageMap = new Map<string, { path: string; content: string; basename: string }>();
    stageNotice = new Notice('', 0);
    stageNotice.setMessage(t.lintReadingPages.replace('{count}', String(wikiFiles.length)));
    console.debug(`lintWiki: reading ${wikiFiles.length} wiki pages in parallel`);

    const totalPages = wikiFiles.length;
    const BATCH_READ = 200;
    for (let i = 0; i < wikiFiles.length; i += BATCH_READ) {
      checkCancelled();
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

    // ---- 0. Double-nested wiki-link fix (programmatic, no LLM) ----
    stageNotice.setMessage(t.lintScanningLinks);
    let doubleNestFixes = 0;
    for (const [path, info] of pageMap) {
      const abstractFile = ctx.app.vault.getAbstractFileByPath(path);
      if (abstractFile instanceof TFile) {
        await ctx.app.vault.process(abstractFile, (data) => {
          const { fixed, content } = fixDoubleNestedWikiLinks(data);
          if (fixed > 0) {
            doubleNestFixes += fixed;
            info.content = content;
            console.debug(`lintWiki: fixed ${fixed} double-nested link(s) in ${path}`);
          }
          return data; // return unchanged if no fixes needed
        });
      }
    }
    // Also scan log.md (excluded from wikiFiles filter)
    const logPath = `${ctx.settings.wikiFolder}/log.md`;
    const logFile = ctx.app.vault.getAbstractFileByPath(logPath);
    if (logFile instanceof TFile) {
      await ctx.app.vault.process(logFile, (data) => {
        const { fixed, content } = fixDoubleNestedWikiLinks(data);
        if (fixed > 0) {
          doubleNestFixes += fixed;
          console.debug(`lintWiki: fixed ${fixed} double-nested link(s) in log.md`);
        }
        return fixed > 0 ? content : data;
      });
    }
    if (doubleNestFixes > 0) {
      console.debug(`lintWiki: total ${doubleNestFixes} double-nested link(s) fixed`);
    }

    // ---- 0.5 Sources field normalize (programmatic, no LLM) — Issue #81 ----
    let sourcesNormalizedFiles = 0;
    let sourcesNormalizedEntries = 0;
    const sourcesPreserveCase = ctx.settings.slugCase === 'preserve';
    for (const [path, info] of pageMap) {
      if (!scanPollutedSources(info.content, ctx.settings.wikiFolder, sourcesPreserveCase)) continue;
      const abstractFile = ctx.app.vault.getAbstractFileByPath(path);
      if (abstractFile instanceof TFile) {
        const { fixed, content } = fixPollutedSources(info.content, ctx.settings.wikiFolder, sourcesPreserveCase);
        if (fixed > 0) {
          await ctx.app.vault.process(abstractFile, () => content);
          sourcesNormalizedFiles += 1;
          sourcesNormalizedEntries += fixed;
          info.content = content;
          console.debug(`lintWiki: normalized ${fixed} sources entry(ies) in ${path}`);
        }
      }
    }
    if (sourcesNormalizedFiles > 0) {
      console.debug(`lintWiki: sources normalized in ${sourcesNormalizedFiles} files (${sourcesNormalizedEntries} entries)`);
    }

    // ---- 1. Alias deficiency check ----
    const aliasDeficientPages = detectAliasDeficiency(wikiFiles, pageMap);
    console.debug(`lintWiki: ${aliasDeficientPages.length} entity/concept pages missing aliases`);

    // ---- 2. Duplicate detection (Layer 1 programmatic candidates + Layer 3 LLM verification) ----
    let duplicates: Array<{target: string, source: string, reason: string}> = [];
    const entityConceptFiles = wikiFiles.filter(f =>
      f.path.includes('/entities/') || f.path.includes('/concepts/')
    );
    if (entityConceptFiles.length >= 2 && ctx.llmClient) {
      // TODO (v1.18.0+, performance): Duplicate detection is the dominant Lint
      // bottleneck on large wikis (e.g. 580+ pages). Current implementation:
      //   1. Tier 1: for each pair (A, B) in entityConceptFiles, do a tier-1
      //      LLM verify → O(N²) pairs × 1 LLM call each (chunked by 100).
      //   2. Tier 2: indirect signals (shared links, moderate similarity) fill
      //      the token budget but are also O(N²) in pair generation.
      //   3. A second LLM verify pass for the Tier-2 candidate list.
      //
      // Optimization roadmap (deferred, not in v1.17.0):
      //   a. Hash-bucket dedup: hash titles (n-gram or phonetic) and only LLM-verify
      //      pairs that share a bucket. Reduces Tier 1 pair count by 5-10x.
      //   b. Embedding-based prefilter: use a local embedding model to compute
      //      Tier 2 candidate pairs, replace the title-similarity heuristic.
      //   c. Cache LLM verify results in a per-lint-run memo so re-runs don't
      //      re-verify unchanged pairs.
      //   d. Skip the second LLM pass if the Tier 1 confidence score is below
      //      a threshold AND no new entries appeared since the last lint.
      //
      // See ROADMAP.md "Lint performance" section for the larger picture.
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
          if (c.signal === 'crossLang' || c.signal === 'caseVariant') {
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
          const dedupFailures: Array<{ name: string; reason: string }> = [];
          for (let i = 0; i < batches.length; i += concurrency) {
            checkCancelled();
            const chunk = batches.slice(i, i + concurrency);
            // Show the actual inner-batch range (matches console log) so the
            // user sees consistent numbers in both places.
            const batchStart = i + 1;
            const batchEnd = Math.min(i + concurrency, batches.length);
            // progressLabel already contains the batch range (e.g. "1-2/3" or "1/3").
            // i18n template: 'Verifying duplicates: batch {current}...' — no extra /{total}.
            const progressLabel = batchEnd > batchStart
              ? `${batchStart}-${batchEnd}/${batches.length}`
              : `${batchStart}/${batches.length}`;
            stageNotice.setMessage(t.lintCheckingDuplicatesProgress
              .replace('{current}', progressLabel));
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
                  max_tokens: TOKENS_LINT_DEDUP_LLM,
                  messages: [{ role: 'user', content: dedupPrompt }],
                  response_format: { type: 'json_object' },
      disableThinking: ctx.settings.disableThinking,
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
                const rawDups = Array.isArray(result.value) ? result.value : [];
                const validDups = rawDups.filter(
                  d => typeof d.target === 'string' && d.target.length > 0 &&
                       typeof d.source === 'string' && d.source.length > 0
                );
                allDuplicates.push(...validDups);
              } else {
                const reason = result.reason instanceof Error ? result.reason.message : String(result.reason || 'unknown');
                console.error('lintWiki: duplicate detection batch failed:', reason);
                dedupFailures.push({ name: `batch-${i + 1}`, reason });
              }
            }
          }

          // Rate-limit detection for duplicate detection
          const dedupRateInfo = detectRateLimitFailures(dedupFailures, concurrency, ctx.settings.batchDelayMs ?? 300);
          if (dedupRateInfo) {
            console.warn(`[Duplicate Rate Limit] ${dedupRateInfo.count} duplicate detection batch(es) failed with 429, ` +
              `suggested concurrency=${dedupRateInfo.suggestedConcurrency}, delay=${dedupRateInfo.suggestedDelay}ms`);
            new Notice(formatRateLimitNotice(dedupRateInfo, ctx.settings.language), NOTICE_RATE_LIMIT);
          }

          duplicates = allDuplicates;
          console.debug(`lintWiki: LLM confirmed ${duplicates.length} duplicate pairs total`);
        }
      } catch (e) {
        console.error('Duplicate detection failed:', e);
        const errMsg = e instanceof Error ? e.message : String(e);
        const errNotice = new Notice(t.lintDuplicateCheckFailedDetail.replace('{step}', 'Layer 3 (LLM verify)').replace('{error}', errMsg), 0);
        window.setTimeout(() => errNotice.hide(), NOTICE_RATE_LIMIT);
      }
    }

    // Dead links
    stageNotice.setMessage(t.lintScanningLinks);
    console.debug('lintWiki: scanning dead links');
    const deadLinks = scanDeadLinks(pageMap, knownTargets, knownTargetsLower, ctx.settings.wikiFolder);
    stageNotice.setMessage(t.lintScanningLinksProgress
      .replace('{current}', String(totalPages))
      .replace('{total}', String(totalPages)));

    // Empty pages (exclude duplicate source pages — they will be merged/deleted)
    const duplicatePaths = new Set<string>();
    for (const d of duplicates) {
      duplicatePaths.add(d.target);
      duplicatePaths.add(d.source);
    }

    const emptyPages: Array<{path: string, content: string}> = [];
    for (const { path, content } of pageMap.values()) {
      // Skip if this page is a duplicate source (will be deleted after merge)
      if (duplicatePaths.has(path)) continue;

      if (isPageEmpty(content)) {
        emptyPages.push({path, content});
      }
    }

    // Orphan pages
    const orphans = scanOrphans(pageMap, ctx.settings.wikiFolder);

    // Issue #85 v7: programmatic tag-vocabulary audit. Pure function,
    // O(P × T) where P = page count and T = avg tags per page.
    // <50ms even on 2000-page vaults, no token cost. Always runs
    // (no opt-in checkbox).
    const tagViolations = scanTagViolations(pageMap, ctx.settings);

    // ---- 2. Build programmatic findings report ----

    // Build report in causality-aware order: Duplicates → Dead Links → Empty Pages → Orphans
    let progReport = '';

    // 0. Missing aliases section (listed before duplicates — aliases enable detection)
    if (aliasDeficientPages.length > 0) {
      progReport += `## ${t.lintAliasesSection.replace('{count}', String(aliasDeficientPages.length))}\n\n`;
      for (const p of aliasDeficientPages) {
        progReport += t.lintAliasesItem.replace('{page}', p.path.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '')) + '\n';
      }
      progReport += '\n';
    }

    // 1. Duplicates section (root cause, shown first)
    if (duplicates.length > 0) {
      progReport += `## ${t.lintDuplicateSection.replace('{count}', String(duplicates.length))}\n\n`;
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
      const deadLinkLines: string[] = [];
      // Log view: ALL entries preserved (the persistent audit trail)
      // Modal view: same data — controllers can truncate later if needed
      for (const dl of deadLinks) {
        const sourcePath = `${ctx.settings.wikiFolder}/${dl.source}.md`;
        const targetPath = `${ctx.settings.wikiFolder}/${dl.target}.md`;
        const involvesDup = duplicatePaths.has(sourcePath) || duplicatePaths.has(targetPath);
        if (involvesDup) deadLinkFromDup++;
        const dupFlag = involvesDup ? t.lintDeadLinkAffectedByDup : '';
        deadLinkLines.push(t.lintDeadLinkItem
          .replace('{source}', dl.source)
          .replace('{target}', dl.target)
          .replace('{dupFlag}', dupFlag));
      }
      // Issue: log.md previously truncated >20 dead links to "... 857 more".
      // Fix: keep the full enumeration in progReport (log uses progReport too).
      // Modal-only truncation is applied at display time via truncateListForDisplay.
      progReport += `## ${t.lintDeadLinkSection.replace('{count}', String(deadLinks.length))}\n\n${deadLinkLines.join('\n')}\n\n`;
    }

    // 3. Empty pages section
    if (emptyPages.length > 0) {
      progReport += `## ${t.lintEmptyPageSection.replace('{count}', String(emptyPages.length))}\n\n`;
      for (const ep of emptyPages) {
        const epRel = ep.path.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
        progReport += t.lintEmptyPageItem.replace('{page}', epRel) + '\n';
      }
      progReport += '\n';
    }

    // Issue #85 v7: out-of-vocabulary tag violations
    if (tagViolations.length > 0) {
      progReport += `## ${t.lintTagViolationSection.replace('{count}', String(tagViolations.length))}\n\n`;
      for (const v of tagViolations) {
        const pathRel = v.path.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
        progReport += t.lintTagViolationItem
          .replace('{path}', pathRel)
          .replace('{tags}', v.invalidTags.join(', ')) + '\n';
      }
      progReport += '\n';
    }

    // 3.5 Polluted pages — basenames with folder-prefix duplication
    const allPages = Array.from(pageMap.values()).map(({ path, basename }) => ({
      path, title: basename
    }));
    const pollutedPages = detectPollutedPages(allPages);
    if (pollutedPages.length > 0) {
      console.warn(`[Lint] Detected ${pollutedPages.length} polluted page(s):`);
      for (const pp of pollutedPages) {
        console.warn(`  - ${pp.path} → should be "${pp.cleanTitle}"`);
      }
    }

    // 3.5 Polluted pages section
    if (pollutedPages.length > 0) {
      progReport += `## ${t.lintPollutedSection.replace('{count}', String(pollutedPages.length))}\n\n`;
      for (const pp of pollutedPages) {
        const ppRel = pp.path.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
        progReport += t.lintPollutedItem
          .replace('{page}', ppRel)
          .replace('{clean}', pp.cleanTitle) + '\n';
      }
      progReport += '\n';
    }

    // 3.6 Sources normalized section (Issue #81)
    if (sourcesNormalizedFiles > 0) {
      progReport += `## ${t.lintSourcesNormalizedSection}\n\n`;
      progReport += t.lintSourcesNormalizedItem
        .replace('{files}', String(sourcesNormalizedFiles))
        .replace('{entries}', String(sourcesNormalizedEntries)) + '\n\n';
    }

    // 4. Orphans section (mark if is a duplicate page)
    let orphanFromDup = 0;
    if (orphans.length > 0) {
      progReport += `## ${t.lintOrphanSection.replace('{count}', String(orphans.length))}\n\n`;
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
    // TODO (v1.18.0+, performance): LLM health analysis is the other major
    // Lint bottleneck. Current implementation sends the full wiki content
    // sample (~8 pages × 600 chars) plus the programmatic findings report
    // plus the full index.md to the LLM in a single call. On large wikis
    // (500+ pages) this exceeds 16K tokens of input, forcing max_tokens
    // truncation which then produces low-quality health analysis.
    //
    // Optimization roadmap (deferred):
    //   a. Hierarchical LLM analysis: page-1 pass summarizes each page into
    //      a compact signature (~200 tokens), page-2 pass reasons over
    //      signatures. Total tokens bounded by O(N) but quality is similar.
    //   b. Skip analysis entirely if programmatic checks found 0 issues
    //      AND user hasn't enabled "deep analysis" in settings.
    //   c. Cache the LLM analysis result, only re-run if wiki content
    //      hash changed since last lint.
    //   d. Parallel LLM analysis: split the wiki into N chunks, analyze
    //      each in parallel, merge findings. Reduces wall-clock but uses
    //      N×tokens. Trade-off for large wikis.
    //
    // See ROADMAP.md "Lint performance" section.
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

    // Issue #96: honor user's extractionGranularity setting in the LLM
    // analysis step (was previously unconstrained).
    // Issue #85 v6: also append the active tag vocabulary so the LLM
    // knows which entity/concept types are valid when suggesting fixes
    // for pages with non-conforming tags.
    const prompt = appendTagVocabularyToPrompt(
      appendGranularityToPrompt(
        t.lintAnalysisPrompt
          .replace('{index}', indexContent)
          .replace('{total}', String(wikiFiles.length))
          .replace('{sample}', String(samplePages.length))
          .replace('{contentSample}', contentSample)
          .replace('{progReport}', progReport || 'No issues detected by programmatic checks.'),
        ctx.settings
      ),
      ctx.settings
    );

    stageNotice.setMessage(t.lintAnalyzingLLM);
    checkCancelled();
    const llmReport = await ctx.llmClient.createMessage({
      model: ctx.settings.model,
      max_tokens: TOKENS_LINT_DEDUP_LLM,
      messages: [{ role: 'user', content: prompt }],
      disableThinking: ctx.settings.disableThinking,
    });

    const cleanedLLM = cleanMarkdownResponse(llmReport);

    // ---- 4. Combine and display ----
    // Measure elapsed wall time since runLintWiki started. Round to whole
    // seconds for the user-facing summary; sub-second precision is noise here.
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - lintStartTime) / 1000));
    const summaryText = t.lintReportSummary
      .replace('{total}', String(wikiFiles.length))
      .replace('{aliasesMissing}', String(aliasDeficientPages.length))
      .replace('{duplicates}', String(duplicates.length))
      .replace('{deadLinks}', String(deadLinks.length))
      .replace('{deadLinkFromDup}', String(deadLinkFromDup))
      .replace('{orphans}', String(orphans.length))
      .replace('{orphanFromDup}', String(orphanFromDup))
      .replace('{emptyPages}', String(emptyPages.length))
      .replace('{elapsedSeconds}', String(elapsedSeconds));

    // Prepend aliases deficiency section to progReport (shown first in report body)
    if (aliasDeficientPages.length > 0) {
      const aliasPre = `> ${t.lintAliasesMissing.replace('{count}', String(aliasDeficientPages.length))}\n\n`;
      progReport = aliasPre + progReport;
    }

    const fullReport = `# ${t.lintReportTitle}\n\n> ${summaryText}\n\n${progReport}${contradictionsReport}${cleanedLLM.startsWith('##') ? '' : t.lintLLMAnalysisHeading + '\n\n'}${cleanedLLM}`;

    // TODO (v1.18.0, future-work): Missing Concept Pages tracker
    // ─────────────────────────────────────────────────────────
    // The LLM analysis section (cleanedLLM) currently flags missing concept
    // pages in prose ("- [缺少\"纪传体\"概念页——...]"). This is human-readable
    // but not actionable: there's no programmatic tracking, no per-lint diff,
    // no "create missing pages" command, and no resolution tracking over time.
    //
    // Distinction from dead links: a dead link is `[[X]]` pointing to a missing
    // page X (resolvable mechanically by counting references). A missing concept
    // page is a domain-knowledge gap the LLM identifies from source content
    // (resolvable only by ingesting more sources, or accepting the gap).
    //
    // Future-work design (not implemented):
    //   1. Programmatic detection: parse the LLM output's missing-page items
    //      into structured `MissingConceptReport { name, source, reason }[]`
    //      rather than just rendering as markdown bullets.
    //   2. Persist to a sidecar file `wiki-folder/lint/missing-concepts.json`
    //      so each lint run accumulates a stable list, and re-runs that resolve
    //      gaps (e.g. user creates the page manually) are removed.
    //   3. Command palette entry: "Create missing concept pages" — auto-ingests
    //      the source note(s) named in the report, generating the missing pages.
    //   4. Diff against previous run: show newly-discovered vs resolved concepts.
    //
    // Until designed and built, the LLM-prose section remains the only signal.
    // Logged here so future contributors see the design intent.
    // ─────────────────────────────────────────────────────────

    const counts: LintCounts = {
      deadLinks: deadLinks.length,
      emptyPages: emptyPages.length,
      pollutedPages: pollutedPages.length,
      orphans: orphans.length,
      duplicates: duplicates.length,
      pagesMissingAliases: aliasDeficientPages.length,
      tagViolations: tagViolations.length,
    };

    // ---- Build callbacks ----

    // Issue #94 regression: each fix phase is its own lint operation
    // lifecycle so the status-bar cancel affordance persists throughout
    // the fix. The modal closes immediately (preserving original UX);
    // the user gets a top-right progress notice from the fix runner +
    // the bottom-right status bar for cancellation.
    const runFixPhase = async (fn: (signal: AbortSignal | undefined) => Promise<void>) => {
      const signal = ctx.wikiEngine.startLintOperation();
      try {
        await fn(signal);
      } finally {
        ctx.wikiEngine.endLintOperation();
      }
    };

    const fixCallbacks: LintFixCallbacks = {};
    fixCallbacks.onAnalyzeSchema = () => { void ctx.onAnalyzeSchema(); };

    // Polluted page repair (structural root cause — similar to aliases)
    if (pollutedPages.length > 0) {
      fixCallbacks.onFixPollutedPages = () => {
        void runFixPhase(async (signal) => {
          let fixed = 0;
          const fixNotice = new Notice('', 0);
          try {
            for (const pp of pollutedPages) {
              if (signal?.aborted) break;
              fixNotice.setMessage(t.lintFixingPolluted
                .replace('{current}', String(fixed + 1))
                .replace('{total}', String(pollutedPages.length))
                .replace('{title}', pp.title)
                .replace('{newTitle}', pp.cleanTitle));
              try {
                await ctx.wikiEngine.fixPollutedPage(pp.path, pp.cleanTitle);
                fixed++;
              } catch (e) {
                console.error(`[Pollution Fix] Failed: ${pp.path}`, e);
              }
            }
            if (fixed > 0) {
              await ctx.wikiEngine.generateIndexFromEngine();
            }
            const msg = getText(ctx.settings.language, 'lintPollutedFixed')
              .replace('{fixed}', String(fixed))
              .replace('{total}', String(pollutedPages.length));
            new Notice(msg, 0);
          } finally {
            fixNotice.hide();
          }
        });
      };
    }

    // Alias completion (runs first — improves duplicate detection for future Lint runs)
    if (aliasDeficientPages.length > 0) {
      fixCallbacks.onCompleteAliases = () => {
        void runFixPhase(async (signal) => {
          const { filled, results } = await runAliasCompletion(ctx, signal, aliasDeficientPages);
          if (filled > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Complete Aliases', results.join('\n'));
          }
          const msg = t.lintAliasesFilled.replace('{filled}', String(filled)).replace('{total}', String(aliasDeficientPages.length))
            + (filled > 0 ? '\n' + t.lintFixIndexUpdated : '');
          new Notice(msg, 0);
        });
      };
    }

    if (deadLinks.length > 0) {
      fixCallbacks.onFixDeadLinks = () => {
        void runFixPhase(async (signal) => {
          const { fixed, results } = await runDeadLinkFixes(ctx, signal, deadLinks);
          if (fixed > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Fix Dead Links', results.join('\n'));
          }
          const msg = t.lintFixDeadComplete.replace('{fixed}', String(fixed)).replace('{total}', String(deadLinks.length))
            + (fixed > 0 ? '\n' + t.lintFixIndexUpdated : '');
          new Notice(msg, 0);
        });
      };
    }

    if (emptyPages.length > 0) {
      fixCallbacks.onFillEmptyPages = () => {
        void runFixPhase(async (signal) => {
          const { filled, results } = await runEmptyPageFixes(ctx, signal, emptyPages);
          if (filled > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Expand Empty Pages', results.join('\n'));
          }
          const msg = t.lintFillComplete.replace('{filled}', String(filled)).replace('{total}', String(emptyPages.length))
            + (filled > 0 ? '\n' + t.lintFixIndexUpdated : '');
          new Notice(msg, 0);
        });
      };
    }

    // Issue #103: independent delete action (not a fix phase) — always available
    fixCallbacks.onDeleteEmptyStubs = () => {
      void runFixPhase(async (signal) => {
        const result = await ctx.wikiEngine.deleteEmptyStubs(ctx.settings.wikiFolder);
        if (result.deleted > 0) {
          await ctx.wikiEngine.generateIndexFromEngine();
          await ctx.wikiEngine.logLintFix('Delete Empty Stubs', `Deleted ${result.deleted} empty stubs`);
        }
        // Issue #244: surface success + failure breakdown to the user.
        const parts: string[] = [];
        if (result.deleted > 0) {
          parts.push(t.lintDeleteCompleted.replace('{count}', String(result.deleted)));
        }
        if (result.failed > 0) {
          parts.push(t.lintDeleteFailed
            .replace('{failed}', String(result.failed))
            .replace('{total}', String(result.deleted + result.failed)));
        }
        if (parts.length === 0) {
          parts.push(t.lintDeleteCompleted.replace('{count}', '0'));
        }
        new Notice(parts.join('\n'), 0);
      });
    };

    if (orphans.length > 0) {
      fixCallbacks.onLinkOrphans = () => {
        void runFixPhase(async (signal) => {
          const { linked, results } = await runOrphanFixes(ctx, signal, orphans);
          if (linked > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Link Orphan Pages', results.join('\n'));
          }
          const msg = t.lintLinkComplete.replace('{linked}', String(linked))
            + (linked > 0 ? '\n' + t.lintFixIndexUpdated : '');
          new Notice(msg, 0);
        });
      };
    }

    if (duplicates.length > 0) {
      fixCallbacks.onMergeDuplicates = () => {
        void runFixPhase(async (signal) => {
          const { merged, results } = await runDuplicateMerges(ctx, signal, duplicates);
          if (merged > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Merge Duplicate Pages', results.join('\n'));
          }
          const msg = t.lintMergeComplete.replace('{merged}', String(merged)).replace('{total}', String(duplicates.length))
            + (merged > 0 ? '\n' + t.lintFixIndexUpdated : '');
          new Notice(msg, 0);
        });
      };
    }

    // Issue #85 v7: LLM-assisted retag of pages whose tags fall outside
    // the active vocabulary. The user gets a single bulk button "Retag
    // N page(s) with LLM" — no per-page approval. Each violation's
    // frontmatter tags: line is rewritten in place; the body is
    // untouched. Defensive: every LLM-returned tag is re-validated
    // against the active vocabulary before write (runRetagViolations).
    if (tagViolations.length > 0) {
      fixCallbacks.onRetagViolations = () => {
        void runFixPhase(async (signal) => {
          const { fixed, results } = await runRetagViolations(ctx, signal, tagViolations);
          if (fixed > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Retag Tag Violations', results.join('\n'));
          }
          const msg = fixed > 0
            ? t.lintTagViolationFixed.replace('{fixed}', String(fixed)).replace('{total}', String(tagViolations.length))
            : t.lintTagViolationFixedNone;
          new Notice(msg, 0);
        });
      };
    }

    const totalFixable = deadLinks.length + emptyPages.length + orphans.length + duplicates.length;
    const totalFixableIncludingAliases = totalFixable + aliasDeficientPages.length + pollutedPages.length;
    if (totalFixableIncludingAliases > 0) {
      fixCallbacks.onFixAll = () => {
        void (async () => {
          // Issue: Smart Fix All was NOT wrapped in startLintOperation/endLintOperation
          // (unlike single-phase fixes via runFixPhase). This meant the status bar
          // never appeared, so the user had no way to cancel a long-running batch.
          // Fix: wrap the entire IIFE in a single lint-operation lifecycle so the
          // status bar stays visible throughout all 6 phases.
          const signal = ctx.wikiEngine.startLintOperation();
          try {
          const allResults: string[] = [];
          const fixAllNotice = new Notice('', 0);

          // Track per-phase counts for final summary
          let pollutedFixed = 0;
          let aliasesFilled = 0;
          let duplicatesMerged = 0;
          let deadLinksFixed = 0;
          let orphansLinked = 0;
          let emptyPagesFilled = 0;
          let tagsRetagged = 0;

          // Smart fix strategy: follow causality chain with aliases as foundation
          // Phase -1: Fix polluted pages (structural root cause before everything else)
          fixAllNotice.setMessage('Smart fix: Phase -1 — Fixing polluted pages...');
          if (pollutedPages.length > 0) {
            for (const pp of pollutedPages) {
              try {
                const result = await ctx.wikiEngine.fixPollutedPage(pp.path, pp.cleanTitle);
                console.debug(`[Pollution Fix] ${result}`);
                pollutedFixed++;
              } catch (e) {
                console.error(`[Pollution Fix] Failed: ${pp.path}`, e);
              }
            }
            if (pollutedFixed > 0) {
              allResults.push(`## Fix Polluted Pages\nFixed ${pollutedFixed}/${pollutedPages.length} polluted pages`);
            }
          }

          // Phase 0: Complete aliases (pre-flight, ensures duplicate detection accuracy)
          // → Aliases are required for Tier 1 duplicate signals (crossLang)
          // → Missing aliases → duplicate detection misses true duplicates → downstream fixes incomplete
          fixAllNotice.setMessage('Smart fix: Phase 0 — Completing aliases...');
          if (aliasDeficientPages.length > 0) {
            const { filled, results } = await runAliasCompletion(ctx, signal, aliasDeficientPages);
            aliasesFilled = filled;
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
            const { merged, results } = await runDuplicateMerges(ctx, signal, duplicates);
            duplicatesMerged = merged;
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
            const { fixed, results } = await runDeadLinkFixes(ctx, signal, deadLinks);
            deadLinksFixed = fixed;
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
            const { linked, results } = await runOrphanFixes(ctx, signal, orphans);
            orphansLinked = linked;
            if (linked > 0) {
              allResults.push(`## Link Orphan Pages\n${results.join('\n')}`);
              console.debug(`Smart fix: Linked ${linked} orphan pages`);
            }
          }

          // Phase 4: Expand empty pages (last, independent of other issues)
          fixAllNotice.setMessage('Smart fix: Phase 4 — Expanding empty pages...');
          if (emptyPages.length > 0) {
            const { filled, results } = await runEmptyPageFixes(ctx, signal, emptyPages);
            emptyPagesFilled = filled;
            if (filled > 0) {
              allResults.push(`## Expand Empty Pages\n${results.join('\n')}`);
              console.debug(`Smart fix: Expanded ${filled} empty pages`);
            }
          }

          // Issue #85 v7 — Phase 5: retag out-of-vocabulary tag pages.
          // LLMs may invent types that don't match the active
          // vocabulary; this phase asks the LLM to re-emit valid
          // tags using only values from the active vocabulary.
          fixAllNotice.setMessage('Smart fix: Phase 5 — Retagging out-of-vocabulary tag pages...');
          if (tagViolations.length > 0) {
            const { fixed, results } = await runRetagViolations(ctx, signal, tagViolations);
            tagsRetagged = fixed;
            if (fixed > 0) {
              allResults.push(`## Retag Tag Violations\n${results.join('\n')}`);
              console.debug(`Smart fix: Retagged ${fixed} tag violations`);
            }
          }

          fixAllNotice.hide();
          if (allResults.length > 0) {
            await ctx.wikiEngine.generateIndexFromEngine();
            await ctx.wikiEngine.logLintFix('Smart Fix All (Causality-Aware with Aliases)', allResults.join('\n\n'));
          }

          // Build phase result data for modal report
          // NOTE: must be inside the try block so the closure-captured counters
          // (pollutedFixed, aliasesFilled, etc.) are still in scope when the
          // modal renders.
          const phases: FixReportPhase[] = [];
          if (pollutedPages.length > 0) {
            phases.push({
              label: `🧹 Fix polluted pages (${pollutedPages.length})`,
              detail: `${pollutedFixed}/${pollutedPages.length}`
            });
          }
          if (aliasDeficientPages.length > 0) {
            phases.push({
              label: t.lintAliasesCompleteBtn.replace('{count}', String(aliasDeficientPages.length)),
              detail: `${aliasesFilled}/${aliasDeficientPages.length}`
            });
          }
          if (duplicates.length > 0) {
            phases.push({
              label: t.lintModalMergeDuplicates.replace('{count}', String(duplicates.length)),
              detail: `${duplicatesMerged}/${duplicates.length}`
            });
          }
          if (deadLinks.length > 0) {
            phases.push({
              label: t.lintModalFixDeadLinks.replace('{count}', String(deadLinks.length)),
              detail: `${deadLinksFixed}/${deadLinks.length}`
            });
          }
          // Issue #85 v7: tag-violation retag phase summary
          if (tagViolations.length > 0) {
            phases.push({
              label: t.lintTagViolationRetagBtn.replace('{count}', String(tagViolations.length)),
              detail: `${tagsRetagged}/${tagViolations.length}`
            });
          }
          if (orphans.length > 0) {
            phases.push({
              label: t.lintModalLinkOrphans.replace('{count}', String(orphans.length)),
              detail: `${orphansLinked}/${orphans.length}`
            });
          }
          if (emptyPages.length > 0) {
            phases.push({
              label: t.lintModalExpandEmpty.replace('{count}', String(emptyPages.length)),
              detail: `${emptyPagesFilled}/${emptyPages.length}`
            });
          }
          new FixReportModal(ctx.app, phases, ctx.settings.language).open();
          } finally {
            // Issue: status bar must persist throughout all 6 phases. Match the
            // startLintOperation call above so the user can click "cancel" at any point.
            ctx.wikiEngine.endLintOperation();
          }
        })();
      };
    }

    stageNotice.hide();
    // Persist the full lint report to log.md before showing the modal.
    // Issue: fullReport starts with "# Wiki Lint Report" (H1) and the log entry
    // wraps it in "## [timestamp] Wiki Lint Report" (H2). Embedding H1 inside
    // H2 is invalid markdown and renders oddly. Fix: strip the H1 and promote
    // all other headings down one level (H2 → H3, H3 → H4) so the report
    // nests correctly under the log heading.
    const logReport = nestReportUnderParent(fullReport);
    await ctx.wikiEngine.logLintFix(t.lintReportTitle, logReport);
    new LintReportModal(ctx.app, fullReport, fixCallbacks, counts, ctx.settings.language).open();
    await ctx.wikiEngine.generateIndexFromEngine();
    new Notice(TEXTS[ctx.settings.language].lintWikiComplete);

  } catch (error) {
    stageNotice?.hide();
    if (error instanceof DOMException && error.name === 'AbortError') {
      new Notice(getText(ctx.settings.language, 'ingestionCancelled'), NOTICE_NORMAL);
      console.debug('Lint cancelled by user');
      return;
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    new Notice(TEXTS[ctx.settings.language].lintWikiFailed + ': ' + errMsg, 0);
    console.error(error);
  }
}
