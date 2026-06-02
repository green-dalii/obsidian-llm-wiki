// Convergence Detector — Pure functions for detecting extraction convergence
// Extracted from source-analyzer.ts::analyzeSource()
// Zero side effects, fully unit-testable

export interface ConvergenceConfig {
  minBatchSize: number;
  batchSizeHalved: boolean;
  customEntityCap: number | null;
  customConceptCap: number | null;
  maxTotalItems: number | null;
}

export interface ConvergenceResult {
  shouldStop: boolean;
  reason: string | null;
  newBatchSize: number;
  newBatchSizeHalved: boolean;
}

export interface CumulativeResult {
  shouldStop: boolean;
  reason: string | null;
}

/**
 * Detect convergence based on batch yield.
 *
 * Convergence algorithm:
 * 1. If yield < 50% of batch size → halve batch size
 * 2. If already halved and yield still < 50% → converged, stop
 * 3. Otherwise continue
 *
 * @param rawTotal - Number of items extracted in current batch
 * @param currentBatchSize - Current batch size
 * @param batchSizeHalved - Whether batch size has been halved before
 * @param minBatchSize - Minimum allowed batch size
 * @returns Convergence result with stop decision and new batch size
 */
export function detectConvergence(
  rawTotal: number,
  currentBatchSize: number,
  batchSizeHalved: boolean,
  minBatchSize: number = 5
): ConvergenceResult {
  const yieldRatio = rawTotal / currentBatchSize;

  // If yield is low (< 50%) and we can reduce batch size
  if (yieldRatio < 0.5 && currentBatchSize > minBatchSize) {
    if (batchSizeHalved) {
      // Already halved before and still low yield → converged
      return {
        shouldStop: true,
        reason: `Low yield persists after halving (${rawTotal}/${currentBatchSize}), converged`,
        newBatchSize: currentBatchSize,
        newBatchSizeHalved: batchSizeHalved
      };
    }

    // First time low yield → halve batch size
    const newBatchSize = Math.max(minBatchSize, Math.floor(currentBatchSize / 2));
    return {
      shouldStop: false,
      reason: `Low yield (${rawTotal}/${currentBatchSize}), halving batch size`,
      newBatchSize,
      newBatchSizeHalved: true
    };
  }

  // Normal yield or can't reduce further → continue
  return {
    shouldStop: false,
    reason: null,
    newBatchSize: currentBatchSize,
    newBatchSizeHalved: batchSizeHalved
  };
}

/**
 * Check if cumulative limits have been reached.
 *
 * @param totalEntities - Total entities extracted so far
 * @param totalConcepts - Total concepts extracted so far
 * @param config - Convergence configuration
 * @returns Cumulative result with stop decision
 */
export function checkCumulativeLimits(
  totalEntities: number,
  totalConcepts: number,
  config: Pick<ConvergenceConfig, 'customEntityCap' | 'customConceptCap' | 'maxTotalItems'>
): CumulativeResult {
  const { customEntityCap, customConceptCap, maxTotalItems } = config;

  // Custom mode: stop when both types reach their per-type caps
  if (customEntityCap !== null && customConceptCap !== null) {
    if (totalEntities >= customEntityCap && totalConcepts >= customConceptCap) {
      return {
        shouldStop: true,
        reason: `Per-type limits reached (entities: ${totalEntities}/${customEntityCap}, concepts: ${totalConcepts}/${customConceptCap})`
      };
    }
    return { shouldStop: false, reason: null };
  }

  // Standard mode: stop when cumulative total reaches limit
  const cumulativeTotal = totalEntities + totalConcepts;
  if (maxTotalItems !== null && cumulativeTotal >= maxTotalItems) {
    return {
      shouldStop: true,
      reason: `Cumulative total reached limit ${maxTotalItems} (${cumulativeTotal} items)`
    };
  }

  return { shouldStop: false, reason: null };
}

/**
 * Check if batch returned empty results.
 *
 * @param rawTotal - Raw items in current batch
 * @param newTotal - New (non-duplicate) items in current batch
 * @returns Empty result with stop decision
 */
export function checkEmptyBatch(
  rawTotal: number,
  newTotal: number
): { shouldStop: boolean; reason: string | null } {
  // LLM returned empty array
  if (rawTotal === 0) {
    return { shouldStop: true, reason: 'LLM returned empty array' };
  }

  // All items were duplicates (nothing new)
  if (newTotal === 0) {
    return { shouldStop: true, reason: 'All items duplicate, extraction exhausted' };
  }

  return { shouldStop: false, reason: null };
}

/**
 * Get convergence status summary for logging.
 *
 * @param batchNum - Current batch number
 * @param result - Convergence result
 * @returns Formatted status message
 */
export function formatConvergenceStatus(
  batchNum: number,
  result: ConvergenceResult
): string {
  if (result.shouldStop) {
    return `[Batch ${batchNum}] ${result.reason}, stopping`;
  }
  if (result.reason) {
    return `[Batch ${batchNum}] ${result.reason}`;
  }
  return `[Batch ${batchNum}] Yield normal, continuing`;
}
