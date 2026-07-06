// PR #3 split: PPR cascade seed-selection phase (Phase 2 of buildWikiContext).
// Extracted from query-engine.ts (1119-1173).
//
// Run lex+PPR cascade first; if results are weak (no hits OR max score < 2),
// escalate to LLM-driven seed selection and re-run the cascade with the
// new seeds. Returns a structured result; the caller (QueryView) writes
// back `_lastRetrieval` from it.

import { pprCascade, type PageRef, type PageMatch } from '../../../core/ppr-cascade';
import type { Graph } from '../../../core/build-graph';
import { selectSeedsWithLLM, type SeedLLMClient, type SeedSelectorSettings } from './seed-selector';

export interface SeedSelectionResult {
  matches: PageMatch[];
  /** Display label, e.g. "PPR+LLM" or "PPR" — for retrieval arm chip. */
  armLabel: string;
  /** Whether LLM augmentation actually improved results. */
  llmAugmented: boolean;
}

/**
 * Pure pipeline: run PPR cascade; if weak, escalate to LLM seed selection.
 * Does NOT mutate caller's `_graph` or `_lastRetrieval` (QueryView's job).
 */
export async function selectPprSeeds(
  query: string,
  pageRefs: PageRef[],
  graph: Graph | null | undefined,
  llmClient: SeedLLMClient | undefined,
  settings: SeedSelectorSettings,
  texts: Record<string, string>,
  onProgress?: (phase: string) => void,
): Promise<SeedSelectionResult> {
  onProgress?.(texts.queryPhaseSearching);

  let matches = pprCascade(query, pageRefs, { graph: graph ?? undefined, topN: 5 });
  const maxScore = matches.length > 0 ? matches[0].score : 0;
  const needsLLMSeeds = matches.length === 0 || maxScore < 2;

  let llmAugmented = false;
  let finalMatches = matches;
  if (needsLLMSeeds) {
    console.debug(`[QueryView PPR] LLM seed selection triggered (maxScore=${maxScore}, lexHits=${matches.length})`);
    const llmSeeds = await selectSeedsWithLLM(query, pageRefs, llmClient, settings);
    console.debug(`[QueryView PPR] LLM returned ${llmSeeds.length} seeds`);
    if (llmSeeds.length > 0) {
      finalMatches = pprCascade(query, pageRefs, {
        graph: graph ?? undefined,
        topN: 5,
        seeds: llmSeeds,
      });
      llmAugmented = finalMatches.some(m => m.score > 0);
    }
  }

  const arms = new Set(finalMatches.map(m => m.arm));
  const armInfo = [...arms].map(a =>
    a === 'graph-first-ppr' ? 'PPR' : a === 'lex-seeded-ppr' ? 'PPR+' : 'index',
  ).join('/');
  const armLabel = llmAugmented ? `${armInfo}+LLM` : armInfo;

  const relevantPages = finalMatches.map(m => m.page.path);
  const pageNames = relevantPages.map(p => p.split('/').pop() || p).join(', ');
  const foundText = texts.queryPhaseFoundPages
    .replace('{count}', relevantPages.length.toString())
    .replace('{pages}', pageNames);
  onProgress?.(`${foundText} · ${armLabel}`);

  return { matches: finalMatches, armLabel, llmAugmented };
}
