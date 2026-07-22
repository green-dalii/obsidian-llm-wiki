// GitHub-Issue-Labels-style chip input for the Wiki Tag Vocabulary.
//
// Renders tags as discrete chips inside a flex container. Add via Enter /
// `,` / `;`, remove via × click or Backspace on empty input. Backed by a
// canonical CSV string so the existing settings storage and downstream
// call sites (page-factory, lint-fixes) need no changes.
//
// Note on Obsidian's `BaseComponent`: it is an `abstract class` (since
// 1.11.0) with `disabled`/`then`/`setDisabled` but no public `controlEl`
// property — `controlEl` is a `Setting`-level concept. To satisfy the
// `addComponent<T extends BaseComponent>` signature we declare a local
// `BaseComponent` interface in scope (kept compatible with the real one
// for the runtime fields we use). The settings.ts caller wraps us in
// `BaseComponent`-shaped cast at the boundary.

export interface BaseComponent {
  controlEl: HTMLElement;
  disabled: boolean;
  then(cb: (component: this) => unknown): this;
  setDisabled(disabled: boolean): this;
  onload?(): void;
  onunload?(): void;
}

export interface TagChipInputOptions {
  /** Parent element to mount into (passed by `Setting.addComponent`). */
  controlEl: HTMLElement;
  /** Initial tags as a CSV string. */
  initialTags: string;
  /** Placeholder text shown when the input is empty. */
  placeholder?: string;
  /** aria-label for the container (a11y). */
  ariaLabel: string;
  /** Text used in the aria-live region when a duplicate is rejected. */
  duplicateHint?: string;
  /**
   * Default reference tags (e.g. the built-in `person`/`organization`/…).
   * Rendered as **non-removable preview chips** when the user has not
   * yet added any custom tags — they are a visual baseline the user
   * can copy from, not a working set. Clicking a preview chip
   * promotes it to a real chip.
   */
  defaultTags?: string[];
  /** Fires after every add/remove with the new canonical CSV. */
  onChange: (csv: string) => void;
}

const DUPLICATE_FLASH_MS = 800;

function createChild<K extends keyof HTMLElementTagNameMap>(
  parent: HTMLElement,
  tag: K,
  opts: { cls?: string; text?: string; attr?: Record<string, string> } = {}
): HTMLElementTagNameMap[K] {
  const el = parent.createEl(tag, opts);
  // Obsidian createEl applies cls/text/attr automatically; the caller still
  // expects to receive the appended element (matches renderers.test.ts
  // expectation that createEl appends + returns).
  return el;
}

export class TagChipInputComponent implements BaseComponent {
  controlEl: HTMLElement;
  disabled = false;
  private tags: string[] = [];
  private opts: TagChipInputOptions;
  private inputEl!: HTMLInputElement;
  private liveRegionEl!: HTMLElement;
  /** Tracks whether the user has ever edited (used to suppress the
   *  initial-load onChange from firing when fallback defaults are
   *  materialized into real chips). */
  private userEdited = false;

  constructor(opts: TagChipInputOptions) {
    this.opts = opts;
    this.controlEl = opts.controlEl;
    this.controlEl.replaceChildren();
    this.controlEl.classList.add('llm-wiki-tag-container');
    this.controlEl.setAttribute('role', 'group');
    this.controlEl.setAttribute('aria-label', opts.ariaLabel);

    this.inputEl = createChild(this.controlEl, 'input', {
      cls: 'llm-wiki-tag-input',
      attr: { type: 'text', 'aria-label': opts.ariaLabel },
    });
    if (opts.placeholder) this.inputEl.placeholder = opts.placeholder;

    this.liveRegionEl = createChild(this.controlEl, 'div', {
      cls: 'llm-wiki-tag-sr-live',
      attr: { 'aria-live': 'polite', 'aria-atomic': 'true' },
    });

    this.inputEl.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.setValue(opts.initialTags || '');
  }

  // Make TS happy with the `then` chain pattern in the BaseComponent
  // interface; the real one just returns `this`.
  then(_cb: (component: this) => unknown): this { return this; }
  setDisabled(disabled: boolean): this { this.disabled = disabled; return this; }

  getValue(): string {
    return this.tags.join(', ');
  }

  getTags(): string[] {
    return [...this.tags];
  }

  setValue(csv: string): void {
    // If the persisted CSV is empty (user has not customized the
    // vocabulary), fall back to the default tags — they are a
    // fully editable baseline the user can delete from or extend.
    // No "preview" / "readonly" distinction: defaults look and behave
    // exactly like user-added chips.
    const seen = new Set<string>();
    const next: string[] = [];
    const source = csv ? csv.split(',') : (this.opts.defaultTags ?? []);
    for (const raw of source) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(trimmed);
    }
    this.tags = next;
    this.userEdited = !!csv; // mark as edited only when an explicit CSV was loaded
    this.renderChips();
  }

  addTag(tag: string): boolean {
    const trimmed = tag.trim();
    if (!trimmed) return false;
    const key = trimmed.toLowerCase();
    if (this.tags.some(t => t.toLowerCase() === key)) {
      this.flashDuplicate(trimmed);
      return false;
    }
    this.tags.push(trimmed);
    this.appendChip(trimmed);
    this.emitChange();
    return true;
  }

  removeTag(tag: string): boolean {
    const idx = this.tags.findIndex(t => t.toLowerCase() === tag.toLowerCase());
    if (idx === -1) return false;
    this.tags.splice(idx, 1);
    const chips = this.controlEl.querySelectorAll('.llm-wiki-tag-chip');
    chips[idx]?.remove();
    this.emitChange();
    return true;
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.isComposing) return;
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      const value = this.inputEl.value;
      if (!value.trim()) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      this.addTag(value);
      this.inputEl.value = '';
      return;
    }
    if (e.key === 'Backspace' && this.inputEl.value === '' && this.tags.length > 0) {
      e.preventDefault();
      const last = this.tags[this.tags.length - 1];
      this.removeTag(last);
      return;
    }
    if (e.key === 'Escape') {
      this.inputEl.blur();
    }
  }

  private renderChips(): void {
    // Remove existing chips but keep input + live region.
    const existing = Array.from(this.controlEl.querySelectorAll('.llm-wiki-tag-chip'));
    for (const el of existing) el.remove();
    for (const tag of this.tags) this.appendChip(tag);
  }

  private appendChip(tag: string): void {
    const chip = createChild(this.controlEl, 'div', {
      cls: 'llm-wiki-tag-chip',
      attr: { 'data-tag': tag },
    });
    createChild(chip, 'span', { cls: 'llm-wiki-tag-chip-label', text: tag });
    const remove = createChild(chip, 'button', {
      cls: 'llm-wiki-tag-chip-remove',
      attr: { 'aria-label': `Remove ${tag}`, type: 'button' },
      text: '×',
    });
    remove.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeTag(tag);
    });
    // Insert before the input so visual order is: chips → input.
    this.controlEl.insertBefore(chip, this.inputEl);
  }

  private flashDuplicate(tag: string): void {
    this.controlEl.classList.add('llm-wiki-tag-container--duplicate');
    this.liveRegionEl.textContent = `${this.opts.duplicateHint ?? 'Duplicate'} (${tag})`;
    window.setTimeout(() => {
      this.controlEl.classList.remove('llm-wiki-tag-container--duplicate');
    }, DUPLICATE_FLASH_MS);
  }

  private emitChange(): void {
    this.opts.onChange(this.getValue());
  }
}
