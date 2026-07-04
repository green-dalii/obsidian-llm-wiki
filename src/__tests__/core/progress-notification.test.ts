import { describe, it, expect } from 'vitest';
import { decideProgressDisplay, ProgressScope } from '../../core/progress-notification';

describe('decideProgressDisplay', () => {
  it('shows notice+status for manual user-triggered short operations', () => {
    const result = decideProgressDisplay(ProgressScope.IngestManual, false, true);
    expect(result.display).toBe('notice+status-bar');
  });

  it('shows notice+status for manual user-triggered long operations', () => {
    const result = decideProgressDisplay(ProgressScope.IngestManual, true, true);
    expect(result.display).toBe('notice+status-bar');
  });

  it('shows status-only for watch-mode auto-ingest', () => {
    const result = decideProgressDisplay(ProgressScope.IngestAutoWatch, false, false);
    expect(result.display).toBe('status-bar-only');
  });

  it('shows status-only for periodic lint', () => {
    const result = decideProgressDisplay(ProgressScope.LintPeriodic, false, false);
    expect(result.display).toBe('status-bar-only');
  });

  it('shows notice+status for manual lint', () => {
    const result = decideProgressDisplay(ProgressScope.LintManual, false, true);
    expect(result.display).toBe('notice+status-bar');
  });

  it('shows notice+status for manual smart fix', () => {
    const result = decideProgressDisplay(ProgressScope.SmartFixManual, false, true);
    expect(result.display).toBe('notice+status-bar');
  });

  it('shows status-only for startup auto-maintenance', () => {
    const result = decideProgressDisplay(ProgressScope.AutoMaintenance, false, false);
    expect(result.display).toBe('status-bar-only');
  });

  it('flags unknown long user ops for notice+status', () => {
    const result = decideProgressDisplay('unknown' as ProgressScope, true, true);
    expect(result.display).toBe('notice+status-bar');
  });
});
