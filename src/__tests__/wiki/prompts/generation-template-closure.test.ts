import { describe, it, expect } from 'vitest';
import { GENERATION_PROMPTS } from '../../../wiki/prompts/generation';

/**
 * #310: every page template used to close its output example with a bare `---`.
 * Models copied that closing rule into the page body, where the schema has no
 * section for it. These tests pin both halves of the contract: the closing rule
 * is gone, and the frontmatter delimiters of the example — which are paired and
 * must stay — are untouched.
 */
const PAGE_TEMPLATES = [
  'generateEntityPage',
  'generateConceptPage',
  'generateSummaryPage',
  'preserveReviewedEntityPage',
  'preserveReviewedConceptPage',
] as const;

describe('generation templates — output example closure (#310)', () => {
  for (const name of PAGE_TEMPLATES) {
    it(`${name} does not end on a bare horizontal rule`, () => {
      const template = GENERATION_PROMPTS[name];
      const lines = template.trimEnd().split('\n');
      expect(lines[lines.length - 1].trim()).not.toBe('---');
    });

    it(`${name} keeps the paired frontmatter delimiters of its example`, () => {
      const template = GENERATION_PROMPTS[name];
      const rules = template.split('\n').filter(l => l.trim() === '---').length;
      // An open/close pair around the frontmatter example, and nothing else.
      expect(rules).toBe(2);
    });
  }
});
