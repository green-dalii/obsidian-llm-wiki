// PR #3 split: InternalView type for white-box test access.
//
// Existing test src/__tests__/wiki/query-view-graph-invalidation.test.ts
// uses `as unknown as InternalView` to read/write `_graph` and `_lastRetrieval`
// directly. This type documents that contract and keeps the cast valid
// regardless of how QueryView's class shape evolves.

/**
 * Subset of private QueryView state read/written by white-box tests.
 * Field names MUST match the QueryView implementation — keeping the cast
 * `(view as unknown as InternalView)._graph` working is the whole point.
 */
export interface InternalView {
  _graph: unknown;
  _lastRetrieval: unknown;
}
