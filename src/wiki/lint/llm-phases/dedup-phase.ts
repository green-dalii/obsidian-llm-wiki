// v1.24.0: dedup-phase extracted from controller.ts:runLintWiki (lines 142-320).
//
// This phase performs the LLM-assisted duplicate detection step:
//   1. Filter entity/concept files (sources are excluded — they don't have
//      aliases and are not user-named pages)
//   2. Run `generateDuplicateCandidates` (programmatic, O(N²) pair scan with
//      3 signals: crossLang, caseVariant, bigram, sharedLinks)
//   3. Classify candidates into Tier 1 (must-verify) and Tier 2 (fill budget)
//   4. Build a token-budgeted verify batch
//   5. Run LLM verify in parallel, respecting `pageGenerationConcurrency`
//   6. Detect rate-limit failures and emit a Notice with suggested mitigation
//
// Pure helpers (`classifyTiers`, `computeVerifyBatch`) are exported for
// unit testing — the rest of the phase is integration-level (async IO, LLM
// client, status notices) and is covered by the runDedupPhase integration
// tests in `__tests__/wiki/lint/llm-phases/dedup-phase.test.ts`.
//
// Behavior MUST be identical to the original inline implementation in
// controller.ts:runLintWiki (lines 142-320). Any change here is a
// behavior regression unless explicitly called out in a release commit.

import { Notice } from 'obsidian';
import { getText } from '../../../core/i18n';
import { TEXTS } from '../../../texts';
import { generateDuplicateCandidates } from '../duplicate-detection';
import type { DuplicateCandidate } from '../duplicate-detection';
import { resolveModelForTask } from '../../../core/model-resolver';
import { parseJsonResponse } from '../../../core/json';
import { detectRateLimitFailures, formatRateLimitNotice } from '../../../core/rate-limit';
import { normalizeLLMPath } from '../../../core/prompt-builders';
import { PROMPTS } from '../../../prompts';
import type { LintPhaseContext, DuplicateResult, ScannerPage } from '../types';
import {
  TOKENS_LINT_DEDUP_LLM,
  NOTICE_RATE_LIMIT,
  NOTICE_ERROR,
  LINT_CANDIDATE_TOKEN_ESTIMATE,
  LINT_MAX_INPUT_TOKENS,
  LINT_DEDUP_BATCH_SIZE,
  WIKI_SUBFOLDERS,
} from '../../../constants';

export interface DedupPhaseInput {
  wikiFiles: Array<{ path: string; basename: string }>;
  pageMap: Map<string, ScannerPage>;
}

/**
 * Tier classification — pure function, mirrors the logic in
 * controller.ts:runLintWiki lines 184-194.
 *
 * - `crossLang` and `caseVariant` signals are always Tier 1 (high-precision).
 * - `bigram` with score >= 0.6 is Tier 1; below is Tier 2.
 * - `sharedLinks` is always Tier 2.
 *
 * Stable ordering: input order is preserved within each tier.
 */
export function classifyTiers(
  candidates: DuplicateCandidate[],
): { tier1: DuplicateCandidate[]; tier2: DuplicateCandidate[] } {
  const tier1: DuplicateCandidate[] = [];
  const tier2: DuplicateCandidate[] = [];
  for (const c of candidates) {
    if (c.signal === 'crossLang' || c.signal === 'caseVariant') {
      tier1.push(c);
    } else if (c.signal === 'bigram') {
      (c.score >= 0.6 ? tier1 : tier2).push(c);
    } else if (c.signal === 'sharedLinks') {
      tier2.push(c);
    }
  }
  return { tier1, tier2 };
}

/**
 * Token-budgeted verify batch — pure function, mirrors controller.ts lines
 * 213-221.
 *
 * Tier 1 is always included in full (matches OLD behavior — even when tier1
 * alone exceeds `maxTotal`, we send all tier1 candidates; truncating would
 * silently drop high-precision duplicates). Tier 2 fills any remaining
 * budget (`maxTotal - tier1.length`). If the combined list is larger than
 * `maxTotal`, the LLM is told about more pairs than the budget suggests —
 * a rare edge case that mirrors the OLD inline code's behavior exactly.
 */
