// Internationalization texts for plugin UI.
// Barrel file — texts are organized by language under src/texts/.

import { EN_TEXTS } from './texts/en';
import { ZH_TEXTS } from './texts/zh';

export const TEXTS = {
  en: EN_TEXTS,
  zh: ZH_TEXTS,
} as const;