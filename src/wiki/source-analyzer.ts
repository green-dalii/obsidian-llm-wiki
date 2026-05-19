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
import { parseJsonResponse } from '../utils';
import { getExistingWikiPages } from './lint-fixes';
import { getGranularityInstruction } from './system-prompts';

export class SourceAnalyzer {
  constructor(private ctx: EngineContext) {}

  async analyzeSource(file: TFile): Promise<SourceAnalysis | null> {
    console.debug('=== Source analysis started ===');
    console.debug('File:', file.path);

    const content = await this.ctx.app.vault.read(file);
    console.debug('File content length:', content.length);

    const existingPages = await getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);
    const existingPagesList = existingPages.map(p => `- ${p.wikiLink}`).join('\n');
    console.debug('Existing Wiki pages count:', existingPages.length);

    // Iterative batch extraction parameters — linked to granularity setting
    const MAX_TOKENS = 16000;
    const granularity = this.ctx.settings.extractionGranularity || 'standard';
    const granularityConfig: Record<string, { initialBatchSize: number; maxBatchesBase: number; maxTotalItems: number | null }> = {
      fine:   { initialBatchSize: 30, maxBatchesBase: 12, maxTotalItems: null },
      standard:{ initialBatchSize: 20, maxBatchesBase: 6,  maxTotalItems: 50 },
      coarse: { initialBatchSize: 10, maxBatchesBase: 3,  maxTotalItems: 20 }
    };
    const config = granularityConfig[granularity] || granularityConfig.standard;
    const MIN_BATCH_SIZE = 5;
    let currentBatchSize = config.initialBatchSize;
    const MAX_BATCHES = Math.max(1, Math.ceil(content.length / 500)) + config.maxBatchesBase;

    const allEntities: EntityInfo[] = [];
    const allConcepts: ConceptInfo[] = [];
    const extractedNames = new Set<string>();

    let sourceTitle = '';
    let sourceSummary = '';
    let contradictions: ContradictionInfo[] = [];
    let relatedPages: string[] = [];
    let keyPoints: string[] = [];
    let firstBatchData: Partial<SourceAnalysis> | null = null;
    let finalBatchNum = 0;

    // Build granularity instruction from shared definitions
    const granularityInstruction = getGranularityInstruction(this.ctx.settings)

