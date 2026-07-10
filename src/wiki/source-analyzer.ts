// Issue #116: build a compact slug-only list of existing wiki pages.
// The verbose index is capped at 40K chars, so the LLM often guesses slugs
// wrong. A slug-only list for 500 pages is ~18K chars and fits uncapped.
export function buildCompactSlugList(app: EngineContext['app'], wikiFolder: string, sourcePath?: string): string {
  const wikiPrefix = wikiFolder + '/';
  const files = app.vault.getMarkdownFiles();
  const slugs = files
    .filter(f =>
      f.path.startsWith(wikiPrefix) &&
      !f.path.includes('/schema/') &&
      !f.path.endsWith('/index.md') &&
      f.path !== sourcePath
    )
    .map(f => f.path.replace(wikiPrefix, '').replace(/\.md$/, ''))
    .sort();
  return slugs.join('\n');
}

// Source Analyzer — iterative batch extraction of entities/concepts from source files.
// Extracted from WikiEngine.

import { TFile } from 'obsidian';
import {
  EngineContext,
  SourceAnalysis,
  EntityInfo,
  ConceptInfo,
  ContradictionInfo,
  MentionWithProvenance,
  WIKI_LANGUAGES,
} from '../types';
import { PROMPTS } from '../prompts';
import { parseJsonResponse } from '../core/json';
import { matchExtractedToExisting } from '../core/index-search';
import { coerceToArray } from '../core/arrays';
import { isBlankSource } from '../core/frontmatter';
import { MAX_TOKENS_BATCH, TOKENS_PER_ITEM_BUDGET, SOURCE_ANALYZER_RETRY_MULTIPLIER } from '../constants';
import { getExistingWikiPages } from './lint/get-existing-pages';
import { getGranularityInstruction, buildActiveTagVocabularySection } from './system-prompts';
import { resolveModelForTask } from '../core/model-resolver';
import { calculateBatchLimits, adjustBatchSizeForResponse, getCustomTypeCaps } from '../core/batch-limits';
import { detectConvergence, checkCumulativeLimits, checkEmptyBatch, formatConvergenceStatus } from '../core/convergence-detector';
import { createEmptyAccumulation, mergeBatchResults, buildSourceAnalysis, calculateBatchStats } from '../core/batch-merger';

// ── Batch response normalization ─────────────────────────────────
// LLMs often return irregular JSON: omitted empty arrays, non-array truthy
// values (entities: true), or missing keys entirely. This module centralizes
// all input validation so the main extraction loop doesn't need scattered
// `|| []` fallbacks. Pure functions (no IO) — fully unit-testable.

export type BatchValidity = 'valid' | 'empty' | 'unusable';

/**
 * Issue #244 — auto-fill mentions_with_provenance from legacy
 * mentions_in_source when the LLM did not return the structured form.
 * This enables the page-factory to always use mentions_with_provenance
 * for programmatic Mentions writes, even when ingesting from older models
 * that only output the legacy string[] format.
 *
 * Manual-test fix: when we synthesize provenance from legacy, ALSO clear the
 * legacy `mentions_in_source` field so the LLM doesn't see both arrays in
 * the analysis log (and so downstream code that prefers the structured form
 * never accidentally falls back to a stale legacy array).
 */
