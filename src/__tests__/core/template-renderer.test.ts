/** Template placeholder renderer: replaces `{{name}}` tokens with values from a vars map. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderTemplate } from '../../core/template-renderer';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renderTemplate', () => {
  it('replaces a single occurrence', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'world' })).toBe('Hello world');
  });

  it('replaces ALL occurrences of the same placeholder', () => {
    expect(
      renderTemplate('{{x}} + {{x}} + {{x}} = 3{{x}}', { x: 'a' })
    ).toBe('a + a + a = 3a');
  });

  it('replaces multiple distinct placeholders', () => {
    expect(
      renderTemplate('{{greeting}} {{name}}, today is {{date}}.', {
        greeting: 'Hello',
        name: 'Bob',
        date: '2026-07-27',
      })
    ).toBe('Hello Bob, today is 2026-07-27.');
  });

  it('returns the original string when no placeholders are present', () => {
    expect(renderTemplate('plain text', { foo: 'bar' })).toBe('plain text');
  });

  it('warns on unknown placeholder and leaves it untouched', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = renderTemplate('Hello {{name}}, your {{unknown}} is ready.', { name: 'Alice' });
    expect(result).toBe('Hello Alice, your {{unknown}} is ready.');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('{{unknown}}'));
  });

  it('does not warn when all placeholders are known', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderTemplate('Hello {{name}}', { name: 'Alice' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once per unknown placeholder across many occurrences', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderTemplate('{{a}} {{a}} {{b}} {{b}}', {});
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it('leaves placeholders with non-word chars (dot/dash) untouched', () => {
    expect(renderTemplate('{{a.b}} {{a-b}}', {})).toBe('{{a.b}} {{a-b}}');
  });

  it('does not recursively substitute values that look like placeholders', () => {
    expect(
      renderTemplate('{{a}}', { a: '{{b}}', b: 'should-not-appear' })
    ).toBe('{{b}}');
  });
});