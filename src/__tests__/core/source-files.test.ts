import { describe, expect, it } from 'vitest';
import { filterCompatibleSourceFiles } from '../../core/source-files';

const configDir = 'config';

const files = [
  { path: 'sources/note.md', extension: 'md' },
  { path: 'sources/plain.TXT', extension: 'TXT' },
  { path: 'sources/paper.PDF', extension: 'PDF' },
  { path: 'sources/image.png', extension: 'png' },
  { path: 'wiki/source.pdf', extension: 'pdf' },
  { path: 'config/plugin.pdf', extension: 'pdf' },
] as const;

describe('filterCompatibleSourceFiles', () => {
  it('keeps supported source extensions case-insensitively', () => {
    expect(filterCompatibleSourceFiles(files, 'wiki', configDir).map(file => file.path)).toEqual([
      'sources/note.md',
      'sources/plain.TXT',
      'sources/paper.PDF',
    ]);
  });
});
