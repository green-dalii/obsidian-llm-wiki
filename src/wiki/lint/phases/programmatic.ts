import { detectAliasDeficiency, scanOrphans, scanTagViolations, scanDeadLinks, scanQuoteGrounding, scanHubLinkDensity } from '../scanners';
import { detectPollutedPages } from '../utils';
import { getText } from '../../../core/i18n';
import type { Graph } from '../../../core/monte-carlo-ppr';
import { LintPhaseContext, ProgrammaticFindings, ScannerPage } from '../types';

export interface ProgrammaticInput {
  wikiFiles: Array<{ path: string; basename: string }>;
  pageMap: Map<string, ScannerPage>;
  knownTargets: Set<string>;
  knownTargetsLower: Set<string>;
  /** v1.23.0 P1-6 — wiki-link graph for hub detection and PPR. */
  graph: Graph;
}

/**
 * Run the fast-programmatic and source-IO programmatic checks.
 *
 * Order (preserves causality-awareness from the original lint-controller):
 *   1. alias deficiency (fast, no IO)
 *   2. orphans (fast, no IO)
 *   3. tag violations (fast, no IO)
 *   4. polluted pages (fast, no IO)
 *   5. dead links (no extra IO — uses pageMap)
 *   6. quote grounding (reuses already-read source pages — no extra IO)
 *
 * emptyPages is initialized empty here; it gets populated in the LLM phase
 * after we know which pages are duplicate sources (to exclude from empty-page list).
 */
export function runProgrammaticPhase(
  ctx: LintPhaseContext,
  input: ProgrammaticInput,
): ProgrammaticFindings {
  // 1. Alias deficiency
  const aliasDeficientPages = detectAliasDeficiency(input.wikiFiles, input.pageMap);
  console.debug(`lintWiki: ${aliasDeficientPages.length} entity/concept pages missing aliases`);

  // 2. Orphan pages
  const orphans = scanOrphans(input.pageMap, ctx.settings.wikiFolder);

  // 3. Tag vocabulary violations
  const tagViolations = scanTagViolations(input.pageMap, ctx.settings);

  // 4. Polluted pages
  const allPages = Array.from(input.pageMap.values()).map(({ path, basename }) => ({
    path, title: basename
  }));
  const pollutedPages = detectPollutedPages(allPages);
  if (pollutedPages.length > 0) {
    console.warn(`[Lint] Detected ${pollutedPages.length} polluted page(s):`);
    for (const pp of pollutedPages) {
      console.warn(`  - ${pp.path} → should be "${pp.cleanTitle}"`);
    }
  }

  // 5. Dead links
  ctx.stageNotice?.setMessage(getText(ctx.settings.language, 'lintScanningLinks'));
  ctx.wikiEngine.updateStatusBar(getText(ctx.settings.language, 'lintStatusScanningLinks'));
  console.debug('lintWiki: scanning dead links');
  const deadLinks = scanDeadLinks(
    input.pageMap, input.knownTargets, input.knownTargetsLower, ctx.settings.wikiFolder
  );
  ctx.stageNotice?.setMessage(
    getText(ctx.settings.language, 'lintScanningLinksProgress')
      .replace('{current}', String(input.wikiFiles.length))
      .replace('{total}', String(input.wikiFiles.length))
  );

  // 6. Quote grounding (Issue #126) — reuses already-read source pages.
  const sourceMap = new Map<string, ScannerPage>();
  for (const [path, page] of input.pageMap) {
    if (path.includes('/sources/')) {
      sourceMap.set(path, page);
    }
  }
  const ungroundedQuotes = scanQuoteGrounding(input.pageMap, sourceMap, ctx.settings.wikiFolder);
  console.debug(`lintWiki: ${ungroundedQuotes.length} ungrounded quote(s)`);

  // 7. Hub link density (Issue #157 / #175, v1.23.0 P1-6) — detects hub
  // pages whose ## Related links are mutually redundant in graph
  // structure. Pure PPR-based scoring, zero IO, zero LLM.
  const hubLinkDensityIssues = scanHubLinkDensity(input.pageMap, input.graph, {
    wikiFolder: ctx.settings.wikiFolder,
  });
  console.debug(`lintWiki: ${hubLinkDensityIssues.length} hub pages with link density issues`);

  return {
    aliasDeficientPages,
    emptyPages: [],
    orphans,
    tagViolations,
    pollutedPages,
    deadLinks,
    ungroundedQuotes,
    hubLinkDensityIssues,
    sourcesNormalizedFiles: 0, // populated by preparation phase caller
    sourcesNormalizedEntries: 0,
    doubleNestFixes: 0,
  };
}
