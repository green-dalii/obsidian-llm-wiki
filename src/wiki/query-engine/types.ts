// PR #3 split: Type declarations extracted from query-engine.ts.
//
// All structural types that were previously inlined in query-engine.ts now
// live here. They are pure type-level (no runtime impact).
//
// HistoryMessage / QueryHistory are reused by SuggestSaveModal-class.ts.
// RetrievalLabelData is the shape stored in `_lastRetrieval` (consumed by
// retrieval-label renderer).

import type { Component } from 'obsidian';
import type { getSectionLabels } from '../system-prompts';

export type { QueryHistory } from './SuggestSaveModal-class';

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  /**
   * v1.24.0: Retrieval metadata for this assistant message.
   * Set at generation time and persisted so the label survives
   * view re-open / rehydration. Optional — older persisted
   * history (from pre-v1.24.0) that lacks this field renders
   * without a label (no crash).
   */
  retrieval?: RetrievalLabelData;
}

export interface QueryViewHistory {
  messages: HistoryMessage[];
}

/** Shape of `_lastRetrieval`, written by buildWikiContext and read by addRetrievalLabel. */
export interface RetrievalLabelData {
  /** PPR cascade arm label, e.g. "PPR/lex-seeded-ppr" or "PPR+LLM". */
  arm: string;
  /** Number of pages selected. */
  count: number;
  /** Top-N page paths for inline detail list (max 5). */
  topPaths: string[];
}

/**
 * Subset of QueryView instance fields exposed for type-safe reads/writes
 * outside the class (e.g., by the invalidateGraph public method, or by
 * test code via the white-box `as unknown as InternalView` cast).
 * v1.24.0 Bug A: removed per-view `_graph`; graph now lives in WikiEngine.
 */
export interface QueryViewStateFields {
  isStreaming: boolean;
  aborted: boolean;
  accumulatedResponse: string;
  currentResponseDiv: HTMLElement | null;
  historyContainer: HTMLElement;
  inputArea: HTMLTextAreaElement;
  sendBtn: HTMLButtonElement;
  historyCountDisplay: HTMLElement;
  pendingInput: string;
  activeRenderComponent: Component | null;
  _sectionLabels: ReturnType<typeof getSectionLabels> | null;
  _lastRetrieval: RetrievalLabelData | null;
  _turnIndicator: HTMLElement | null;
  _turnObserver: IntersectionObserver | null;
  _lastClearTimestamp: number;
  _streamRafHandle: number | null;
}

/**
 * Context shape passed to pure-function renderers and pipeline helpers.
 * Decouples them from QueryView instance state — tests construct a fake
 * context directly, no ItemView/Leaf/Plugin stub required.
 */
export interface QueryRendererContext {
  app: import('obsidian').App;
  wikiFolder: string;
  language: string;
}
