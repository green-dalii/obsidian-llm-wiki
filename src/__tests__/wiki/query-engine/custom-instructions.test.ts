// v1.24.0 #251: Custom Query Instructions — pure helper unit tests.

import { describe, it, expect } from 'vitest';
import {
  appendCustomQueryInstructions,
  CUSTOM_INSTRUCTIONS_HEADER,
} from '../../../wiki/query-engine/custom-instructions';
import { CUSTOM_QUERY_INSTRUCTIONS_MAX_CHARS } from '../../../constants';

describe('appendCustomQueryInstructions — Issue #251', () => {
  it('returns input unchanged when instructions is undefined', () => {
    const out = appendCustomQueryInstructions('PROMPT', undefined);
    expect(out).toBe('PROMPT');
  });

  it('returns input unchanged when instructions is empty string', () => {
    const out = appendCustomQueryInstructions('PROMPT', '');
    expect(out).toBe('PROMPT');
  });

  it('returns input unchanged when instructions is whitespace only', () => {
    const out = appendCustomQueryInstructions('PROMPT', '   \n\t  ');
    expect(out).toBe('PROMPT');
  });

  it('appends non-empty instructions with header delimiter', () => {
    const out = appendCustomQueryInstructions('PROMPT', 'be concise');
    expect(out).toBe(`PROMPT\n\n${CUSTOM_INSTRUCTIONS_HEADER}\nbe concise`);
  });

  it('trims surrounding whitespace from instructions', () => {
    const out = appendCustomQueryInstructions('PROMPT', '  be concise  \n');
    expect(out).toBe(`PROMPT\n\n${CUSTOM_INSTRUCTIONS_HEADER}\nbe concise`);
  });

  it('truncates instructions longer than the 5000-char cap', () => {
    const long = 'a'.repeat(CUSTOM_QUERY_INSTRUCTIONS_MAX_CHARS + 100);
    const out = appendCustomQueryInstructions('PROMPT', long);
    const instructionBlock = out.slice(`PROMPT\n\n${CUSTOM_INSTRUCTIONS_HEADER}\n`.length);
    expect(instructionBlock.length).toBe(CUSTOM_QUERY_INSTRUCTIONS_MAX_CHARS);
    expect(out.endsWith('a'.repeat(CUSTOM_QUERY_INSTRUCTIONS_MAX_CHARS))).toBe(true);
  });

  it('emits header + instructions even when systemPrompt is empty', () => {
    const out = appendCustomQueryInstructions('', 'be concise');
    expect(out).toBe(`\n\n${CUSTOM_INSTRUCTIONS_HEADER}\nbe concise`);
  });

  it('emits header + instructions even when systemPrompt is 1 char', () => {
    const out = appendCustomQueryInstructions('X', 'be concise');
    expect(out).toBe(`X\n\n${CUSTOM_INSTRUCTIONS_HEADER}\nbe concise`);
  });

  it('does NOT modify other LLM consumers (e.g. seed-selector)', () => {
    // Sanity: helper is pure. A caller that doesn't pass `instructions`
    // (e.g. seed-selector's buildSeedSelectionUserPrompt) sees no change.
    const prompt = 'seed-selector prompt';
    const out = appendCustomQueryInstructions(prompt, undefined);
    expect(out).toBe(prompt);
  });
});