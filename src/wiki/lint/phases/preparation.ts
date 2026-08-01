import { TEXTS } from '../../../texts';
import { getText } from '../../../core/i18n';
import { fixDoubleNestedWikiLinks } from '../utils';
import { scanPollutedSources, fixPollutedSources } from '../../../core/sources-normalizer';
import { parseFrontmatter } from '../../../core/frontmatter';
import { isInFolderScope } from '../../../core/folder-scope';
import { LINT_PREP_BATCH_READ } from '../../../constants';
import { LintPhaseContext, ScannerPage } from '../types';

export interface PreparationResult {
  wikiFiles: Array<{ path: string; basename: string }>;
  pageMap: Map<string, ScannerPage>;
  knownTargets: Set<string>;
  knownTargetsLower: Set<string>;
  doubleNestFixes: number;
  sourcesNormalizedFiles: number;
  sourcesNormalizedEntries: number;
}

export async function runPreparationPhase(
  ctx: LintPhaseContext,
): Promise<PreparationResult> {
  // Issue #383: anchored so lint does not pull a sibling folder
  // ("wiki-archive/") or a neighbouring file ("wiki.md") into the page set
  // every later phase operates on.
  const wikiFiles = ctx.app.vault.getMarkdownFiles()
    .filter(f => isInFolderScope(f.path, ctx.settings.wikiFolder, false) &&
                 !f.path.includes('index.md') &&
                 !f.path.includes('log.md') &&
                 !f.path.includes('/schema/') &&
                 !f.path.includes('/contradictions/'));

  const allVaultFiles = ctx.app.vault.getMarkdownFiles();
  const { known: knownTargets, knownLower: knownTargetsLower } = buildKnownTargets(allVaultFiles);

  const pageMap = new Map<string, ScannerPage>();
  ctx.stageNotice?.setMessage(
    getText(ctx.settings.language, 'lintReadingPages').replace('{count}', String(wikiFiles.length))
  );
  ctx.wikiEngine.updateStatusBar(getText(ctx.settings.language, 'lintStagePrep'));
  console.debug(`lintWiki: reading ${wikiFiles.length} wiki pages in parallel`);

  const BATCH_READ = LINT_PREP_BATCH_READ;
  for (let i = 0; i < wikiFiles.length; i += BATCH_READ) {
    ctx.checkCancelled();
    const batch = wikiFiles.slice(i, i + BATCH_READ);
    const batchResults = await Promise.all(
      batch.map(async file => {
        const content = await ctx.app.vault.read(file);
        return { path: file.path, content, basename: file.basename };
      })
    );
    for (const r of batchResults) {
      pageMap.set(r.path, r);
    }
  }
  ctx.stageNotice?.setMessage(
    getText(ctx.settings.language, 'lintReadingPagesProgress')
      .replace('{current}', String(wikiFiles.length))
      .replace('{total}', String(wikiFiles.length))
  );
  console.debug(`lintWiki: read ${wikiFiles.length}/${wikiFiles.length} pages`);

  // Double-nested wiki-link fix
  ctx.stageNotice?.setMessage(getText(ctx.settings.language, 'lintScanningLinks'));
  let doubleNestFixes = 0;
  for (const [path, info] of pageMap) {
    const abstractFile = ctx.app.vault.getAbstractFileByPath(path);
    if (abstractFile) {
      await ctx.app.vault.process(abstractFile, (data) => {
        const { fixed, content } = fixDoubleNestedWikiLinks(data);
        if (fixed > 0) {
          doubleNestFixes += fixed;
          info.content = content;
          console.debug(`lintWiki: fixed ${fixed} double-nested link(s) in ${path}`);
        }
        return data;
      });
    }
  }
  const logPath = `${ctx.settings.wikiFolder}/log.md`;
  const logFile = ctx.app.vault.getAbstractFileByPath(logPath);
  if (logFile) {
    await ctx.app.vault.process(logFile, (data) => {
      const { fixed, content } = fixDoubleNestedWikiLinks(data);
      if (fixed > 0) {
        doubleNestFixes += fixed;
        console.debug(`lintWiki: fixed ${fixed} double-nested link(s) in log.md`);
      }
      return fixed > 0 ? content : data;
    });
  }
  if (doubleNestFixes > 0) {
    console.debug(`lintWiki: total ${doubleNestFixes} double-nested link(s) fixed`);
  }

  // Sources field normalize
  let sourcesNormalizedFiles = 0;
  let sourcesNormalizedEntries = 0;
  const sourcesPreserveCase = ctx.settings.slugCase === 'preserve';
  for (const [path, info] of pageMap) {
    if (!scanPollutedSources(info.content, ctx.settings.wikiFolder, sourcesPreserveCase)) continue;
    const abstractFile = ctx.app.vault.getAbstractFileByPath(path);
    if (abstractFile) {
      const { fixed, content } = fixPollutedSources(info.content, ctx.settings.wikiFolder, sourcesPreserveCase);
      if (fixed > 0) {
        await ctx.app.vault.process(abstractFile, () => content);
        sourcesNormalizedFiles += 1;
        sourcesNormalizedEntries += fixed;
        info.content = content;
        console.debug(`lintWiki: normalized ${fixed} sources entry(ies) in ${path}`);
      }
    }
  }
  if (sourcesNormalizedFiles > 0) {
    console.debug(`lintWiki: sources normalized in ${sourcesNormalizedFiles} files (${sourcesNormalizedEntries} entries)`);
  }

  // v1.23.0 P0-2 follow-up: exclude Welcome notes from Lint.
  //
  // Welcome notes have `type: welcome` frontmatter and live in
  // `${wikiFolder}/${getWelcomeFileName(lang)}.md` — the filename is
  // localized to the user's wiki language, so we cannot filter by
  // filename. Filter by frontmatter instead. This is the only
  // robust signal that a page is a Welcome note.
  //
  // Without this filter, Lint would treat the welcome note as a
  // regular wiki page and report false positives:
  //   - "dead link" for every [[link]] in the welcome body
  //   - "orphan" because the welcome page has no incoming links
  //   - "ungrounded quote" for any quoted phrases in the welcome
  //     template
  //   - "tag violation" if the welcome note doesn't conform to
  //     entity/concept tag vocab
  //
  // The same welcome-filter must apply to Ingest and Query Wiki's
  // `getExistingWikiPages` (which also uses `wikiFolder/` filter).
  // Search for `type: welcome` in those call sites — if missed, the
  // LLM would treat welcome as an existing entity and try to update
  // it during ingestion.
  let welcomeSkipped = 0;
  for (const [path, info] of pageMap) {
    const fm = parseFrontmatter(info.content);
    // Defensive: parseFrontmatter returns null for malformed
    // frontmatter. Only skip pages with a valid `type: welcome` —
    // any other shape (no frontmatter, malformed, no type) is
    // kept for Lint to surface as a separate issue.
    if (fm && fm.type === 'welcome') {
      pageMap.delete(path);
      welcomeSkipped += 1;
      console.debug(`lintWiki: skipped welcome page ${path}`);
    }
  }
  const filteredWikiFiles = wikiFiles.filter(f => pageMap.has(f.path));
  console.debug(
    `lintWiki: ${wikiFiles.length} wiki files, ${welcomeSkipped} welcome skipped, ` +
    `${filteredWikiFiles.length} linted`
  );

  return {
    wikiFiles: filteredWikiFiles,
    pageMap,
    knownTargets,
    knownTargetsLower,
    doubleNestFixes,
    sourcesNormalizedFiles,
    sourcesNormalizedEntries,
  };
}

function buildKnownTargets(
  allVaultFiles: Array<{ basename: string; path: string }>
): { known: Set<string>; knownLower: Set<string> } {
  const known = new Set<string>();
  const knownLower = new Set<string>();
  const addTarget = (t: string) => { known.add(t); knownLower.add(t.toLowerCase()); };
  for (const file of allVaultFiles) {
    const nameWithoutExt = file.basename.replace('.md', '');
    addTarget(file.basename);
    addTarget(nameWithoutExt);
    const relPath = file.path.replace('.md', '');
    addTarget(relPath);
    addTarget(file.path);
    const parts = relPath.split('/');
    for (let i = 1; i < parts.length; i++) {
      const subPath = parts.slice(i).join('/');
      addTarget(subPath);
      addTarget(subPath + '.md');
    }
  }
  return { known, knownLower };
}

export { TEXTS };
