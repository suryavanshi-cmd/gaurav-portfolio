'use client';

import { createContext, useCallback, useContext, useDeferredValue, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_MAX_AGE, LOCALE_META, type Locale,
} from './config';
import { formatDate, formatMoney, pickText, translate, translateList, type I18nField } from './dictionaries';

interface IntlValue {
  /* What the page renders in. Deferred: switching language re-renders every
     component on the page, and React can do that at lower priority while the
     click paints immediately. */
  locale: Locale;
  /* What the switcher shows as chosen. Never deferred — the control has to
     move under the finger that pressed it, or the tap reads as ignored. */
  selected: Locale;
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
  const deferredLocale = useDeferredValue(locale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`;
    // The <html lang> has to follow, or a screen reader keeps reading Devanagari
    // with an English voice.
    document.documentElement.lang = LOCALE_META[next].htmlLang;
  }, []);

  const value = useMemo<IntlValue>(() => ({
    locale: deferredLocale,
    selected: locale,
    setLocale,
    t: (path, vars) => translate(deferredLocale, path, vars),
    list: (path) => translateList(deferredLocale, path),
    tx: (field) => pickText(field, deferredLocale),
    money: (amount) => formatMoney(amount),
    date: (iso) => formatDate(iso, deferredLocale),
  }), [deferredLocale, locale, setLocale]);

  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>;
}

export function useIntl(): IntlValue {
  const ctx = useContext(IntlContext);
  if (!ctx) throw new Error('useIntl must be used inside <IntlProvider>');
  return ctx;
}