export function computeVerifyBatch(
  tier1: DuplicateCandidate[],
  tier2: DuplicateCandidate[],
  maxTotal: number,
): { verifyList: DuplicateCandidate[]; tier2Included: number } {
  const verifyList: DuplicateCandidate[] = [];
  // Tier 1: always include in full (no cap). Matches OLD `[...tier1]`.
  for (let i = 0; i < tier1.length; i++) {
    verifyList.push(tier1[i]);
  }
  const tier2Budget = Math.max(0, maxTotal - verifyList.length);
  const tier2Included = Math.min(tier2.length, tier2Budget);
  for (let i = 0; i < tier2Included; i++) {
    verifyList.push(tier2[i]);
  }
  return { verifyList, tier2Included };
}

/**
 * Run the duplicate detection phase. Returns the list of LLM-confirmed
 * duplicate pairs (target, source, reason). The caller is responsible
 * for surfacing the result to the lint report — this function only
 * emits a Notice on rate-limit detection and lets the caller decide
 * what to do with the empty array.
 *
 * On any error, returns `[]` and logs. Does NOT throw.
 */
export async function runDedupPhase(
  ctx: LintPhaseContext,
  input: DedupPhaseInput,
  checkCancelled: () => void,
): Promise<DuplicateResult[]> {
  // Early return guards — preserves original behavior in controller.ts.
  // v1.24.0: use WIKI_SUBFOLDERS constants instead of hardcoded '/entities/' /
  // '/concepts/' literals — keeps the entity/concept folder contract in
  // a single place (constants.ts) so future wiki-layout changes propagate.
  const entityConceptFiles = input.wikiFiles.filter(f =>
    f.path.includes(`/${WIKI_SUBFOLDERS.entities}/`) ||
    f.path.includes(`/${WIKI_SUBFOLDERS.concepts}/`)
  );
  if (entityConceptFiles.length < 2) return [];
  // B3 fix: invoke the getter closure (was direct ref → snapshot).
  if (!ctx.llmClient()) return [];

  const t = TEXTS[ctx.settings.language];

  try {
    const pagesForDedup: Array<{ path: string; content: string; title: string }> = [];
    for (const file of entityConceptFiles) {
      const info = input.pageMap.get(file.path);
      if (info) {
        pagesForDedup.push({ path: file.path, content: info.content, title: info.basename });
      }
    }

    // Update UI before any work — mirrors controller.ts:runLintWiki
    // lines 167-168 which updated the status bar/stage notice before
    // running the candidate generation. The v1.24.0 refactor's first pass
    // accidentally moved the UI updates inside the verify loop, leaving
    // "wiki is clean" runs without any visible "Checking duplicates"
    // feedback. This regression-fix restores the OLD observable behavior.
    ctx.wikiEngine.updateStatusBar(getText(ctx.settings.language, 'lintStatusDuplicates'));
    ctx.stageNotice?.setMessage(t.lintCheckingDuplicates);

    // Layer 1: Programmatic candidates (3 signals: crossLang, bigram, sharedLinks)
    const allCandidates = await generateDuplicateCandidates(pagesForDedup);
    if (allCandidates.length === 0) {
      console.debug('lintWiki: no duplicate candidates found — wiki is clean');
      return [];
    }

    const { tier1, tier2 } = classifyTiers(allCandidates);
    console.debug(`lintWiki: ${allCandidates.length} candidates → Tier 1: ${tier1.length}, Tier 2: ${tier2.length}`);
    // v1.24.0: log candidate breakdown by signal (preserved from the
    // OLD controller.ts:runLintWiki lines 200-204 diagnostic; was
    // accidentally dropped during refactor).
    console.debug('lintWiki: candidate breakdown by signal:', {
      crossLang: allCandidates.filter(c => c.signal === 'crossLang').length,
      bigram: allCandidates.filter(c => c.signal === 'bigram').length,
      sharedLinks: allCandidates.filter(c => c.signal === 'sharedLinks').length,
    });

    // Layer 3: LLM verification with token-budget batching.
    // Each candidate ≈ 120 chars ≈ 30 tokens. Total input budget: 15K tokens
    // (leaves room for prompt + output in 200K window).
    const maxTotalCandidates = Math.floor(LINT_MAX_INPUT_TOKENS / LINT_CANDIDATE_TOKEN_ESTIMATE);
    const { verifyList: verifyCandidates, tier2Included: tier2ToInclude } = computeVerifyBatch(tier1, tier2, maxTotalCandidates);
    console.debug(`lintWiki: sending ${verifyCandidates.length}/${maxTotalCandidates} candidates (Tier 1: ${tier1.length}, Tier 2: ${tier2ToInclude}/${tier2.length}, budget: ${LINT_MAX_INPUT_TOKENS} tokens)`);

    if (verifyCandidates.length === 0) return [];

    // Split into batches
    const batches: DuplicateCandidate[][] = [];
    for (let i = 0; i < verifyCandidates.length; i += LINT_DEDUP_BATCH_SIZE) {
      batches.push(verifyCandidates.slice(i, i + LINT_DEDUP_BATCH_SIZE));
    }

    const concurrency = ctx.settings.pageGenerationConcurrency || 1;
    console.debug(`lintWiki: ${batches.length} batches, concurrency=${concurrency}`);

    // v1.24.0: compose the system prompt once for the whole dedup run and
    // reuse it across every batch worker (it is identical for all batches,
    // and re-resolving it per batch would re-parse the schema on each worker).
    // Uses the shared buildSystemPrompt composer so dedup receives the same
    // language directive + schema context + active tag vocabulary as the
    // fix-runners.
    const systemPrompt = await ctx.buildSystemPrompt('lint');

    // Process batches in parallel with concurrency limit
    const allDuplicates: DuplicateResult[] = [];
    const dedupFailures: Array<{ name: string; reason: string }> = [];
    for (let i = 0; i < batches.length; i += concurrency) {
      checkCancelled();
      const chunk = batches.slice(i, i + concurrency);
      const batchStart = i + 1;
      const batchEnd = Math.min(i + concurrency, batches.length);
      const progressLabel = batchEnd > batchStart
        ? `${batchStart}-${batchEnd}/${batches.length}`
        : `${batchStart}/${batches.length}`;
      ctx.stageNotice?.setMessage(t.lintCheckingDuplicatesProgress
        .replace('{current}', progressLabel));
      const results = await Promise.allSettled(
        chunk.map(async (batch, bi) => {
          const batchNum = i + bi + 1;
          const candidateList = batch.map(c =>
            `- Candidate A: ${c.target}\n  Candidate B: ${c.source}\n  Signal: ${c.reason}`
          ).join('\n');

          const dedupPrompt = PROMPTS.lintDuplicateDetection
            .replace('{{wikiFolder}}', ctx.settings.wikiFolder)
            .replace('{{candidates}}', candidateList)
            .replace('{{total}}', String(pagesForDedup.length));

          console.debug(`lintWiki: batch ${batchNum}/${batches.length} — ${batch.length} candidates`);
          // v1.24.0 #208: log resolved lint model for e2e verification
          // of per-task routing in dedup batches.
          const lintModel = resolveModelForTask(ctx.settings, 'lint');
          // B3 fix: capture the result of the getter so subsequent await
          // calls don't re-invoke (also narrows the non-null assertion
          // away — ctx.llmClient() returned null only at the early-return
          // guard; this loop is unreachable in that case).
          const llm = ctx.llmClient();
          if (!llm) {
            throw new Error('runDedupPhase: LLM client became null mid-run');
          }
          const dedupResponse = await llm.createMessage({
            model: lintModel,
            max_tokens: TOKENS_LINT_DEDUP_LLM,
            messages: [{ role: 'user', content: dedupPrompt }],
            ...(systemPrompt ? { system: systemPrompt } : {}),
            response_format: { type: 'json_object' },
            ...(ctx.settings.disableThinking ? { enableThinking: false } : {}),
          });

          const dedupResult = await parseJsonResponse(dedupResponse) as {
            duplicates?: DuplicateResult[]
          } | null;

          console.debug(`lintWiki: batch ${batchNum}/${batches.length} → ${dedupResult?.duplicates?.length || 0} duplicates confirmed`);
          // Guard against non-array LLM responses (single object, string, etc.)
          const rawDups = dedupResult?.duplicates;
          return Array.isArray(rawDups) ? rawDups : [];
        })
      );

      for (let resultIdx = 0; resultIdx < results.length; resultIdx++) {
        const result = results[resultIdx];
        // v1.24.0: capture the real batch number via the closure. `batchNum`
        // for the bi'th result in this chunk is `batchStart + bi`. We
        // re-derive from `resultIdx` instead of `results.indexOf(result)`
        // to avoid relying on Promise.allSettled result identity.
        const batchNum = batchStart + resultIdx;
        if (result.status === 'fulfilled') {
          const rawDups = Array.isArray(result.value) ? result.value : [];
          const validDups = rawDups.filter(
            // v1.24.0 W5: include `typeof d.reason === 'string'` so LLMs that
            // return null/42 for `reason` are filtered out (not silently
            // passed through to DuplicateResult.reason: string).
            d => typeof d.target === 'string' && d.target.length > 0 &&
                 typeof d.source === 'string' && d.source.length > 0 &&
                 typeof d.reason === 'string'
          ).map(d => ({
            target: normalizeLLMPath(d.target, ctx.settings.wikiFolder),
            source: normalizeLLMPath(d.source, ctx.settings.wikiFolder),
            reason: d.reason,
          }));
          allDuplicates.push(...validDups);
        } else {
          const reason = result.reason instanceof Error ? result.reason.message : String(result.reason || 'unknown');
          console.error('lintWiki: duplicate detection batch failed:', reason);
          // Real batch number (was `batch-${i + 1}` — the outer chunk-loop
          // index — which collided with sibling batches in the same chunk
          // at concurrency > 1; v1.24.0 review finding B4).
          dedupFailures.push({ name: `batch-${batchNum}`, reason });
        }
      }
    }

    // Rate-limit detection for duplicate detection
    const dedupRateInfo = detectRateLimitFailures(
      dedupFailures,
      concurrency,
      ctx.settings.batchDelayMs ?? 300,
    );
    if (dedupRateInfo) {
      console.warn(
        `[Duplicate Rate Limit] ${dedupRateInfo.count} duplicate detection batch(es) failed with 429, ` +
        `suggested concurrency=${dedupRateInfo.suggestedConcurrency}, delay=${dedupRateInfo.suggestedDelay}ms`
      );
      new Notice(formatRateLimitNotice(dedupRateInfo, ctx.settings.language), NOTICE_RATE_LIMIT);
    }

    console.debug(`lintWiki: LLM confirmed ${allDuplicates.length} duplicate pairs total`);
    return allDuplicates;
  } catch (e) {
    // v1.22.6 #204: errors in dedup phase should not crash the entire lint.
    // Log and return empty so subsequent phases can still report.
    console.error('Duplicate detection failed:', e);
    const errMsg = e instanceof Error ? e.message : String(e);
    // v1.24.0: Use NOTICE_ERROR (8s TTL) + auto-hide so dedup failures don't
    // sit forever (regression fix vs the v1.24.0 refactor's first pass which
    // used literal `0` and produced sticky Notices until restart).
    const errNotice = new Notice(
      t.lintDuplicateCheckFailedDetail.replace('{step}', 'Layer 3 (LLM verify)').replace('{error}', errMsg),
      NOTICE_ERROR,
    );
    window.setTimeout(() => errNotice.hide(), NOTICE_RATE_LIMIT);
    return [];
  }
}
