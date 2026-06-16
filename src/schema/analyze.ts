// Schema analyze cancel wiring — extracted as a pure function for testability.
//
// Background: ROADMAP v1.17.0 P1 #1.
// Both call sites of `suggestSchemaUpdate` (command palette + Lint Report
// Modal button) bypass the lint cancel infrastructure, so the status bar's
// "click to cancel" does nothing during schema analysis.
//
// Fix: extract the cancel-aware version here so the lifecycle (startLint /
// endLint) and signal.aborted check live in a single, testable function.

import { Notice } from 'obsidian';
import { TEXTS } from '../texts';
import { NOTICE_NORMAL, NOTICE_ERROR } from '../constants';

export interface SchemaAnalyzeCtx {
  settings: { language: string };
  llmClient: unknown;
  wikiEngine: {
    startLintOperation(): { aborted: boolean };
    endLintOperation(): void;
  };
  schemaManager: {
    suggestSchemaUpdate(context: string): Promise<unknown>;
  };
  requireLLMReady(): boolean;
}

export async function runSchemaAnalyze(ctx: SchemaAnalyzeCtx): Promise<void> {
  if (!ctx.requireLLMReady()) return;
  if (!ctx.llmClient) {
    new Notice(TEXTS[ctx.settings.language as keyof typeof TEXTS].errorNoApiKey);
    return;
  }

  const signal = ctx.wikiEngine.startLintOperation();
  new Notice(TEXTS[ctx.settings.language as keyof typeof TEXTS].analyzingSchema);
  try {
    const result = (await ctx.schemaManager.suggestSchemaUpdate('Wiki lint analysis')) as
      | { changes_needed?: boolean; suggestions?: string }
      | null;
    if (signal.aborted) return; // user cancelled — suppress stale result Notice
    if (result?.changes_needed) {
      new Notice(TEXTS[ctx.settings.language as keyof typeof TEXTS].schemaSuggestionGenerated, NOTICE_ERROR);
    } else {
      new Notice(TEXTS[ctx.settings.language as keyof typeof TEXTS].noSchemaUpdateNeeded, NOTICE_NORMAL);
    }
  } catch (error) {
    console.error('Schema suggestion failed:', error);
    if (signal.aborted) return; // suppress error Notice on user-initiated cancel
    const errMsg = error instanceof Error ? error.message : String(error);
    new Notice(
      TEXTS[ctx.settings.language as keyof typeof TEXTS].schemaSuggestionFailed + ': ' + errMsg,
      NOTICE_ERROR
    );
  } finally {
    ctx.wikiEngine.endLintOperation();
  }
}
