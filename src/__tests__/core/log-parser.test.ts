import { describe, it, expect } from 'vitest';
import { parseLogEntries, parseDetailRows, extractWikiLinks } from '../../core/log-parser';

/**
 * Log parser tests for the Operation History Panel (#122).
 *
 * Real-world log.md structure (from a 215-line sample vault):
 *
 *   ## [YYYY-MM-DD] ingest | <source_title>          ← ingest
 *     **Created pages**: [[...]]
 *
 *   ## [YYYY-MM-DD HH:MM] Wiki 维护报告              ← maintenance
 *     > Wiki 状态概览：共 38 个页面，…耗时 7 秒       (KPI blockquote)
 *     - [[a]] → **b**（页面不存在）
 *     ### 标签越界（程序检测）[共 1 个]              (### section)
 *     - [[x]] — invalid: document
 *     ### LLM 分析
 *     - [矛盾：...]
 */

const HEADER = '# Wiki Operation Log\n\n';

describe('parseLogEntries — ingest entries (operation | source_title)', () => {
  it('parses a single ingest entry with created + updated pages', () => {
    const log = HEADER + [
      '## [2026-06-21] ingest | my-source.md',
      '',
      '**Created pages**: [[entities/Foo]], [[concepts/Bar]]',
      '',
      '**Updated pages**: [[entities/Baz]]',
      '',
    ].join('\n');

    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: 'ingest',
      date: '2026-06-21',
      operation: 'ingest',
      sourceTitle: 'my-source.md',
      createdPages: ['entities/Foo', 'concepts/Bar'],
      updatedPages: ['entities/Baz'],
    });
  });

  it('parses multiple ingest entries in chronological order', () => {
    const log = HEADER + [
      '## [2026-06-19] ingest | first.md',
      '',
      '**Created pages**: [[entities/A]]',
      '',
      '**Updated pages**:',
      '',
      '## [2026-06-20] ingest | second.md',
      '',
      '**Created pages**: [[entities/B]], [[entities/C]]',
      '',
      '**Updated pages**: [[entities/D]]',
      '',
    ].join('\n');

    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(2);
    expect(entries[0].sourceTitle).toBe('first.md');
    expect(entries[1].sourceTitle).toBe('second.md');
    expect(entries[1].createdPages).toEqual(['entities/B', 'entities/C']);
  });
});

