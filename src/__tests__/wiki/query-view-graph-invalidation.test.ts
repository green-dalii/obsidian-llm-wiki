// v1.23.2 graph-cache invalidation (called out by three-model review C).
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
  const fakePlugin = {
    settings: {
      queryHistory: [],
      wikiFolder: 'wiki',
      language: 'en',
    },
  } as unknown as LLMWikiPlugin;
  // ItemView constructor requires a WorkspaceLeaf; we pass a stub.
  const fakeLeaf = {} as ConstructorParameters<typeof QueryView>[0];
  const view = new QueryView(fakeLeaf, fakePlugin);
  return view;
}

interface InternalView {
  _graph: unknown;
  _lastRetrieval: unknown;
}

describe('QueryView — invalidateGraph (#review-C P0)', () => {
  it('exposes a public invalidateGraph() method', () => {
    const view = makeQueryViewStub();
    expect(typeof view.invalidateGraph).toBe('function');
  });

  it('clears the cached _graph so the next sendMessage rebuilds', () => {
    const view = makeQueryViewStub();
    // Reach into the private field (white-box) to simulate prior state.
    (view as unknown as InternalView)._graph = { nodes: [], edges: { size: 0 } };

    view.invalidateGraph();

    expect((view as unknown as InternalView)._graph).toBeNull();
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

  it('is idempotent — calling twice is a no-op after first call', () => {
    const view = makeQueryViewStub();
    (view as unknown as InternalView)._graph = { stale: true };

    view.invalidateGraph();
    const firstCall = (view as unknown as InternalView)._graph;
    expect(firstCall).toBeNull();

    // Second call must not throw (null is a fine initial state already).
    expect(() => view.invalidateGraph()).not.toThrow();
    expect((view as unknown as InternalView)._graph).toBeNull();
  });
});
