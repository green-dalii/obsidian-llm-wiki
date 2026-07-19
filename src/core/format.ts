/**
 * Format a byte count as a short human-readable string (e.g. "1.2MB", "456KB",
 * "789B"). Pure function — used by log-writer (ingest log metrics) and the
 * history-modal (ingest metric cards).
 *
 * Centralized here in v1.25.1 Phase C-PR1 cleanup after code-review flagged
 * a byte-identical duplicate in src/ui/history-modal/render-state.ts.
 */
export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${n}B`;
}
