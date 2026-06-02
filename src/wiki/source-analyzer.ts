// Source Analyzer — iterative batch extraction of entities/concepts from source files.
// Extracted from WikiEngine.

import { TFile } from 'obsidian';
import {
  EngineContext,
  SourceAnalysis,
  EntityInfo,
  ConceptInfo,
  ContradictionInfo,
  WIKI_LANGUAGES,
} from '../types';
import { PROMPTS } from '../prompts';
import { parseJsonResponse, matchExtractedToExisting, coerceToArray } from '../utils';
import { getExistingWikiPages } from './lint-fixes';
import { getGranularityInstruction } from './system-prompts';
import { calculateBatchLimits, adjustBatchSizeForResponse, getCustomTypeCaps } from '../core/batch-limits';
import { detectConvergence, checkCumulativeLimits, checkEmptyBatch, formatConvergenceStatus } from '../core/convergence-detector';
import { createEmptyAccumulation, mergeBatchResults, buildSourceAnalysis, calculateBatchStats } from '../core/batch-merger';

// ── Batch response normalization ─────────────────────────────────
// LLMs often return irregular JSON: omitted empty arrays, non-array truthy
// values (entities: true), or missing keys entirely. This module centralizes
// all input validation so the main extraction loop doesn't need scattered
// `|| []` fallbacks. Pure functions (no IO) — fully unit-testable.

export type BatchValidity = 'valid' | 'empty' | 'unusable';

export interface NormalizedBatch {
  entities: EntityInfo[];
  concepts: ConceptInfo[];
  sourceTitle: string | null;
  summary: string | null;
  contradictions: ContradictionInfo[];
  relatedPages: string[];
  keyPoints: string[];
}

// Normalize a raw LLM batch response into a well-formed NormalizedBatch.
// Returns a validity flag so callers can distinguish:
//   'unusable' — both arrays absent/unfilled ⟹ abort first batch or skip
//   'empty'    — both arrays present but zero items ⟹ signal to stop iteration
//   'valid'    — at least one extractable item found ⟹ continue processing
export function normalizeBatchResponse(
  raw: Partial<SourceAnalysis> | null
): { validity: BatchValidity; data: NormalizedBatch } {
  if (!raw) {
    return { validity: 'unusable', data: emptyBatch() };
  }

  const entities = coerceToArray<EntityInfo>(raw.entities)
    .filter(e => e?.name?.trim());
  const concepts = coerceToArray<ConceptInfo>(raw.concepts)
    .filter(c => c?.name?.trim());

  // Strip wiki-link formatting if LLM outputs [[path|name]] instead of plain name
  const relatedPages = coerceToArray<string>(raw.related_pages).map(p => {
    const match = String(p).match(/^\[\[(?:[^\]|]+\|)?([^\]]+)\]\]$/);
    return match ? match[1] : p;
  });

  const data: NormalizedBatch = {
    entities,
    concepts,
    sourceTitle: typeof raw.source_title === 'string' ? raw.source_title : null,
    summary: typeof raw.summary === 'string' ? raw.summary : null,
    contradictions: coerceToArray<ContradictionInfo>(raw.contradictions),
    relatedPages,
    keyPoints: coerceToArray<string>(raw.key_points),
  };

  if (entities.length === 0 && concepts.length === 0) {
    // Both absent at key level → truly unusable; both present but empty → empty signal
    const bothKeysAbsent = raw.entities === undefined && raw.concepts === undefined;
    return { validity: bothKeysAbsent ? 'unusable' : 'empty', data };
  }

  return { validity: 'valid', data };
}

function emptyBatch(): NormalizedBatch {
  return {
    entities: [],
    concepts: [],
    sourceTitle: null,
    summary: null,
    contradictions: [],
    relatedPages: [],
    keyPoints: [],
  };
}

export class SourceAnalyzer {
  constructor(private ctx: EngineContext) {}

