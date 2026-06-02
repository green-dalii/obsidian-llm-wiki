import { describe, it, expect } from 'vitest';
import {
  detectConvergence,
  checkCumulativeLimits,
  checkEmptyBatch,
  formatConvergenceStatus,
} from './convergence-detector';

describe('Convergence Detector — Pure Functions', () => {
  describe('detectConvergence', () => {
    it('returns normal yield result', () => {
      const result = detectConvergence(10, 20, false);

      expect(result.shouldStop).toBe(false);
      expect(result.reason).toBeNull();
      expect(result.newBatchSize).toBe(20);
      expect(result.newBatchSizeHalved).toBe(false);
    });

    it('halves batch size on first low yield', () => {
      const result = detectConvergence(5, 20, false, 5);

      expect(result.shouldStop).toBe(false);
      expect(result.reason).toContain('halving');
      expect(result.newBatchSize).toBe(10);
      expect(result.newBatchSizeHalved).toBe(true);
    });

    it('stops on second low yield (below 50%)', () => {
      const result = detectConvergence(4, 10, true, 5); // 4/10 = 40% < 50%

      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('converged');
      expect(result.newBatchSize).toBe(10);
    });

    it('continues when at minimum size (cannot reduce further)', () => {
      const result = detectConvergence(2, 5, false, 5); // 2/5 = 40%, but can't reduce below 5

      // At minimum size, can't halve, so continues
      expect(result.shouldStop).toBe(false);
      expect(result.newBatchSize).toBe(5);
    });

    it('does not halve at exact threshold (50%)', () => {
      const result = detectConvergence(10, 20, false);

      expect(result.shouldStop).toBe(false);
      expect(result.newBatchSize).toBe(20);
    });

    it('halves below threshold (49%)', () => {
      const result = detectConvergence(9, 20, false);

      expect(result.shouldStop).toBe(false);
      expect(result.reason).toContain('halving');
      expect(result.newBatchSize).toBe(10);
    });

    it('uses default min batch size', () => {
      const result = detectConvergence(2, 20, false);

      expect(result.shouldStop).toBe(false);
      expect(result.reason).toContain('halving');
      expect(result.newBatchSize).toBe(10);
    });

    it('does not stop after first halve', () => {
      const result = detectConvergence(5, 20, false, 5);

      expect(result.shouldStop).toBe(false);
      expect(result.newBatchSizeHalved).toBe(true);
    });

    it('preserves halved flag when continuing', () => {
      const result = detectConvergence(15, 20, true);

      expect(result.shouldStop).toBe(false);
      expect(result.newBatchSizeHalved).toBe(true);
    });

    it('rounds down when halving', () => {
      const result = detectConvergence(4, 15, false, 5);

      expect(result.newBatchSize).toBe(7); // floor(15/2)
    });

    it('respects minimum when halving odd numbers', () => {
      const result = detectConvergence(4, 9, false, 5);

      expect(result.newBatchSize).toBe(5); // floor(9/2)=4, but min is 5
    });
  });

  describe('checkCumulativeLimits', () => {
    it('stops when both custom caps reached', () => {
      const result = checkCumulativeLimits(10, 10, {
        customEntityCap: 10,
        customConceptCap: 10,
        maxTotalItems: null
      });

      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('Per-type limits reached');
    });

    it('continues when only entity cap reached', () => {
      const result = checkCumulativeLimits(10, 5, {
        customEntityCap: 10,
        customConceptCap: 10,
        maxTotalItems: null
      });

      expect(result.shouldStop).toBe(false);
    });

    it('continues when only concept cap reached', () => {
      const result = checkCumulativeLimits(5, 10, {
        customEntityCap: 10,
        customConceptCap: 10,
        maxTotalItems: null
      });

      expect(result.shouldStop).toBe(false);
    });

    it('stops when standard max total reached', () => {
      const result = checkCumulativeLimits(50, 0, {
        customEntityCap: null,
        customConceptCap: null,
        maxTotalItems: 50
      });

      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('Cumulative total reached');
    });

    it('continues when under standard limit', () => {
      const result = checkCumulativeLimits(49, 0, {
        customEntityCap: null,
        customConceptCap: null,
        maxTotalItems: 50
      });

      expect(result.shouldStop).toBe(false);
    });

    it('stops when exactly at standard limit', () => {
      const result = checkCumulativeLimits(25, 25, {
        customEntityCap: null,
        customConceptCap: null,
        maxTotalItems: 50
      });

      expect(result.shouldStop).toBe(true);
    });

    it('continues when maxTotalItems is null', () => {
      const result = checkCumulativeLimits(100, 100, {
        customEntityCap: null,
        customConceptCap: null,
        maxTotalItems: null
      });

      expect(result.shouldStop).toBe(false);
    });

    it('handles mixed null and number caps', () => {
      const result = checkCumulativeLimits(10, 10, {
        customEntityCap: 10,
        customConceptCap: null,
        maxTotalItems: 25
      });

      // Only entity cap set, falls back to maxTotalItems
      // 10+10=20 < 25, should continue
      expect(result.shouldStop).toBe(false);
    });
  });

  describe('checkEmptyBatch', () => {
    it('stops when raw total is 0', () => {
      const result = checkEmptyBatch(0, 0);

      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('empty array');
    });

    it('stops when all items are duplicates', () => {
      const result = checkEmptyBatch(10, 0);

      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('duplicate');
    });

    it('continues when there are new items', () => {
      const result = checkEmptyBatch(10, 5);

      expect(result.shouldStop).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('continues when all items are new', () => {
      const result = checkEmptyBatch(10, 10);

      expect(result.shouldStop).toBe(false);
    });

    it('handles partial duplicates', () => {
      const result = checkEmptyBatch(20, 15);

      expect(result.shouldStop).toBe(false);
    });
  });

  describe('formatConvergenceStatus', () => {
    it('formats stop message', () => {
      const result = formatConvergenceStatus(5, {
        shouldStop: true,
        reason: 'Low yield',
        newBatchSize: 10,
        newBatchSizeHalved: true
      });

      expect(result).toContain('[Batch 5]');
      expect(result).toContain('Low yield');
      expect(result).toContain('stopping');
    });

    it('formats halving message', () => {
      const result = formatConvergenceStatus(3, {
        shouldStop: false,
        reason: 'Low yield (5/20), halving batch size',
        newBatchSize: 10,
        newBatchSizeHalved: true
      });

      expect(result).toContain('[Batch 3]');
      expect(result).toContain('halving');
    });

    it('formats normal continuation', () => {
      const result = formatConvergenceStatus(2, {
        shouldStop: false,
        reason: null,
        newBatchSize: 20,
        newBatchSizeHalved: false
      });

      expect(result).toContain('[Batch 2]');
      expect(result).toContain('Yield normal');
    });

    it('handles high batch numbers', () => {
      const result = formatConvergenceStatus(12, {
        shouldStop: true,
        reason: 'Converged',
        newBatchSize: 5,
        newBatchSizeHalved: true
      });

      expect(result).toContain('[Batch 12]');
    });
  });
});
