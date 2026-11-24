import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { localeOf } from '.';

const CJK = /[㐀-鿿豈-﫿]/;

/**
 * Number, date and name formatting for the current language. Use it instead of
 * toLocaleString('en-US') and instead of the English names that come from the API.
 */
export function useFormat() {
  const { t, i18n } = useTranslation('common');
  const language = i18n.language;

  return useMemo(() => {
    const locale = localeOf(language);
    const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    const fixed = new Map<number, Intl.NumberFormat>();
    let regions: Intl.DisplayNames | null = null;
    try {
      regions = new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
      /* old browser: keep the API's English names */
    }

    return {
      locale,
      /** 12,345 / 12 345 / 12,345 */
      int: (n: number) => integer.format(n),
      /** Fixed decimals in the locale's style: 85.42 / 85,42. */
      num: (n: number, digits = 2) => {
        let f = fixed.get(digits);
        if (!f) {
          f = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
          fixed.set(digits, f);
        }
        return f.format(n);
      },
      /** A date from the API (UTC), e.g. "Nov 20, 2026" / "20 нояб. 2026 г." / "2026年11月20日". */
      date: (iso: string, style: 'medium' | 'long' = 'medium') =>
        new Date(iso).toLocaleDateString(locale, { dateStyle: style, timeZone: 'UTC' }),
      /** Date and time in the viewer's time zone. */
      dateTime: (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }),
      /** Country name from its ISO2 code in the current language; `fallback` is the API's English name. */
      country: (iso2: string | null | undefined, fallback?: string | null): string => {
        if (iso2 && language !== 'en' && regions) {
          try {
            const name = regions.of(iso2.toUpperCase());
            if (name && name !== iso2.toUpperCase()) return name;
          } catch {
            /* not a region code */
          }
        }
        return fallback ?? iso2 ?? '';
      },
      /** Continent name for AF, AS, EU, NA, OC, SA. */
      continent: (code: string | null | undefined, fallback?: string | null): string =>
        code && i18n.exists(`common:continents.${code}`)
          ? t(`continents.${code}` as 'continents.EU')
          : (fallback ?? code ?? ''),
      /** WCA event name by event ID (333, 333bf, …). */
      event: (eventId: string, fallback?: string): string =>
        i18n.exists(`common:events.${eventId}`) ? t(`events.${eventId}` as 'events.333') : (fallback ?? eventId),
      /**
       * WCA names carry the local spelling in parentheses: "Yiheng Wang (王艺衡)".
       * In Chinese the Chinese spelling goes first: "王艺衡 (Yiheng Wang)".
       */
      person: (name: string): string => {
        if (language !== 'zh') return name;
        const m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(name);
        return m && CJK.test(m[2]) && !CJK.test(m[1]) ? `${m[2]} (${m[1]})` : name;
      },
    };
  }, [language, t, i18n]);
}

export type Format = ReturnType<typeof useFormat>;
