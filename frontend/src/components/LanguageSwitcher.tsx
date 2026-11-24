import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { LANGUAGES, Language, setLanguage } from '../i18n';

/** Language picker for the header; the choice is saved in this browser. */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation();
  return (
    <label className={`relative flex items-center ${className}`.trim()}>
      <span className="sr-only">{t('language.label')}</span>
      <Languages className="pointer-events-none absolute left-2 h-4 w-4 text-gray-400" aria-hidden="true" />
      <select
        value={i18n.language}
        onChange={(e) => void setLanguage(e.target.value as Language)}
        className="cursor-pointer appearance-none rounded-lg border border-gray-700 bg-gray-800 py-1.5 pl-8 pr-3 text-sm text-gray-200 transition hover:border-gray-600 hover:text-white focus:border-green-500 focus:outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