    const templateUntouched = PROMPTS.analyzeSource
      .replace('{{content}}', content)
      .replace('{{existing_pages}}', existingPagesList);
    const batchMarker = '{{batch_context}}';
    const markerIdx = templateUntouched.indexOf(batchMarker);
    const staticPrefix = templateUntouched.substring(0, markerIdx);
    const suffixTemplate = templateUntouched.substring(markerIdx + batchMarker.length);

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    for (let batchNum = 0; batchNum < MAX_BATCHES; batchNum++) {
      const isFirstBatch = batchNum === 0;

      let batchContext: string;
      if (isFirstBatch) {
        batchContext = 'This is the first extraction round. Extract the most important entities and concepts from the source.';
      } else {
        const nameList = [...extractedNames].map(n => `"${n}"`).join(', ');
        batchContext = `This is round ${batchNum + 1} of extraction. The following items have already been extracted — do NOT repeat them:\n${nameList}\n\nExtract the next batch of most important entities and concepts from the remaining content. If no more items are worth extracting, return empty arrays [] for entities and concepts.`;
      }

      const prompt = staticPrefix + batchContext + suffixTemplate
        .replace('{{granularity_instruction}}', granularityInstruction)
        .replace(/{{batch_size}}/g, String(currentBatchSize));

      const langHint = `\n\nCRITICAL LANGUAGE REQUIREMENT: Summaries, descriptions, source_title, and key_points in your JSON output MUST be written in ${WIKI_LANGUAGES[this.ctx.settings.wikiLanguage || 'en'] || this.ctx.settings.wikiLanguage || 'English'}. HOWEVER: entity names and concept names MUST be preserved in their original source language — NEVER translate names. mentions_in_source MUST be verbatim quotes from the source (preserve original language).`;
      const finalPrompt = prompt + langHint;

      console.debug(`[Batch ${batchNum + 1}/${MAX_BATCHES}] LLM call started (batch_size=${currentBatchSize})...`);
      console.debug(`[Batch ${batchNum + 1}] Prompt length:`, prompt.length);
      this.ctx.onProgress?.(`Analyzing batch ${batchNum + 1}...`);

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

        if (isFirstBatch) {
          if (!analysisData.entities || !analysisData.concepts) {
            console.error('❌ Round 1 missing required fields (entities/concepts):', {
              entities: !!analysisData.entities,
              concepts: !!analysisData.concepts
            });
            return null;
          }
          if (!analysisData.source_title) {
            console.debug('Round 1 missing source_title, falling back to filename:', file.basename);
          }
          firstBatchData = analysisData;
          sourceTitle = analysisData.source_title || file.basename;
          sourceSummary = analysisData.summary || '';
          contradictions = analysisData.contradictions || [];
          relatedPages = analysisData.related_pages || [];
          keyPoints = analysisData.key_points || [];
        }

        const newEntities = (analysisData.entities || []).filter(e => {
          if (!e.name?.trim()) return false;
          if (extractedNames.has(e.name.trim().toLowerCase())) return false;
          return true;
        });

        const newConcepts = (analysisData.concepts || []).filter(c => {
          if (!c.name?.trim()) return false;
          if (extractedNames.has(c.name.trim().toLowerCase())) return false;
          return true;
        });

        for (const e of newEntities) extractedNames.add(e.name.trim().toLowerCase());
        for (const c of newConcepts) extractedNames.add(c.name.trim().toLowerCase());

        allEntities.push(...newEntities);
        allConcepts.push(...newConcepts);

        const batchTotal = newEntities.length + newConcepts.length;
        console.debug(`[Batch ${batchNum + 1}] New: ${newEntities.length} entities, ${newConcepts.length} concepts (de-duplicated ${batchTotal})`);
        console.debug(`[Batch ${batchNum + 1}] Cumulative: ${allEntities.length} entities, ${allConcepts.length} concepts`);

        const RESPONSE_FULLNESS_THRESHOLD = MAX_TOKENS * 0.7;
        if (response.length > RESPONSE_FULLNESS_THRESHOLD && currentBatchSize > MIN_BATCH_SIZE) {
          const prevSize = currentBatchSize;
          currentBatchSize = Math.max(MIN_BATCH_SIZE, Math.floor(currentBatchSize * 0.75));
          console.debug(`[Batch ${batchNum + 1}] Response length ${response.length} 超过阈值 ${Math.round(RESPONSE_FULLNESS_THRESHOLD)}，batch_size: ${prevSize} → ${currentBatchSize}`);
        }

        const rawTotal = (analysisData.entities || []).length + (analysisData.concepts || []).length;
        const newTotal = newEntities.length + newConcepts.length;
        finalBatchNum = batchNum + 1;

        if (rawTotal === 0) {
          console.debug(`[Batch ${batchNum + 1}] LLM returned empty array, stopping iteration`);
          break;
        }

        // Stop only when LLM returned items but ALL were duplicates (nothing new to extract)
        if (newTotal === 0) {
          console.debug(`[Batch ${batchNum + 1}] All items duplicate, extraction exhausted, stopping`);
          break;
        }

        // Granularity-linked cumulative soft cap
        const cumulativeTotal = allEntities.length + allConcepts.length;
        if (config.maxTotalItems !== null && cumulativeTotal >= config.maxTotalItems) {
          console.debug(`[Batch ${batchNum + 1}] Cumulative total reached limit, stopping ${config.maxTotalItems}，停止迭代`);
          break;
        }

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

    if (!firstBatchData && allEntities.length === 0 && allConcepts.length === 0) {
      return null;
    }

    const analysis: SourceAnalysis = {
      source_file: file.path,
      source_title: sourceTitle || firstBatchData?.source_title || file.basename,
      summary: sourceSummary || (firstBatchData as SourceAnalysis)?.summary || '',
      entities: allEntities,
      concepts: allConcepts,
      contradictions: contradictions,
      related_pages: relatedPages,
      key_points: keyPoints,
      created_pages: [],
      updated_pages: []
    };

    console.debug('=== Iterative extraction complete ===');
    console.debug('  - Total batches:', finalBatchNum);
    console.debug('  - Entities count:', allEntities.length);
    console.debug('  - Concepts count:', allConcepts.length);
    console.debug('  - Deduplicated names:', extractedNames.size);

    return analysis;
  }
}
