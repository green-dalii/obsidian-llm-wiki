// Wiki Engine — Core Wiki ingestion and management logic.
// Orchestrates sub-modules: SourceAnalyzer, PageFactory, ConversationIngestor,
// LintFixer, ContradictionManager, and system-prompts.

import { App, TFile, TFolder, Notice, normalizePath } from 'obsidian';
import {
  LLMWikiSettings,
  LLMClient,
  SourceAnalysis,
  ContradictionInfo,
  IngestReport,
  IngestOptions,
  BatchRequirementsContext,
  EngineContext,
} from '../types';
import { PROMPTS } from '../prompts';
import { getText } from '../core/i18n';
import { slugify } from '../core/slug';
import { resolveSourceSlug } from '../core/source-slug';
import { parseFrontmatter, upsertFrontmatterField, mergeFrontmatterArrayField, extractBody } from '../core/frontmatter';
import { setGenerationComplete } from '../core/incomplete-page-cleaner';
import { convertPdfToMarkdown, UnsupportedProviderError, EncryptedPdfError } from '../core/pdf-converter';
import { hashBody, checkContentRequirements } from '../core/source-requirements';
import { resolveModelForTask } from '../core/model-resolver';
import type { SourceRejection } from '../core/source-requirements';
// v1.25.1 Phase C-PR1: detectRateLimitFailures is invoked exclusively by runBatchedWithRetry (engine-internals/page-batch-runner.ts).
import { formatRateLimitNotice } from '../core/rate-limit';
import { extractSourceTags } from '../core/arrays';
import { cleanMarkdownResponse } from '../core/markdown';
import { SchemaManager, SchemaTask } from '../schema/schema-manager';
import {
  buildSystemPrompt,
  getSectionLabels,
  applySectionLabels,
} from './system-prompts';
import { getExistingWikiPages } from './lint/get-existing-pages';
import { fixDeadLink } from './lint/fix-dead-link';
import { fillEmptyPage } from './lint/fill-empty-page';
import { deleteEmptyStubs } from './lint/delete-empty-stubs';
import { linkOrphanPage } from './lint/link-orphan';
import { mergeDuplicatePages } from './lint/merge-duplicates';
import { fixPollutedPage } from './lint/fix-polluted-page';
import { ContradictionManager } from './contradictions';
import { fixPollutedSources } from '../core/sources-normalizer';
// v1.25.1 Phase C-PR1: buildLogHeader moved into LogWriter.
import { UNIVERSAL_LINK_CONSTRAINTS } from './prompts/constraints';
import { SourceAnalyzer } from './source-analyzer';
import { TOKENS_PAGE_GENERATION, NOTICE_ABORT, NOTICE_RATE_LIMIT, NOTICE_NORMAL, PAGES_CACHE_TTL_MS, COMPATIBLE_SOURCE_EXTENSIONS } from '../constants';
import { PageFactory } from './page-factory';
import { ConversationIngestor, ConversationOrchestration, formatConversation, ConversationHistory } from './conversation-ingest';
import type { Graph } from '../core/build-graph';
import { runBatchedWithRetry } from './engine-internals/page-batch-runner';
import { GraphCache, type GraphPageLoader } from './engine-internals/graph-cache';
import { IndexGenerator } from './engine-internals/index-generator';
import { LogWriter } from './engine-internals/log-writer';
import { dedupPages } from './engine-internals/dedup-pages';

/**
 * Issue #173 Symptom B: drop exact-string duplicates from a page-path list
 * while preserving first-occurrence order. Used to dedup `analysis.created_pages`
 * before assembling the IngestReport so a duplicate surface-form (e.g. two
 * "intelligent-xtraction-and-processing" entries from one batch) does not
 * inflate the report count or the "Created" listing.
 *
 * v1.25.1 Phase C-PR1: re-exported from engine-internals/dedup-pages.ts.
 * WikiEngine callers see no API change.
 */
export { dedupPages } from './engine-internals/dedup-pages';

/**
 * Walk the `error.cause` chain to find the deepest meaningful message.
 *
 * v1.25.0 PR3 follow-up #6 (Bug B, e2e 2026-07-17): Vercel AI SDK v6 wraps
 * provider rejections in `AI_APICallError`, whose top-level message reads
 * `"AI_APICallError: Failed to deserialize the JSON body into the target
 * type: messages[1]: unknown variant \`file\`, expected \`text\`"`. The
 * actual provider-level rejection phrase (in this case `unknown variant
 * \`file\`, expected \`text\``) lives in `error.cause.message`. Flattening
 * to top-level loses it; inspecting only `error.message` causes the
 * classifier to miss obvious PDF-shape errors and surface a raw
 * `errorIngestFailed` toast instead of the localized PDF guidance.
 *
 * Returns the deepest provider-level message we can find, falling back to
 * the top-level message when the chain is empty or generic. Hard cap on
 * depth (4) prevents cycle-induced hangs.
 */
export function inspectCauseChain(error: unknown): string {
  const seen = new Set<unknown>();
  let current: unknown = error;
  let deepest = errorToString(current);
  for (let i = 0; i < 4; i++) {
    if (!(current instanceof Error)) break;
    const next = (current as { cause?: unknown }).cause;
    if (next === undefined || next === null || seen.has(next)) break;
    seen.add(next);
    const nextMessage = errorToString(next);
    if (nextMessage) {
      deepest = nextMessage;
    }
    current = next;
  }
  return deepest;
}

