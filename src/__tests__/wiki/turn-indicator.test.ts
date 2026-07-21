// v1.23.2: vertical turn indicator (Variant 2 only).
//
// ChatGPT/Grok-style right-edge dots. Each dot maps to a conversation
// turn (user + assistant pair). IntersectionObserver highlights the
// dot whose turn is currently visible. Clicking a dot scrolls that
// turn to the top of the history container.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { installObsidianDomHelpers } from '../__support__/dom-helpers';

// We can't easily import QueryView without a lot of scaffolding, so we
// test the helper logic directly and verify DOM mutations through a
// small harness that mirrors the implementation.
import {
  buildTurnIndicator,
  findTurnElements,
  scrollTurnToStart,
  updateActiveDot,
} from '../../wiki/turn-indicator';

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  // eslint-disable-next-line obsidianmd/no-global-this
  globalThis.document = dom.window.document;
  // eslint-disable-next-line obsidianmd/no-global-this
  (globalThis as Record<string, unknown>).activeDocument = dom.window.document;
  installObsidianDomHelpers(
    { HTMLElement: dom.window.HTMLElement, Document: dom.window.Document },
    dom.window.document,
  );
});

afterEach(() => {
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).document;
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).activeDocument;
});

function makeHistoryContainer(): HTMLElement {
  // eslint-disable-next-line obsidianmd/no-global-this
  const doc = globalThis.document;
  const container = doc.createElement('div');
  container.className = 'llm-wiki-query-history';
  // Three turns
  for (let i = 0; i < 3; i++) {
    const user = doc.createElement('div');
    user.className = 'llm-wiki-query-message-wrapper llm-wiki-query-message-user';
    user.dataset.turn = String(i);
    container.appendChild(user);

    const assistant = doc.createElement('div');
    assistant.className = 'llm-wiki-query-message-wrapper llm-wiki-query-message-assistant';
    assistant.dataset.turn = String(i);
    container.appendChild(assistant);
  }
  return container;
}

describe('turn-indicator helpers', () => {
  it('finds all unique turns in order', () => {
    const container = makeHistoryContainer();
    const turns = findTurnElements(container);
    expect(turns.length).toBe(3);
    expect(turns[0].dataset.turn).toBe('0');
    expect(turns[2].dataset.turn).toBe('2');
  });

  it('builds an indicator with one dot per turn', () => {
    const container = makeHistoryContainer();
    const indicator = buildTurnIndicator(container, 0, ['q1', 'q2', 'q3'], () => {});
    const dots = indicator.querySelectorAll('.llm-wiki-turn-dot');
    expect(dots.length).toBe(3);
    expect(indicator.classList.contains('llm-wiki-turn-indicator')).toBe(true);
  });

  it('creates tooltip elements with question text on hover', () => {
    const container = makeHistoryContainer();
    const indicator = buildTurnIndicator(container, 0, ['first question', 'second question', 'third'], () => {});
    const tooltips = indicator.querySelectorAll('.llm-wiki-turn-dot-tooltip');
    expect(tooltips.length).toBe(3);
    expect(tooltips[0].textContent).toBe('first question');
    expect(tooltips[1].textContent).toBe('second question');
    expect(tooltips[2].textContent).toBe('third');
  });

  it('wraps each dot in a .llm-wiki-turn-dot-wrapper', () => {
    const container = makeHistoryContainer();
    const indicator = buildTurnIndicator(container, 0, ['a', 'b', 'c'], () => {});
    const wrappers = indicator.querySelectorAll('.llm-wiki-turn-dot-wrapper');
    expect(wrappers.length).toBe(3);
    // Each wrapper contains a dot and a tooltip
    wrappers.forEach(w => {
      expect(w.querySelector('.llm-wiki-turn-dot')).toBeTruthy();
    });
  });

  it('always creates tooltip element with label or fallback', () => {
    const container = makeHistoryContainer();
    const indicator = buildTurnIndicator(container, 0, ['question', '', 'three'], () => {});
    const tooltips = indicator.querySelectorAll('.llm-wiki-turn-dot-tooltip');
    expect(tooltips.length).toBe(3);
    expect(tooltips[0].textContent).toBe('question');
    // Empty label falls back to "Turn N"
    expect(tooltips[1].textContent).toMatch(/Turn \d+/);
    expect(tooltips[2].textContent).toBe('three');
  });

  it('updates the active dot class based on visible turn', () => {
    const container = makeHistoryContainer();
    const indicator = buildTurnIndicator(container, 0, ['q1', 'q2', 'q3'], () => {});
    const dots = indicator.querySelectorAll('.llm-wiki-turn-dot');

    updateActiveDot(indicator, 1);
    expect(dots[1].classList.contains('llm-wiki-turn-dot-active')).toBe(true);
    expect(dots[0].classList.contains('llm-wiki-turn-dot-active')).toBe(false);

    updateActiveDot(indicator, 2);
    expect(dots[2].classList.contains('llm-wiki-turn-dot-active')).toBe(true);
    expect(dots[1].classList.contains('llm-wiki-turn-dot-active')).toBe(false);
  });

  it('scrolls the selected turn to start via scrollIntoView mock', () => {
    const container = makeHistoryContainer();
    const turns = findTurnElements(container);
    const called: { turn: string; options: ScrollIntoViewOptions }[] = [];

    scrollTurnToStart(turns[1], (opts: ScrollIntoViewOptions) => {
      called.push({ turn: turns[1].dataset.turn ?? '', options: opts });
    });

    expect(called.length).toBe(1);
    expect(called[0].turn).toBe('1');
    expect(called[0].options.block).toBe('start');
    expect(called[0].options.behavior).toBe('smooth');
  });
});
