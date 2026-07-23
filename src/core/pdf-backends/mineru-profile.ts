export const MINERU_CONVERSION_PROFILE = {
  backend: 'mineru',
  modelVersion: 'vlm',
  converterVersion: 'mineru-v1',
  enableFormula: true,
  enableTable: true,
  converter: 'mineru/vlm',
} as const;

export function buildMineruCacheKey(sourceSha256: string): string {
  const profile = MINERU_CONVERSION_PROFILE;
  return `${sourceSha256}:${profile.backend}:${profile.modelVersion}:${profile.converterVersion}:formula=${profile.enableFormula}:table=${profile.enableTable}`;
}
