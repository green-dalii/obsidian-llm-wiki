/**
 * ChatGPT/Grok-style vertical turn indicator.
 *
 * Variant 2 only (per v1.23.2 scope): right-edge dots, one per turn,
 * with IntersectionObserver-driven active highlighting. Clicking a dot
 * scrolls the corresponding turn into view at the top of the history
 * container.
 *
 * No sticky "turn N/M" header (Variant 1 rejected).
 * No turn-preview tooltip (Variant 3 rejected).
 */

const INDICATOR_CLASS = 'llm-wiki-turn-indicator';
const DOT_CLASS = 'llm-wiki-turn-dot';
const ACTIVE_CLASS = 'llm-wiki-turn-dot-active';
const TURN_ATTR = 'data-turn';

/** Find one representative element per turn, in document order. */
export function findTurnElements(historyContainer: HTMLElement): HTMLElement[] {
  const seen = new Set<string>();
  const reps: HTMLElement[] = [];
  const wrappers = historyContainer.querySelectorAll('.llm-wiki-query-message-wrapper');
  wrappers.forEach((el) => {
    const turn = el.getAttribute(TURN_ATTR);
    if (!turn || seen.has(turn)) return;
    seen.add(turn);
    reps.push(el as HTMLElement);
  });
  return reps;
}

/** Rebuild the indicator to match the current number of turns. */
export function buildTurnIndicator(
  historyContainer: HTMLElement,
  activeTurn: number,
  turnLabels: string[],
  onDotClick: (turn: number) => void,
): HTMLElement {
  const existing = historyContainer.querySelector(`.${INDICATOR_CLASS}`);
  if (existing) existing.remove();

  // v1.25.2 PATCH prefer-create-el: production code uses the Obsidian-style
  // `historyContainer.createDiv()` helpers (declared in
  // `src/types/obsidian-dom.d.ts`). Tests install the same helpers via
  // `installObsidianDomHelpers`; Obsidian production runtime provides
  // them natively.
  const indicator = historyContainer.createDiv();
  indicator.className = INDICATOR_CLASS;

  const turns = findTurnElements(historyContainer);
  turns.forEach((_, idx) => {
    const wrapper = historyContainer.createDiv();
    wrapper.className = 'llm-wiki-turn-dot-wrapper';

    const dot = historyContainer.createDiv();
    dot.className = DOT_CLASS;
    if (idx === activeTurn) {
      dot.classList.add(ACTIVE_CLASS);
    }
    dot.addEventListener('click', () => onDotClick(idx));
    wrapper.appendChild(dot);

    const label = turnLabels[idx]?.trim();
    const tip = historyContainer.createDiv();
    tip.className = 'llm-wiki-turn-dot-tooltip';
    tip.textContent = label || `Turn ${idx + 1}`;
    wrapper.appendChild(tip);

    indicator.appendChild(wrapper);
  });

  historyContainer.appendChild(indicator);
  return indicator;
}

/** Move the active class to the dot for `turnIdx`. */
export function updateActiveDot(indicator: HTMLElement, turnIdx: number): void {
  const dots = indicator.querySelectorAll(`.${DOT_CLASS}`);
  dots.forEach((dot, idx) => {
    if (idx === turnIdx) {
      dot.classList.add(ACTIVE_CLASS);
    } else {
      dot.classList.remove(ACTIVE_CLASS);
    }
  });
}

/** Scroll a turn element to the top of its scroll container. */
export function scrollTurnToStart(
  turnElement: HTMLElement,
  scrollFn?: (options: ScrollIntoViewOptions) => void,
): void {
  const options: ScrollIntoViewOptions = { block: 'start', behavior: 'smooth' };
  if (scrollFn) {
    scrollFn(options);
    return;
  }
  turnElement.scrollIntoView(options);
}

/** Create an IntersectionObserver that updates the active dot. */
export function observeVisibleTurn(
  historyContainer: HTMLElement,
  indicator: HTMLElement,
): IntersectionObserver {
  const turns = findTurnElements(historyContainer);

  const observer = new IntersectionObserver(
    (entries) => {
      // Pick the entry with the largest intersection ratio.
      let best: IntersectionObserverEntry | null = null;
      for (const entry of entries) {
        if (!best || entry.intersectionRatio > best.intersectionRatio) {
          best = entry;
        }
      }
      if (!best) return;

      const turn = best.target.getAttribute(TURN_ATTR);
      if (!turn) return;
      const idx = turns.findIndex((t) => t.getAttribute(TURN_ATTR) === turn);
      if (idx >= 0) {
        updateActiveDot(indicator, idx);
      }
    },
    {
      root: historyContainer,
      threshold: [0, 0.25, 0.5, 0.75, 1],
    },
  );

  turns.forEach((t) => observer.observe(t));
  return observer;
}
