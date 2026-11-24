import 'i18next';
import type { en } from './resources';

// t('key') is type-checked against the English JSON files: a missing or misspelled key fails tsc.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof en;
    returnNull: false;
  }
}
