// v1.23.2 graph-cache invalidation (called out by three-model review C).
// v1.24.0 Bug A: graph cache moved from per-view QueryView to WikiEngine.
//
// Background: src/wiki/query-engine.ts `_graph: ... | null` is built
// lazily on first sendMessage, then held for the lifetime of the
// QueryView. If the user ingests new wiki content in the same Obsidian
// session (a common workflow: ingest → realize a Query needs the new
// material → ask), the QueryView continues to walk the pre-ingest
// graph. Confirmed by reading the source: zero invalidateGraph call
// sites, zero _graph = null assignments.
//
// Fix: add QueryView.invalidateGraph() and wire main.ts
// onIngestDoneDispatch to call it across all leaves of VIEW_TYPE_QUERY.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { QueryView } from '../../wiki/query-engine';
import type LLMWikiPlugin from '../../main';

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  // eslint-disable-next-line obsidianmd/no-global-this
  globalThis.document = dom.window.document;
  // eslint-disable-next-line obsidianmd/no-global-this
  (globalThis as Record<string, unknown>).activeDocument = dom.window.document;
  // eslint-disable-next-line obsidianmd/no-global-this
  globalThis.HTMLElement = dom.window.HTMLElement;
});

afterEach(() => {
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).document;
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).activeDocument;
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).HTMLElement;
});

/**
 * Build a QueryView with a fake plugin that satisfies the QueryView
 * constructor's surface (we only exercise invalidateGraph, so the
 * constructor-time audit logging is tolerated).
 */
function makeQueryViewStub(): QueryView {
  const fakeWikiEngine = {
    invalidateGraph: () => { /* no-op */ },
  };
  const fakePlugin = {
    settings: {
      queryHistory: [],
      wikiFolder: 'wiki',
      language: 'en',
    },
    wikiEngine: fakeWikiEngine,
  } as unknown as LLMWikiPlugin;
  // ItemView constructor requires a WorkspaceLeaf; we pass a stub.
  const fakeLeaf = {} as ConstructorParameters<typeof QueryView>[0];
  const view = new QueryView(fakeLeaf, fakePlugin);
  return view;
}

interface InternalView {
  _lastRetrieval: unknown;
}

describe('QueryView — invalidateGraph (#review-C P0)', () => {
  it('exposes a public invalidateGraph() method', () => {
    const view = makeQueryViewStub();
    expect(typeof view.invalidateGraph).toBe('function');
  });

  it('delegates graph invalidation to WikiEngine.invalidateGraph()', () => {
    const view = makeQueryViewStub();
    let engineInvalidated = false;
    const plugin = (view as unknown as { plugin: LLMWikiPlugin }).plugin;
    const engine = plugin.wikiEngine as { invalidateGraph: () => void };
    const original = engine.invalidateGraph;
    engine.invalidateGraph = () => { engineInvalidated = true; };

    view.invalidateGraph();

    expect(engineInvalidated).toBe(true);
    engine.invalidateGraph = original;
  });

  it('also clears _lastRetrieval so the next query starts fresh', () => {
    const view = makeQueryViewStub();
    (view as unknown as InternalView)._lastRetrieval = {
      arm: 'lex-seeded-ppr',
      count: 3,
      topPaths: ['wiki/entities/foo'],
    };

    view.invalidateGraph();

    expect((view as unknown as InternalView)._lastRetrieval).toBeNull();
  });

  it('is idempotent — calling twice does not throw', () => {
    const view = makeQueryViewStub();

    expect(() => view.invalidateGraph()).not.toThrow();
    expect(() => view.invalidateGraph()).not.toThrow();
  });
});
