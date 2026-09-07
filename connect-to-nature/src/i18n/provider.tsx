'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_MAX_AGE, LOCALE_META, type Locale,
} from './config';
import { formatDate, formatMoney, pickText, translate, translateList, type I18nField } from './dictionaries';

interface IntlValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  list: (path: string) => string[];
  tx: (field: I18nField) => string;
  money: (value: number) => string;
  date: (iso: string) => string;
}

const IntlContext = createContext<IntlValue | null>(null);

export function IntlProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`;
    // The <html lang> has to follow, or a screen reader keeps reading Devanagari
    // with an English voice.
    document.documentElement.lang = LOCALE_META[next].htmlLang;
  }, []);

  const value = useMemo<IntlValue>(() => ({
    locale,
    setLocale,
    t: (path, vars) => translate(locale, path, vars),
    list: (path) => translateList(locale, path),
    tx: (field) => pickText(field, locale),
    money: (amount) => formatMoney(amount),
    date: (iso) => formatDate(iso, locale),
  }), [locale, setLocale]);

  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>;
}

export function useIntl(): IntlValue {
  const ctx = useContext(IntlContext);
  if (!ctx) throw new Error('useIntl must be used inside <IntlProvider>');
  return ctx;
}
