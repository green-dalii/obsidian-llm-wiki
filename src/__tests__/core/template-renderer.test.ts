/**
 * Tests for the template placeholder renderer.
 *
 * Background: GH #361 Theme 3 — the prompt layer has 5+ sites that call
 * `String.replace('{{placeholder}}', value)` without the `/g` flag,
 * silently skipping every occurrence after the first. This utility
 * replaces all occurrences in one pass and warns on unknown placeholders
 * (which the silent sites previously also failed silently).
 *
 * The utility is read-only and pure (no IO, no async).
 */
import { describe, expect, it, vi } from 'vitest';
import { renderTemplate } from '../../core/template-renderer';

describe('renderTemplate', () => {
  it('replaces a single occurrence', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'world' })).toBe('Hello world');
  });

  it('replaces ALL occurrences of the same placeholder', () => {
    // This is the bug class Theme 3 fixes — String.replace without /g
    // would leave the second occurrence untouched.
    expect(
      renderTemplate('Hi {{name}}, welcome {{name}}!', { name: 'Alice' })
    ).toBe('Hi Alice, welcome Alice!');
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

  it('replaces mixed occurrences of the same placeholder with other text between them', () => {
    expect(
      renderTemplate('{{x}} + {{x}} + {{x}} = 3{{x}}', { x: 'a' })
    ).toBe('a + a + a = 3a');
  });

  it('returns the original string when no placeholders are present', () => {
    expect(renderTemplate('plain text', { foo: 'bar' })).toBe('plain text');
  });

  it('warns to console.warn on unknown placeholder and leaves it untouched', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = renderTemplate('Hello {{name}}, your {{unknown}} is ready.', {
        name: 'Alice',
      });
      expect(result).toBe('Hello Alice, your {{unknown}} is ready.');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('{{unknown}}')
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('does not warn when all placeholders are known', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      renderTemplate('Hello {{name}}', { name: 'Alice' });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('handles placeholder names matching \\w+ (letters, digits, underscore)', () => {
    expect(
      renderTemplate('{{foo_bar123}}', { foo_bar123: 'ok' })
    ).toBe('ok');
  });

  it('leaves placeholder with non-word chars (dot/dash) untouched (conservative regex)', () => {
    // The renderer uses \w+ so {{a.b}} or {{a-b}} don't match the
    // pattern; this is intentional — those names would be ambiguous
    // and the existing sites only use word-char placeholders.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(renderTemplate('{{a.b}} {{a-b}}', {})).toBe('{{a.b}} {{a-b}}');
    } finally {
      warn.mockRestore();
    }
  });

  it('handles empty vars map (all placeholders unknown)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(renderTemplate('{{a}} and {{b}}', {})).toBe('{{a}} and {{b}}');
      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });

  it('handles values containing placeholder-like strings (no recursive substitution)', () => {
    // If a value contains '{{x}}', it must NOT be re-substituted. The
    // renderer walks the template once, not the substituted result.
    expect(
      renderTemplate('{{a}}', { a: '{{b}}', b: 'should-not-appear' })
    ).toBe('{{b}}');
  });
});