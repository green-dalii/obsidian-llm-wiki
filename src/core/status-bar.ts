/**
 * Status bar text composition for ingestion progress.
 *
 * Pure functions — zero IO. Composes the existing localized status-bar label
 * (e.g. "提取中... 点击取消") with the current document name and, during a
 * folder batch run, the [current/total] counter.
 *
 * Examples (label = "提取中... 点击取消"):
 *   single:  "My Note · 提取中... 点击取消"
 *   batch:   "[4/10] My Note · 提取中... 点击取消"
 *   no info: "提取中... 点击取消"  (backward-compatible fallback)
 */

export interface BatchProgress {
  current: number;
  total: number;
}

export function buildIngestStatusBarText(
  label: string,
  filename?: string,
  batch?: BatchProgress | null
): string {
  const name = filename?.trim() || '';
  const prefix = batch ? `[${batch.current}/${batch.total}] ` : '';
  const body = name ? `${name} · ${label}` : label;
  return `${prefix}${body}`;
}
