import { describe, it, expect } from 'vitest';
import {
  SEED_SELECTION_SYSTEM_PROMPT,
  buildSeedSelectionUserPrompt,
} from '../../../wiki/prompts/seed-selection';

describe('Seed selection prompt', () => {
  it('system prompt defines the role and JSON output format', () => {
    expect(SEED_SELECTION_SYSTEM_PROMPT).toMatch(/selecting Wiki pages/i);
    expect(SEED_SELECTION_SYSTEM_PROMPT).toContain('"seeds"');
    expect(SEED_SELECTION_SYSTEM_PROMPT).toMatch(/strict JSON/i);
  });

  it('system prompt caps output at 3 seeds to keep prompt cost bounded', () => {
    expect(SEED_SELECTION_SYSTEM_PROMPT).toMatch(/up to 3/);
  });

  it('system prompt encourages semantic matching, not literal word overlap', () => {
    expect(SEED_SELECTION_SYSTEM_PROMPT).toMatch(/synonyms/i);
    expect(SEED_SELECTION_SYSTEM_PROMPT).toMatch(/semantic/i);
  });

  it('user prompt includes the question and page list verbatim', () => {
    const user = buildSeedSelectionUserPrompt('什么是熵', '- entities/foo: bar');
    expect(user).toContain('什么是熵');
    expect(user).toContain('- entities/foo: bar');
    // System-style content should NOT be in the user message.
    expect(user).not.toMatch(/selecting Wiki pages/i);
    expect(user).not.toMatch(/strict JSON/i);
  });
});
