import { describe, it, expect } from 'vitest';
import { getText } from '../../core/i18n';
describe('getText', () => {
  it('returns EN text for a known key', () => {
    const result = getText('en', 'ingestionCancelled');
    expect(result).toBe('Ingestion cancelled');
  });

  it('returns ZH text for a known key', () => {
    const result = getText('zh', 'ingestionCancelled');
    expect(result).toBe('提取已取消');
  });

  it('falls back to EN for unknown language code', () => {
    const result = getText('xx', 'ingestionCancelled');
    expect(result).toBe('Ingestion cancelled');
  });

  it('performs single placeholder replacement', () => {
    const result = getText('en', 'lintReadingPages', { count: '3' });
    expect(result).toContain('3');
    expect(result).toContain('Wiki pages');
  });

  it('performs multiple placeholder replacements', () => {
    const result = getText('en', 'rateLimitDetected', {
      count: '5',
      suggestedConcurrency: '2',
      suggestedDelay: '800',
    });
    expect(result).toContain('5');
    expect(result).toContain('2');
    expect(result).toContain('800');
  });

  it('returns JA text for a known key', () => {
    const result = getText('ja', 'ingestionCancelled');
    expect(result).toBe('取り込みがキャンセルされました');
  });

  it('returns KO text for a known key', () => {
    const result = getText('ko', 'ingestionCancelled');
    expect(result).toBe('수집이 취소되었습니다');
  });

  it('handles non-existent replacement placeholders gracefully', () => {
    const result = getText('en', 'ingestionCancelled', { nonexistent: 'foo' });
    expect(result).toBe('Ingestion cancelled');
  });
});

