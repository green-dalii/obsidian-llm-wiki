// Exit contract of the UPSTREAM DEV-ONLY INSTRUMENT (Issue #417 secondary,
// split out of PR #418 as its own decision).
//
// Two layers. The unit half pins `exitCodeForReport`, the one function that
// turns the engine's report into the process exit code. The process half
// runs the real `run-instrument.mjs` (its own esbuild step, its own shim
// alias — 0.15 s per start) so the launcher wiring is covered too: missing
// positionals must exit 2 with usage on stderr and nothing on stdout, and an
// ingest whose report says `success false` must exit 1. Before this change
// both exited 0 unless something happened to throw.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EXIT_INGEST_FAILED,
  EXIT_OK,
  EXIT_USAGE,
  exitCodeForReport,
} from '../../../../tools/dev-instrument/src/exit-code';
import type { IngestReport } from '../../../../src/types';

function report(overrides: Partial<IngestReport>): IngestReport {
  return {
    sourceFile: 'note.md',
    createdPages: [],
    updatedPages: [],
    entitiesCreated: 0,
    conceptsCreated: 0,
    failedItems: [],
    contradictionsFound: 0,
    success: true,
    ...overrides,
  };
}

describe('exitCodeForReport', () => {
  it('success: true → 0', () => {
    expect(exitCodeForReport(report({ success: true }))).toBe(EXIT_OK);
  });

  it('requirements-gate skip (success: true + skipped) → 0 — the engine calls it success', () => {
    expect(exitCodeForReport(report({ success: true, skipped: true }))).toBe(EXIT_OK);
  });

  it('success: false → 1, whether or not the engine also threw', () => {
    expect(exitCodeForReport(report({ success: false, errorMessage: 'boom' }))).toBe(EXIT_INGEST_FAILED);
    expect(exitCodeForReport(report({ success: false, cancelled: true }))).toBe(EXIT_INGEST_FAILED);
  });

  it('no report (engine returned before onDone) → 1', () => {
    expect(exitCodeForReport(null)).toBe(EXIT_INGEST_FAILED);
  });
});

describe('run-instrument.mjs — process exit code', () => {
  // Vitest runs from the repo root (same assumption as shim-bundle.test.ts).
  const launcher = join(process.cwd(), 'tools/dev-instrument/run-instrument.mjs');
  const run = (args: string[]) =>
    spawnSync(process.execPath, [launcher, ...args], { encoding: 'utf8', timeout: 60_000 });

  it('no positionals → 2, usage on stderr, nothing on stdout', () => {
    const r = run([]);
    expect(r.status).toBe(EXIT_USAGE);
    expect(r.stderr).toContain('Usage:');
    expect(r.stdout).toBe('');
  });

  it('ingest whose report says success false → 1', () => {
    // A vault whose local no-key provider points at a closed port: the
    // engine's first LLM call fails, onDone receives success:false, the
    // summary prints it — and the process must say the same thing.
    const vault = mkdtempSync(join(tmpdir(), 'dev-instrument-exit-'));
    try {
      mkdirSync(join(vault, '.obsidian', 'plugins', 'karpathywiki'), { recursive: true });
      writeFileSync(
        join(vault, '.obsidian', 'plugins', 'karpathywiki', 'data.json'),
        JSON.stringify({ provider: 'lmstudio', baseUrl: 'http://127.0.0.1:9/v1', model: 'exit-contract-test' }),
      );
      writeFileSync(join(vault, 'note.md'), '# Ferritin\n\nFerritin is an iron-storage protein.\n');
      const r = run([vault, 'note.md']);
      expect(r.stdout).toMatch(/success\s+false/);
      expect(r.status).toBe(EXIT_INGEST_FAILED);
    } finally {
      rmSync(vault, { recursive: true, force: true });
    }
  }, 60_000);
});
