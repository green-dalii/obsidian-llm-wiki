/**
 * v1.25.1 Phase C-PR3: Ingest commands.
 *
 * Extracted from main.ts (lines 587-927). Covers the 5 ingest
 * entry points and the batch pipeline.
 *
 * Cross-mixin dependencies:
 *   - requireLLMReady()          → ConnectionCommandsHost
 *   - preparePdfCacheForBatchIngest()  → PdfCacheHost
 *   - showProgressFor / dismissProgress → core methods (main retains)
 *   - ingestQueue / batchProgress        → core fields (promoted to public)
 *
 * WARNING: batchProgress = { current: i+1, total: ingestCount } is
 * read by the status-bar callback (registered in command-registry).
 * The shared mutation across async boundaries is intentional.
 */

import { Notice, TFile } from 'obsidian';
import type { App } from 'obsidian';
import type { LLMWikiSettings, LLMClient, IngestReport } from '../types';
import type { WikiEngine } from '../wiki/wiki-engine';
import type { IngestQueue } from '../core/ingest-queue';
import type { BatchProgress } from '../core/status-bar';
import { TEXTS } from '../texts';
import { getText } from '../core/i18n';
import { slugify } from '../core/slug';
import { parseFrontmatter } from '../core/frontmatter';
import { isInFolderScope } from '../core/folder-scope';
import { COMPATIBLE_SOURCE_EXTENSIONS, NOTICE_NORMAL, NOTICE_ERROR } from '../constants';
import { FileSuggestModal, FolderSuggestModal, MultiFileSuggestModal, IngestReportModal } from '../ui/modals';
import { ProgressScope } from '../core/progress-notification';
import { isMineruArtifactPath } from '../core/pdf-backends/mineru-paths';

function rejectManagedArtifact(file: TFile, settings: LLMWikiSettings): boolean {
  if (!isMineruArtifactPath(file.path)) return false;
  new Notice(
    getText(settings.language, 'sourceRejectedManagedArtifact')
      .replace('{filename}', file.name),
    NOTICE_NORMAL,
  );
  return true;
}

export interface IngestHost {
  app: App;
  settings: LLMWikiSettings;
  llmClient: LLMClient | null;
  wikiEngine: WikiEngine;
  ingestQueue: IngestQueue;
  batchProgress: BatchProgress | null;
  requireLLMReady(): boolean;
  showProgressFor(scope: ProgressScope, msg: string): void;
  dismissProgress(): void;
  preparePdfCacheForBatchIngest(): Promise<void>;
  /** Self-references: co-members of this mixin. */
  runBatchIngest?(files: TFile[], jobIds: string[], sourceLabel: string): Promise<void>;
  isAlreadyIngested?(sourceFile: TFile): Promise<boolean>;
}

export interface IngestMethods {
  selectSourceToIngest(): void;
  ingestActiveFile(): void;
  selectFolderToIngest(): void;
  selectMultipleFilesToIngest(): void;
}

