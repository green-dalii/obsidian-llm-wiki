// v1.22.0 #97: build a human-readable lint analysis summary for the
// Schema suggestion prompt. The LLM uses this as {{analysis_context}}
// to decide whether the schema needs updating.
//
// Pure function — no IO, no Obsidian dependencies. Takes the raw
// findings from the lint pipeline and produces a compact string that
// fits in ~200 tokens (the LLM doesn't need every detail, just the
// counts and the most actionable items).

export interface LintAnalysisInput {
  orphanCount: number;
  deadLinkCount: number;
  pollutedPageCount: number;
  tagViolationCount: number;
  duplicateCount: number;
  ungroundedQuoteCount: number;
  emptyPageCount: number;
  contradictionReport: string;
  /** Top orphan page names (up to 5) for the LLM to consider. */
  sampleOrphans: string[];
  /** Top dead link targets (up to 5). */
  sampleDeadLinks: string[];
  /** Page names with tag violations (up to 5). */
  sampleTagViolations: string[];
  /** v1.23.0 P1-6: hub pages with redundant ## Related links (Issue #157 / #175). */
  hubLinkDensityCount: number;
  /** Top hub pages flagged for link density issues (up to 3). */
  sampleHubLinkDensity: string[];
  totalWikiPages: number;
}

export function buildLintAnalysisContext(input: LintAnalysisInput): string {
  const lines: string[] = [];
  lines.push(`Wiki size: ${input.totalWikiPages} pages.`);
  lines.push(`Findings: ${input.orphanCount} orphan pages, ${input.deadLinkCount} dead links, ${input.pollutedPageCount} polluted pages, ${input.tagViolationCount} tag violations, ${input.duplicateCount} duplicates, ${input.ungroundedQuoteCount} ungrounded quotes, ${input.emptyPageCount} empty pages, ${input.hubLinkDensityCount} hub pages with redundant links.`);

  if (input.sampleOrphans.length > 0) {
    lines.push(`Sample orphans: ${input.sampleOrphans.join(', ')}.`);
  }
  if (input.sampleDeadLinks.length > 0) {
    lines.push(`Sample dead link targets: ${input.sampleDeadLinks.join(', ')}.`);
  }
  if (input.sampleTagViolations.length > 0) {
    lines.push(`Sample tag violations: ${input.sampleTagViolations.join(', ')}.`);
  }
  if (input.sampleHubLinkDensity.length > 0) {
    lines.push(`Sample hub link density issues: ${input.sampleHubLinkDensity.join(', ')}.`);
  }
  if (input.contradictionReport) {
    lines.push(input.contradictionReport);
  }
  return lines.join('\n');
}
