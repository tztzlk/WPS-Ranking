import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './resources';

/**
 * Languages of the interface. The URL does not carry the language: it is picked
 * from the saved choice, then the browser's languages, then English.
 *
 * Translations live in locales/<lang>/<namespace>.json, one namespace per page
 * (plus "common" for the layout and shared components). English is bundled as
 * the fallback; other languages are loaded on demand.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'ru', label: 'Русский', locale: 'ru-RU' },
  { code: 'zh', label: '简体中文', locale: 'zh-CN' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

const STORAGE_KEY = 'wps-lang';
const isLanguage = (value: unknown): value is Language => LANGUAGES.some((l) => l.code === value);

/** BCP 47 locale for Intl formatting of the current language, e.g. "ru-RU". */
export function localeOf(language: string): string {
  return LANGUAGES.find((l) => l.code === language)?.locale ?? 'en-US';
}

function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag?.toLowerCase().split('-')[0];
    if (isLanguage(base)) return base;
  }
  return 'en';
}

// Non-English namespaces, each its own small chunk.
const lazyLocales = import.meta.glob<{ default: Record<string, unknown> }>(['./locales/*/*.json', '!./locales/en/*.json']);

async function loadLanguage(language: Language): Promise<void> {
  if (language === 'en' || i18n.hasResourceBundle(language, 'common')) return;
  const prefix = `./locales/${language}/`;
  await Promise.all(
    Object.entries(lazyLocales)
      .filter(([path]) => path.startsWith(prefix))
      .map(async ([path, load]) => {
        const ns = path.slice(prefix.length, -'.json'.length);
        i18n.addResourceBundle(language, ns, (await load()).default, true, true);
      }),
  );
}

function applyToDocument(language: Language): void {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
}

/** Call once before the first render, so the page never flashes in the wrong language. */
export async function initI18n(): Promise<void> {
  const language = detectLanguage();
  await i18n.use(initReactI18next).init({
    resources: { en },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: Object.keys(en),
    interpolation: { escapeValue: false }, // React escapes
    returnNull: false,
  });
  if (language !== 'en') {
    try {
      await loadLanguage(language);
      await i18n.changeLanguage(language);
    } catch (error) {
      console.warn('[i18n] could not load language, using English:', error);
    }
  }
  applyToDocument(i18n.language as Language);
}

/** Switch the interface language and remember the choice. */
export async function setLanguage(language: Language): Promise<void> {
  await loadLanguage(language);
  await i18n.changeLanguage(language);
  applyToDocument(language);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    /* storage unavailable */
  }
}

export default i18n;
