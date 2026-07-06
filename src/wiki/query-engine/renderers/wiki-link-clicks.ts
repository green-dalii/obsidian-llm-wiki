// PR #3 split: bindWikiLinkClicks extracted from query-engine.ts (831-844).
//
// Iterates `.internal-link` elements inside a container and attaches click
// listeners that route through Obsidian's workspace API. Pure with respect
// to QueryView — no `this`, no instance state.

import type { App } from 'obsidian';

/**
 * Bind click handlers on every `.internal-link` inside `container` so they
 * open via `app.workspace.openLinkText` regardless of where the container
 * is mounted in the DOM tree. Obsidian's global delegated handler on
 * document.body does not always see events from ItemView content.
 */
export function bindWikiLinkClicks(
  container: HTMLElement,
  app: App,
  sourcePath: string,
): void {
  container.querySelectorAll('.internal-link').forEach(link => {
    const el = link as HTMLAnchorElement;
    const href = el.getAttribute('data-href') || el.getAttribute('href');
    if (!href) return;
    el.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      void app.workspace.openLinkText(href, sourcePath);
    });
  });
}
