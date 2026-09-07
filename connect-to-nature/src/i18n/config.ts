export const LOCALES = ['en', 'hi', 'mr'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/* The shetkari portal opens in Marathi unless the visitor has chosen
   otherwise. A farmer in Sindhudurg should not have to find a language
   switcher before the page makes sense. */
export const HOST_PORTAL_LOCALE: Locale = 'mr';

export const LOCALE_COOKIE = 'ctn.locale';
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_META: Record<Locale, { label: string; short: string; htmlLang: string }> = {
  en: { label: 'English', short: 'EN', htmlLang: 'en-IN' },
  hi: { label: 'हिंदी', short: 'हिं', htmlLang: 'hi-IN' },
  mr: { label: 'मराठी', short: 'मरा', htmlLang: 'mr-IN' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
