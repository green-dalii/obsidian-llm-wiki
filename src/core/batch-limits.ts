// Batch Limits — Pure functions for calculating extraction batch parameters
// Extracted from source-analyzer.ts::analyzeSource()
// Zero side effects, fully unit-testable

export interface GranularityConfig {
  initialBatchSize: number;
  maxBatchesBase: number;
  maxTotalItems: number | null;
}

export interface BatchLimits {
  initialBatchSize: number;
  maxBatches: number;
  maxTotalItems: number | null;
  minBatchSize: number;
  responseFullnessThreshold: number;
}

// Configuration per granularity level
export const GRANULARITY_CONFIG: Record<string, GranularityConfig> = {
  fine: { initialBatchSize: 30, maxBatchesBase: 12, maxTotalItems: 100 },
  standard: { initialBatchSize: 20, maxBatchesBase: 6, maxTotalItems: 50 },
  coarse: { initialBatchSize: 10, maxBatchesBase: 3, maxTotalItems: 10 },
  minimal: { initialBatchSize: 5, maxBatchesBase: 1, maxTotalItems: 5 },
  custom: { initialBatchSize: 5, maxBatchesBase: 1, maxTotalItems: null }
};

const MIN_BATCH_SIZE = 5;
const MAX_TOKENS = 16000;
const SHORT_CONTENT_THRESHOLD = 20000;
const CHARS_PER_ITEM = 600;

/**
 * Calculate batch limits based on content length and granularity.
 *
 * @param contentLength - Length of source content in characters
 * @param granularity - Extraction granularity ('fine' | 'standard' | 'coarse' | 'minimal' | 'custom')
 * @param customLimits - Custom limits for 'custom' granularity
 * @returns Calculated batch limits
 */
export function calculateBatchLimits(
  contentLength: number,
  granularity: string = 'standard',
  customLimits?: { entityCap?: number; conceptCap?: number }
): BatchLimits {
  const config = { ...(GRANULARITY_CONFIG[granularity] || GRANULARITY_CONFIG.standard) };

  // Auto-downgrade maxTotalItems for short content to avoid "hard digging"
  // A 6800-char source can't have 50 wiki-worthy items; cap at ~1 per 600 chars
  if (contentLength < SHORT_CONTENT_THRESHOLD && config.maxTotalItems !== null) {
    const reasonableCap = Math.max(5, Math.ceil(contentLength / CHARS_PER_ITEM));
    if (config.maxTotalItems > reasonableCap) {
      config.maxTotalItems = reasonableCap;
    }
  }

  // Dynamic MAX_BATCHES: short content gets fewer, long content more
  // Base: ~1 batch per 2000 chars + small constant
  const maxBatches = Math.min(
    config.maxBatchesBase * 3,
    Math.max(2, Math.ceil(contentLength / 2000) + 2)
  );

  return {
    initialBatchSize: config.initialBatchSize,
    maxBatches,
    maxTotalItems: config.maxTotalItems,
    minBatchSize: MIN_BATCH_SIZE,
    responseFullnessThreshold: MAX_TOKENS * 0.7
  };
}

/**
 * Calculate dynamic batch size based on response length.
 * Reduces batch size if response is getting too long.
 *
 * @param currentBatchSize - Current batch size
 * @param responseLength - Length of LLM response
 * @param threshold - Threshold for fullness (default: 70% of max tokens)
 * @returns New batch size (may be reduced or unchanged)
 */
export function adjustBatchSizeForResponse(
  currentBatchSize: number,
  responseLength: number,
  threshold: number = MAX_TOKENS * 0.7
): number {
  if (responseLength > threshold && currentBatchSize > MIN_BATCH_SIZE) {
    return Math.max(MIN_BATCH_SIZE, Math.floor(currentBatchSize * 0.75));
  }
  return currentBatchSize;
}

/**
 * Get custom per-type caps for custom granularity mode.
 *
 * @param settings - Extraction settings
 * @returns Entity and concept caps (null if not custom mode)
 */
export function getCustomTypeCaps(
  settings: {
    extractionGranularity: string;
    customEntityLimit?: number;
    customConceptLimit?: number;
  }
): { entityCap: number | null; conceptCap: number | null } {
  if (settings.extractionGranularity !== 'custom') {
    return { entityCap: null, conceptCap: null };
  }

  return {
    entityCap: settings.customEntityLimit ?? 5,
    conceptCap: settings.customConceptLimit ?? 5
  };
}
