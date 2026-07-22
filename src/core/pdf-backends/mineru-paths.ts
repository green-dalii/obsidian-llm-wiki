const MINERU_ARTIFACT_SEGMENT = /(?:^|\/)[^/]+\.mineru(?:\.tmp-[^/]+)?(?:\/|$)/;
const WINDOWS_DRIVE_PREFIX = /^[A-Za-z]:/;

function normalizeSeparators(path: string): string {
  return path.replace(/\\/g, '/');
}

export function sanitizeMineruRelativePath(path: string): string {
  if (!path || path.includes('\0')) {
    throw new Error('MinerU paths must be non-empty and cannot contain NUL bytes.');
  }

  const normalized = normalizeSeparators(path);
  if (
    normalized.startsWith('/') ||
    WINDOWS_DRIVE_PREFIX.test(normalized) ||
    normalized.startsWith('//')
  ) {
    throw new Error('MinerU paths must be relative.');
  }

  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('MinerU paths cannot contain empty, dot, or parent segments.');
  }

  return segments.join('/');
}

export function getMineruArtifactDir(sourcePath: string): string {
  const normalized = sanitizeMineruRelativePath(sourcePath);
  const segments = normalized.split('/');
  const filename = segments.pop() as string;
  const extensionIndex = filename.lastIndexOf('.');
  const basename = extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
  segments.push(`${basename}.mineru`);
  return segments.join('/');
}

export function getMineruTempDir(sourcePath: string, suffix: string): string {
  if (!suffix || suffix.includes('/') || suffix.includes('\\') || suffix.includes('\0')) {
    throw new Error('MinerU temporary directory suffix must be one safe path segment.');
  }
  return `${getMineruArtifactDir(sourcePath)}.tmp-${suffix}`;
}

export function isMineruArtifactPath(path: string): boolean {
  return MINERU_ARTIFACT_SEGMENT.test(normalizeSeparators(path));
}