describe('parseLogEntries — maintenance reports (real-world format)', () => {
  it('classifies "Wiki 维护报告" as maintenance', () => {
    const log = HEADER + [
      '## [2026-06-17 18:55] Wiki 维护报告',
      '',
      '> Wiki 状态概览：共 38 个页面，0 个缺失别名，重复 0 个，断链 19 个，孤立 2 个，空洞 0 个，无来源引证 0 个，标签越界 1 个。本次 Lint 耗时 7 秒',
      '',
      '- [[sources/plugin-guidelines]] → **concepts/hardcoded-styling**（页面不存在）',
      '',
    ].join('\n');
    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('maintenance');
    expect(entries[0].time).toBe('18:55');
    expect(entries[0].operation).toBe('Wiki 维护报告');
  });

  it('extracts KPI numbers from the > blockquote header', () => {
    const log = HEADER + [
      '## [2026-06-17 18:55] Wiki 维护报告',
      '',
      '> Wiki 状态概览：共 38 个页面，0 个缺失别名，重复 0 个，断链 19 个，孤立 2 个，空洞 0 个，无来源引证 0 个，标签越界 1 个。本次 Lint 耗时 7 秒',
      '',
    ].join('\n');
    const entries = parseLogEntries(log);
    const kpi = entries[0].kpi!;
    expect(kpi.totalPages).toBe(38);
    expect(kpi.missingAliases).toBe(0);
    expect(kpi.duplicates).toBe(0);
    expect(kpi.deadLinks).toBe(19);
    expect(kpi.orphans).toBe(2);
    expect(kpi.emptyPages).toBe(0);
    expect(kpi.unsourced).toBe(0);
    expect(kpi.tagViolations).toBe(1);
    expect(kpi.durationSeconds).toBe(7);
  });

  it('parses ### sections with bullets grouped under headings', () => {
    const log = HEADER + [
      '## [2026-06-17 18:55] Wiki 维护报告',
      '',
      '> 共 38 个页面，断链 19 个，耗时 7 秒',
      '',
      '### 标签越界（程序检测）[共 1 个]',
      '',
      '- [[sources/developer-policies]] — invalid: document',
      '',
      '### 孤立页面（程序检测）[共 2 个]',
      '',
      '- [[concepts/tfiletfolder]] — 无其他 Wiki 页面链接至此',
      '- [[concepts/vault-getfilebypath]] — 无其他 Wiki 页面链接至此',
      '',
    ].join('\n');
    const entries = parseLogEntries(log);
    expect(entries[0].sections).toHaveLength(2);
    expect(entries[0].sections[0].kind).toBe('tagViolation');
    expect(entries[0].sections[0].heading).toBe('标签越界（程序检测）[共 1 个]');
    expect(entries[0].sections[0].count).toBe(1);
    expect(entries[0].sections[0].items).toHaveLength(1);
    expect(entries[0].sections[0].items[0].severity).toBe('medium');
    expect(entries[0].sections[1].kind).toBe('orphan');
    expect(entries[0].sections[1].heading).toBe('孤立页面（程序检测）[共 2 个]');
    expect(entries[0].sections[1].count).toBe(2);
    expect(entries[0].sections[1].items).toHaveLength(2);
  });

  it('classifies dead-link bullets (top section before any ###) as deadLinks kind', () => {
    const log = HEADER + [
      '## [2026-06-17 18:55] Wiki 维护报告',
      '',
      '> 共 38 个页面，断链 19 个',
      '',
      '- [[sources/plugin-guidelines]] → **concepts/hardcoded-styling**（页面不存在）',
      '- [[sources/developer-policies]] → **concepts/client-side-telemetry**（页面不存在）',
      '',
    ].join('\n');
    const entries = parseLogEntries(log);
    expect(entries[0].sections).toHaveLength(1);
    expect(entries[0].sections[0].kind).toBe('deadLinks');
    expect(entries[0].sections[0].heading).toBe('Dead links');
    expect(entries[0].sections[0].items).toHaveLength(2);
    // Each dead-link item has the missing target extracted from **…**
    expect(entries[0].sections[0].items[0].targetPage).toBe('concepts/hardcoded-styling');
    expect(entries[0].sections[0].items[0].severity).toBe('high');
  });

  it('classifies LLM analysis sections and extracts type chips (矛盾/过时/缺失/结构)', () => {
    const log = HEADER + [
      '## [2026-06-18 15:01] Wiki 维护报告',
      '',
      '> 共 39 个页面，耗时 78 秒',
      '',
      '### LLM 分析',
      '',
      '- [矛盾：**`obsidian-directory`** 引用 `[[entities/community-plugins]]` 但实际应为 `[[concepts/community-plugins]]`]',
      '- [过时：`obsidian` 实体页面只引用 `[[sources/developer-policies]]`]',
      '- [缺失：**`Vault`** 独立概念页面缺失]',
      '- [结构：多个概念页别名有重复项]',
      '',
    ].join('\n');
    const entries = parseLogEntries(log);
    const llmSection = entries[0].sections.find((s) => s.kind === 'llmAnalysis');
    expect(llmSection).toBeDefined();
    expect(llmSection!.items).toHaveLength(4);
    expect(llmSection!.items[0].llmType).toBe('矛盾');
    expect(llmSection!.items[0].severity).toBe('high');
    expect(llmSection!.items[1].llmType).toBe('过时');
    expect(llmSection!.items[1].severity).toBe('medium');
    expect(llmSection!.items[2].llmType).toBe('缺失');
    expect(llmSection!.items[3].llmType).toBe('结构');
    expect(llmSection!.items[3].severity).toBe('low');
  });

  it('extracts [共 N 个] count from heading', () => {
    const log = HEADER + [
      '## [2026-06-18 15:01] Wiki 维护报告',
      '',
      '> 共 39 个页面',
      '',
      '### 标签越界（程序检测）[共 3 个]',
      '',
      '- [[a]] — invalid: x',
      '- [[b]] — invalid: y',
      '- [[c]] — invalid: z',
      '',
    ].join('\n');
    const entries = parseLogEntries(log);
    expect(entries[0].sections[0].count).toBe(3);
  });

  // ── v3.1 — enriched ingest entries with HH:MM + metrics ──

  it('parses enriched ingest entries: HH:MM timestamp + metrics suffix (v3.1)', () => {
    const log = HEADER + [
      '## [2026-06-21 14:30] ingest | Developer policies · 28s · claude-sonnet-4 · 4.2KB',
      '',
      '**Created pages**: [[entities/Foo]], [[concepts/Bar]]',
      '',
      '**Updated pages**:',
      '',
    ].join('\n');
    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('ingest');
    expect(entries[0].time).toBe('14:30');
    expect(entries[0].sourceTitle).toBe('Developer policies');
    expect(entries[0].operation).toBe('ingest'); // stripped of metrics suffix
    expect(entries[0].ingestMetrics).toEqual({
      durationSec: 28,
      model: 'claude-sonnet-4',
      sourceBytes: Math.round(4.2 * 1024),
    });
  });

  it('parses ingest entries without metrics suffix (legacy format)', () => {
    const log = HEADER + [
      '## [2026-06-17] ingest | Developer policies',
      '',
      '**Created pages**: [[entities/Foo]]',
      '',
      '**Updated pages**:',
      '',
    ].join('\n');
    const entries = parseLogEntries(log);
    expect(entries[0].time).toBeUndefined();
    expect(entries[0].ingestMetrics).toBeUndefined();
    expect(entries[0].sourceTitle).toBe('Developer policies');
  });

  it('parses ingest with minutes duration: "1m30s" → 90s', () => {
    const log = HEADER + [
      '## [2026-06-21 14:30] ingest | Foo.md · 1m30s',
      '',
      '**Created pages**: [[entities/X]]',
      '',
      '**Updated pages**:',
      '',
    ].join('\n');
    expect(parseLogEntries(log)[0].ingestMetrics?.durationSec).toBe(90);
  });

  it('classifies EN "Wiki Maintenance Report" as maintenance', () => {
    const log = HEADER + [
      '## [2026-06-17 18:55] Wiki Maintenance Report',
      '',
      '> Wiki status: 38 pages, 19 dead links, 7 seconds',
      '',
    ].join('\n');
    const entries = parseLogEntries(log);
    expect(entries[0].kind).toBe('maintenance');
  });

  it('extracts KPIs from EN blockquote with "X pages / X dead links / X seconds"', () => {
    const log = HEADER + [
      '## [2026-06-17 18:55] Wiki Maintenance Report',
      '',
      '> Wiki status: 38 pages, 0 missing aliases, 0 duplicates, 19 dead links, 2 orphans, 28 seconds',
      '',
    ].join('\n');
    const entries = parseLogEntries(log);
    expect(entries[0].kpi).toMatchObject({
      totalPages: 38,
      missingAliases: 0,
      duplicates: 0,
      deadLinks: 19,
      orphans: 2,
      durationSeconds: 28,
    });
  });
});

