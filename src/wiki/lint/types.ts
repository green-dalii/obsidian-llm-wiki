// Shared types for the lint pipeline.
// These are internal to src/wiki/lint/. LintController is the only public
// entry point.
//
// History:
//   - v1.18.3: extracted LintContext here so fix-runners.ts can stop
//     importing from lint-controller.ts (cycle risk).

import type { App } from 'obsidian';
import { LLMWikiSettings, LLMClient } from '../../types';
import { WikiEngine } from '../wiki-engine';

// Public ctx for the entire lint run. The controller creates one of these
// and passes it down to every phase (preparation, programmatic, llm-assisted,
// fix-runners) and to report-builder / fix-callback assembly.
export interface LintContext {
  app: App;
  settings: LLMWikiSettings;
  llmClient: LLMClient | null;
  wikiEngine: WikiEngine;
  onAnalyzeSchema: () => void;
}

export interface LintPhaseContext {
  app: {
    vault: {
      getMarkdownFiles: () => Array<{ path: string; basename: string }>;
      read: (file: { path: string }) => Promise<string>;
      getAbstractFileByPath: (path: string) => unknown;
      process: (file: unknown, fn: (data: string) => string | Promise<string>) => Promise<string>;
    };
    workspace: {
      onLayoutReady: (cb: () => void) => void;
    };
    metadataCache: {
      on: (event: string, cb: unknown) => unknown;
    };
  };
  settings: LLMWikiSettings;
  wikiEngine: {
    updateStatusBar: (text: string) => void;
    getExistingWikiPages: () => Promise<Array<{ path: string }>>;
    tryReadFile: (path: string) => Promise<string | null>;
    getOpenContradictions: () => Promise<Array<{ path: string; status: string; claim: string }>>;
    resolveContradiction: (path: string) => Promise<void>;
    updateContradictionStatus: (path: string, status: string) => Promise<void>;
  };
  checkCancelled: () => void;
  stageNotice: {
    setMessage: (message: string) => void;
  } | null;
  totalPages: number;
}

export interface ScannerPage {
  path: string;
  content: string;
  basename: string;
}

export interface ProgrammaticFindings {
  aliasDeficientPages: ScannerPage[];
  emptyPages: Array<{ path: string; content: string }>;
  orphans: string[];
  tagViolations: import('./scanners').TagViolation[];
  pollutedPages: Array<{ path: string; title: string; cleanTitle: string }>;
  deadLinks: Array<{ source: string; target: string }>;
  ungroundedQuotes: import('./scanners').QuoteGroundingIssue[];
  sourcesNormalizedFiles: number;
  sourcesNormalizedEntries: number;
  doubleNestFixes: number;
}

export interface DuplicateResult {
  target: string;
  source: string;
  reason: string;
}

export interface LlmAssistedResults {
  duplicates: DuplicateResult[];
  contradictionsReport: string;
  llmReport: string;
}