function errorToString(value: unknown): string {
  if (value instanceof Error) return value.message;
  // Use the value's own primitive stringification (boolean / number),
  // but avoid the default Object.toString "useful only for debugging" path
  // for plain objects — ES2023 doesn't expose a clean gate here, so we
  // gate on typeof and return an empty string otherwise (callers
  // tolerate empty strings and will fall back to top-level message).
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

// v1.25.1 Phase C-PR1: setsEqual moved to engine-internals/graph-cache.ts
// (private to GraphCache). Removed from wiki-engine.ts to avoid duplicate export;
// no external callers — see git grep before this change.

export class WikiEngine {
  private app: App;
  settings: LLMWikiSettings;
  private llmClient: LLMClient | null;
  private getLLMClient: () => LLMClient | null;
  private schemaManager: SchemaManager;
  private onFileWrite: ((path: string) => void) | null;
  private onProgress: ((message: string) => void) | null;
  private onDone: ((report: IngestReport) => void) | null;
  /**
   * #164: invoked when an interactive ingest hits a duplicate. Returns true to
   * re-ingest anyway, false to skip. Wired by main.ts to a confirmation modal;
   * left null for non-interactive (folder/watcher) ingest, which auto-skips.
   */
  onConfirmReingest: ((file: TFile, rejection: SourceRejection) => Promise<boolean>) | null = null;

  private contradictionManager: ContradictionManager;
  private sourceAnalyzer: SourceAnalyzer;
  private pageFactory: PageFactory;
  private conversationIngestor: ConversationIngestor;
  private abortController: AbortController | null = null;
  private lintAbortController: AbortController | null = null;
  wasCancelled = false;
  private onIngestionStart: ((filename?: string) => void) | null = null;
  private onIngestionEnd: (() => void) | null = null;
  private onLintStart: (() => void) | null = null;
  private onLintEnd: (() => void) | null = null;
  private onStatusBarUpdate: ((text: string) => void) | null = null;
  private pagesCache: Array<{path: string; title: string; wikiLink: string; aliases?: string[]}> | null = null;
  private pagesCacheTime = 0;
  private readonly PAGES_CACHE_TTL_MS = PAGES_CACHE_TTL_MS;
  // #164: ingested content-hash snapshot, cached on the same TTL/lifecycle as
  // pagesCache so back-to-back single-file ingests don't re-walk the vault.
  private ingestedHashesCache: Set<string> | null = null;
  private ingestedHashesCacheTime = 0;
  // v1.24.0 Bug A: shared graph cache for PPR — built lazily from loaded page
  // content, invalidated on every vault write via invalidatePageCaches.
  // v1.25.1 Phase C-PR1: extracted to engine-internals/graph-cache.ts;
  // WikiEngine keeps a private holder + facade methods for backward compat.
  private graphCache!: GraphCache;
  // v1.25.1 Phase C-PR1: extracted to engine-internals/index-generator.ts.
  private indexGenerator!: IndexGenerator;
  // v1.25.1 Phase C-PR1: extracted to engine-internals/log-writer.ts.
  private logWriter!: LogWriter;
  private ctx: EngineContext;
  /** SubtleCrypto from `activeWindow.crypto.subtle`. Used by PDF cache. */
  private subtle: SubtleCrypto | undefined;

  constructor(
    app: App,
    settings: LLMWikiSettings,
    getLLMClient: () => LLMClient | null,
    schemaManager: SchemaManager,
    onFileWrite?: (path: string) => void,
    onProgress?: (message: string) => void,
    onDone?: (report: IngestReport) => void,
    subtle?: SubtleCrypto
  ) {
    this.app = app;
    this.settings = settings;
    this.llmClient = null;
    this.getLLMClient = getLLMClient;
    this.schemaManager = schemaManager;
    this.onFileWrite = onFileWrite || null;
    this.onProgress = onProgress || null;
    this.onDone = onDone || null;
    this.subtle = subtle;

    const ctx: EngineContext = {
      app: this.app,
      settings: this.settings,
      getClient: () => this.getLLMClient(),
      createOrUpdateFile: (p, c) => this.createOrUpdateFile(p, c),
      deleteFile: p => this.deleteFile(p),
      tryReadFile: p => this.tryReadFile(p),
      buildSystemPrompt: task =>
        buildSystemPrompt(this.settings, t => this.schemaManager.getSchemaContext(t as SchemaTask), task),
      getSectionLabels: () => getSectionLabels(this.settings),
      getExistingWikiPages: () =>
        getExistingWikiPages(this.app, this.settings.wikiFolder),
      getSchemaContext: t => this.schemaManager.getSchemaContext(t as SchemaTask),
      ...(this.subtle ? { subtle: this.subtle } : {}),
      onFileWrite: path => this.onFileWrite?.(path),
      onProgress: msg => this.notifyProgress(msg),
      onDone: report => this.onDone?.(report),
    };

    this.ctx = ctx;

    this.contradictionManager = new ContradictionManager(ctx);
    this.sourceAnalyzer = new SourceAnalyzer(ctx);
    this.pageFactory = new PageFactory(ctx);

    const orch: ConversationOrchestration = {
      ensureWikiStructure: () => this.ensureWikiStructure(),
      apiDelay: ms => this.apiDelay(ms),
      generateIndex: () => this.generateIndexFromEngine(),
      updateLog: (op, analysis) => this.updateLog(op, analysis),
    };
    this.conversationIngestor = new ConversationIngestor(ctx, this.pageFactory, orch);

    // v1.25.1 Phase C-PR1: PPR graph cache (extracted from inline state in
    // WikiEngine). Loader resolves path-keyed reads with vault normalization.
    const graphLoader: GraphPageLoader = async (allPaths) => {
      // v1.24.1 PATCH Phase 5.5.0 hotfix fix: `allPaths` is in wiki-index format
      // (`entities/Foo`, `concepts/Bar`) — relative to the wiki folder, with NO
      // `wiki/` prefix and NO `.md` suffix. `tryReadFile` expects full vault paths
      // (`wiki/entities/Foo.md`), so normalize before reading.
      const wikiPrefix = this.settings.wikiFolder + '/';
      const readTasks = [...allPaths].map(async (path) => {
        const vaultPath = path.startsWith(wikiPrefix)
          ? path
          : `${wikiPrefix}${path}`;
        const fullPath = vaultPath.endsWith('.md') ? vaultPath : `${vaultPath}.md`;
        const content = await this.tryReadFile(fullPath);
        return { path, content: content ?? '' };
      });
      return Promise.all(readTasks);
    };
    this.graphCache = new GraphCache({ wikiFolder: this.settings.wikiFolder, loadPages: graphLoader });

    // v1.25.1 Phase C-PR1: index generator (extracted from inline state in
    // WikiEngine). Reads from app.vault via injected closures; never holds App.
    this.indexGenerator = new IndexGenerator({
      wikiFolder: this.settings.wikiFolder,
      wikiLanguage: this.settings.wikiLanguage ?? '',
      readFile: (file: TFile) => this.app.vault.read(file),
      writeFile: (path: string, content: string) => this.createOrUpdateFile(path, content),
    });

    // v1.25.1 Phase C-PR1: log writer (extracted from inline state in WikiEngine).
    // Reads/writes the wiki log.md via injected closures (tryReadFile/createOrUpdateFile).
    this.logWriter = new LogWriter({
      wikiFolder: this.settings.wikiFolder,
      wikiLanguage: this.settings.wikiLanguage ?? '',
      readFile: (path: string) => this.tryReadFile(path),
      writeFile: (path: string, content: string) => this.createOrUpdateFile(path, content),
    });
  }

  setFileWriteCallback(cb: (path: string) => void): void {
    this.onFileWrite = cb;
  }

  setProgressCallback(cb: ((message: string) => void) | null): void {
    this.onProgress = cb;
  }

  getProgressCallback(): ((message: string) => void) | null {
    return this.onProgress;
  }

  setStatusBarUpdateCallback(cb: ((text: string) => void) | null): void {
    this.onStatusBarUpdate = cb;
  }

  updateStatusBar(text: string): void {
    this.onStatusBarUpdate?.(text);
  }

  private notifyProgress(msg: string): void {
    this.onProgress?.(msg);
    this.updateStatusBar(msg);
  }

  /**
   * True iff the path falls inside the wiki's content folders (entities/concepts/sources).
   * Other files inside `wiki/` (log.md, schema/, index.md) are NOT content pages
   * and must not be stamped with `generation_complete` — that frontmatter marker
   * only applies to actual wiki entity/concept/source pages (Issue #170).
   */
  private isInWikiContentFolder(path: string, wikiFolder: string): boolean {
    return path.startsWith(`${wikiFolder}/entities/`) ||
           path.startsWith(`${wikiFolder}/concepts/`) ||
           path.startsWith(`${wikiFolder}/sources/`);
  }

  /**
   * Issue #170: stamp `generation_complete: true` on a wiki page after a
   * successful write. The pre-ingest requirement that pages carry this flag
   * is implicit — if it's missing, the page is treated as legacy (preserved).
   * This is best-effort: if re-read fails we just leave the file as-is; the
   * startup self-scan will catch any incomplete pages.
   */
  private markPageComplete(path: string): void {
    void (async () => {
      try {
        const current = await this.tryReadFile(path);
        if (!current) return;
        const flipped = setGenerationComplete(current, true);
        if (flipped === current) return;
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
          await this.app.vault.process(file, () => flipped);
        }
      } catch (e) {
        console.warn(`[wiki-engine] markPageComplete failed for ${path}:`, e);
      }
    })();
  }

  setDoneCallback(cb: ((report: IngestReport) => void) | null): void {
    this.onDone = cb;
  }

  setIngestionCallbacks(onStart: ((filename?: string) => void) | null, onEnd: (() => void) | null): void {
    this.onIngestionStart = onStart;
    this.onIngestionEnd = onEnd;
  }

  setLintCallbacks(onStart: (() => void) | null, onEnd: (() => void) | null): void {
    this.onLintStart = onStart;
    this.onLintEnd = onEnd;
  }

  cancelIngestion(): void {
    if (this.abortController) {
      this.abortController.abort();
      const msg = getText(this.settings.language, 'ingestionCancelling');
      new Notice(msg, NOTICE_ABORT);
      this.onProgress?.(msg);
      console.debug('Ingestion cancellation requested');
    }
  }

  isIngesting(): boolean {
    return this.abortController !== null;
  }

  startLintOperation(): AbortSignal {
    this.lintAbortController = new AbortController();
    this.onLintStart?.();
    return this.lintAbortController.signal;
  }

  cancelLint(): void {
    if (this.lintAbortController) {
      this.lintAbortController.abort();
      const msg = getText(this.settings.language, 'ingestionCancelling');
      new Notice(msg, NOTICE_ABORT);
      console.debug('[lint] cancellation requested');
    }
  }

  isLintRunning(): boolean {
    return this.lintAbortController !== null;
  }

  endLintOperation(): void {
    if (this.lintAbortController === null) return;
    this.lintAbortController = null;
    this.onLintEnd?.();
  }

  private checkCancelled(): void {
    if (this.abortController?.signal.aborted) {
      throw new DOMException('Ingestion cancelled by user', 'AbortError');
    }
  }

  // Proxy for lint-controller to access LintFixer methods without exposing the class
  async fixPollutedPage(oldPath: string, newBasename: string): Promise<string> {
    return fixPollutedPage(this.ctx, oldPath, newBasename);
  }

  /** Issue #137: get the current LLM client. All consumers (page-factory,
   * source-analyzer, conversation-ingestor, contradictions) get their client
   * via this getter, which forwards through the shared closure `() => this.llmClient`
   * that main.ts updates via `initializeLLMClient()`. */
  private get client(): LLMClient {
    const c = this.getLLMClient();
    if (!c) throw new Error('LLM Client not initialized');
    return c;
  }

  private applySectionLabels(prompt: string): string {
    return applySectionLabels(prompt, this.settings);
  }

  /**
   * Apply new settings. Returns `true` iff `wikiFolder` changed (and the
   * path-keyed caches were therefore dropped). The return value lets
   * `main.saveSettings()` act on the same condition in one pass without
   * exposing the cache-invalidation knob.
   */
  updateSettings(settings: LLMWikiSettings): boolean {
    // Compare BEFORE assigning so a same-folder update doesn't drop the cache.
    const wikiFolderChanged = settings.wikiFolder !== this.settings.wikiFolder;
    this.settings = settings;
    this.ctx.settings = settings;
    if (wikiFolderChanged) {
      this.invalidatePageCaches();
    }
    return wikiFolderChanged;
  }

  /**
   * Build a shared dedup context for a folder/batch ingest run (#164). The
   * `ingested` snapshot reads content hashes from source-page frontmatter via the
   * (cached) metadata cache — no disk reads. Pass the same context to every
   * ingestSource call in the batch so within-batch duplicates are caught too.
   */
  createBatchContext(): BatchRequirementsContext {
    return { seen: new Set<string>(), ingested: this.buildIngestedHashes() };
  }

  /**
   * Content hashes already present in the wiki, read from source-page
   * frontmatter. Cached on the same TTL as pagesCache and invalidated on every
   * file write (via invalidatePageCaches), so a fresh ingest is always seen on
   * the next call while back-to-back rejected/skip checks reuse one snapshot.
   * The returned set is read-only to callers (only `seen` is mutated per batch).
   */
  private buildIngestedHashes(): Set<string> {
    const now = Date.now();
    if (this.ingestedHashesCache && (now - this.ingestedHashesCacheTime) < this.PAGES_CACHE_TTL_MS) {
      return this.ingestedHashesCache;
    }
    const hashes = new Set<string>();
    const prefix = normalizePath(`${this.settings.wikiFolder}/sources`) + '/';
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!f.path.startsWith(prefix)) continue;
      const fm = this.app.metadataCache.getFileCache(f)?.frontmatter as { contentHash?: unknown } | undefined;
      if (typeof fm?.contentHash === 'string' && fm.contentHash) hashes.add(fm.contentHash);
    }
    this.ingestedHashesCache = hashes;
    this.ingestedHashesCacheTime = Date.now();
    return hashes;
  }

  /** Invalidate both write-dependent caches. Called after every vault write/delete. */
  private invalidatePageCaches(): void {
    this.pagesCache = null;
    this.ingestedHashesCache = null;
    this.graphCache.invalidate();
  }

  /**
   * v1.24.0 Bug A: public graph invalidation. Idempotent; drops the engine-level
   * PPR graph cache so the next query rebuilds it from current vault content.
   * Called by main.ts onIngestDoneDispatch across every open QueryView leaf.
   *
   * v1.25.1 Phase C-PR1: facade over GraphCache.invalidate().
   */
  invalidateGraph(): void {
    this.graphCache.invalidate();
  }

  /**
   * v1.24.0: expose buildSystemPrompt so lint phases can compose their
   * `system` prompt through the shared composer (language directive + schema
   * context + active tag vocabulary) — exactly like EngineContext and the
   * fix-runners. Lint phases call this instead of raw getSchemaContext.
   */
  async buildSystemPrompt(task: SchemaTask): Promise<string | undefined> {
    return buildSystemPrompt(this.settings, t => this.schemaManager.getSchemaContext(t as SchemaTask), task);
  }

  /**
   * v1.24.0 Bug A: shared graph builder for PPR. Returns a cached Graph when
   * the requested path set is unchanged, otherwise rebuilds by reading every
   * path in `allPaths` from the vault.
   *
   * v1.25.1 Phase C-PR1: facade over GraphCache.getOrBuild().
   */
  async getOrBuildGraph(allPaths: Set<string>): Promise<Graph> {
    return this.graphCache.getOrBuild(allPaths);
  }

  /**
   * Pre-ingest requirements gate (#164). Hard rejects: empty/whitespace/
   * frontmatter-only body, and incompatible file type. Uniqueness: content-hash
   * duplicates (within the batch and already in the wiki). Returns the first
   * failing reason, or null to proceed. On proceed, records the hash in the batch
   * so a later identical file in the same run is caught.
   */
  async checkRequirements(file: TFile, content: string, batch?: BatchRequirementsContext): Promise<SourceRejection | null> {
    const contentRejection = checkContentRequirements({
      extension: file.extension,
      content,
      allowedExtensions: COMPATIBLE_SOURCE_EXTENSIONS,
    });
    if (contentRejection) return contentRejection;

    const hash = hashBody(extractBody(content));
    if (batch?.seen.has(hash)) return { reason: 'duplicate', detail: 'duplicate of another file in this batch' };
    const ingested = batch?.ingested ?? this.buildIngestedHashes();
    if (ingested.has(hash)) return { reason: 'duplicate', detail: 'content already ingested' };

    batch?.seen.add(hash);
    return null;
  }

  /**
   * Map a rejection reason to its localized Notice key.
   *
   * v1.25.0 PR2 redo: PDF provider-unsupported rejections route through
   * `sourceRejectedPdfUnsupported` (restored in 10 locales). Without this
   * mapping, users would see the generic "empty content" Notice for a PDF
   * their provider can't handle — the dedicated i18n key would be orphaned.
   */
  private rejectionNoticeKey(reason: SourceRejection['reason']): 'sourceRejectedEmpty' | 'sourceRejectedType' | 'sourceRejectedDuplicate' | 'sourceRejectedPdfUnsupported' {
    if (reason === 'incompatible-type') return 'sourceRejectedType';
    if (reason === 'duplicate') return 'sourceRejectedDuplicate';
    if (reason === 'unsupported-pdf') return 'sourceRejectedPdfUnsupported';
    return 'sourceRejectedEmpty';
  }

  /** Log + (interactive only) notify + report a gate skip without creating any pages. */
  private reportSkip(file: TFile, rejection: SourceRejection, opts?: IngestOptions): void {
    console.warn(`[Ingest skipped] ${file.path}: ${rejection.reason}${rejection.detail ? ` — ${rejection.detail}` : ''}`);
    // Interactive (single-file) ingest shows a Notice; folder/watcher stay quiet
    // (the batch summary / console covers them) to avoid Notice spam.
    if (opts?.interactive) {
      new Notice(
        getText(this.settings.language, this.rejectionNoticeKey(rejection.reason)).replace('{filename}', file.basename),
        NOTICE_NORMAL
      );
    }
    this.onDone?.({
      sourceFile: file.path,
      createdPages: [],
      updatedPages: [],
      entitiesCreated: 0,
      conceptsCreated: 0,
      failedItems: [],
      collisions: [],
      contradictionsFound: 0,
      success: true,
      skipped: true,
      rejectedFiles: [{ path: file.path, reason: rejection.reason, detail: rejection.detail }],
      elapsedSeconds: 0,
      // v1.22.6 #204: Propagate trigger so completion can route UI.
      trigger: opts?.trigger,
    });
  }

  /**
   * v1.25.0 PR3 follow-up #2 (P1 #3): best-effort classifier for LLM
   * errors that look like "this endpoint rejected the PDF binary".
   *
   * We don't try to be exhaustive (providers use different phrasings for
   * "I don't support PDFs": 400, 415, "file part", "mediaType", etc.).
   * The intent is to route the obvious cases — "rejected PDF", file part
   * media-type errors, or "PDF input not supported" — to the localized
   * `sourceRejectedPdfUnsupported` Notice, while transient network errors
   * and generic 5xx still bubble up to the outer ingest error path.
   */
  private isPdfRelatedLlmError(message: string): boolean {
    const lower = message.toLowerCase();
    // v1.25.0 PR3 follow-up #3 (P2): tightened — require BOTH a rejection verb
    // AND a PDF/media marker. Pre-fix version substring-matched on 'pdf' alone,
    // which misclassified 413 size-limit errors, internal 'pdf_data'
    // null-derefs, and other PDF-adjacent strings as "provider doesn't
    // support PDF", misleading users into disabling `forcePdfSupport` for
    // non-PDF issues.
    //
    // v1.25.0 PR3 follow-up #6 (Bug B, e2e 2026-07-17): added `unknown` and
    // `expected` to catch Rust-serde-style schema-reject messages from
    // OpenAI-compatible runtimes ("unknown variant `file`, expected `text`"),
    // which is the dominant shape when the LLM endpoint does not implement
    // the multipart file content schema (Ollama, vLLM, GLM, etc.).
    const hasRejectionVerb =
      lower.includes('reject') ||
      lower.includes('not support') ||
      lower.includes('unsupported') ||
      lower.includes('invalid') ||
      lower.includes('not allowed') ||
      lower.includes('unknown') ||
      lower.includes('expected');
    // v1.25.0 PR3 follow-up #6 (Bug B, e2e 2026-07-17): `file_part`,
    // `mediatype`, and the multi-word content-part phrases are still
    // preferred when present, but a single-word `file` marker is also
    // accepted as long as the rejection verb set fires. This covers the
    // dominant OpenAI-compat-Rust serde schema reject:
    //   "messages[1]: unknown variant `file`, expected `text`"
    // which has neither "pdf" nor "mediatype" — it's pure schema-tier.
    // The verb set (rejection token) is the primary gate; the marker just
    // narrows the search.
    const hasPdfMarker =
      lower.includes('pdf') ||
      lower.includes('application/pdf') ||
      lower.includes('file part') ||
      lower.includes('file_part') ||
      lower.includes('media type') ||
      lower.includes('mediatype') ||
      lower.includes('variant') ||
      lower.includes('schema') ||
      /\bfile\b/.test(lower);
    return hasRejectionVerb && hasPdfMarker;
  }

  /**
   * v1.25.0 PR2 redo + PR3: PDF ingest branch.
   *
   * Converts the PDF binary to Markdown via the configured LLM provider's
   * native PDF support (or `forcePdfSupport` for compatible providers), then
   * re-enters `ingestSource` with the converted markdown threaded via
   * `IngestOptions.contentOverride`.
   *
   * Artifact policy: the cache (`.obsidian/plugins/karpathywiki/pdf-cache/`) is
   * always the source of truth. When the user opts in via `writePdfMarkdownToVault`,
   * the converted markdown is also written to `<dir>/<basename>.pdf.md` next to
   * the source PDF. Otherwise (default, cache-only) no sidecar is written — the
   * vault contains no implementation artifacts from PDF ingestion.
   *
   * Errors are caught and surfaced via the standard `reportSkip` path so
   * the user sees a localized Notice rather than an unhandled exception.
   */
  private async ingestPdfSource(file: TFile, opts?: IngestOptions): Promise<void> {
    // Surface progress so the user knows the PDF is being read + converted.
    // A single Notice is shown, and the progress callback is updated so batch
    // ingest can reflect it in its progress bar. The main progress bar is
    // reserved for stage updates from the inner ingestSource run.
    const lang = this.settings.language;
    const pdfMsg = getText(lang, 'pdfReadingInProgress').replace('{filename}', file.basename);
    new Notice(pdfMsg, NOTICE_NORMAL);
    this.onProgress?.(pdfMsg);

    let conversionResult;
    try {
      conversionResult = await convertPdfToMarkdown({
        app: this.app,
        // Narrow to the converter's settings shape so the provider gate
        // sees `forcePdfSupport` (typed, not `as never`).
        settings: {
          provider: this.settings.provider,
          apiKey: this.settings.apiKey,
          baseUrl: this.settings.baseUrl,
          model: this.settings.model,
          forcePdfSupport: this.settings.forcePdfSupport,
        },
        pdfFile: file,
        llmClient: this.getLLMClient() as never,
        resolveModelForTask: (settings, task) =>
          resolveModelForTask(this.settings, task as 'ingest' | 'lint' | 'query'),
        ...(this.subtle ? { subtle: this.subtle } : {}),
        // v1.25.0 PR3 follow-up #8 (Bug D): thread the engine's
        // AbortSignal through to the LLM call. When the user clicks
        // the status bar during PDF conversion, cancelIngestion()
        // flips this signal aborted; AI SDK v6 propagates it to the
        // underlying HTTP request and returns early. Pre-fix the
        // signal was ignored and the LLM call ran to completion even
        // after the user clicked cancel.
        ...(this.abortController ? { abortSignal: this.abortController.signal } : {}),
      });
    } catch (error) {
      if (error instanceof UnsupportedProviderError) {
        this.reportSkip(file, { reason: 'unsupported-pdf', detail: error.message }, opts);
        return;
      }
      if (error instanceof EncryptedPdfError) {
        this.reportSkip(file, { reason: 'unsupported-pdf', detail: error.message }, opts);
        return;
      }
      // v1.25.0 PR3 follow-up #2 (P1 #3): LLM errors during PDF conversion
      // surface via the localized `sourceRejectedPdfUnsupported` Notice so the
      // user sees actionable guidance ("toggle Force PDF Support or switch
      // provider") rather than a generic ingest-error toast. The user opted
      // into a PDF-capable flow; an LLM-side rejection of the PDF binary is
      // a rejection of the source, not an unexpected runtime error.
      //
      // We still re-throw non-PDF-shaped errors (e.g. vault adapter IO
      // failures, abort signals) so the outer ingestSource can apply its
      // standard retry / log semantics.
      //
      // v1.25.0 PR3 follow-up #6 (Bug B, e2e 2026-07-17): Vercel AI SDK v6
      // wraps provider rejections in `AI_APICallError` whose top-level
      // message is `"AI_APICallError: Failed to deserialize the JSON body
      // into the target type: messages[1]: unknown variant \`file\`,
      // expected \`text\`"`. The actual provider-level rejection phrase is
      // in `error.cause.message`. inspectCauseChain() walks the chain to
      // find the deepest provider-level message; classifier then runs on
      // that. The verb set is also extended with `unknown` to capture
      // Rust-serde-style schema reject messages ("unknown variant X,
      // expected Y") which are the dominant shape from OpenAI-compatible
      // runtimes (Ollama, vLLM, etc.).
      const message = inspectCauseChain(error);
      if (this.isPdfRelatedLlmError(message)) {
        this.reportSkip(file, { reason: 'unsupported-pdf', detail: message }, opts);
        return;
      }
      throw error;
    }

    // v1.25.0 PR3: optional sidecar write. When the user opts in via
    // `writePdfMarkdownToVault`, persist the converted markdown next to the
    // source PDF (`<dir>/<basename>.pdf.md`). Default off → cache-only; the
    // `.obsidian` cache remains the only artifact. The write happens before
    // re-entering the standard ingest path so the sidecar reflects the exact
    // markdown fed to the analysis pipeline.
    //
    // We deliberately write via the vault adapter directly rather than
    // `createOrUpdateFile` because: (a) the sidecar is a plain copy of
    // LLM-converted markdown — no pollution detection needed; (b) writing
    // through createOrUpdateFile would fire onFileWrite + invalidatePageCaches,
    // which could trigger auto-ingest cascades if the source folder is watched.
    if (this.settings.writePdfMarkdownToVault === true) {
      const dir = file.parent?.path ?? '';
      const rawPath = dir ? `${dir}/${file.basename}.pdf.md` : `${file.basename}.pdf.md`;
      const sidecarPath = normalizePath(rawPath);
      const existing = this.app.vault.getAbstractFileByPath(sidecarPath);
      if (existing instanceof TFile) {
        await this.app.vault.modify(existing, conversionResult.markdown);
      } else {
        await this.app.vault.create(sidecarPath, conversionResult.markdown);
      }
    }

    // Re-enter the standard ingest path with the converted markdown as a
    // virtual source body. The pipeline (analyzeSource → summary → entities
    // → concepts → related → index) runs unchanged — contentOverride flows
    // through IngestOptions into analyzeSource/createSummaryPage.
    return this.ingestSource(file, { ...opts, contentOverride: conversionResult.markdown });
  }

  async ingestSource(file: TFile, opts?: IngestOptions) {
    console.debug('=== Ingestion started ===');
    console.debug('Source file:', file.path);
    if (opts?.contentOverride !== undefined) {
      console.debug('Content override length:', opts.contentOverride.length);
    }

    // v1.25.0 PR3 follow-up #7 + #8 (Bug C + D, e2e 2026-07-17): cancellation
    // setup + status bar entry MUST happen BEFORE the PDF early-return at
    // :745 — the PDF branch (ingestPdfSource) is an early return that
    // would skip every line below, including the AbortController +
    // onIngestionStart that users need to (a) see which file is currently
    // being converted and (b) cancel a long LLM call without killing
    // Obsidian. Pre-fix, the status bar stayed on the initial "LLM wiki"
    // placeholder forever and the click-to-cancel button was a no-op.
    //
    // v1.25.0 PR3 follow-up #8 (Bug D, e2e 2026-07-17): once `convertPdfToMarkdown`
    // finishes, `ingestPdfSource` re-enters `ingestSource` with `contentOverride`
    // set (line 727) — so this setup block runs TWICE per PDF ingest. Without
    // the guard below, the second invocation would overwrite `this.abortController`
    // with a fresh controller whose `signal` is NOT aborted, even if the user
    // clicked the status bar to cancel during PDF conversion. The fresh
    // controller also overwrites any in-flight cancellation signal.
    //
    // Guard: only initialize the controller if none exists yet. This keeps
    // the *original* abort signal live for both PDF and re-entered text
    // flows, so a single cancel-click propagates through both stages.
    // `onIngestionStart` is idempotent at the main.ts callback level (it
    // simply sets status bar text), so we still re-emit it for visual
    // refresh — that doesn't grow any state.
    if (this.abortController === null) {
      this.wasCancelled = false;
      this.abortController = new AbortController();
      this.onIngestionStart?.(file.basename);
    }

    // v1.25.0 PR2 redo: PDF ingest path converts the PDF binary to markdown
    // via the configured LLM provider's native PDF support, caches by content
    // hash, then re-enters the standard ingest path with the markdown as
    // a virtual body (contentOverride). No sidecar file is written to the
    // vault; the cache in `.obsidian/` is the sole persistent artifact.
    //
    // Guard: only dispatch to the PDF branch when the caller has NOT
    // already provided a converted body — otherwise this would recurse
    // (ingestPdfSource re-enters ingestSource with contentOverride set).
    if (file.extension.toLowerCase() === 'pdf' && !opts?.contentOverride) {
      return this.ingestPdfSource(file, opts);
    }

    // #164 pre-ingest requirements gate — runs BEFORE any cancellation/UI setup so
    // a rejected file returns cleanly with nothing to tear down. Empty/type are
    // hard skips; a duplicate auto-skips, except interactive ingest prompts first.
    const fileContent = opts?.contentOverride ?? await this.app.vault.read(file);
    const rejection = opts?.forceReingest ? null : await this.checkRequirements(file, fileContent, opts?.batchCtx);
    if (rejection) {
      const confirmed = rejection.reason === 'duplicate' && opts?.interactive && this.onConfirmReingest
        ? await this.onConfirmReingest(file, rejection)
        : false;
      if (!confirmed) {
        this.reportSkip(file, rejection, opts);
        return;
      }
    }

    const totalStartTime = Date.now();

    // Setup cancellation support
    // v1.25.0 PR3 follow-up #7 (Bug C): AbortController / onIngestionStart
    // already initialized above (line ~700, before PDF dispatch) so the
    // status bar is correct and cancellation is wired for both PDF and
    // text flows. We intentionally do NOT re-create the AbortController
    // here — it would create a race window where cancelIngestion() could
    // abort the *previous* instance instead of the current one.

    // Long-source warning: large files trigger iterative batch extraction
    // (multiple LLM passes), which takes significantly longer than small files.
    const LONG_SOURCE_LINE_THRESHOLD = 1000;
    const lineCount = fileContent.split('\n').length;
    if (lineCount > LONG_SOURCE_LINE_THRESHOLD) {
      const sizeKB = Math.round(fileContent.length / 1024);
      new Notice(
        getText(this.settings.language, 'longSourceNotice')
          .replace('{filename}', file.basename)
          .replace('{lines}', String(lineCount))
          .replace('{size}', sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)}MB` : `${sizeKB}KB`),
        NOTICE_NORMAL
      );
      console.debug(`[Long Source] ${file.basename}: ${lineCount} lines, ${sizeKB}KB — long ingestion expected`);
    }

    this.onProgress?.(`Analyzing: ${file.basename}`);

    const failedItems: Array<{ type: 'entity' | 'concept'; name: string; reason: string }> = [];
    const collisions: Array<{ name: string; sourceType: 'entity' | 'concept'; targetType: 'entity' | 'concept'; targetPath: string }> = [];
    let analysis: SourceAnalysis | null = null;

    try {
      await this.ensureWikiStructure();

      // Stage 1: Source Analysis (contentOverride flows via opts)
      const analysisStart = Date.now();
      analysis = await this.sourceAnalyzer.analyzeSource(file, {
        ...(opts?.contentOverride !== undefined ? { contentOverride: opts.contentOverride } : {}),
      });
      if (!analysis) {
        throw new Error(`Source analysis failed for "${file.basename}". Check the developer console (Ctrl+Shift+I) for network or API errors. If you see SSL/network errors, verify your provider URL and network connection.`);
      }
      const analysisTime = Date.now() - analysisStart;
      console.debug(`[Time] Source analysis phase: ${analysisTime}ms`);
      console.debug('Analysis result:', JSON.stringify(analysis, null, 2));

      this.checkCancelled();

      const totalSteps = 1 + analysis.entities.length + analysis.concepts.length + analysis.related_pages.length + 2;
      let step = 1;

      const plannedPaths: string[] = [];
      const preserveCase = this.settings.slugCase === 'preserve';
      for (const entity of analysis.entities) {
        plannedPaths.push(normalizePath(`${this.settings.wikiFolder}/entities/${slugify(entity.name, preserveCase)}.md`));
      }
      for (const concept of analysis.concepts) {
        plannedPaths.push(normalizePath(`${this.settings.wikiFolder}/concepts/${slugify(concept.name, preserveCase)}.md`));
      }

      this.onProgress?.(`[${step}/${totalSteps}] Creating summary...`);
      await this.apiDelay();

      // Issue #155: derive the source slug (<basename>-<path fingerprint>) ONCE,
      // before any page is written, so the summary page, entity/concept backlinks,
      // and related pages all reference the same canonical [[sources/<slug>]].
      const sourceSlug = resolveSourceSlug(file.path, { preserveCase });

      // Stage 2: Summary Page Generation (contentOverride flows through opts)
      const summaryStart = Date.now();
      const summaryPage = await this.createSummaryPage(file, analysis, plannedPaths, sourceSlug, opts?.contentOverride);
      const summaryTime = Date.now() - summaryStart;
      console.debug(`[Time] Summary page generation: ${summaryTime}ms`);
      analysis.created_pages.push(summaryPage);

      // Stage 3: Entity/Concept Page Generation
      // v1.25.1 Phase C-PR1: retry + rate-limit template extracted to
      // engine-internals/page-batch-runner.ts (eliminates ~60% duplication
      // with Stage 4 and makes the retry path unit-testable).
      const pageGenStart = Date.now();
      let pageGenCount = 0;

      const concurrency = this.settings.pageGenerationConcurrency ?? 1;
      const batchDelay = this.settings.batchDelayMs ?? 300;

      if (concurrency > 1) {
        console.debug(`[Parallel] concurrency: ${concurrency}, batch delay: ${batchDelay}ms, total tasks: ${analysis.entities.length + analysis.concepts.length}`);
      } else {
        console.debug(`[Serial] generating pages sequentially, total tasks: ${analysis.entities.length + analysis.concepts.length}`);
      }

      const pageGenTasks = [
        ...analysis.entities.map((e, i) => ({
          id: `entity:${e.name}`,
          payload: { type: 'entity' as const, name: e.name, index: i },
        })),
        ...analysis.concepts.map((c, i) => ({
          id: `concept:${c.name}`,
          payload: { type: 'concept' as const, name: c.name, index: i },
        })),
      ];

      const pageGenResult = await runBatchedWithRetry<typeof pageGenTasks[number]['payload']>({
        tasks: pageGenTasks,
        concurrency,
        batchDelayMs: batchDelay,
        checkCancelled: () => this.checkCancelled(),
        apiDelay: (ms: number) => this.apiDelay(ms),
        onProgress: (_id) => {
          step++;
          const task = pageGenTasks[step - 1]?.payload;
          if (task) {
            this.onProgress?.(
              `[${step}/${totalSteps}] ${task.type === 'entity' ? 'Entity' : 'Concept'}: ${task.name}`
            );
          }
        },
        execute: async (task) => {
          if (task.type === 'entity') {
            const entity = analysis!.entities[task.index];
            try {
              const entityResult = await this.pageFactory.createOrUpdateEntityPage(entity, analysis!, file, [], sourceSlug);
              if (entityResult.path) {
                (entityResult.created ? analysis!.created_pages : analysis!.updated_pages)
                  .push(entityResult.path);
              }
              if (entityResult.collision) {
                console.debug(`Entity "${entity.name}" → collision with ${entityResult.collision.targetType}`);
                return {
                  success: true as const,
                  collision: entityResult.collision,
                };
              }
              return { success: true as const };
            } catch (error) {
              const reason = error instanceof Error ? error.message : String(error);
              console.error(`Entity "${entity.name}" failed:`, reason);
              return { success: false as const, failureReason: reason };
            }
          }
          const concept = analysis!.concepts[task.index];
          try {
            const conceptResult = await this.pageFactory.createOrUpdateConceptPage(concept, analysis!, file, [], sourceSlug);
            if (conceptResult.path) {
              (conceptResult.created ? analysis!.created_pages : analysis!.updated_pages)
                .push(conceptResult.path);
            }
            if (conceptResult.collision) {
              console.debug(`Concept "${concept.name}" → collision with ${conceptResult.collision.targetType}`);
              return {
                success: true as const,
                collision: conceptResult.collision,
              };
            }
            return { success: true as const };
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            console.error(`Concept "${concept.name}" failed:`, reason);
            return { success: false as const, failureReason: reason };
          }
        },
      });

      // Sync state out of the runner result (runner doesn't own our analysis state).
      pageGenCount = pageGenResult.succeeded + pageGenResult.failed.length;
      for (const f of pageGenResult.failed) {
        const isEntity = f.id.startsWith('entity:');
        failedItems.push({
          type: isEntity ? 'entity' : 'concept',
          name: f.id.split(':')[1] ?? f.id,
          reason: f.reason,
        });
      }
      for (const c of pageGenResult.collisions) {
        collisions.push(c);
      }
      if (pageGenResult.rateLimitInfo) {
        console.warn(
          `[Rate Limit] Page generation: ${pageGenResult.rateLimitInfo.count} item(s) failed with 429, ` +
          `suggested concurrency=${pageGenResult.rateLimitInfo.suggestedConcurrency}, ` +
          `delay=${pageGenResult.rateLimitInfo.suggestedDelay}ms`
        );
        new Notice(
          formatRateLimitNotice(pageGenResult.rateLimitInfo, this.settings.language),
          NOTICE_RATE_LIMIT
        );
      }
      const pageGenTime = Date.now() - pageGenStart;
      console.debug(`[Time] Page generation phase complete: ${pageGenTime}ms (avg ${pageGenCount > 0 ? Math.round(pageGenTime / pageGenCount) : 0}ms/page)`);

      // Stage 4: Related Pages Update (same runner, different execute fn)
      const relatedStart = Date.now();
      const relatedConcurrency = this.settings.pageGenerationConcurrency ?? 1;
      const relatedDelay = this.settings.batchDelayMs ?? 300;

      const relatedTasks = analysis.related_pages.map((name, idx) => ({
        id: `related:${name}`,
        payload: { name, index: idx, stepNum: step + idx + 1 },
      }));

      const relatedResult = await runBatchedWithRetry<typeof relatedTasks[number]['payload']>({
        tasks: relatedTasks,
        concurrency: relatedConcurrency,
        batchDelayMs: relatedDelay,
        checkCancelled: () => this.checkCancelled(),
        apiDelay: (ms: number) => this.apiDelay(ms),
        onProgress: (id) => {
          const task = relatedTasks.find(t => t.id === id);
          if (task) {
            this.onProgress?.(`[${task.payload.stepNum}/${totalSteps}] Updating: ${task.payload.name}`);
          }
        },
        execute: async (task) => {
          try {
            const updated = await this.pageFactory.updateRelatedPage(task.name, analysis!, file, sourceSlug);
            if (updated) {
              analysis!.updated_pages.push(task.name);
            }
            return { success: true as const };
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            console.error(`Related page "${task.name}" update failed:`, reason);
            return { success: false as const, failureReason: reason };
          }
        },
      });

      const relatedCount = relatedResult.succeeded;
      const relatedTotal = relatedTasks.length;
      const relatedTime = Date.now() - relatedStart;
      const relatedModeLabel = relatedConcurrency > 1 ? `parallel(concurrency:${relatedConcurrency})` : 'serial';
      console.debug(
        `[Time] Related page update phase complete: ${relatedTime}ms ` +
        `(${relatedModeLabel}, ${relatedCount}/${relatedTotal} pages succeeded)`
      );
      step += relatedTotal;

      if (relatedResult.rateLimitInfo) {
        console.warn(
          `[Rate Limit] Related pages update: ${relatedResult.rateLimitInfo.count} item(s) failed with 429, ` +
          `suggested concurrency=${relatedResult.rateLimitInfo.suggestedConcurrency}, ` +
          `delay=${relatedResult.rateLimitInfo.suggestedDelay}ms`
        );
        new Notice(
          formatRateLimitNotice(relatedResult.rateLimitInfo, this.settings.language),
          NOTICE_RATE_LIMIT
        );
      }

      // Stage 5: Contradiction Recording
      const contradictionStart = Date.now();
      for (const contradiction of analysis.contradictions) {
        try {
          await this.noteContradiction(contradiction);
        } catch {
          // non-critical
        }
      }
      const contradictionTime = Date.now() - contradictionStart;
      console.debug(`[Time] Contradiction recording phase: ${contradictionTime}ms (${analysis.contradictions.length} items)`);

      // Stage 6: Index & Log Update
      const indexStart = Date.now();
      step++;
      this.onProgress?.(`[${step}/${totalSteps}] Generating index...`);
      await this.generateIndexFromEngine();
      // Compute total elapsed wall time + source bytes BEFORE updateLog so the
      // log entry can record both (issue #122 v3.1: ingest history needs timing).
      const totalTime = Date.now() - totalStartTime;
      const sourceSize = fileContent?.length ?? 0;
      await this.updateLog('ingest', analysis, {
        durationSec: Math.round(totalTime / 1000),
        model: this.settings.model,
        sourceBytes: sourceSize,
      });
      const indexTime = Date.now() - indexStart;
      console.debug(`[Time] Index Index & log update: ${indexTime}ms`);

      const updated = analysis.updated_pages.length;
      // Issue #173 Symptom B: dedup before counting/listing — a duplicated
      // surface-form (e.g. the LLM emitting the same path twice) must not
      // inflate the report count or the "Created" listing.
      const dedupedCreatedPages = dedupPages(analysis.created_pages);
      const entitiesCreated = dedupedCreatedPages.filter(p => p.includes('/entities/')).length;
      const conceptsCreated = dedupedCreatedPages.filter(p => p.includes('/concepts/')).length;
      const modeLabel = (this.settings.pageGenerationConcurrency ?? 1) > 1 ? `parallel(concurrency:${this.settings.pageGenerationConcurrency})` : 'serial';
      // totalTime was computed above; do not redeclare here.

      console.debug('=== Ingestion complete ===');
      console.debug(`Ingestion complete [${modeLabel}]: Created ${dedupedCreatedPages.length} pages (${entitiesCreated} entities + ${conceptsCreated} concepts), Updated ${updated} pages, ${collisions.length} cross-type collisions`);
      console.debug(`[Total time] ${totalTime}ms (${Math.round(totalTime/1000)}s)`);
      console.debug('[Phase breakdown]:');
      console.debug(`  - Source analysis: ${analysisTime}ms`);
      console.debug(`  - Summary page generation: ${summaryTime}ms`);
      console.debug(`  - Page gen (${concurrency}concurrency): ${pageGenTime}ms`);
      console.debug(`  - Related page update: ${relatedTime}ms`);
      console.debug(`  - Contradiction recording: ${contradictionTime}ms`);
      console.debug(`  - Index & log: ${indexTime}ms`);

      // Show collision notice if any occurred
      if (collisions.length > 0) {
        new Notice(getText(this.settings.language, 'crossTypeCollisionNotice')
          .replace('{count}', String(collisions.length)), NOTICE_NORMAL);
      }

      this.onDone?.({
        sourceFile: file.path,
        createdPages: dedupedCreatedPages,
        updatedPages: analysis.updated_pages,
        entitiesCreated,
        conceptsCreated,
        failedItems,
        collisions,
        contradictionsFound: analysis.contradictions.length,
        success: true,
        elapsedSeconds: Math.round(totalTime / 1000),
        // v1.22.6 #204: Propagate trigger so completion can route UI.
        trigger: opts?.trigger,
      });

    } catch (error) {
      const createdPages = dedupPages(analysis?.created_pages || []);

      if (error instanceof DOMException && error.name === 'AbortError') {
        this.wasCancelled = true;
        console.debug('=== Ingestion cancelled by user ===');
        new Notice(getText(this.settings.language, 'ingestionCancelled'), NOTICE_NORMAL);
        this.onDone?.({
          sourceFile: file.path,
          createdPages,
          updatedPages: analysis?.updated_pages || [],
          entitiesCreated: createdPages.filter(p => p.includes('/entities/')).length,
          conceptsCreated: createdPages.filter(p => p.includes('/concepts/')).length,
          failedItems,
          collisions,
          contradictionsFound: analysis?.contradictions?.length || 0,
          success: false,
          cancelled: true,
          errorMessage: 'Cancelled by user',
          elapsedSeconds: Math.round((Date.now() - totalStartTime) / 1000),
          // v1.22.6 #204: Propagate trigger so completion can route UI.
          trigger: opts?.trigger,
        });
        return;
      }

      console.error('=== Ingestion failed ===');
      console.error('Error:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);

      this.onDone?.({
        sourceFile: file.path,
        createdPages,
        updatedPages: analysis?.updated_pages || [],
        entitiesCreated: createdPages.filter(p => p.includes('/entities/')).length,
        conceptsCreated: createdPages.filter(p => p.includes('/concepts/')).length,
        failedItems,
        collisions,
        contradictionsFound: analysis?.contradictions?.length || 0,
        success: false,
        errorMessage: errorMsg,
        elapsedSeconds: Math.round((Date.now() - totalStartTime) / 1000),
        // v1.22.6 #204: Propagate trigger so completion can route UI.
        trigger: opts?.trigger,
      });
      throw error;
    } finally {
      this.abortController = null;
      this.onIngestionEnd?.();
    }
  }

  private async apiDelay(ms?: number): Promise<void> {
    await new Promise(resolve => window.setTimeout(resolve, ms || 300));
  }

  async ensureWikiStructure() {
    const folders = [
      normalizePath(this.settings.wikiFolder),
      normalizePath(`${this.settings.wikiFolder}/entities`),
      normalizePath(`${this.settings.wikiFolder}/concepts`),
      normalizePath(`${this.settings.wikiFolder}/sources`)
    ];

    for (const folder of folders) {
      try {
        await this.app.vault.createFolder(folder);
        console.debug('Creating folder:', folder);
      } catch {
        // Folder already exists
      }
    }

    await this.schemaManager.ensureSchemaExists();
  }

  async createSummaryPage(file: TFile, analysis: SourceAnalysis, plannedPaths: string[] = [], sourceSlug?: string, contentOverride?: string): Promise<string> {
    const preserveCase = this.settings.slugCase === 'preserve';
    const slug = sourceSlug ?? slugify(file.basename, preserveCase);
    const path = normalizePath(`${this.settings.wikiFolder}/sources/${slug}.md`);
    // PDF branch: use the LLM-converted markdown instead of reading raw PDF
    // bytes (which would be garbage text). Text branch: unchanged.
    const content = contentOverride ?? await this.app.vault.read(file);

    // Issue #114: if the source page already exists with manually-set tags,
    // preserve them — re-ingesting a note must not overwrite corrections.
    // Priority: existing source-page tags > source-note tags > LLM concept names.
    const existingSource = await this.tryReadFile(path);
    const existingFm = existingSource ? parseFrontmatter(existingSource) : null;
    const existingTags = Array.isArray(existingFm?.tags) && existingFm.tags.length > 0
      ? existingFm.tags
      : null;

    // Issue #90: inherit tags from source note frontmatter when available,
    // so the generated summary page doesn't pollute the tag vocabulary with
    // LLM-derived concept names. Fallback to LLM-derived tags if source has none.
    const sourceTags = extractSourceTags(content);
    const tagsValue = existingTags
      ? existingTags.join(', ')
      : sourceTags.length > 0
        ? sourceTags.join(', ')
        : analysis.concepts.map(c => c.name).join(', ');

    const createdPagesList = plannedPaths.length > 0
      ? plannedPaths.map(p => {
          const relPath = p.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
          const name = relPath.split('/').pop() || relPath;
          return `- [[${relPath}|${name}]]`;
        }).join('\n')
      : analysis.entities.map(e => `- [[entities/${slugify(e.name, preserveCase)}|${e.name}]]`).join('\n') +
        '\n' +
        analysis.concepts.map(c => `- [[concepts/${slugify(c.name, preserveCase)}|${c.name}]]`).join('\n');

    const prompt = PROMPTS.generateSummaryPage
      .replace('{{source_title}}', analysis.source_title)
      .replace('{{content}}', content.substring(0, 500))
      .replace('{{analysis}}', JSON.stringify(analysis))
      .replace('{{created_pages_list}}', createdPagesList || '(none)')
      .replace(/{{source_file}}/g, file.path)
      .replace(/{{date}}/g, new Date().toISOString().split('T')[0])
      .replace('{{tags}}', tagsValue)
      .replace('{{constraints}}', UNIVERSAL_LINK_CONSTRAINTS);

    const finalPrompt = this.applySectionLabels(prompt);

    const pageContent = await this.client.createMessage({
      model: resolveModelForTask(this.settings, 'ingest'),
      max_tokens: TOKENS_PAGE_GENERATION,
      system: await this.buildSystemPrompt('summary'),
      messages: [{ role: 'user', content: finalPrompt }],
      ...(this.settings.disableThinking ? { enableThinking: false } : {}),
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    // #164: stamp a content fingerprint so future ingests can detect duplicates.
    // Injected programmatically — the LLM can't be trusted to emit it.
    let finalContent = upsertFrontmatterField(cleanedContent, 'contentHash', hashBody(extractBody(content)));

    // Issue #185: append the source note's curated frontmatter `aliases:`
    // to the generated `sources/<slug>` page. Merged inline (BEFORE the
    // write) so the page lands complete on disk in one `createOrUpdateFile`
    // call — no partial-write window. Downstream `fix-dead-link`
    // (slugify-normalized cross-page alias match at lint/scanners.ts:150 +
    // fix-dead-link.ts:237) consumes this pool to retarget dead links
    // written with inflection variants — a German "Exekutiven Funktionen"
    // link in body text resolves to the canonical page via this alias.
    //
    // `mergeFrontmatterArrayField` short-circuits when the additions are
    // already present (frontmatter.ts:211), so the `!==` check below is
    // purely an observability gate.
    if (analysis.source_note_aliases?.length) {
      const withAliases = mergeFrontmatterArrayField(finalContent, 'aliases', analysis.source_note_aliases);
      if (withAliases !== finalContent) {
        console.debug(
          `[Issue #185] Propagated ${analysis.source_note_aliases.length} alias(es) to ${path}`
        );
        finalContent = withAliases;
      }
    }

    await this.createOrUpdateFile(path, finalContent);
    return path;
  }

  async createOrUpdateFile(path: string, content: string): Promise<void> {
    console.debug('createOrUpdateFile:', path);

    // Central pollution detection: strip folder-prefix duplication from wiki-links
    // before writing. This catches pollution from ALL sources (page generation,
    // stub expansion, dead link fixes, merges, etc.).
    //
    // Pattern A: display-name pollution — [[entities/X|entities/Y]]
    //   e.g. [[entities/Qwen|entities/Qwen]] → [[entities/Qwen|Qwen]]
    const DISPLAY_POLLUTION_REGEX = /\[\[(entities|concepts|sources)\/([^|\]]+)\|(entities|concepts|sources)\/([^|\]]+)\]\]/g;
    if (DISPLAY_POLLUTION_REGEX.test(content)) {
      console.warn(
        `createOrUpdateFile: detected display-name pollution in ${path}, auto-correcting`
      );
      content = content.replace(
        DISPLAY_POLLUTION_REGEX,
        (_match: string, _folder: string, _path: string, _dupFolder: string, display: string) => {
          return `[[${_folder}/${_path}|${display}]]`;
        }
      );
    }

    // Pattern B: path-prefix duplication — [[X/Xname|name]]
    //   e.g. [[concepts/concepts布局优化|布局优化]] → [[concepts/布局优化|布局优化]]
    //   The folder prefix is duplicated in the path portion, directly before
    //   the page name with no separator (CJK char, letter, etc.).
    //   Safe: [[concepts/concepts-of-ML|...]] — '-' separator indicates legitimate slug.
    const PATH_DUP_REGEX = /\[\[(entities|concepts|sources)\/\1([^\s\-_|\]]+)(\|[^\]]+)?\]\]/g;
    if (PATH_DUP_REGEX.test(content)) {
      console.warn(
        `createOrUpdateFile: detected path-prefix pollution in ${path}, auto-correcting`
      );
      content = content.replace(
        PATH_DUP_REGEX,
        (_match: string, folder: string, rest: string, display: string | undefined) => {
          const displayPart = display || '';
          return `[[${folder}/${rest}${displayPart}]]`;
        }
      );
    }

    // Issue #125: normalize the `sources:` frontmatter field on every write.
    // The LLM emits raw note paths ("[[Notizen/Autonome Dysregulation.md]]"),
    // `.md` extensions, `|alias` pipes, and space/paren-containing titles. Left
    // unfixed these become dead links that previously required a post-ingest
    // cleanup script. normalizeSourcesField (Issue #81) already exists and is
    // unit-tested but was only wired into the lint/auto-maintain paths — not the
    // generation/merge write path that produces this pollution in the first place.
    const preserveCase = this.settings.slugCase === 'preserve';
    const sourcesFix = fixPollutedSources(content, this.settings.wikiFolder, preserveCase);
    if (sourcesFix.fixed > 0) {
      console.warn(`createOrUpdateFile: normalized polluted sources field in ${path}`);
      content = sourcesFix.content;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
          console.debug(`Attempt ${attempt + 1}: File exists, updating:`, path);
          await this.app.vault.process(file, () => content);
          console.debug('Update success:', path);
          if (this.isInWikiContentFolder(path, this.settings.wikiFolder)) {
            this.markPageComplete(path);
          }
          this.onFileWrite?.(path);
          this.invalidatePageCaches();
          return;
        }

        // getAbstractFileByPath returned null — could be an NFC/NFD normalization
        // mismatch on macOS where the file exists but with a different Unicode form.
        // Try resolveFileInVault (walks parent directory, no full vault scan) first,
        // rather than guessing vault.create() will succeed.
        if (attempt === 0) {
          const resolved = this.resolveFileInVault(path);
          if (resolved instanceof TFile) {
            console.debug('createOrUpdateFile: resolved via directory scan:', path);
            await this.app.vault.process(resolved, () => content);
            console.debug('Update success (resolved path):', path);
            if (this.isInWikiContentFolder(path, this.settings.wikiFolder)) {
              this.markPageComplete(path);
            }
            this.onFileWrite?.(path);
            this.invalidatePageCaches();
            return;
          }
        }

        // File genuinely does not appear to exist — attempt to create it.
        console.debug(`Attempt ${attempt + 1}: File not found, creating:`, path);
        await this.app.vault.create(path, content);
        console.debug('Create success:', path);
        if (this.isInWikiContentFolder(path, this.settings.wikiFolder)) {
          this.markPageComplete(path);
        }
        this.onFileWrite?.(path);
        this.invalidatePageCaches();
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Attempt ${attempt + 1} failed:`, errorMsg);

        if (errorMsg.includes('File already exists') || errorMsg.includes('already exists')) {
          // macOS Unicode normalization: getAbstractFileByPath returned null
          // but vault.create detected the file (NFC vs NFD mismatch).
          // Fall back to parent-directory listing to resolve the actual TFile.
          let resolved = this.resolveFileInVault(path);
          if (!resolved) {
            const normalized = path.normalize();
            const allFiles = this.app.vault.getMarkdownFiles();
            resolved = allFiles.find(f => f.path.normalize() === normalized) || null;
            if (resolved) console.debug('Retry found file via full scan:', path);
          }
          if (resolved instanceof TFile) {
            await this.app.vault.process(resolved, () => content);
            console.debug('Update succeeded after file resolution:', path);
            this.onFileWrite?.(path);
            this.invalidatePageCaches();
            return;
          }
          console.debug('File exists anomaly, retrying after 100ms:', path);
          await new Promise(resolve => window.setTimeout(resolve, 100));
          continue;
        } else {
          console.error('Unhandled error:', path, error);
          throw error;
        }
      }
    }

    // Final fallback: try directory listing + full markdown scan
    console.debug('3attempts exhausted, searching directory listing:', path);
    let file = this.resolveFileInVault(path);
    if (!file) {
      // Belt-and-suspenders: scan getMarkdownFiles() (same source of truth as lint)
      const normalized = path.normalize();
      const allFiles = this.app.vault.getMarkdownFiles();
      file = allFiles.find(f => f.path.normalize() === normalized) || null;
      if (file) console.debug('createOrUpdateFile: resolved via full scan:', path);
    }
    if (file) {
      await this.app.vault.process(file, () => content);
      console.debug('Final update succeeded:', path);
      this.onFileWrite?.(path);
      this.invalidatePageCaches();
    } else {
      // Issue #172: localize via getText, never hardcode CJK in source.
      throw new Error(
        getText(this.settings.language, 'fileWriteFailed').replace('{path}', path)
      );
    }
  }

  async deleteFile(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.fileManager.trashFile(file);
      this.invalidatePageCaches();
      console.debug('deleteFile:', path);
    }
  }

  /** Resolve a vault path to TFile by listing parent directory children.
   *  macOS APFS stores filenames in NFD; JavaScript strings are NFC.
   *  When getAbstractFileByPath can't find a file that vault.create
   *  detected as existing, this fallback resolves the mismatch.
   *  Uses Unicode normalization so Chinese filenames compare correctly. */
  private resolveFileInVault(path: string): TFile | null {
    const lastSep = path.lastIndexOf('/');
    if (lastSep === -1) return null;
    const dirPath = path.substring(0, lastSep);
    const baseName = path.substring(lastSep + 1).normalize();

    const dir = this.app.vault.getAbstractFileByPath(dirPath);
    if (dir && dir instanceof TFolder) {
      for (const child of dir.children) {
        if (child instanceof TFile && child.name.normalize() === baseName) {
          return child;
        }
      }
    }
    return null;
  }

  async tryReadFile(path: string): Promise<string | null> {
    // Resolve the file using all available strategies.
    // On macOS APFS, filenames are stored in NFD while JavaScript uses NFC,
    // so getAbstractFileByPath may miss files with non-ASCII names.
    let file: TFile | null = null;

    try {
      const direct = this.app.vault.getAbstractFileByPath(path);
      if (direct instanceof TFile) file = direct;
    } catch {
      // getAbstractFileByPath can throw on malformed paths; ignore and try fallbacks
    }

    if (!file) {
      file = this.resolveFileInVault(path);
    }

    if (!file) {
      const normalized = path.normalize();
      const allFiles = this.app.vault.getMarkdownFiles();
      const matched = allFiles.find(f => f.path.normalize() === normalized);
      if (matched) {
        console.debug('tryReadFile: resolved via full scan:', path);
        file = matched;
      }
    }

    if (!file) {
      console.debug('tryReadFile: all lookups failed for:', path);
      return null;
    }

    // vault.read() exceptions are NOT caught — a file that exists but can't
    // be read is a real error, not a "file not found" condition.
    return await this.app.vault.read(file);
  }

  async regenerateDefaultSchema(): Promise<void> {
    await this.schemaManager.regenerateDefaultSchema();
  }

  // ---- Lint-fix delegation ----

  getExistingWikiPages(): Promise<Array<{path: string; title: string; wikiLink: string; aliases?: string[]}>> {
    const now = Date.now();
    if (this.pagesCache && (now - this.pagesCacheTime) < this.PAGES_CACHE_TTL_MS) {
      return Promise.resolve(this.pagesCache);
    }
    return getExistingWikiPages(this.app, this.settings.wikiFolder).then(data => {
      this.pagesCache = data;
      this.pagesCacheTime = Date.now();
      return data;
    });
  }

  async fixDeadLink(sourcePath: string, targetName: string): Promise<string> {
    return fixDeadLink(this.ctx, sourcePath, targetName);
  }

  async fillEmptyPage(pagePath: string, existingContent?: string): Promise<string> {
    return fillEmptyPage(this.ctx, pagePath, existingContent);
  }

  // Issue #103: delete empty stubs without running full lint pipeline
  async deleteEmptyStubs(wikiFolder: string): Promise<{ deleted: number; failed: number; errors: string[] }> {
    return deleteEmptyStubs(this.ctx, wikiFolder);
  }

  async linkOrphanPage(orphanPath: string): Promise<string[]> {
    return linkOrphanPage(this.ctx, orphanPath);
  }

  // ---- Contradiction delegation ----

  async noteContradiction(contradiction: ContradictionInfo) {
    return this.contradictionManager.noteContradiction(contradiction);
  }

  async getOpenContradictions(): Promise<Array<{ path: string; status: string; claim: string; sourcePage: string }>> {
    return this.contradictionManager.getOpenContradictions();
  }

  async updateContradictionStatus(filePath: string, newStatus: string): Promise<void> {
    return this.contradictionManager.updateContradictionStatus(filePath, newStatus);
  }

  async resolveContradiction(contradictionPath: string): Promise<void> {
    return this.contradictionManager.resolveContradiction(contradictionPath);
  }

  // ---- Conversation ingestion delegation ----

  async ingestConversation(history: ConversationHistory): Promise<IngestReport> {
    return this.conversationIngestor.ingestConversation(history);
  }

  formatConversation(history: ConversationHistory): string {
    return formatConversation(history);
  }

  // ---- Index generation ----
  // v1.25.1 Phase C-PR1: extracted to engine-internals/index-generator.ts.
  // WikiEngine keeps facade methods so existing callers (lint phases,
  // conversation-ingest orchestrator, main.ts command) see no change.

  async generateIndexFromEngine() {
    await this.ensureWikiStructure();

    // v1.25.1 Phase C-PR1.8 (Efficiency #2): one getMarkdownFiles() call
    // + 3 prefix filters (was 3 separate calls — each rebuilds the vault
    // file index). On a 5K-page vault this saves ~30-150ms per regen.
    const prefix = `${this.settings.wikiFolder}/`;
    const allWikiPages = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(prefix));
    const entities = allWikiPages.filter(f => f.path.startsWith(`${prefix}entities/`));
    const concepts = allWikiPages.filter(f => f.path.startsWith(`${prefix}concepts/`));
    const sources = allWikiPages.filter(f => f.path.startsWith(`${prefix}sources/`));

    const totalPages = entities.length + concepts.length + sources.length;
    if (totalPages === 0) {
      await this.indexGenerator.generateEmptyIndex();
      return;
    }
    await this.indexGenerator.generateFlatIndex(entities, concepts, sources);
  }

  async getPageSummary(file: TFile): Promise<string> {
    return this.indexGenerator.getPageSummary(file);
  }

  async getPageAliases(file: TFile): Promise<string[]> {
    return this.indexGenerator.getPageAliases(file);
  }

  async updateLog(
    operation: string,
    analysis: SourceAnalysis,
    metrics?: { durationSec?: number; model?: string; sourceBytes?: number },
  ) {
    return this.logWriter.appendIngest(operation, analysis, metrics);
  }

  /** Append a lint-fix entry to the operation log. */
  async logLintFix(operation: string, details: string): Promise<void> {
    return this.logWriter.appendLintFix(operation, details);
  }

  /** Merge a duplicate source page into a target page. */
  async mergeDuplicatePages(targetPath: string, sourcePath: string): Promise<string> {
    return mergeDuplicatePages(this.ctx, targetPath, sourcePath);
  }
}