describe('parseLogEntries — fix runner entries (Lint — fixXxx)', () => {
  it('classifies "Lint — fixDeadLinks" as fix', () => {
    const log = HEADER + [
      '## [2026-06-21 14:30] Lint — fixPollutedSources',
      '',
      '- [[entities/Foo]]: added 3 aliases',
      '- [[entities/Bar]]: cleaned 2 dead links',
      '',
    ].join('\n');
    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('fix');
    expect(entries[0].time).toBe('14:30');
    expect(entries[0].operation).toBe('Lint — fixPollutedSources');
    expect(entries[0].details).toHaveLength(2);
    expect(entries[0].details[0].isBullet).toBe(true);
    expect(entries[0].details[0].links[0].path).toBe('entities/Foo');
  });
});

describe('parseLogEntries — edge cases', () => {
  it('returns empty array for empty string', () => {
    expect(parseLogEntries('')).toEqual([]);
  });

  it('returns empty array for header-only content', () => {
    expect(parseLogEntries(HEADER)).toEqual([]);
  });

  it('tolerates a malformed H2 line (no brackets) by skipping it', () => {
    const log = HEADER + [
      '## This is not a log entry',
      '',
      '## [2026-06-21] ingest | valid.md',
      '',
      '**Created pages**: [[entities/Foo]]',
      '',
      '**Updated pages**:',
      '',
    ].join('\n');

    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0].sourceTitle).toBe('valid.md');
  });

  it('handles Chinese wiki log header (# Wiki 操作日志)', () => {
    const log = '# Wiki 操作日志\n\n' + [
      '## [2026-06-21] ingest | source.md',
      '',
      '**Created pages**: [[entities/SourceEntity]]',
      '',
      '**Updated pages**:',
      '',
    ].join('\n');

    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(1);
    expect(entries[0].sourceTitle).toBe('source.md');
    expect(entries[0].createdPages).toEqual(['entities/SourceEntity']);
  });
});

describe('parseDetailRows / extractWikiLinks — pure utilities', () => {
  it('extractWikiLinks returns paths in order', () => {
    expect(extractWikiLinks('see [[a]] and [[b|c]] and [[c]]')).toEqual([
      { path: 'a', alias: undefined },
      { path: 'b', alias: 'c' },
      { path: 'c', alias: undefined },
    ]);
  });

  it('parseDetailRows handles bullets + non-bullets + empty lines', () => {
    const rows = parseDetailRows('- first\n\n   \nplain line\n- second');
    expect(rows).toHaveLength(3);
    expect(rows[0].isBullet).toBe(true);
    expect(rows[1].isBullet).toBe(false);
    expect(rows[1].raw).toBe('plain line');
    expect(rows[2].isBullet).toBe(true);
  });
});