export const ingestCommands = {
  async isAlreadyIngested(this: IngestHost, sourceFile: TFile): Promise<boolean> {
    const slug = slugify(sourceFile.basename, this.settings.slugCase === 'preserve');
    const wikiPath = `${this.settings.wikiFolder}/sources/${slug}.md`;

    try {
      const file = this.app.vault.getAbstractFileByPath(wikiPath);
      if (!(file instanceof TFile)) return false;

      try {
        const content = await this.app.vault.read(file);
        const fm = parseFrontmatter(content);
        if (fm && fm.sources) {
          const normalizedSources = fm.sources.map(s => {
            const trimmed = s.trim();
            if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
              return trimmed.slice(2, -2).trim();
            }
            return trimmed;
          });
          return normalizedSources.includes(sourceFile.path);
        }
        return true;
      } catch {
        return true;
      }
    } catch {
      return false;
    }
  },

  selectSourceToIngest(this: IngestHost): void {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new FileSuggestModal(this.app, this.settings.wikiFolder, (file: TFile) => {
      if (rejectManagedArtifact(file, this.settings)) return;
      this.showProgressFor(ProgressScope.IngestManual, `Ingesting: ${file.basename}`);
      this.wikiEngine.ingestSource(file, { interactive: true }).catch(e => {
        console.error('Single ingest failed:', e);
        const errMsg = e instanceof Error ? e.message : String(e);
        new Notice(TEXTS[this.settings.language].errorIngestFailed + errMsg, NOTICE_ERROR);
        this.dismissProgress();
      });
    }).open();
  },

  ingestActiveFile(this: IngestHost): void {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice(getText(this.settings.language, 'noActiveFile'), NOTICE_NORMAL);
      return;
    }
    if (rejectManagedArtifact(activeFile, this.settings)) return;

    this.showProgressFor(ProgressScope.IngestManual, `Ingesting: ${activeFile.basename}`);
    this.wikiEngine.ingestSource(activeFile, { interactive: true }).catch(e => {
      console.error('Ingest active file failed:', e);
      const errMsg = e instanceof Error ? e.message : String(e);
      new Notice(TEXTS[this.settings.language].errorIngestFailed + errMsg, NOTICE_ERROR);
      this.dismissProgress();
    });
  },

  selectFolderToIngest(this: IngestHost): void {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new FolderSuggestModal(this.app, this.settings.wikiFolder, (folder) => {
      const allowedExts: readonly string[] = COMPATIBLE_SOURCE_EXTENSIONS;
      // v1.25.10 PATCH Issue #364 (consolidated with DocTpoint PR #370):
      // scope on the folder boundary, not on a bare string prefix. The
      // helper enforces a path-separator boundary and treats the vault
      // root as a wildcard ancestor. See core/folder-scope.ts for the
      // three cases a bare startsWith leaks (sibling-folder-with-prefix,
      // file-sitting-beside-the-folder, the folder itself).
      const files = this.app.vault.getFiles()
        .filter(f => allowedExts.includes(f.extension.toLowerCase()))
        .filter(f => isInFolderScope(f.path, folder.path, folder.isRoot()))
        .filter(f => !isMineruArtifactPath(f.path));

      if (files.length === 0) {
        const msg = TEXTS[this.settings.language].selectFolderNoMdFiles.replace('{path}', folder.path);
        new Notice(msg);
        return;
      }

      void this.runBatchIngest!(files, [], `${files.length} files from ${folder.path}`);
    }).open();
  },

  selectMultipleFilesToIngest(this: IngestHost): void {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new MultiFileSuggestModal(
      this.app,
      this.settings,
      this.ingestQueue,
      (ids: string[], files: TFile[]) => {
        if (files.length === 0 || ids.length === 0) return;
        void this.runBatchIngest!(files, ids, `${files.length} manually-selected files`);
      },
    ).open();
  },

  async runBatchIngest(this: IngestHost, files: TFile[], jobIds: string[], sourceLabel: string): Promise<void> {
    void this.preparePdfCacheForBatchIngest();

    const eligibleFiles: TFile[] = [];
    const eligibleJobIds: string[] = [];
    const preissuedJobs = jobIds.length > 0
      ? new Map(this.ingestQueue.getSnapshot().map(job => [job.id, job]))
      : undefined;
    const acceptedJobIds = new Set<string>();
    for (let i = 0; i < files.length; i++) {
      if (isMineruArtifactPath(files[i].path)) continue;
      const jobId = jobIds[i] ?? '';
      if (preissuedJobs) {
        const job = preissuedJobs.get(jobId);
        if (
          !jobId
          || acceptedJobIds.has(jobId)
          || job?.status !== 'pending'
          || job.file.path !== files[i].path
        ) continue;
        acceptedJobIds.add(jobId);
      }
      eligibleFiles.push(files[i]);
      eligibleJobIds.push(jobId);
    }
    if (eligibleFiles.length === 0) return;

    const alreadyIngestedFiles: TFile[] = [];
    const newFiles: TFile[] = [];
    const alignedJobIds: string[] = [];

    for (let i = 0; i < eligibleFiles.length; i++) {
      const file = eligibleFiles[i];
      const jobId = eligibleJobIds[i];
      if (await this.isAlreadyIngested!(file)) {
        alreadyIngestedFiles.push(file);
      } else {
        newFiles.push(file);
        alignedJobIds.push(jobId);
      }
    }

    const totalFiles = eligibleFiles.length;
    const skippedCount = alreadyIngestedFiles.length;

    if (newFiles.length === 0) {
      const texts = TEXTS[this.settings.language];
      new Notice(texts.batchIngestAllIngested.replace('{total}', String(totalFiles)), NOTICE_NORMAL);
      return;
    }

    let executionFiles: TFile[];
    let resolvedJobIds: string[];
    if (preissuedJobs) {
      executionFiles = newFiles;
      resolvedJobIds = alignedJobIds;
    } else {
      const jobs = this.ingestQueue.enqueueJobs(newFiles);
      if (jobs.length === 0) return;
      executionFiles = jobs.map(job => job.file);
      resolvedJobIds = jobs.map(job => job.id);
    }

    const ingestCount = executionFiles.length;

    if (skippedCount > 0) {
      const texts = TEXTS[this.settings.language];
      new Notice(
        texts.batchIngestSkipNotice
          .replace('{skipped}', String(skippedCount))
          .replace('{total}', String(totalFiles))
          .replace('{new}', String(ingestCount)),
        6000
      );
    }

    const reports: IngestReport[] = [];

    this.wikiEngine.setDoneCallback((report: IngestReport) => {
      reports.push(report);
    });

    const texts = TEXTS[this.settings.language];
    this.showProgressFor(ProgressScope.IngestManual, texts.batchIngestStarting
      .replace('{count}', String(ingestCount))
      .replace('{folder}', sourceLabel));

    const batchCtx = this.wikiEngine.createBatchContext();

    for (let i = 0; i < executionFiles.length; i++) {
      const file = executionFiles[i];
      const jobId = resolvedJobIds[i];

      try {
        if (jobId) {
          this.ingestQueue.start(jobId);
        }
        this.batchProgress = { current: i + 1, total: ingestCount };
        this.showProgressFor(ProgressScope.IngestManual, `[${i + 1}/${ingestCount}] ${file.basename}`);
        await this.wikiEngine.ingestSource(file, { batchCtx });
        if (this.wikiEngine.wasCancelled) {
          if (jobId) {
            this.ingestQueue.complete(jobId, false, 'Cancelled by user');
          }
          break;
        }
        if (jobId) {
          this.ingestQueue.complete(jobId, true);
        }
      } catch (error) {
        console.error(`(${i + 1}/${ingestCount}) ingestion failed: ${file.path}`, error);
        const errMsg = error instanceof Error ? error.message : String(error);
        new Notice(texts.errorIngestFailed + file.basename + ': ' + errMsg, NOTICE_ERROR);
        if (jobId) this.ingestQueue.complete(jobId, false, errMsg);
      }
    }

    this.batchProgress = null;
    this.dismissProgress();

    if (reports.length > 0) {
      const allCreated = [...new Set(reports.flatMap(r => r.createdPages))];
      const allUpdated = [...new Set(reports.flatMap(r => r.updatedPages))];
      const totalEntities = reports.reduce((sum, r) => sum + r.entitiesCreated, 0);
      const totalConcepts = reports.reduce((sum, r) => sum + r.conceptsCreated, 0);
      const totalContradictions = reports.reduce((sum, r) => sum + r.contradictionsFound, 0);
      const totalElapsed = reports.reduce((sum, r) => sum + (r.elapsedSeconds || 0), 0);
      const allFailedItems = reports.flatMap(r => r.failedItems);
      const allCollisions = reports.flatMap(r => r.collisions || []);
      const allRejectedFiles = reports.flatMap(r => r.rejectedFiles || []);
      const allSuccess = reports.every(r => r.success);

      const aggregated: IngestReport = {
        sourceFile: sourceLabel,
        createdPages: allCreated,
        updatedPages: allUpdated,
        entitiesCreated: totalEntities,
        conceptsCreated: totalConcepts,
        failedItems: allFailedItems,
        collisions: allCollisions,
        contradictionsFound: totalContradictions,
        success: allSuccess,
        elapsedSeconds: totalElapsed,
        skippedFiles: skippedCount,
        totalFilesInFolder: totalFiles,
        rejectedFiles: allRejectedFiles,
      };

      new IngestReportModal(this.app, aggregated, this.settings.language).open();
    } else {
      const texts2 = TEXTS[this.settings.language];
      new Notice(texts2.batchIngestComplete
        .replace('{success}', '0')
        .replace('{total}', String(ingestCount))
        .replace('{fail}', String(ingestCount)), 10000);
    }
  },
};
