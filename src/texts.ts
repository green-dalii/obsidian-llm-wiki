// Internationalization texts for plugin UI.
// Barrel file — texts are organized by language under src/texts/.

import { EN_TEXTS } from './texts/en';
import { ZH_TEXTS } from './texts/zh';
import { ZH_HANT_TEXTS } from './texts/zh-hant';
import { JA_TEXTS } from './texts/ja';
import { KO_TEXTS } from './texts/ko';
import { DE_TEXTS } from './texts/de';
import { FR_TEXTS } from './texts/fr';
import { ES_TEXTS } from './texts/es';
import { PT_TEXTS } from './texts/pt';
import { IT_TEXTS } from './texts/it';

// v1.22.0: TEXTS keys are BCP-47 tags to match settings.language and
// WIKI_LANGUAGES. zh-Hant is a regional subtag (vs. zh = zh-Hans by default).
// Type assertion is needed because TS would otherwise try to verify the
// runtime shape of every export (EN/ZH/.../IT) against the inferred type
// of the object literal — and the inferred type wouldn't include 'zh-Hant'
// without help. The i18n-parity test enforces key completeness.
export const TEXTS = {
  en: EN_TEXTS,
  zh: ZH_TEXTS,
  'zh-Hant': ZH_HANT_TEXTS,
  ja: JA_TEXTS,
  ko: KO_TEXTS,
  de: DE_TEXTS,
  fr: FR_TEXTS,
  es: ES_TEXTS,
  pt: PT_TEXTS,
  it: IT_TEXTS,
} as const;