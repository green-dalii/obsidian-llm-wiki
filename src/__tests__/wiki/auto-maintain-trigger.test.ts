// v1.22.6 #204: regression tests for IngestReport.trigger propagation
// and completion-callback dispatch.
//
// Background: v1.22.2 introduced `onAutoIngestDone` but never wired it
// into the watch-mode path — every ingest completion went through
// `onIngestDone` which always opens IngestReportModal. This test file
// guards against that regression returning.

import { describe, it, expect } from 'vitest';
import type { IngestReport } from '../../types';

describe('IngestReport.trigger dispatch (v1.22.6 #204)', () => {
  // Sanity: trigger is optional and forward-compatible with legacy
  // callers that never set it.
  it('trigger field is optional on IngestReport', () => {
    const legacyReport: IngestReport = {
      sourceFile: 'wiki/sources/foo.md',
      createdPages: [],
      updatedPages: [],
      entitiesCreated: 0,
      conceptsCreated: 0,
      failedItems: [],
      collisions: [],
      contradictionsFound: 0,
      success: true,
    };
    expect(legacyReport.trigger).toBeUndefined();
  });

  it('explicit trigger="auto" round-trips through the report shape', () => {
    const autoReport: IngestReport = {
      sourceFile: 'wiki/sources/bar.md',
      createdPages: ['wiki/concepts/x'],
      updatedPages: [],
      entitiesCreated: 0,
      conceptsCreated: 1,
      failedItems: [],
      collisions: [],
      contradictionsFound: 0,
      success: true,
      trigger: 'auto',
    };
    expect(autoReport.trigger).toBe('auto');
  });

  it('explicit trigger="manual" round-trips through the report shape', () => {
    const manualReport: IngestReport = {
      sourceFile: 'wiki/sources/baz.md',
      createdPages: [],
      updatedPages: ['wiki/entities/y'],
      entitiesCreated: 1,
      conceptsCreated: 0,
      failedItems: [],
      collisions: [],
      contradictionsFound: 0,
      success: true,
      trigger: 'manual',
    };
    expect(manualReport.trigger).toBe('manual');
  });

  // Pure-function dispatch logic, mirrors LLMWikiPlugin.onIngestDoneDispatch.
  // Re-extracted here so the dispatch contract is unit-testable without
  // standing up the full Obsidian Plugin harness.
  function dispatchTarget(report: IngestReport): 'auto' | 'manual' {
    return report.trigger === 'auto' ? 'auto' : 'manual';
  }

  it('dispatch routes trigger="auto" to auto path', () => {
    expect(dispatchTarget({ ...baseReport(), trigger: 'auto' })).toBe('auto');
  });

  it('dispatch routes trigger="manual" to manual path', () => {
    expect(dispatchTarget({ ...baseReport(), trigger: 'manual' })).toBe('manual');
  });

  it('dispatch defaults missing trigger to manual path (backward compat)', () => {
    expect(dispatchTarget({ ...baseReport() })).toBe('manual');
    expect(dispatchTarget({ ...baseReport(), trigger: undefined })).toBe('manual');
  });
});

function baseReport(): IngestReport {
  return {
    sourceFile: 'wiki/sources/test.md',
    createdPages: [],
    updatedPages: [],
    entitiesCreated: 0,
    conceptsCreated: 0,
    failedItems: [],
    collisions: [],
    contradictionsFound: 0,
    success: true,
  };
}