function fillMentionsWithProvenance<T extends EntityInfo | ConceptInfo>(item: T): T {
  // If the LLM already returned structured provenance, keep it as-is
  // but clear the legacy field when both are present (avoids duplicate output).
  if (item.mentions_with_provenance?.length) {
    if (item.mentions_in_source?.length) {
      return { ...item, mentions_in_source: undefined };
    }
    return item;
  }
  // Otherwise, synthesize provenance from the legacy string[].
  const quotes = item.mentions_in_source?.filter(q => q?.trim()) ?? [];
  if (quotes.length === 0) return item;
  const now = new Date().toISOString();
  const provenance: MentionWithProvenance[] = quotes.map(quote => ({
    quote,
    source_path: '',      // filled by page-factory at write time
    source_slug: '',      // filled by page-factory at write time
    extracted_at: now,
  }));
  return { ...item, mentions_with_provenance: provenance, mentions_in_source: undefined };
}

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
    .filter(e => e?.name?.trim())
    .map(e => fillMentionsWithProvenance(e));
  const concepts = coerceToArray<ConceptInfo>(raw.concepts)
    .filter(c => c?.name?.trim())
    .map(c => fillMentionsWithProvenance(c));

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

    // #164 defense-in-depth: a blank source (empty / whitespace / frontmatter-only)
    // makes small/local models hallucinate entities to satisfy the JSON schema.
    // Never send a blank prompt to the LLM. The ingest gate normally rejects these
    // first; this guards any other/future caller of analyzeSource.
    if (isBlankSource(content)) {
      console.debug('[Source analysis] blank body — skipping LLM call, returning null');
      return null;
    }

    // Issue #185: source note's frontmatter `aliases:` are appended to
    // the generated `sources/<slug>` page (consumed there by
    // `fix-dead-link`'s slugify-normalized cross-page alias match).
    const noteFm = this.ctx.app.metadataCache
      .getFileCache(file)?.frontmatter as { aliases?: unknown } | undefined;
    const rawNoteAliases = noteFm?.aliases;
    const sourceNoteAliases: string[] = Array.isArray(rawNoteAliases)
      ? rawNoteAliases.filter((a): a is string => typeof a === 'string')
      : [];

    console.debug('Existing Wiki pages count: — delayed until post-extraction matching');

    // Calculate batch limits using pure functions (Phase 1)
    const limits = calculateBatchLimits(content.length, this.ctx.settings.extractionGranularity || 'standard', {
      entityCap: this.ctx.settings.customEntityLimit,
      conceptCap: this.ctx.settings.customConceptLimit
    });

    const customTypeCaps = getCustomTypeCaps(this.ctx.settings);

    // Dynamic max_tokens: scale with batch size to avoid truncation on large batches.
    // Batch 1 with 50 items needs ~20K tokens; batch 2+ with dedup context may need more.
    const baseMaxTokens = Math.max(MAX_TOKENS_BATCH, limits.initialBatchSize * TOKENS_PER_ITEM_BUDGET);
    // Allow truncation retry to grow up to N× the base cap.
    const retryCap = baseMaxTokens * SOURCE_ANALYZER_RETRY_MULTIPLIER;

    console.debug(`[Batch limits] Initial size: ${limits.initialBatchSize}, Max batches: ${limits.maxBatches}, Max total: ${limits.maxTotalItems || 'none'}, baseMaxTokens: ${baseMaxTokens}, retryCap: ${retryCap}`);

    let currentBatchSize = limits.initialBatchSize;
    let batchSizeHalved = false;
    let retryingBatch = false; // one retry on truncation: halve batch size

    // Initialize batch accumulation using pure function (Phase 3)
    const accumulation = createEmptyAccumulation();

    let firstBatchData: NormalizedBatch | null = null;
    let finalBatchNum = 0;

    // Build granularity instruction from shared definitions
    const granularityInstruction = getGranularityInstruction(this.ctx.settings)

    // Issue #85 v6: inject the active tag vocabulary so the LLM knows
    // exactly which entity/concept types are accepted by the frontmatter
    // validator. Without this, the LLM invents its own types that get
    // silently dropped at write time.
    const tagVocabularySection = buildActiveTagVocabularySection(this.ctx.settings)

    // Issue #116: inject a compact slug-only list of existing wiki pages so
    // the LLM uses exact paths when generating [[links]]. The verbose index
    // is capped at 40K chars and causes dead-link slug mismatches; a slug-only
    // list for 500 pages is ~18K chars and fits uncapped.
    const existingSlugs = buildCompactSlugList(this.ctx.app, this.ctx.settings.wikiFolder, file.path);

    // ⚡ Page list removed from extraction prompt — PageFactory.resolvePagePath
    // handles deduplication via slug/alias/LLM matching. Programmatic
    // related_pages matching runs after extraction instead.
    // Issue #244 (manual test fix): inject the source's original vault path
    // so the LLM records it in `mentions_with_provenance[i].source_path`
    // instead of guessing `wiki/sources/<slug>`.
    const templateUntouched = PROMPTS.analyzeSource
      .replace('{{content}}', content)
      .replace('{{existing_pages}}', '')  // Empty — dedup handled downstream
      .replace('{{existing_slugs}}', existingSlugs)
      .replace(/\{\{source_path\}\}/g, file.path);
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

      const wikiLang = this.ctx.settings.wikiLanguage || 'en';
      const wikiLangName = WIKI_LANGUAGES[wikiLang] || wikiLang;
      const langHint = `\n\nCRITICAL LANGUAGE REQUIREMENT: Summaries, descriptions, source_title, and key_points in your JSON output MUST be written in ${wikiLangName}. HOWEVER: entity names and concept names MUST be preserved in their original source language -- NEVER translate names. mentions_in_source MUST be verbatim quotes from the source (preserve original language).`;
      // Issue #244 (manual test fix): when the user's wiki language differs
      // from English, instruct the LLM to ALSO emit a 'translation' field
      // alongside each quote in mentions_with_provenance. The downstream
      // formatter renders: "<verbatim>" (<translation>) -- [[path|display]].
      // When source and wiki languages match, skip the translation field.
      const translationHint = wikiLang !== 'en'
        ? `\n\nTRANSLATION (cross-language wikis): For each entry in mentions_with_provenance, ALSO add a 'translation' field containing a ${wikiLangName} translation of the quote text. The 'quote' field MUST stay verbatim in the source's original language; the translation goes in a separate 'translation' field. Example: {"quote": "Machine learning is fun", "translation": "机器学习很有趣", "source_path": "...", ...}`
        : '';
      // Issue #85 v6: inject the active tag vocabulary so the LLM emits
      // type values that match the user's custom vocabulary (or the
      // hardcoded defaults). Without this, the LLM invents its own types
      // and the frontmatter validator silently drops them.
      const finalPrompt = prompt + langHint + translationHint + '\n\n' + tagVocabularySection;

      console.debug(`[Batch ${batchNum + 1}/${limits.maxBatches}] LLM call started (batch_size=${currentBatchSize})...`);
      console.debug(`[Batch ${batchNum + 1}] Prompt length:`, prompt.length);
      if (isFirstBatch) {
        this.ctx.onProgress?.(`Analyzing batch 1/${limits.maxBatches}...`);
      } else {
        this.ctx.onProgress?.(`Analyzing batch ${batchNum + 1}/${limits.maxBatches} (${accumulation.entities.length} entities, ${accumulation.concepts.length} concepts so far)...`);
      }

      try {
        const systemPrompt = await this.ctx.buildSystemPrompt('analyze');
        // Scale max_tokens with current batch size to avoid truncation.
        const batchMaxTokens = Math.max(baseMaxTokens, currentBatchSize * TOKENS_PER_ITEM_BUDGET);
        // v1.24.0 #208: route through resolveModelForTask so the debug
        // log reflects the ACTUAL model used (per-task override), not
        // the unified setting. Without this, e2e verification of
        // per-task routing would be impossible from console alone.
        const resolvedModel = resolveModelForTask(this.ctx.settings, 'ingest');
        console.debug(`[Batch ${batchNum + 1}] Provider:`, this.ctx.settings.provider, '| Model:', resolvedModel, '| Prompt:', finalPrompt.length, 'chars', '| max_tokens:', batchMaxTokens);
        const response = await client.createMessage({
          model: resolvedModel,
          max_tokens: batchMaxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: finalPrompt }],
          response_format: { type: 'json_object' },
          cacheBreakpoint: staticPrefix.length,
          maxTokensPerCall: retryCap,
        });

        console.debug(`[Batch ${batchNum + 1}] Response length:`, response.length);
        this.ctx.onProgress?.(`Analyzed batch ${batchNum + 1}, processing...`);

        const analysisData = await parseJsonResponse(response, async (malformedJson: string) => {
          const repairPrompt = `Fix the following malformed JSON. Only fix JSON syntax errors (unescaped quotes, trailing commas, missing brackets). Do NOT change any values or content. Output ONLY the fixed JSON, no other text.\n\n${malformedJson}`;
          return await client.createMessage({
            model: resolveModelForTask(this.ctx.settings, 'ingest'),
            max_tokens: retryCap, // Repair may need full output if original was truncated at retryCap
            system: await this.ctx.buildSystemPrompt('analyze'),
            messages: [{ role: 'user', content: repairPrompt }],
            response_format: { type: 'json_object' },
            maxTokensPerCall: retryCap,
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
          const modelName = this.ctx.settings.model;
          const errMsg = error instanceof Error ? error.message : String(error);
          const lowerErr = errMsg.toLowerCase();

          // Classify error by message content for targeted user guidance
          let userHint: string;
          if (lowerErr.includes('context') || lowerErr.includes('token') || lowerErr.includes('length') || lowerErr.includes('exceed')) {
            userHint = 'The request was rejected because the source file is too large for this model\'s context window. ' +
              'Try: (1) switch to a model with a larger context window (e.g. 1M tokens) in Settings, ' +
              '(2) reduce the file size, or (3) use a provider that supports larger contexts.';
          } else if (lowerErr.includes('max_tokens')) {
            userHint = 'The model rejected the max_tokens value. Try reducing it in Settings → LLM Configuration → Context Window.';
          } else if (lowerErr.includes('400')) {
            userHint = 'The API returned a Bad Request error. Check that the model name is correct and supported by your provider.';
          } else if (lowerErr.includes('401') || lowerErr.includes('403')) {
            userHint = 'Authentication failed. Check your API key in Settings.';
          } else if (lowerErr.includes('429')) {
            userHint = 'Rate limit exceeded. Wait a moment and try again, or switch to a provider with higher limits.';
          } else {
            userHint = 'Check your network connection, API key, and provider URL in Settings. ' +
              'If the error mentions SSL/TLS, try: (1) restart Obsidian, (2) check VPN/proxy settings, (3) verify the provider URL is correct.';
          }

          throw new Error(
            `Failed to connect to ${providerName} API (model: ${modelName}): ${errMsg}. ${userHint}`
          );
        }

        const errMsg = error instanceof Error ? error.message : String(error);
        const isTruncation = errMsg.toLowerCase().includes('truncated') || errMsg.toLowerCase().includes('max_tokens');
        if (!retryingBatch && isTruncation && currentBatchSize > limits.minBatchSize) {
          currentBatchSize = Math.max(limits.minBatchSize, Math.floor(currentBatchSize * 0.5));
          console.warn(`[Batch ${batchNum + 1}] Truncation detected, halving batch size to ${currentBatchSize} and retrying`);
          retryingBatch = true;
          batchNum--;
          continue;
        }
        retryingBatch = false;
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

    // Hard-cap accumulation to the configured custom limits (#120).
    // The prompt instruction is a soft hint the LLM may exceed; the
    // convergence detector only stops further batches. This slice ensures
    // the user's limit is actually honoured regardless of LLM behaviour.
    if (this.ctx.settings.extractionGranularity === 'custom') {
      const eCap = this.ctx.settings.customEntityLimit ?? 5;
      const cCap = this.ctx.settings.customConceptLimit ?? 5;
      if (accumulation.entities.length > eCap) accumulation.entities = accumulation.entities.slice(0, eCap);
      if (accumulation.concepts.length > cCap) accumulation.concepts = accumulation.concepts.slice(0, cCap);
    }

    // Build final SourceAnalysis using pure function (Phase 3)
    const analysis = buildSourceAnalysis(
      file.path,
      file.basename,
      accumulation,
      firstBatchData ? {
        sourceTitle: firstBatchData.sourceTitle,
        summary: firstBatchData.summary
      } : undefined,
      // Issue #185: forward curated source-note aliases so the
      // generated sources/<slug> page can carry them.
      sourceNoteAliases
    );

    console.debug('=== Iterative extraction complete ===');
    console.debug('  - Total batches:', finalBatchNum);
    console.debug('  - Entities count:', accumulation.entities.length);
    console.debug('  - Concepts count:', accumulation.concepts.length);
    console.debug('  - Deduplicated names:', accumulation.extractedNames.size);

    return analysis;
  }
}
