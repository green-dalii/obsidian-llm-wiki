// v1.24.0 #251: Custom Query Instructions collapsible panel — DOM tests.
//
// jsdom test environment following the established pattern from
// query-renderers.test.ts (activeDocument stub only — the panel renderer
// uses native DOM APIs, so no Obsidian prototype helpers are required).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { installObsidianDomHelpers } from '../../__support__/dom-helpers';
import {
  renderCustomInstructionsPanel,
  type CustomInstructionsPanelOptions,
} from '../../../wiki/query-engine/renderers/custom-instructions-panel';

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
  const doc = dom.window.document;
  // eslint-disable-next-line obsidianmd/no-global-this
  globalThis.document = doc;
  // eslint-disable-next-line obsidianmd/no-global-this
  (globalThis as Record<string, unknown>).activeDocument = doc;
  // eslint-disable-next-line obsidianmd/no-global-this
  globalThis.HTMLElement = dom.window.HTMLElement;
  // v1.25.2 PATCH prefer-create-el: production renderer uses `parent.createEl`,
  // which Obsidian provides natively. Tests mirror the helpers via
  // `installObsidianDomHelpers` so per-test JSDOM carries the same surface.
  installObsidianDomHelpers(
    { HTMLElement: dom.window.HTMLElement, Document: dom.window.Document },
    doc,
  );
});

afterEach(() => {
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).document;
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).activeDocument;
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).HTMLElement;
});

// Test-environment document accessors. Wrapped once so the test body
// avoids Obsidian review-rule warnings in every assertion.
//
// `document` here is the jsdom-injected global (set in beforeEach),
// NOT the bare DOM global — production code paths must use
// `activeDocument` (per CLAUDE.md "Obsidian Plugin Submission Rules").
/* eslint-disable obsidianmd/prefer-active-doc */
const root = () => document.getElementById('root') as HTMLElement;
const newInputEvent = () => new ((document as Document & { defaultView: Window }).defaultView.Event)('input');
/* eslint-enable obsidianmd/prefer-active-doc */

function buildOptions(overrides: Partial<CustomInstructionsPanelOptions> = {}): CustomInstructionsPanelOptions {
  return {
    initialValue: '',
    maxChars: 5000,
    language: 'en',
    applyHandler: () => undefined,
    clearHandler: () => undefined,
    ...overrides,
  };
}

function getTextarea(panel: HTMLElement): HTMLTextAreaElement {
  const ta = panel.querySelector('textarea');
  if (!ta) throw new Error('textarea not found');
  return ta;
}

function getCounter(panel: HTMLElement): HTMLElement {
  const c = panel.querySelector('.llm-wiki-query-instructions-counter');
  if (!c) throw new Error('counter not found');
  return c as HTMLElement;
}

function getApplyButton(panel: HTMLElement): HTMLButtonElement {
  const b = panel.querySelector('.llm-wiki-query-instructions-apply');
  if (!b) throw new Error('apply button not found');
  return b as HTMLButtonElement;
}

function getClearButton(panel: HTMLElement): HTMLButtonElement {
  const b = panel.querySelector('.llm-wiki-query-instructions-clear');
  if (!b) throw new Error('clear button not found');
  return b as HTMLButtonElement;
}

