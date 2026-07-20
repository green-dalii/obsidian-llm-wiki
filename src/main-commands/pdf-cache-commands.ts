/**
 * v1.25.1 Phase C-PR3: PDF cache commands.
 *
 * Extracted from main.ts. Three async methods that manage the
 * PdfConversionCache lifecycle. These are the only methods that
 * directly import and use the dynamic pdf-cache module.
 *
 * Self-contained: no cross-dependencies on other mixins beyond
 * `app` and `settings.language`.
 *
 * Method signatures declared via PdfCacheMethods interface for
 * interface merging at the bottom of main.ts.
 */

import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import type { LLMWikiSettings } from '../types';
import { getText } from '../core/i18n';
import { NOTICE_NORMAL } from '../constants';

/** Host fields these methods need. Used as `this: PdfCacheHost` bound. */
export interface PdfCacheHost {
  app: App;
  settings: LLMWikiSettings;
}

/** Method signatures merged into LLMWikiPlugin via interface augmentation. */
export interface PdfCacheMethods {
  clearPdfCache(): Promise<void>;
  preparePdfCacheForBatchIngest(): Promise<void>;
  performPdfCacheHousekeeping(): Promise<void>;
}

export const pdfCacheCommands = {
  async clearPdfCache(this: PdfCacheHost): Promise<void> {
    const { createPdfCache } = await import('../core/pdf-cache');
    const cache = createPdfCache(this.app);
    const result = await cache.clear();
    new Notice(
      getText(this.settings.language, 'pdfCacheCleared').replace('{count}', String(result.removed)),
      NOTICE_NORMAL
    );
  },

  async preparePdfCacheForBatchIngest(this: PdfCacheHost): Promise<void> {
    try {
      const { createPdfCache } = await import('../core/pdf-cache');
      const cache = createPdfCache(this.app);
      const { expired, size } = await cache.prepareBatchIngest();
      if (expired.removed > 0 || size.removed > 0) {
        console.debug(
          `[pdf-cache] batch prep: purged ${expired.removed} expired, ` +
          `evicted ${size.removed} oversized (${size.freedBytes} bytes freed)`
        );
      }
    } catch (error) {
      console.warn('[pdf-cache] batch prep failed:', error);
    }
  },

  async performPdfCacheHousekeeping(this: PdfCacheHost): Promise<void> {
    try {
      const { createPdfCache } = await import('../core/pdf-cache');
      const cache = createPdfCache(this.app);
      const expired = await cache.purgeExpired();
      const size = await cache.enforceSizeLimit();
      if (expired.removed > 0 || size.removed > 0) {
        console.debug(
          `[pdf-cache] housekeeping: purged ${expired.removed} expired, ` +
          `evicted ${size.removed} oversized (${size.freedBytes} bytes freed)`
        );
      }
    } catch (error) {
      console.warn('[pdf-cache] housekeeping failed:', error);
    }
  },
};
