// Issue #258: buildSectionLabelsHint (used by lint/fill-empty-page.ts and
// any other LLM-driven empty-page regenerator) used to list "Basic
// Information" as the first entity-page section. That label conflicted
// with the prompt + default-schema fix that removed the block — the lint
// regen path would re-introduce the same `## 基本信息\n- Type: ...\n- Source:`
// drift the original fix eliminated. The fix at lint/utils.ts:10 removes
// the redundant `basic_information` line and renumbers the entity list to
// start at Description.
import { describe, it, expect } from 'vitest';
import { buildSectionLabelsHint } from '../../../wiki/lint/utils';
import { LLMWikiSettings } from '../../../types';

function mkSettings(overrides: Partial<LLMWikiSettings> = {}): LLMWikiSettings {
  return {
    wikiLanguage: 'zh',
    ...overrides,
  } as LLMWikiSettings;
}

describe('buildSectionLabelsHint (#258 lint regen parity)', () => {
  it('entity labels start at Description and skip Basic Information', () => {
    const hint = buildSectionLabelsHint(mkSettings());
    // The redundant entity label MUST NOT appear — the prompt + schema +
    // user-customized schema agree it is gone.
    expect(hint).not.toContain('基本信息');
    expect(hint).not.toContain('Basic Information');
    // Description is the new first entity section.
    const entitySection = hint.split('Concept pages use:')[0];
    expect(entitySection).toContain('描述');
    // The remaining canonical entity sections are still listed.
    expect(entitySection).toContain('相关实体');
    expect(entitySection).toContain('相关概念');
    expect(entitySection).toContain('来源提及');
  });

  it('concept labels have never included Basic Information', () => {
    // Sentinel: concept pages never had the Basic Information block in any
    // version. Confirm the lint hint honours that contract.
    const hint = buildSectionLabelsHint(mkSettings());
    const conceptSection = hint.split('Concept pages use:')[1]?.split('Source pages use:')[0] ?? '';
    expect(conceptSection).not.toContain('基本信息');
    expect(conceptSection).not.toContain('Basic Information');
  });

  it('English wikiLanguage also drops Basic Information from entity labels', () => {
    const hint = buildSectionLabelsHint(mkSettings({ wikiLanguage: 'en' }));
    expect(hint).not.toContain('Basic Information');
    expect(hint).toContain('Description');
  });
});