  async analyzeSource(file: TFile): Promise<SourceAnalysis | null> {
    console.debug('=== Source analysis started ===');
    console.debug('File:', file.path);

    const content = await this.ctx.app.vault.read(file);
    console.debug('File content length:', content.length);

    console.debug('Existing Wiki pages count: — delayed until post-extraction matching');

    // Calculate batch limits using pure functions (Phase 1)
    const limits = calculateBatchLimits(content.length, this.ctx.settings.extractionGranularity || 'standard', {
      entityCap: this.ctx.settings.customEntityLimit,
      conceptCap: this.ctx.settings.customConceptLimit
    });

    const customTypeCaps = getCustomTypeCaps(this.ctx.settings);

    const MAX_TOKENS = 16000;  // LLM API max_tokens parameter

    console.debug(`[Batch limits] Initial size: ${limits.initialBatchSize}, Max batches: ${limits.maxBatches}, Max total: ${limits.maxTotalItems || 'none'}`);

    let currentBatchSize = limits.initialBatchSize;
    let batchSizeHalved = false;

    // Initialize batch accumulation using pure function (Phase 3)
    const accumulation = createEmptyAccumulation();

    let firstBatchData: NormalizedBatch | null = null;
    let finalBatchNum = 0;

    // Build granularity instruction from shared definitions
    const granularityInstruction = getGranularityInstruction(this.ctx.settings)

    // ⚡ Page list removed from extraction prompt — PageFactory.resolvePagePath
    // handles deduplication via slug/alias/LLM matching. Programmatic
    // related_pages matching runs after extraction instead.
    const templateUntouched = PROMPTS.analyzeSource
      .replace('{{content}}', content)
      .replace('{{existing_pages}}', '');  // Empty — dedup handled downstream
    const batchMarker = '{{batch_context}}';
    const markerIdx = templateUntouched.indexOf(batchMarker);
    const staticPrefix = templateUntouched.substring(0, markerIdx);
    const suffixTemplate = templateUntouched.substring(markerIdx + batchMarker.length);

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    for (let batchNum = 0; batchNum < limits.maxBatches; batchNum++) {
      const isFirstBatch = batchNum === 0;

      let batchContext: string;
      if (isFirstBatch) {
        batchContext = 'This is the first extraction round. Extract the most important entities and concepts from the source.';
      } else {
        // Build already-extracted context with names and aliases to inform later rounds.
        // This prevents the LLM from re-extracting duplicates (especially useful for
        // small models that cannot reliably remember their own previous output).
        const ctxLines: string[] = [];
        for (const e of accumulation.entities) {
          const line = e.aliases?.length
            ? `${e.name} (aliases: ${e.aliases.join(', ')})`
            : e.name;
          ctxLines.push(line);
        }
        for (const c of accumulation.concepts) {
          const line = c.aliases?.length
            ? `${c.name} (aliases: ${c.aliases.join(', ')})`
            : c.name;
          ctxLines.push(line);
        }
        const alreadyExtracted = ctxLines.length > 0
          ? `\n\nAlready extracted from this source:\n  [${ctxLines.join('; ')}]\n  (including abbreviations, synonyms, and translations of these names)\nDo NOT extract them again. If a candidate name is equivalent to any of the above — including their aliases — skip it.`
          : '';
        batchContext = `This is round ${batchNum + 1} of extraction. Extract the next batch of most important entities and concepts from the remaining content. If no more items are worth extracting, return empty arrays [] for entities and concepts.${alreadyExtracted}`;
      }

      const prompt = staticPrefix + batchContext + suffixTemplate
        .replace('{{granularity_instruction}}', granularityInstruction)
        .replace(/{{batch_size}}/g, String(currentBatchSize));

      const langHint = `\n\nCRITICAL LANGUAGE REQUIREMENT: Summaries, descriptions, source_title, and key_points in your JSON output MUST be written in ${WIKI_LANGUAGES[this.ctx.settings.wikiLanguage || 'en'] || this.ctx.settings.wikiLanguage || 'English'}. HOWEVER: entity names and concept names MUST be preserved in their original source language — NEVER translate names. mentions_in_source MUST be verbatim quotes from the source (preserve original language).`;
      const finalPrompt = prompt + langHint;

      console.debug(`[Batch ${batchNum + 1}/${limits.maxBatches}] LLM call started (batch_size=${currentBatchSize})...`);
      console.debug(`[Batch ${batchNum + 1}] Prompt length:`, prompt.length);
      if (isFirstBatch) {
        this.ctx.onProgress?.(`Analyzing batch 1/${limits.maxBatches}...`);
      } else {
        this.ctx.onProgress?.(`Analyzing batch ${batchNum + 1}/${limits.maxBatches} (${accumulation.entities.length} entities, ${accumulation.concepts.length} concepts so far)...`);
      }

      try {
        const systemPrompt = await this.ctx.buildSystemPrompt('analyze');
        const response = await client.createMessage({
          model: this.ctx.settings.model,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: [{ role: 'user', content: finalPrompt }],
          response_format: { type: 'json_object' },
          cacheBreakpoint: staticPrefix.length
        });

        console.debug(`[Batch ${batchNum + 1}] Response length:`, response.length);
        this.ctx.onProgress?.(`Analyzed batch ${batchNum + 1}, processing...`);

        const analysisData = await parseJsonResponse(response, async (malformedJson: string) => {
          const repairPrompt = `Fix the following malformed JSON. Only fix JSON syntax errors (unescaped quotes, trailing commas, missing brackets). Do NOT change any values or content. Output ONLY the fixed JSON, no other text.\n\n${malformedJson}`;
          return await client.createMessage({
            model: this.ctx.settings.model,
            max_tokens: MAX_TOKENS,
            system: await this.ctx.buildSystemPrompt('analyze'),
            messages: [{ role: 'user', content: repairPrompt }],
            response_format: { type: 'json_object' }
          });
        }) as Partial<SourceAnalysis> | null;

        if (!analysisData) {
          console.error(`[Batch ${batchNum + 1}] JSON parse failed, skipping batch`);
          if (isFirstBatch) return null;
          break;
        }

        const { validity, data: norm } = normalizeBatchResponse(analysisData);

        if (isFirstBatch) {
          if (validity === 'unusable') {
            console.error('❌ Round 1 unusable — no entities or concepts:', {
              entities: !!analysisData?.entities,
              concepts: !!analysisData?.concepts
            });
            return null;
          }
          if (!norm.sourceTitle) {
            console.debug('Round 1 missing source_title, falling back to filename:', file.basename);
          }
          firstBatchData = norm;
          accumulation.contradictions = norm.contradictions;
          accumulation.relatedPages = norm.relatedPages;
          accumulation.keyPoints = norm.keyPoints;

          // First batch: immediately merge entities/concepts into accumulation
          const firstMergeResult = mergeBatchResults(accumulation, norm, customTypeCaps);
          accumulation.entities = firstMergeResult.allEntities;
          accumulation.concepts = firstMergeResult.allConcepts;
          accumulation.extractedNames = firstMergeResult.extractedNames;
        }

        if (validity === 'empty') {
          console.debug(`[Batch ${batchNum + 1}] LLM returned empty arrays, stopping iteration`);
          break;
        }

        // Later batches: merge batch results using pure function (Phase 3)
        if (!isFirstBatch) {
          const mergeResult = mergeBatchResults(accumulation, norm, customTypeCaps);
          accumulation.entities = mergeResult.allEntities;
          accumulation.concepts = mergeResult.allConcepts;
          accumulation.extractedNames = mergeResult.extractedNames;

          // Batch statistics logging for later batches
          const rawTotal = norm.entities.length + norm.concepts.length;
          const newTotal = mergeResult.newEntities.length + mergeResult.newConcepts.length;
          const statsMsg = calculateBatchStats(batchNum + 1, {
            entities: mergeResult.newEntities.length,
            concepts: mergeResult.newConcepts.length
          }, {
            entities: accumulation.entities.length,
            concepts: accumulation.concepts.length
          });
          console.debug(statsMsg);

          // Adjust batch size for long responses (Phase 1)
          currentBatchSize = adjustBatchSizeForResponse(currentBatchSize, response.length, limits.responseFullnessThreshold);

          // Check empty batch (Phase 2)
          const emptyCheck = checkEmptyBatch(rawTotal, newTotal);
          if (emptyCheck.shouldStop) {
            console.debug(`[Batch ${batchNum + 1}] ${emptyCheck.reason}, stopping`);
            break;
          }

          // Convergence detection (Phase 2)
          const convergence = detectConvergence(rawTotal, currentBatchSize, batchSizeHalved, limits.minBatchSize);
          if (convergence.shouldStop) {
            console.debug(formatConvergenceStatus(batchNum + 1, convergence));
            break;
          }
          if (convergence.newBatchSizeHalved) {
            batchSizeHalved = true;
            currentBatchSize = convergence.newBatchSize;
          }

          // Cumulative limits check (Phase 2)
          const cumulativeCheck = checkCumulativeLimits(accumulation.entities.length, accumulation.concepts.length, {
            customEntityCap: customTypeCaps.entityCap,
            customConceptCap: customTypeCaps.conceptCap,
            maxTotalItems: limits.maxTotalItems
          });
          if (cumulativeCheck.shouldStop) {
            console.debug(`[Batch ${batchNum + 1}] ${cumulativeCheck.reason}, stopping`);
            break;
          }
        }

        finalBatchNum = batchNum + 1;

      } catch (error) {
        console.error(`[Batch ${batchNum + 1}] Call failed:`, error);
        if (isFirstBatch) {
          const providerName = this.ctx.settings.provider;
          const errMsg = error instanceof Error ? error.message : String(error);
          throw new Error(
            `Failed to connect to ${providerName} API: ${errMsg}. ` +
            `Check your network connection, API key, and provider URL in Settings. ` +
            `If the error mentions SSL/TLS, try: (1) restart Obsidian, (2) check VPN/proxy settings, (3) verify the provider URL is correct.`
          );
        }
        console.warn(`[Batch ${batchNum + 1}] Non-first-round failure, keeping extracted items`);
        break;
      }
    }

    if (!firstBatchData && accumulation.entities.length === 0 && accumulation.concepts.length === 0) {
      return null;
    }

    // ── Programmatic related_pages matching ──────────────────────────
    // After extraction, match extracted names against existing wiki pages
    // using slug + alias matching (same logic as resolvePagePath Fast path 2).
    // Replaces the old approach of embedding ~200K chars of page list in prompt.
    const allExtractedNames = [
      ...accumulation.entities.map(e => e.name),
      ...accumulation.concepts.map(c => c.name),
    ];
    if (allExtractedNames.length > 0) {
      try {
        const existingPages = await getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);
        accumulation.relatedPages = matchExtractedToExisting(allExtractedNames, existingPages);
        console.debug('[Related pages] Programmatic matching:', accumulation.relatedPages.length, 'pages matched');
      } catch (err) {
        console.warn('[Related pages] Programmatic matching failed:', err);
      }
    }

    // Build final SourceAnalysis using pure function (Phase 3)
    const analysis = buildSourceAnalysis(
      file.path,
      file.basename,
      accumulation,
      firstBatchData ? {
        sourceTitle: firstBatchData.sourceTitle,
        summary: firstBatchData.summary
      } : undefined
    );

    console.debug('=== Iterative extraction complete ===');
    console.debug('  - Total batches:', finalBatchNum);
    console.debug('  - Entities count:', accumulation.entities.length);
    console.debug('  - Concepts count:', accumulation.concepts.length);
    console.debug('  - Deduplicated names:', accumulation.extractedNames.size);

    return analysis;
  }
}
