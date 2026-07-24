import type { App, TFile } from 'obsidian';
import type { LLMClient } from '../../types';
import type { PdfCacheEntry } from '../pdf-cache';
import type { MINERU_CONVERSION_PROFILE } from './mineru-profile';

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
  mineruApiTokenSecretId?: string;
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

export type MineruConfigurationReason = 'missing-token' | 'desktop-only';

export class MineruConfigurationError extends Error {
  constructor(public readonly reason: MineruConfigurationReason) {
    super(reason === 'desktop-only'
      ? 'MinerU PDF conversion is available only on desktop.'
      : 'A MinerU API Token is required.');
    this.name = 'MineruConfigurationError';
  }
}

export interface MineruArtifactManifestImage {
  path: string;
  bytes: number;
  sha256: string;
}

export interface MineruArtifactManifest {
  schemaVersion: 2;
  sourcePath: string;
  sourceSha256: string;
  backend: typeof MINERU_CONVERSION_PROFILE.backend;
  modelVersion: typeof MINERU_CONVERSION_PROFILE.modelVersion;
  converterVersion: typeof MINERU_CONVERSION_PROFILE.converterVersion;
  convertedAt: string;
  taskId: string;
  traceId?: string;
  markdownPath: 'document.md';
  markdownSha256: string;
  images: MineruArtifactManifestImage[];
}

export type ArtifactInspection =
  | { kind: 'missing' }
  | { kind: 'valid'; manifest: MineruArtifactManifest; markdown: string }
  | { kind: 'managed-invalid'; reason: string }
  | { kind: 'unowned-conflict' };

export interface MineruArtifactImageInput {
  path: string;
  bytes: Uint8Array;
}

export interface MineruArtifactPublishInput {
  sourcePath: string;
  sourceSha256: string;
  taskId: string;
  traceId?: string;
  convertedAt: string;
  markdown: string;
  images: MineruArtifactImageInput[];
}

export interface MineruArtifactAdapter {
  /**
   * Returns a stable, globally scoped identity for the physical path.
   * Filesystem aliases must share an identity; distinct destinations must not.
   */
  getPathIdentity(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<{ size: number } | null>;
  list(path: string): Promise<{ files: string[]; folders: string[] }>;
  readBinary(path: string): Promise<ArrayBuffer>;
  mkdir(path: string): Promise<void>;
  writeBinary(path: string, bytes: ArrayBuffer): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  removeDirectory(path: string): Promise<void>;
}
