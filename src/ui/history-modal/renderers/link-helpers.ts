// v3.1 split: link helpers extracted from history-modal.ts
// (renderLineWithLinks was at lines 1543-1563, renderOpenInLogLink at 1520-1540).
//
// Both renderers take a {app, logPath} context so they can wire up click
// handlers that call `app.workspace.openLinkText(path, sourcePath)` without
// relying on `this`. This makes the renderers pure (no side effects on
// import, no hidden dependencies).
//
// The `[[path]]` and `[[path|alias]]` parser is preserved verbatim from the
// original (regex with #anchor support) to keep click-to-open behavior
// identical for users.

import type { App } from 'obsidian';
import type { HistoryTexts } from '../types';

/** Per-renderer context for click-handler wiring. */
export interface RendererContext {
  app: App;
  /** Log path used as the `sourcePath` argument for openLinkText (vault context). */
  logPath: string;
}

/** Options for `createWikiLink` — accepts either text=path or an explicit label. */
export interface WikiLinkOptions {
  /** Path to navigate to when the link is clicked. */
  path: string;
  /** Visible text. Defaults to `path` if not provided. */
  text?: string;
  /** Extra inline styles applied to the `<a>` element. */
  extraStyle?: string;
  /** Base style to start from (default: standard link color). */
  baseStyle?: string;
}

const DEFAULT_LINK_STYLE =
  'color: var(--text-accent); cursor: pointer; text-decoration: none;';

/**
 * Build a clickable wiki link `<a>` element with the standard Obsidian
 * click→openLinkText behavior. Used by every renderer that needs to
 * navigate to a wiki page from inside the History Modal.
 *
 * The click handler is wired on the element directly; the caller just
 * needs to `appendChild` (which `createEl` does automatically) and the
 * link is functional.
 */
export function createWikiLink(
  parent: HTMLElement,
  opts: WikiLinkOptions,
  ctx: RendererContext,
): HTMLAnchorElement {
  const text = opts.text ?? opts.path;
  const style = (opts.baseStyle ?? DEFAULT_LINK_STYLE) + (opts.extraStyle ? ` ${opts.extraStyle}` : '');
  const linkPath = opts.path;
  const link = parent.createEl('a', {
    text,
    href: '#',
    attr: { style: style },
  });
  link.addEventListener('click', (ev) => {
    ev.preventDefault();
    void ctx.app.workspace.openLinkText(linkPath, ctx.logPath);
  });
  return link;
}

/** Render a raw line with `[[path]]` and `[[path|alias]]` markers replaced by clickable spans. */
export function renderLineWithLinks(
  parent: HTMLElement,
  rawLine: string,
  ctx: RendererContext,
): void {
  let cursor = 0;
  const re = /\[\[([^\]|#]+?)(?:#\^?[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawLine)) !== null) {
    if (m.index > cursor) parent.appendText(rawLine.substring(cursor, m.index));
    const path = m[1].trim();
    const alias = m[2]?.trim() ?? path;
    createWikiLink(parent, { path, text: alias }, ctx);
    cursor = m.index + m[0].length;
  }
  if (cursor < rawLine.length) parent.appendText(rawLine.substring(cursor));
}

export function renderOpenInLogLink(
  body: HTMLElement,
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  const footer = body.createDiv({
    attr: {
      style:
        'margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--background-modifier-border); ' +
        'display: flex; justify-content: flex-end;',
    },
  });
  // sourcePath intentionally empty — matches the original behavior where
  // the modal's "Open in log.md" link opened the file with no originating
  // sourcePath context.
  createWikiLink(
    footer,
    {
      path: ctx.logPath,
      text: t.historyOpenInLog,
      extraStyle: 'font-size: 0.8em;',
    },
    { app: ctx.app, logPath: '' },
  );
}
