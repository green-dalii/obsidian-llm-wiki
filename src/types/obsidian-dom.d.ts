// SPDX-License-Identifier: Apache-2.0
//
// v1.25.2 PATCH: Obsidian DOM augmentation
//
// Problem (documented in `eslint-plugin-obsidianmd` 0.4.1 upgrade roadmap):
//   Obsidian's `eslint-plugin-obsidianmd/prefer-create-el` rule (0.4.1) is
//   stricter than 0.3.0. The rule is satisfied by calls like
//   `doc.win.createEl(tag)` / `parent.ownerDocument.createDiv()`. Obsidian
//   extends `HTMLElement.prototype` with `createEl`/`createDiv`/`createSpan`,
//   but in Obsidian's strict runtime these helpers ALSO exist on
//   `Document.prototype` (via the embedded DOM helpers). Production code
//   therefore can — and routinely does — call `ownerDocument.createEl(...)`
//   on a `Document` instance.
//
// Resolution: declare-merge `interface Document` here with the three helpers.
// The runtime is already supplied by `setup.ts` (jsdom polyfill for tests)
// and Obsidian itself (in production). This file adds the TS surface so
// our compile passes and the lint rule's autofix suggestion no longer
// produces a type error.
//
// Notes:
//   - We do NOT extend `interface Window` — Obsidian's actual API does
//     not put these helpers there. The 0.4.1 lint "suggestion" of
//     `doc.win.createEl` is misleading; the correct sink is `Document`.
//   - We do NOT extend `interface Node` again — `obsidian.d.ts` already
//     does that (line 187-189). Declaring here would just shadow.

import 'obsidian';

interface ObsidianDomElementInfo {
  cls?: string;
  text?: string;
  attr?: Record<string, string>;
  type?: string;
  placeholder?: string;
  href?: string;
  value?: string;
  title?: string;
  parent?: Node;
  prepend?: boolean;
}

declare global {
  interface Document {
    /**
     * Create an element (with class/text/attr) and append it as a child of
     * the document. Obsidian provides this on `document` (not just on
     * `HTMLElement` nodes) so list rendering can build top-level elements
     * before attaching them.
     */
    createEl<K extends keyof HTMLElementTagNameMap>(
      tag: K,
      o?: ObsidianDomElementInfo | string,
      callback?: (el: HTMLElementTagNameMap[K]) => void,
    ): HTMLElementTagNameMap[K];
    createDiv(o?: ObsidianDomElementInfo | string, callback?: (el: HTMLDivElement) => void): HTMLDivElement;
    createSpan(o?: ObsidianDomElementInfo | string, callback?: (el: HTMLSpanElement) => void): HTMLSpanElement;
  }

  /**
   * Mirrors the chainable setters commonly used by Obsidian renderers.
   * `setText` returns `this` so production code can do
   * `el.createDiv().setText('hi').addClass('foo')`.
   */
  interface HTMLElement {
    setText(text: string): this;
    addClass(cls: string): this;
  }
}
