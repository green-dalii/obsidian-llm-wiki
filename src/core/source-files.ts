import { COMPATIBLE_SOURCE_EXTENSIONS } from '../constants';

const compatibleExtensions: readonly string[] = COMPATIBLE_SOURCE_EXTENSIONS;

export function filterCompatibleSourceFiles<T extends { path: string; extension: string }>(
  files: readonly T[],
  wikiFolder: string,
  configDir: string,
): T[] {
  return files.filter(file =>
    compatibleExtensions.includes(file.extension.toLowerCase())
    && !file.path.startsWith(wikiFolder)
    && !file.path.startsWith(configDir),
  );
}
