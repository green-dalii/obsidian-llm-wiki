// Internationalization texts for plugin UI.
// Barrel file — texts are organized by language under src/texts/.

import { EN_TEXTS } from './texts/en';
import { ZH_TEXTS } from './texts/zh';
import { JA_TEXTS } from './texts/ja';
import { KO_TEXTS } from './texts/ko';
import { DE_TEXTS } from './texts/de';
import { FR_TEXTS } from './texts/fr';
import { ES_TEXTS } from './texts/es';
import { PT_TEXTS } from './texts/pt';

export const TEXTS = {
  en: EN_TEXTS,
  zh: ZH_TEXTS,
  ja: JA_TEXTS,
  ko: KO_TEXTS,
  de: DE_TEXTS,
  fr: FR_TEXTS,
  es: ES_TEXTS,
  pt: PT_TEXTS,
} as const;