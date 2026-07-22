import { describe, expect, it } from 'vitest';
import {
  getMineruArtifactDir,
  getMineruTempDir,
  isMineruArtifactPath,
  sanitizeMineruRelativePath,
} from '../../core/pdf-backends/mineru-paths';

describe('MinerU managed paths', () => {
  it('derives stable artifact and temporary directories', () => {
    expect(getMineruArtifactDir('articles/paper.pdf')).toBe('articles/paper.mineru');
    expect(getMineruArtifactDir('articles\\paper.pdf')).toBe('articles/paper.mineru');
    expect(getMineruTempDir('articles/paper.pdf', 'abc')).toBe(
      'articles/paper.mineru.tmp-abc'
    );
  });

  it('classifies only exact managed directory segments', () => {
    expect(isMineruArtifactPath('articles/paper.mineru/document.md')).toBe(true);
    expect(isMineruArtifactPath('articles/paper.mineru.tmp-abc/document.md')).toBe(true);
    expect(isMineruArtifactPath('articles\\paper.mineru\\document.md')).toBe(true);
    expect(isMineruArtifactPath('articles/mineru-notes/document.md')).toBe(false);
    expect(isMineruArtifactPath('articles/paper.mineru-notes.md')).toBe(false);
    expect(isMineruArtifactPath('articles/paper.mineru.tmp-/document.md')).toBe(false);
    expect(isMineruArtifactPath('articles/.mineru/document.md')).toBe(false);
  });
});

describe('sanitizeMineruRelativePath', () => {
  it('normalizes backslashes in safe relative paths', () => {
    expect(sanitizeMineruRelativePath('result\\images\\图像.png')).toBe(
      'result/images/图像.png'
    );
  });

  it.each([
    '',
    '/absolute/full.md',
    '\\server\\share\\full.md',
    'C:\\result\\full.md',
    'result//full.md',
    'result/./full.md',
    'result/../full.md',
    'result/full.md\0ignored',
  ])('rejects unsafe path %j', (path) => {
    expect(() => sanitizeMineruRelativePath(path)).toThrow();
  });
});
