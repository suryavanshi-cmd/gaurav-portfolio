import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, HOST_PORTAL_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './config';
import { translate } from './dictionaries';

/* Server components read the locale from the cookie the switcher writes, so the
   first paint is already in the right language — no flash of English. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const headerList = await headers();
  // middleware.ts sets this on the shetkari portal.
  if (headerList.get('x-ctn-portal') === 'host') return HOST_PORTAL_LOCALE;

  const accept = headerList.get('accept-language')?.toLowerCase() ?? '';
  if (accept.includes('mr')) return 'mr';
  if (accept.includes('hi')) return 'hi';
  return DEFAULT_LOCALE;
}

export async function getServerT() {
  const locale = await getLocale();
  return {
    locale,
    t: (path: string, vars?: Record<string, string | number>) => translate(locale, path, vars),
  };
}
