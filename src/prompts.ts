// LLM prompt templates for Wiki operations.
// Barrel file — prompts are organized by domain under src/wiki/prompts/.

import { INGESTION_PROMPTS } from './wiki/prompts/ingestion';
import { GENERATION_PROMPTS } from './wiki/prompts/generation';
import { MERGE_PROMPTS } from './wiki/prompts/merge';
import { FIX_PROMPTS } from './wiki/prompts/fixes';
import { LINT_PROMPTS } from './wiki/prompts/lint';
import { CONVERSATION_PROMPTS } from './wiki/prompts/conversation';

export const PROMPTS = {
  ...INGESTION_PROMPTS,
  ...GENERATION_PROMPTS,
  ...MERGE_PROMPTS,
  ...FIX_PROMPTS,
  ...LINT_PROMPTS,
  ...CONVERSATION_PROMPTS,
};
