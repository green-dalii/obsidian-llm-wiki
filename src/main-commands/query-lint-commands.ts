/**
 * v1.25.1 Phase C-PR3: Query and lint commands.
 *
 * Extracted from main.ts. Four methods that manage the Query view
 * activation and linting pipeline.
 *
 * `queryWiki` / `lintWiki` are command callbacks (registered by
 * command-registry). `activateQueryView` is a private helper for
 * the query side. `invalidateAllQueryGraphs` is called by both
 * `onIngestDoneDispatch` (main core) and `saveSettings`.
 *
 * Cross-mixin routing:
 *   - requireLLMReady() → ConnectionCommandsHost
 *   - suggestSchemaUpdate() → SchemaCommandsHost
 */

import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import type { LLMWikiSettings, LLMClient } from '../types';
import type { WikiEngine } from '../wiki/wiki-engine';
import type { SchemaTask } from '../schema/schema-manager';
import { TEXTS } from '../texts';
import { runLintWiki } from '../wiki/lint/controller';
import { QueryView, VIEW_TYPE_QUERY } from '../wiki/query-engine';

/** Host interface: minimal surface for these methods to compile. */
export interface QueryLintHost {
  app: App;
  settings: LLMWikiSettings;
  llmClient: LLMClient | null;
  wikiEngine: WikiEngine;
  requireLLMReady(): boolean;
  suggestSchemaUpdate(context?: string): Promise<void>;
  /** activateQueryView is a co-member of this mixin. */
  activateQueryView?(): Promise<void>;
}

export interface QueryLintMethods {
  queryWiki(): void;
  invalidateAllQueryGraphs(): void;
  lintWiki(trigger?: 'auto' | 'manual'): Promise<void>;
}

export const queryLintCommands = {
  queryWiki(this: QueryLintHost): void {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    void this.activateQueryView!();
  },
  activateQueryView(this: QueryLintHost): Promise<void> {
    const { workspace } = this.app;

    const existing = workspace.getLeavesOfType(VIEW_TYPE_QUERY);
    if (existing.length > 0) {
      return workspace.revealLeaf(existing[0]);
    }

    const leaf = workspace.getRightLeaf(false);
    if (!leaf) return Promise.resolve();
    return leaf.setViewState({ type: VIEW_TYPE_QUERY, active: true })
      .then(() => workspace.revealLeaf(leaf));
  },

  invalidateAllQueryGraphs(this: QueryLintHost): void {
    const viewLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_QUERY);
    for (const leaf of viewLeaves) {
      if (leaf.view instanceof QueryView) {
        leaf.view.invalidateGraph();
      }
    }
  },

  async lintWiki(this: QueryLintHost, trigger: 'auto' | 'manual' = 'manual'): Promise<void> {
    if (!this.requireLLMReady()) return;
    const signal = this.wikiEngine.startLintOperation();
    try {
      await runLintWiki({
        app: this.app,
        settings: this.settings,
        llmClient: this.llmClient,
        wikiEngine: this.wikiEngine,
        // #328 Phase 1 follow-up: wire the shared system-prompt composer
        // so fix-runners can mirror the Phase 1 "system layer is the
        // sole tag-vocab injection point" pattern (e.g. retag).
        buildSystemPrompt: (task) => this.wikiEngine.buildSystemPrompt(task as SchemaTask),
        onAnalyzeSchema: (context?: string) => { void this.suggestSchemaUpdate(context); },
      }, signal, trigger);
    } finally {
      this.wikiEngine.endLintOperation();
    }
  },
};
