import { describe, it, expect } from 'vitest';
import { buildIngestStatusBarText } from '../../core/status-bar';

const LABEL = '提取中... 点击取消';

describe('buildIngestStatusBarText', () => {
  it('returns the bare label when no filename and no batch info', () => {
    expect(buildIngestStatusBarText(LABEL)).toBe(LABEL);
  });

  it('prefixes the filename before the label for a single file', () => {
    expect(buildIngestStatusBarText(LABEL, 'My Note')).toBe('My Note · 提取中... 点击取消');
  });

  it('prefixes the batch counter and filename when batch info is given', () => {
    expect(buildIngestStatusBarText(LABEL, 'My Note', { current: 4, total: 10 })).toBe(
      '[4/10] My Note · 提取中... 点击取消'
    );
  });

  it('shows the batch counter alone when batch info is given but filename is missing', () => {
    expect(buildIngestStatusBarText(LABEL, undefined, { current: 2, total: 5 })).toBe(
      '[2/5] 提取中... 点击取消'
    );
  });

  it('falls back to the bare label when filename is empty/whitespace and no batch', () => {
    expect(buildIngestStatusBarText(LABEL, '   ')).toBe(LABEL);
  });

  it('trims the filename', () => {
    expect(buildIngestStatusBarText(LABEL, '  Note  ')).toBe('Note · 提取中... 点击取消');
  });

  it('ignores null batch info', () => {
    expect(buildIngestStatusBarText(LABEL, 'Doc', null)).toBe('Doc · 提取中... 点击取消');
  });
});
