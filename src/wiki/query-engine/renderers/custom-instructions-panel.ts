// v1.24.0 #251: Custom Query Instructions — collapsible panel renderer.
//
// Renders a `<details>` block inside the Query Wiki input area with:
//   - `<summary>` (collapsed by default)
//   - User-facing description
//   - `<textarea>` with placeholder + char counter
//   - Apply + Clear buttons
//   - DOM-level truncation past `maxChars` (input layer defense)
//
// Persistence is owned by QueryView (it calls saveSettings after Apply/Clear).
// This module is DOM-only and event-handler-only — no IO, no state mutation
// beyond the textarea value and the internal counter.
//
// Uses native DOM APIs (createElement/appendChild/setAttribute) instead of
// Obsidian's `createEl`/`createDiv` prototype extensions — this keeps the
// renderer portable, easier to unit-test in jsdom, and identical to the
// pattern used by other renderers in this directory (see wiki-link-clicks.ts
// and history-message.ts).

import { TEXTS } from '../../../texts';
import type { LLMWikiSettings } from '../../../types';

export interface CustomInstructionsPanelOptions {
  initialValue: string;
  maxChars: number;
  language: LLMWikiSettings['language'];
  applyHandler: (value: string) => void | Promise<void>;
  clearHandler: () => void | Promise<void>;
}

export interface CustomInstructionsPanelHandle {
  /** Read current textarea value (post any truncation). */
  getValue(): string;
  /** Write a new value into the textarea + counter. Truncates to maxChars. */
  setValue(value: string): void;
  /** Clear the textarea (does NOT call the clearHandler). */
  clear(): void;
  /** Remove event listeners and clear internal refs. */
  dispose(): void;
}

/** Helper: create an HTMLElement with class + optional text/attrs, appended to parent. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  parent: HTMLElement,
  cls: string,
  opts: { text?: string; attrs?: Record<string, string> } = {},
): HTMLElementTagNameMap[K] {
  const node = parent.createEl(tag, {
    cls,
    ...(opts.attrs ? { attr: opts.attrs } : {}),
    ...(opts.text !== undefined ? { text: opts.text } : {}),
  });
  return node;
}

/**
 * Render the collapsible Custom Query Instructions panel into `parent`.
 * Returns a handle for programmatic value access + cleanup.
 */
export function renderCustomInstructionsPanel(
  parent: HTMLElement,
  options: CustomInstructionsPanelOptions,
): CustomInstructionsPanelHandle {
  const texts = TEXTS[options.language];

  const details = el('details', parent, 'llm-wiki-query-instructions-block');
  el('summary', details, '', { text: texts.customInstructionsTitle });

  const body = el('div', details, 'llm-wiki-query-instructions-body');
  el('div', body, 'llm-wiki-query-instructions-desc', { text: texts.customInstructionsDesc });

  const textarea = el('textarea', body, 'llm-wiki-query-instructions-textarea', {
    attrs: {
      rows: '6',
      placeholder: texts.customInstructionsPlaceholder,
    },
  });
  // initialValue is truncated defensively (callers should also cap, but
  // defense in depth: never expose a textarea pre-loaded past the cap).
  const initialCapped = options.initialValue.length > options.maxChars
    ? options.initialValue.slice(0, options.maxChars)
    : options.initialValue;
  textarea.value = initialCapped;

  const counter = el('div', body, 'llm-wiki-query-instructions-counter');
  const updateCounter = () => {
    counter.textContent = texts.customInstructionsCharCount
      .replace('{current}', String(textarea.value.length))
      .replace('{max}', String(options.maxChars));
  };
  updateCounter();

  const buttonRow = el('div', body, 'llm-wiki-query-instructions-button-row');
  const applyBtn = el('button', buttonRow, 'llm-wiki-query-instructions-apply mod-cta', {
    text: texts.customInstructionsApply,
  });
  // v1.24.0 #251 UX: Apply button is disabled when the textarea is empty
  // (after trim). This prevents a stale-state Notice when the user clicks
  // Apply on an empty box. Re-evaluated on every input event.
  const updateApplyDisabledState = () => {
    applyBtn.disabled = textarea.value.trim().length === 0;
  };
  updateApplyDisabledState();
  const clearBtn = el('button', buttonRow, 'llm-wiki-query-instructions-clear', {
    text: texts.customInstructionsClear,
  });

  let disposed = false;

  const inputHandler = () => {
    if (textarea.value.length > options.maxChars) {
      textarea.value = textarea.value.slice(0, options.maxChars);
    }
    updateCounter();
    updateApplyDisabledState();
  };
  const applyHandler = () => {
    if (disposed) return;
    // Defensive: ignore click if somehow still disabled (race with dispose
    // during click — input event may not have fired yet).
    if (textarea.value.trim().length === 0) return;
    void options.applyHandler(textarea.value);
  };
  const clearHandler = () => {
    if (disposed) return;
    textarea.value = '';
    updateCounter();
    updateApplyDisabledState();
    void options.clearHandler();
  };

  textarea.addEventListener('input', inputHandler);
  applyBtn.addEventListener('click', applyHandler);
  clearBtn.addEventListener('click', clearHandler);

  return {
    getValue: () => textarea.value,
    setValue: (value: string) => {
      if (disposed) return;
      textarea.value = value.length > options.maxChars ? value.slice(0, options.maxChars) : value;
      updateCounter();
    },
    clear: () => {
      if (disposed) return;
      textarea.value = '';
      updateCounter();
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      textarea.removeEventListener('input', inputHandler);
      applyBtn.removeEventListener('click', applyHandler);
      clearBtn.removeEventListener('click', clearHandler);
    },
  };
}