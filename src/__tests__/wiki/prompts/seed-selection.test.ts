import { describe, it, expect } from 'vitest';
import { SEED_SELECTION_PROMPT } from '../../../wiki/prompts/seed-selection';

describe('Seed selection prompt', () => {
  it('contains the {{query}} and {{pages}} placeholders', () => {
    expect(SEED_SELECTION_PROMPT).toContain('{{query}}');
    expect(SEED_SELECTION_PROMPT).toContain('{{pages}}');
  });

  it('instructs the LLM to return strict JSON with seeds array', () => {
    expect(SEED_SELECTION_PROMPT).toContain('"seeds"');
    expect(SEED_SELECTION_PROMPT).toMatch(/strict JSON/i);
  });

  it('caps output at 3 seeds to keep prompt cost bounded', () => {
    expect(SEED_SELECTION_PROMPT).toMatch(/up to 3/);
  });

  it('encourages semantic matching, not literal word overlap', () => {
    expect(SEED_SELECTION_PROMPT).toMatch(/synonyms/i);
    expect(SEED_SELECTION_PROMPT).toMatch(/semantic/i);
  });
});