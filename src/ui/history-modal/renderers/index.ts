// v3.1 split: re-exports for all renderers so callers can import from one
// place (e.g. `import { renderEntry, renderGlobalInsight } from './renderers'`).
//
// Each module is a pure DOM builder that takes (parent, ..., t, ctx?) and
// returns void. The optional `ctx: RendererContext` is needed only by
// renderers that wire up click handlers (openLinkText).

export { renderSectionTitle, renderCloseFooter } from './footer';
export { renderLineWithLinks, renderOpenInLogLink } from './link-helpers';
export type { RendererContext } from './link-helpers';
export { renderGlobalInsight } from './global-insight';
export type { GlobalInsightData } from './global-insight';
export { renderEntry } from './entry';
export { renderMaintenanceDetails, renderCriticalKpiCards, renderReportSection } from './maintenance-details';
export { renderDeadLinkSection, renderDeadLinkTable } from './dead-link-table';
export { renderTagViolationSection } from './tag-violation';
export { renderSimpleListSection } from './simple-list';
export { renderLlmAnalysisSection, renderLlmItems } from './llm-analysis';
export { renderIngestDetails, renderIngestMetricCards, renderPageTypeGroup } from './ingest-details';
export { renderFixDetails } from './fix-details';
