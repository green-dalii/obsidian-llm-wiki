// SPDX-License-Identifier: Apache-2.0
//
// Test-only DOM helpers — installObsidianDomHelpers
//
// Mirrors the Obsidian plugin runtime's HTMLElement.prototype /
// Document.prototype extensions onto the given jsdom Window. Production
// code uses `parent.createEl(tag, opts)` / `document.createDiv()` etc.
// freely; without these helpers installed on a fresh jsdom instance,
// tests would see `TypeError: parent.createEl is not a function`.
//
// Background:
//   - Obsidian 0.4.1 bot's `prefer-create-el` rule expects production code
//     to use `parent.createEl(...)` instead of `document.createElement(...)`.
//   - `src/types/obsidian-dom.d.ts` declares the matching surface on
//     `Document` and `HTMLElement` (via declare-merge) so TypeScript
//     accepts the calls.
//   - The same helpers are installed once globally by `setup.ts` for tests
//     that opt into jsdom via `@vitest-environment jsdom`. Tests that
//     build their own per-test JSDOM (e.g. wiki/query-thinking-ui.test.ts,
//     ui/history-modal/renderers.test.ts, wiki/turn-indicator.test.ts)
//     must call this helper explicitly against their JSDOM's window +
//     document so the per-instance prototype carries the helpers.
//
// API:
//   installObsidianDomHelpers(window, document)
//     Installs `createEl` / `createDiv` / `createSpan` / `setText` /
//     `addClass` on the window's `HTMLElement.prototype` and
//     `Document.prototype`. Idempotent: re-invoking is a no-op (safe
//     to call from `beforeEach`).

interface ObsidianCreateOptions {
  cls?: string;
  text?: string;
  type?: string;
  placeholder?: string;
  href?: string;
  value?: string;
  attr?: Record<string, string>;
}

/**
 * Mirror Obsidian's `HTMLElement.prototype` and `Document.prototype`
 * extensions onto a per-test jsdom window/document. Idempotent.
 *
 * @param win  jsdom window-like object (provides `HTMLElement` and `Document`)
 * @param doc  document belonging to the same window (used for `createElement`)
 */
export function installObsidianDomHelpers(
  win: { HTMLElement: { prototype: HTMLElement }; Document: { prototype: Document } },
  doc: Document,
): void {
  const elProto = win.HTMLElement.prototype;
  if (elProto.createDiv !== undefined) return; // idempotent — already installed

  function applyOpts(el: HTMLElement, o: ObsidianCreateOptions | string | undefined): void {
    if (typeof o === 'string') {
      el.className = o;
      return;
    }
    if (!o) return;
    if (o.cls !== undefined) el.className = o.cls;
    if (o.text !== undefined) el.textContent = o.text;
    // Per-attribute shortcuts (mirror Obsidian's DOMElementInfo signature).
    // Falling back to attr-style any of the unknown keys so callers can
    // round-trip any HTML attribute via `attr: { foo: 'bar' }`.
    if (o.type !== undefined) el.setAttribute('type', o.type);
    if (o.placeholder !== undefined) el.setAttribute('placeholder', o.placeholder);
    if (o.href !== undefined) el.setAttribute('href', o.href);
    if (o.value !== undefined) el.setAttribute('value', o.value);
    if (o.attr) {
      for (const [k, v] of Object.entries(o.attr)) el.setAttribute(k, v);
    }
  }

  elProto.createEl = function createEl<K extends keyof HTMLElementTagNameMap>(
    this: HTMLElement,
    tag: K,
    o?: ObsidianCreateOptions | string,
    cb?: (el: HTMLElementTagNameMap[K]) => void,
  ): HTMLElementTagNameMap[K] {
    const el = doc.createElement(tag);
    applyOpts(el, o);
    this.appendChild(el);
    cb?.(el);
    return el as unknown as HTMLElementTagNameMap[K];
  };

  elProto.createDiv = function createDiv(
    this: HTMLElement,
    o?: ObsidianCreateOptions | string,
    cb?: (el: HTMLDivElement) => void,
  ): HTMLDivElement {
    return this.createEl('div', o, cb);
  };

  elProto.createSpan = function createSpan(
    this: HTMLElement,
    o?: ObsidianCreateOptions | string,
    cb?: (el: HTMLSpanElement) => void,
  ): HTMLSpanElement {
    return this.createEl('span', o, cb);
  };

  // Obsidian also provides chainable setters commonly used by renderers:
  //   label.setText('...')
  //   wrap.addClass('foo')
  // These return `this` so the production code can chain. Mirror them so
  // the same renderer code works in tests without modification.
  elProto.setText = function setText(this: HTMLElement, text: string): HTMLElement {
    this.textContent = text;
    return this;
  };
  elProto.addClass = function addClass(this: HTMLElement, cls: string): HTMLElement {
    this.classList.add(cls);
    return this;
  };

  const docProto = win.Document.prototype;

  docProto.createEl = function createElOnDoc<K extends keyof HTMLElementTagNameMap>(
    this: Document,
    tag: K,
    o?: ObsidianCreateOptions | string,
    cb?: (el: HTMLElementTagNameMap[K]) => void,
  ): HTMLElementTagNameMap[K] {
    const el = this.createElement(tag);
    applyOpts(el, o);
    cb?.(el);
    return el;
  };

  docProto.createDiv = function createDivOnDoc(
    this: Document,
    o?: ObsidianCreateOptions | string,
    cb?: (el: HTMLDivElement) => void,
  ): HTMLDivElement {
    return this.createEl('div', o, cb);
  };

  docProto.createSpan = function createSpanOnDoc(
    this: Document,
    o?: ObsidianCreateOptions | string,
    cb?: (el: HTMLSpanElement) => void,
  ): HTMLSpanElement {
    return this.createEl('span', o, cb);
  };
}