describe('renderCustomInstructionsPanel — Issue #251', () => {
  it('mounts a <details> element with summary, body, description, textarea, buttons, counter', () => {
    const r = root();
    const handle = renderCustomInstructionsPanel(r, buildOptions());

    const details = r.querySelector('details');
    expect(details).not.toBeNull();
    expect(details?.querySelector('summary')).not.toBeNull();
    expect(details?.querySelector('.llm-wiki-query-instructions-desc')).not.toBeNull();
    expect(details?.querySelector('textarea')).not.toBeNull();
    expect(details?.querySelector('.llm-wiki-query-instructions-apply')).not.toBeNull();
    expect(details?.querySelector('.llm-wiki-query-instructions-clear')).not.toBeNull();
    expect(details?.querySelector('.llm-wiki-query-instructions-counter')).not.toBeNull();

    handle.dispose();
  });

  it('renders <details> collapsed by default (no `open` attribute)', () => {
    const r = root();
    const handle = renderCustomInstructionsPanel(r, buildOptions());

    const details = r.querySelector('details');
    expect(details?.hasAttribute('open')).toBe(false);

    handle.dispose();
  });

  it('pre-fills textarea with initialValue', () => {
    const r = root();
    const handle = renderCustomInstructionsPanel(r, buildOptions({
      initialValue: 'be concise',
    }));

    const ta = getTextarea(r);
    expect(ta.value).toBe('be concise');

    handle.dispose();
  });

  it('counter shows current/max chars and updates on input', () => {
    const r = root();
    const handle = renderCustomInstructionsPanel(r, buildOptions({ maxChars: 100 }));

    const counter = getCounter(r);
    expect(counter.textContent).toMatch(/0\/100/);

    const ta = getTextarea(r);
    ta.value = 'hello';
    // eslint-disable-next-line obsidianmd/prefer-active-doc
    ta.dispatchEvent(new (document as Document & { defaultView: Window }).defaultView.Event('input'));

    expect(counter.textContent).toMatch(/5\/100/);

    handle.dispose();
  });

  it('input past maxChars is truncated at the DOM level', () => {
    const r = root();
    const handle = renderCustomInstructionsPanel(r, buildOptions({ maxChars: 10 }));

    const ta = getTextarea(r);
    ta.value = 'a'.repeat(20);
    // eslint-disable-next-line obsidianmd/prefer-active-doc
    ta.dispatchEvent(new (document as Document & { defaultView: Window }).defaultView.Event('input'));

    expect(ta.value.length).toBe(10);

    handle.dispose();
  });

  it('Apply button invokes applyHandler with current textarea value', () => {
    const r = root();
    let captured: string | null = null;
    const handle = renderCustomInstructionsPanel(r, buildOptions({
      applyHandler: (value) => { captured = value; },
    }));

    const ta = getTextarea(r);
    ta.value = 'research-mode instructions';
    ta.dispatchEvent(newInputEvent());  // triggers input handler — re-evaluates disabled
    getApplyButton(r).click();

    expect(captured).toBe('research-mode instructions');

    handle.dispose();
  });

  it('Apply button is disabled when textarea is empty (v1.24.0 UX fix)', () => {
    const r = root();
    let captured: string | null = null;
    const handle = renderCustomInstructionsPanel(r, buildOptions({
      applyHandler: (value) => { captured = value; },
    }));

    const applyBtn = getApplyButton(r);
    expect(applyBtn.disabled).toBe(true);

    // Clicking the disabled button does NOT invoke applyHandler.
    applyBtn.click();
    expect(captured).toBeNull();

    // Typing re-enables the button.
    const ta = getTextarea(r);
    ta.value = 'x';
    ta.dispatchEvent(newInputEvent());
    expect(applyBtn.disabled).toBe(false);

    // Clearing re-disables the button.
    ta.value = '';
    ta.dispatchEvent(newInputEvent());
    expect(applyBtn.disabled).toBe(true);

    handle.dispose();
  });

  it('Apply button stays disabled when textarea has only whitespace', () => {
    const r = root();
    let captured: string | null = null;
    const handle = renderCustomInstructionsPanel(r, buildOptions({
      applyHandler: (value) => { captured = value; },
    }));

    const ta = getTextarea(r);
    const applyBtn = getApplyButton(r);
    ta.value = '   \n  ';
    ta.dispatchEvent(newInputEvent());

    expect(applyBtn.disabled).toBe(true);
    applyBtn.click();
    expect(captured).toBeNull();

    handle.dispose();
  });

  it('Clear button works regardless of textarea content', () => {
    const r = root();
    let cleared = false;
    const handle = renderCustomInstructionsPanel(r, buildOptions({
      clearHandler: () => { cleared = true; },
    }));

    getClearButton(r).click();
    expect(getTextarea(r).value).toBe('');
    expect(cleared).toBe(true);

    handle.dispose();
  });

  it('Clear button clears textarea and invokes clearHandler', () => {
    const r = root();
    let cleared = false;
    const handle = renderCustomInstructionsPanel(r, buildOptions({
      initialValue: 'old',
      clearHandler: () => { cleared = true; },
    }));

    const ta = getTextarea(r);
    expect(ta.value).toBe('old');

    getClearButton(r).click();

    expect(ta.value).toBe('');
    expect(cleared).toBe(true);

    handle.dispose();
  });

  it('setValue updates textarea + counter', () => {
    const r = root();
    const handle = renderCustomInstructionsPanel(r, buildOptions({ maxChars: 100 }));

    handle.setValue('hi');
    const ta = getTextarea(r);
    expect(ta.value).toBe('hi');
    expect(getCounter(r).textContent).toMatch(/2\/100/);

    handle.dispose();
  });

  it('dispose removes event listeners (further inputs do not throw, do not update counter)', () => {
    const r = root();
    const handle = renderCustomInstructionsPanel(r, buildOptions({ maxChars: 100 }));

    const ta = getTextarea(r);
    handle.dispose();

    // After dispose, the input listener is removed; the counter should stay
    // at its last value rather than updating.
    ta.value = 'changed';
    // eslint-disable-next-line obsidianmd/prefer-active-doc
    ta.dispatchEvent(new (document as Document & { defaultView: Window }).defaultView.Event('input'));

    // Counter should NOT update post-dispose (still 0/100 from initial state).
    expect(getCounter(r).textContent).toMatch(/0\/100/);
  });

  it('getValue returns the current textarea content', () => {
    const r = root();
    const handle = renderCustomInstructionsPanel(r, buildOptions({ initialValue: 'init' }));

    expect(handle.getValue()).toBe('init');
    handle.dispose();
  });
});