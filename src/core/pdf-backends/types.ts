import type { App, TFile } from 'obsidian';
import type { LLMClient } from '../../types';
import type { PdfCacheEntry } from '../pdf-cache';

export type PdfConversionBackendId = 'native' | 'mineru';

export type PdfBackendProgress =
  | { stage: 'preparing' }
  | { stage: 'requesting-upload' }
  | { stage: 'uploading' }
  | { stage: 'waiting' }
  | { stage: 'parsing'; completedPages?: number; totalPages?: number }
  | { stage: 'converting' }
  | { stage: 'downloading' }
  | { stage: 'validating' }
  | { stage: 'saving' };

export type PdfBackendProgressFn = (progress: PdfBackendProgress) => void;

interface PdfBackendSettings {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  forcePdfSupport?: boolean;
  pdfConversionBackend?: PdfConversionBackendId;
  mineruApiToken?: string;
  mineruTaskTimeoutMinutes?: number;
  [k: string]: unknown;
}

export interface PdfBackendContext {
  app: App;
  settings: PdfBackendSettings;
  pdfFile: TFile;
  llmClient: LLMClient;
  resolveModelForTask: (settings: PdfBackendSettings, task: string) => string;
  subtle?: SubtleCrypto;
  abortSignal?: AbortSignal;
  onProgress?: PdfBackendProgressFn;
}

export type PdfConversionResult = PdfCacheEntry;

export interface PdfConversionBackend {
  convert(ctx: PdfBackendContext): Promise<PdfConversionResult>;
}
